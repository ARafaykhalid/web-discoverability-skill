import { DOMAINS, TIERS_REQUIRING_SOURCES } from './model.ts';
import type { LedgerRecord, Requirement } from './model.ts';
import type { CheckList } from './checks/index.ts';
import { normalizeText, tokenSimilarity } from './registry.ts';
import { validate, findDependencyCycles, DUPLICATE_THRESHOLD, summarizeByRule } from './validate.ts';
import { levelCandidateCounts } from './select.ts';

/** What the three registry reports read. Shared because they take the same data. */
export interface RegistryReportOptions {
  records?: Requirement[];
  removed?: LedgerRecord[];
  deferred?: LedgerRecord[];
  checks?: CheckList | null;
  /** YYYY-MM-DD. Defaults to now, so a test can pin it. */
  today?: string;
}

export interface MetricsOptions extends RegistryReportOptions {
  /** Aggregate figures from a benchmark run. Never defaulted to a flattering value. */
  benchmarks?: Record<string, unknown> | null;
}

export interface StaleOptions {
  records?: Requirement[];
  today?: string;
}

export interface SourceOptions {
  records?: Requirement[];
}

function countBy(records, get) {
  const out = {};
  for (const record of records) {
    const key = get(record);
    if (key === undefined || key === null) continue;
    out[key] = (out[key] || 0) + 1;
  }
  return out;
}

function hasSources(record) {
  return Array.isArray(record.sources) && record.sources.length > 0;
}

function hasVerification(record) {
  return Boolean(record.verification?.method && Array.isArray(record.verification?.evidence) && record.verification.evidence.length);
}

function hasAutomatedCheck(record) {
  return Boolean(record.verification?.automated_check);
}

/**
 * Registry-quality report (brief section 2). Every number here is derived; none
 * is written into documentation by hand.
 */
export function qualityReport({ records, removed = [], deferred = [], checks = null, today = undefined }: RegistryReportOptions = {}) {
  const validation = validate({ records, removed, deferred, checks, today });

  const normalizedTitles = new Map();
  for (const record of records) {
    const key = normalizeText(record.title);
    if (!normalizedTitles.has(key)) normalizedTitles.set(key, []);
    normalizedTitles.get(key).push(record.id);
  }
  const exactDuplicates = [...normalizedTitles.values()].filter((ids) => ids.length > 1);

  const nearDuplicates = [];
  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const similarity = tokenSimilarity(records[i].title, records[j].title);
      if (similarity >= DUPLICATE_THRESHOLD) {
        nearDuplicates.push({ a: records[i].id, b: records[j].id, similarity: Number(similarity.toFixed(3)) });
      }
    }
  }

  const ids = new Set(records.map((r) => r.id));
  const brokenDependencies = [];
  for (const record of records) {
    for (const target of record.depends_on || []) {
      if (!ids.has(target)) brokenDependencies.push({ id: record.id, missing: target });
    }
    for (const target of record.conflicts_with || []) {
      if (!ids.has(target)) brokenDependencies.push({ id: record.id, missing: target });
    }
  }

  const cycles = findDependencyCycles(records);

  const missingMetadata = records
    .map((record) => {
      const missing = [];
      if (!hasSources(record) && TIERS_REQUIRING_SOURCES.includes(record.evidence_tier)) missing.push('sources');
      if (!hasVerification(record)) missing.push('verification');
      if (!record.confidence) missing.push('confidence');
      if (!record.applies_when) missing.push('applies_when');
      if (!record.review?.last_verified) missing.push('review.last_verified');
      return missing.length ? { id: record.id, missing } : null;
    })
    .filter(Boolean);

  // Contradictions: two requirements that conflict but are both selectable at the
  // same level without either declaring the other.
  const contradictions = [];
  for (const record of records) {
    for (const target of record.conflicts_with || []) {
      const other = records.find((r) => r.id === target);
      if (other && !(other.conflicts_with || []).includes(record.id)) {
        contradictions.push({ id: record.id, conflicts_with: target, issue: 'not declared reciprocally' });
      }
    }
  }

  return {
    generated_from: 'requirements/*.jsonl',
    totals: {
      records: records.length,
      removed: removed.length,
      deferred: deferred.length,
      unique_titles: normalizedTitles.size,
      domains: DOMAINS.length,
    },
    by_domain: countBy(records, (r) => r.domain),
    by_level: levelCandidateCounts(records),
    by_minimum_level: countBy(records, (r) => r.minimum_level),
    by_category: countBy(records, (r) => r.category),
    by_evidence_tier: countBy(records, (r) => r.evidence_tier),
    by_confidence: countBy(records, (r) => r.confidence),
    by_change_safety: countBy(records, (r) => r.change_safety),
    by_impact: countBy(records, (r) => r.impact),
    by_verification_level: countBy(records, (r) => r.verification?.level),
    coverage: {
      with_sources: records.filter(hasSources).length,
      with_verification: records.filter(hasVerification).length,
      with_automated_check: records.filter(hasAutomatedCheck).length,
      without_automated_check: records.filter((r) => !hasAutomatedCheck(r)).length,
      checks_defined: checks ? checks.length : 0,
    },
    problems: {
      duplicate_titles: exactDuplicates,
      near_duplicate_titles: nearDuplicates,
      missing_metadata: missingMetadata,
      broken_dependencies: brokenDependencies,
      circular_dependencies: cycles.map((c) => c.join(' -> ')),
      contradictions,
    },
    validation: {
      ok: validation.ok,
      errors: validation.errors.length,
      warnings: validation.warnings.length,
      by_rule: summarizeByRule(validation.entries),
    },
  };
}

/**
 * Machine-readable metrics (brief section 18). Benchmark figures are only
 * present when a benchmark run supplied them; they are never defaulted to a
 * flattering value.
 */
export function metricsReport({ records, removed = [], deferred = [], checks = null, benchmarks = null, today = undefined }: MetricsOptions = {}) {
  const quality = qualityReport({ records, removed, deferred, checks, today });
  const tested = records.filter(hasAutomatedCheck).length;

  return {
    schema_version: 3,
    generated_at: new Date().toISOString(),
    requirements_total: records.length,
    requirements_unique: quality.totals.unique_titles,
    requirements_with_sources: records.filter(hasSources).length,
    requirements_with_verification: records.filter(hasVerification).length,
    requirements_with_tests: tested,
    requirements_with_confidence: records.filter((r) => Boolean(r.confidence)).length,
    duplicate_count: quality.problems.duplicate_titles.length,
    near_duplicate_count: quality.problems.near_duplicate_titles.length,
    broken_dependency_count: quality.problems.broken_dependencies.length,
    circular_dependency_count: quality.problems.circular_dependencies.length,
    requirements_removed: removed.length,
    requirements_deferred: deferred.length,
    checks_defined: checks ? checks.length : 0,
    check_coverage_ratio: records.length ? Number((tested / records.length).toFixed(4)) : 0,
    registry_valid: quality.validation.ok,
    validation_errors: quality.validation.errors,
    level_candidate_counts: quality.by_level,
    evidence_tier_counts: quality.by_evidence_tier,
    category_counts: quality.by_category,
    change_safety_counts: quality.by_change_safety,
    benchmark_precision: benchmarks?.precision ?? null,
    benchmark_recall: benchmarks?.recall ?? null,
    false_positive_rate: benchmarks?.false_positive_rate ?? null,
    false_negative_rate: benchmarks?.false_negative_rate ?? null,
    benchmark_cases: benchmarks?.cases ?? null,
    benchmark_scope: benchmarks
      ? 'fixture projects, checked subset of the registry only'
      : 'not measured in this run',
  };
}

/** Requirements whose external evidence is due for re-verification (brief 16). */
export function staleReport({ records, today = new Date().toISOString().slice(0, 10) }: StaleOptions = {}) {
  const now = Date.parse(today);
  const rows = [];
  for (const record of records) {
    const review = record.review;
    if (!review?.last_verified || !review.interval_days) continue;
    const due = Date.parse(review.last_verified) + review.interval_days * 86400000;
    const overdueDays = Math.floor((now - due) / 86400000);
    rows.push({
      id: record.id,
      domain: record.domain,
      title: record.title,
      evidence_tier: record.evidence_tier,
      stability: review.stability,
      last_verified: review.last_verified,
      due_on: new Date(due).toISOString().slice(0, 10),
      overdue_days: overdueDays,
      stale: overdueDays > 0,
    });
  }
  rows.sort((a, b) => b.overdue_days - a.overdue_days);
  return {
    today,
    total: rows.length,
    stale_count: rows.filter((r) => r.stale).length,
    due_within_30_days: rows.filter((r) => !r.stale && r.overdue_days > -30).length,
    rows,
  };
}

/** The source manifest (brief section 5). One row per citation. */
export function sourceManifest({ records }: SourceOptions = {}) {
  const rows = [];
  for (const record of records) {
    for (const source of record.sources || []) {
      rows.push({
        requirement_id: record.id,
        domain: record.domain,
        url: source.url,
        organization: source.organization,
        title: source.title,
        type: source.type,
        official: source.official,
        date_checked: source.date_checked,
        evidence_tier: source.tier,
        limitations: source.limitations ?? null,
      });
    }
  }
  rows.sort((a, b) => a.requirement_id.localeCompare(b.requirement_id) || a.url.localeCompare(b.url));

  const byOrganization = {};
  for (const row of rows) byOrganization[row.organization] = (byOrganization[row.organization] || 0) + 1;

  return {
    total_citations: rows.length,
    unique_urls: new Set(rows.map((r) => r.url)).size,
    official_citations: rows.filter((r) => r.official).length,
    unofficial_citations: rows.filter((r) => !r.official).length,
    by_organization: byOrganization,
    requirements_missing_sources: records
      .filter((r) => TIERS_REQUIRING_SOURCES.includes(r.evidence_tier) && !(r.sources || []).length)
      .map((r) => r.id),
    rows,
  };
}

/**
 * Verify that every cited URL is reachable. Real network I/O: a failure is
 * reported as a failure, never silently treated as verified.
 */
export async function checkSources({ records, concurrency = 6, timeoutMs = 15000, fetchImpl = fetch }: SourceOptions & { concurrency?: number; timeoutMs?: number; fetchImpl?: typeof fetch } = {}) {
  const manifest = sourceManifest({ records });
  const urls = [...new Set(manifest.rows.map((r) => r.url))];
  const results = [];
  let cursor = 0;

  const attempt = async (url, signal) => {
    const response = await fetchImpl(url, { method: 'HEAD', redirect: 'follow', signal });
    if (response.status === 405 || response.status === 501) {
      return fetchImpl(url, { method: 'GET', redirect: 'follow', signal });
    }
    return response;
  };

  const worker = async () => {
    while (cursor < urls.length) {
      const url = urls[cursor];
      cursor += 1;
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);
      const requirementIds = manifest.rows.filter((r) => r.url === url).map((r) => r.requirement_id);
      try {
        // One retry, because a dropped connection is not a dead citation. Firing
        // 130+ requests concurrently enough to be polite still trips rate
        // limiters and TLS resets on healthy hosts, and reporting those as broken
        // citations would make this command fail on a network flake and train
        // everyone to ignore it.
        let response;
        let lastError = null;
        for (let tries = 0; tries < 2; tries += 1) {
          try {
            response = await attempt(url, controller.signal);
            lastError = null;
            break;
          } catch (error) {
            lastError = error;
          }
        }
        if (lastError) throw lastError;
        results.push({
          url,
          requirement_ids: requirementIds,
          status: response.status,
          final_url: response.url || url,
          ok: response.status >= 200 && response.status < 400,
          error: null,
        });
      } catch (error) {
        results.push({ url, requirement_ids: requirementIds, status: null, final_url: null, ok: false, error: error.message });
      } finally {
        clearTimeout(timer);
      }
    }
  };

  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length || 1) }, worker));
  results.sort((a, b) => a.url.localeCompare(b.url));

  return {
    checked: results.length,
    reachable: results.filter((r) => r.ok).length,
    unreachable: results.filter((r) => !r.ok).length,
    results,
  };
}
