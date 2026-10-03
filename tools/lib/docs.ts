import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  includesValue,
  DOMAINS,
  LEVELS,
  SEVERITIES,
  IMPACT_LEVELS,
  CATEGORIES,
  EXPERIMENTAL_CATEGORIES,
  EVIDENCE_TIERS,
  EVIDENCE_TIER_VALUES,
  CONFIDENCE_LEVELS,
  CHANGE_SAFETY,
  CHANGE_SAFETY_VALUES,
  VERIFICATION_LEVELS,
  EVIDENCE_TYPES,
  APPLICABILITY_STATUSES,
  TERMINAL_STATUSES,
  SURFACES,
  SOURCE_TYPES,
  STABILITY,
  STABILITY_VALUES,
  FRAMEWORKS,
  FRAMEWORKS_WITH_ADAPTERS,
  PROFILE_PREDICATES,
  ACTIVATIONS,
  CLASSIFICATIONS,
  DEFERRED_READMISSION_CRITERIA,
  DEFERRED_ORIGIN,
  RUNTIME_SENSITIVE_DOMAINS,
  REQUIRED_FIELDS,
  OPTIONAL_FIELDS,
  ID_PATTERN,
} from './model.ts';
import { ROOT, sortRecords } from './registry.ts';

/**
 * Generated documentation and schemas.
 *
 * Anything that restates a number or an enum is generated here. `wds docs
 * --check` fails when a generated artifact drifts from the registry, which is
 * how the repository stops documentation from making claims the data does not
 * support.
 */

const GENERATED_NOTICE = '<!-- GENERATED FILE. Run `npm run docs -- --write`. Edits are overwritten. -->';

function escapePipes(text) {
  return String(text ?? '').replace(/\|/g, '\\|');
}

function table(headers, rows) {
  const lines = [`| ${headers.join(' | ')} |`, `| ${headers.map(() => '---').join(' | ')} |`];
  for (const row of rows) lines.push(`| ${row.map(escapePipes).join(' | ')} |`);
  return lines.join('\n');
}

function inline(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function code(value) {
  return `\`${String(value ?? '').replaceAll('`', '\\`')}\``;
}

function countBy(records, get) {
  const out = new Map();
  for (const record of records) {
    const key = get(record);
    out.set(key, (out.get(key) || 0) + 1);
  }
  return out;
}

/* ------------------------------------------------------------------ schemas */

/** JSON Schema for one requirement record. Generated from model.ts. */
export function requirementSchema() {
  // `description` is optional: six call sites pass only the values, and the schema is
  // equally valid without a description for an enum whose name is self-explanatory.
  const enumProp = (values, description?) => ({ type: 'string', enum: values, description });

  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://github.com/ARafaykhalid/web-discoverability-skill/schema/requirement.schema.json',
    title: 'Discoverability requirement',
    description: 'One record of requirements/<domain>.jsonl. Generated from tools/lib/model.ts.',
    type: 'object',
    additionalProperties: false,
    required: REQUIRED_FIELDS,
    properties: {
      id: { type: 'string', pattern: ID_PATTERN.source, description: 'Stable identifier. Never reused, even after retirement.' },
      domain: enumProp(DOMAINS.map((d) => d.domain), 'Must match the file the record lives in.'),
      title: { type: 'string', minLength: 12, maxLength: 120, description: 'One control, imperative voice. Compound titles are rejected by the validator.' },
      statement: { type: 'string', minLength: 40, description: 'The testable assertion, independent of the title.' },
      rationale: { type: 'string', minLength: 40, description: 'Why it matters, in language the evidence tier supports.' },
      category: enumProp(CATEGORIES, 'Separates established technical SEO from experimental GEO/LLMO.'),
      minimum_level: enumProp(LEVELS, 'Lowest audit level that includes this requirement.'),
      severity: enumProp(SEVERITIES, 'How bad the defect is when present.'),
      impact: enumProp(IMPACT_LEVELS, 'Blast radius if the change is wrong. HIGH forbids SAFE_AUTOMATIC.'),
      change_safety: enumProp(CHANGE_SAFETY_VALUES, 'What an agent may do without human approval.'),
      evidence_tier: enumProp(EVIDENCE_TIER_VALUES, 'Strength of external evidence.'),
      confidence: enumProp(CONFIDENCE_LEVELS, 'Confidence that the change produces the stated effect.'),
      applies_when: {
        type: 'object',
        additionalProperties: false,
        description: 'Profile predicates gating this requirement. Unknown facts yield UNCERTAIN, never NOT_APPLICABLE.',
        properties: {
          all: { type: 'array', items: enumProp(PROFILE_PREDICATES), uniqueItems: true },
          any: { type: 'array', items: enumProp(PROFILE_PREDICATES), uniqueItems: true },
          none: { type: 'array', items: enumProp(PROFILE_PREDICATES), uniqueItems: true },
        },
      },
      implementation: { type: 'string', minLength: 60, description: 'Concrete, framework-aware guidance.' },
      verification: {
        type: 'object',
        additionalProperties: false,
        required: ['level', 'method', 'evidence'],
        properties: {
          level: enumProp(VERIFICATION_LEVELS, `SOURCE is rejected for runtime-sensitive domains: ${RUNTIME_SENSITIVE_DOMAINS.join(', ')}.`),
          method: { type: 'string', minLength: 40, description: 'How to prove the requirement holds in the produced output.' },
          evidence: { type: 'array', minItems: 1, items: enumProp(EVIDENCE_TYPES), uniqueItems: true },
          automated_check: { type: 'string', description: 'Check id in tools/lib/checks/ that provides machine evidence.' },
        },
      },
      review: {
        type: 'object',
        additionalProperties: false,
        required: ['stability', 'interval_days', 'last_verified', 'owner'],
        properties: {
          stability: enumProp(STABILITY_VALUES, 'How fast the external evidence moves.'),
          interval_days: { type: 'integer', description: 'Derived from stability; the validator enforces the mapping.' },
          last_verified: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
          owner: { type: 'string', minLength: 2 },
        },
      },
      surfaces: { type: 'array', items: enumProp(SURFACES, 'Evaluate here. Never implies appearance here.'), uniqueItems: true },
      frameworks: { type: 'array', items: enumProp(FRAMEWORKS), uniqueItems: true },
      framework_notes: { type: 'object', additionalProperties: { type: 'string' } },
      depends_on: { type: 'array', items: { type: 'string', pattern: ID_PATTERN.source }, uniqueItems: true },
      conflicts_with: { type: 'array', items: { type: 'string', pattern: ID_PATTERN.source }, uniqueItems: true },
      supersedes: { type: 'array', items: { type: 'string', pattern: ID_PATTERN.source }, uniqueItems: true },
      caution: { type: 'string', description: 'Required for Tier D. States what is not established.' },
      sources: {
        type: 'array',
        description: 'Required for evidence tiers A-D.',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['url', 'organization', 'title', 'type', 'official', 'date_checked', 'tier'],
          properties: {
            url: { type: 'string', pattern: '^https://' },
            organization: { type: 'string', minLength: 2 },
            title: { type: 'string', minLength: 4 },
            type: enumProp(SOURCE_TYPES),
            official: { type: 'boolean', description: 'True only for first-party documentation from the organization that owns the behaviour.' },
            date_checked: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
            tier: enumProp(EVIDENCE_TIER_VALUES, 'How strongly this source supports *this* record\'s claim, not how authoritative the document is in general. The same URL can legitimately be tier A where it states a behaviour directly and tier B where it only implies one.'),
            limitations: { type: 'string', description: 'What the source does not say. Prevents over-reading a citation.' },
          },
        },
      },
    },
  };
}

/** JSON Schema for removed.jsonl / deferred.jsonl entries. */
export function ledgerSchema() {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://github.com/ARafaykhalid/web-discoverability-skill/schema/ledger.schema.json',
    title: 'Requirement review ledger entry',
    description: 'A reviewed requirement that is not active. IDs recorded here are never reused.',
    type: 'object',
    additionalProperties: false,
    required: ['id', 'title', 'classification'],
    properties: {
      id: { type: 'string', pattern: ID_PATTERN.source },
      title: { type: 'string', minLength: 8, description: 'The title as it existed before review.' },
      classification: { type: 'string', enum: CLASSIFICATIONS },
      reason: { type: 'string', minLength: 20, description: 'Why this is not an active requirement. Required in removed.jsonl.' },
      domain: { type: 'string' },
      replaced_by: { type: 'array', items: { type: 'string', pattern: ID_PATTERN.source }, uniqueItems: true },
      blocker: {
        type: 'string',
        description: 'For a deferred entry held back for a reason other than rewording: what is missing before it can be activated. Entries classified NEEDS_REWORDING need no blocker; the shared criteria in tools/lib/model.ts cover them.',
      },
      reviewed_on: { type: 'string', pattern: '^\\d{4}-\\d{2}-\\d{2}$' },
    },
  };
}

/** JSON Schema for a benchmark case. */
export function benchmarkCaseSchema() {
  return {
    $schema: 'https://json-schema.org/draft/2020-12/schema',
    $id: 'https://github.com/ARafaykhalid/web-discoverability-skill/schema/benchmark-case.schema.json',
    title: 'Benchmark case',
    type: 'object',
    additionalProperties: false,
    required: ['id', 'fixture', 'description', 'planted_defects', 'expected_findings', 'expected_non_findings'],
    properties: {
      id: { type: 'string', minLength: 3 },
      fixture: { type: 'string', description: 'Path relative to the repository root.' },
      description: { type: 'string', minLength: 20 },
      level: { type: 'string', enum: LEVELS },
      profile_expectations: { type: 'object', description: 'Profile facts the detector must conclude for this fixture.' },
      planted_defects: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['requirement_id', 'location', 'note'],
          properties: {
            requirement_id: { type: 'string', pattern: ID_PATTERN.source },
            check_id: { type: 'string' },
            location: { type: 'string' },
            note: { type: 'string' },
          },
        },
      },
      expected_findings: {
        type: 'array',
        items: {
          type: 'object',
          additionalProperties: false,
          required: ['check_id'],
          properties: { check_id: { type: 'string' }, requirement_id: { type: 'string' }, location: { type: 'string' } },
        },
      },
      expected_non_findings: {
        type: 'array',
        description: 'Checks that must stay silent. These produce the true negatives in the false-positive rate.',
        items: {
          oneOf: [
            { type: 'string' },
            {
              type: 'object',
              additionalProperties: false,
              required: ['check_id'],
              properties: { check_id: { type: 'string' }, location: { type: 'string' }, requirement_id: { type: 'string' } },
            },
          ],
        },
      },
      expected_not_applicable: { type: 'array', items: { type: 'string', pattern: ID_PATTERN.source } },
      expected_safe_fixes: { type: 'array', items: { type: 'string', pattern: ID_PATTERN.source } },
      expected_blocked: { type: 'array', items: { type: 'string', pattern: ID_PATTERN.source } },
    },
  };
}

/* ---------------------------------------------------------------- manifest */

/** The manifest is a generated index, not a hand-maintained claim. */
export function manifest({ records, removed = [], deferred = [], checks = [] }) {
  const byDomain = {};
  for (const domain of DOMAINS) {
    const list = records.filter((r) => r.domain === domain.domain);
    byDomain[domain.domain] = {
      title: domain.title,
      activation: domain.activation,
      file: `${domain.domain}.jsonl`,
      count: list.length,
      ids: list.map((r) => r.id).sort(),
      runtime_sensitive: includesValue(RUNTIME_SENSITIVE_DOMAINS, domain.domain),
    };
  }

  const levelCounts = {};
  for (const level of LEVELS) {
    levelCounts[level] = records.filter((r) => LEVELS.slice(LEVELS.indexOf(r.minimum_level)).includes(level)).length;
  }

  return {
    schema_version: 3,
    generated_from: 'requirements/*.jsonl',
    generator: 'npm run docs -- --write',
    counts: {
      active: records.length,
      removed: removed.length,
      deferred: deferred.length,
      domains: DOMAINS.length,
      checks: checks.length,
    },
    levels: levelCounts,
    highest_id: records.length ? records.map((r) => r.id).sort().at(-1) : null,
    domains: byDomain,
  };
}

/* ------------------------------------------------------------------ markdown */

export function registryIndexMarkdown({ records, removed = [], deferred = [], checks = [] }) {
  const sorted = sortRecords(records);
  const covered = new Set(checks.flatMap((c) => c.requirements || []));

  const lines = [
    GENERATED_NOTICE,
    '',
    '# Requirement registry index',
    '',
    `${records.length} active requirements across ${DOMAINS.length} domains.`,
    `${removed.length} retired and ${deferred.length} deferred IDs are recorded in the ledgers; retired IDs are never reused.`,
    '',
    '## Deferred IDs',
    '',
    'The deferred ledger holds IDs reviewed out of the active registry and not yet specified well enough to promote.',
    'They are not a roadmap: an ID is there because it was reviewed and the review found it wanting.',
    '',
    DEFERRED_ORIGIN,
    '',
    'Re-admission requires all of:',
    '',
    DEFERRED_READMISSION_CRITERIA.split('\n').map((line) => `- ${line}`).join('\n'),
    '',
    'These criteria are stated once because they are the same for every entry classified `NEEDS_REWORDING`.',
    'An entry deferred for any other reason carries its own `blocker` instead.',
    '',
    'Columns: `Chk` marks a requirement with a deterministic check in `tools/lib/checks/`.',
    'Requirements without one are verified by the documented manual method and are counted as unchecked in `reports/metrics.json`.',
    '',
  ];

  for (const domain of DOMAINS) {
    const list = sorted.filter((r) => r.domain === domain.domain);
    if (!list.length) continue;
    lines.push(`## ${domain.title} (\`${domain.domain}\`)`);
    lines.push('');
    lines.push(`Activation: \`${domain.activation}\` · ${list.length} requirements${includesValue(RUNTIME_SENSITIVE_DOMAINS, domain.domain) ? ' · runtime-sensitive' : ''}`);
    lines.push('');
    lines.push(
      table(
        ['ID', 'Title', 'Level', 'Sev', 'Tier', 'Conf', 'Safety', 'Chk'],
        list.map((r) => [
          r.id,
          `[${inline(r.title)}](by-id/${r.id}.md)`,
          r.minimum_level,
          r.severity,
          r.evidence_tier,
          r.confidence,
          r.change_safety,
          covered.has(r.id) ? 'yes' : '-',
        ]),
      ),
    );
    lines.push('');
  }

  return `${lines.join('\n').trimEnd()}\n`;
}

/** One generated Markdown page for each active requirement. */
export function requirementMarkdown(record) {
  const canonicalRecord = Object.fromEntries(Object.entries(record).filter(([key]) => !key.startsWith('__')));
  const sources = record.sources || [];
  const surfaces = record.surfaces || [];
  const frameworks = record.frameworks || [];
  const dependencies = record.depends_on || [];
  const conflicts = record.conflicts_with || [];
  const supersedes = record.supersedes || [];
  const lines = [
    GENERATED_NOTICE,
    '',
    `# ${record.id}: ${record.title}`,
    '',
    'This page is generated from the canonical JSONL registry record. Edit the JSONL record and run `npm run docs -- --write`; do not edit this file directly.',
    '',
    '| Field | Value |',
    '| --- | --- |',
    `| Domain | ${code(record.domain)} |`,
    `| Category | ${code(record.category)} |`,
    `| Minimum level | ${code(record.minimum_level)} |`,
    `| Severity | ${code(record.severity)} |`,
    `| Impact | ${code(record.impact)} |`,
    `| Change safety | ${code(record.change_safety)} |`,
    `| Evidence tier | ${code(record.evidence_tier)} |`,
    `| Confidence | ${code(record.confidence)} |`,
    '',
    '## Statement',
    '',
    record.statement,
    '',
    '## Rationale',
    '',
    record.rationale,
    '',
    '## Applicability',
    '',
    '```json',
    JSON.stringify(record.applies_when || {}, null, 2),
    '```',
    '',
    '## Implementation',
    '',
    record.implementation,
    '',
    '## Verification',
    '',
    `- Level: ${code(record.verification?.level)}`,
    `- Method: ${record.verification?.method || 'Not specified.'}`,
    `- Evidence: ${(record.verification?.evidence || []).map(code).join(', ') || 'Not specified.'}`,
    record.verification?.automated_check ? `- Automated check: ${code(record.verification.automated_check)}` : '- Automated check: none.',
    '',
    '## Scope',
    '',
    `- Search surfaces: ${surfaces.length ? surfaces.map(code).join(', ') : 'not specified'}`,
    `- Frameworks: ${frameworks.length ? frameworks.map(code).join(', ') : 'not specified'}`,
    record.caution ? `- Caution: ${record.caution}` : '- Caution: none recorded.',
    '',
    '### Framework notes',
    '',
    '```json',
    JSON.stringify(record.framework_notes || {}, null, 2),
    '```',
    '',
    '## Review',
    '',
    `- Stability: ${code(record.review?.stability)}`,
    `- Review interval: ${record.review?.interval_days ?? 'not specified'} days`,
    `- Last verified: ${record.review?.last_verified || 'not specified'}`,
    `- Owner: ${record.review?.owner || 'not specified'}`,
    '',
    '## Relationships',
    '',
    `- Depends on: ${dependencies.length ? dependencies.map((id) => `[${id}](./${id}.md)`).join(', ') : 'none'}`,
    `- Conflicts with: ${conflicts.length ? conflicts.map((id) => `[${id}](./${id}.md)`).join(', ') : 'none'}`,
    `- Supersedes: ${supersedes.length ? supersedes.map((id) => `[${id}](./${id}.md)`).join(', ') : 'none'}`,
    '',
    '## Sources',
    '',
  ];

  if (sources.length) {
    lines.push('| Organization | Source | Tier | Checked |');
    lines.push('| --- | --- | --- | --- |');
    for (const source of sources) {
      lines.push(`| ${inline(source.organization)} | [${inline(source.title)}](${source.url}) | ${code(source.tier)} | ${inline(source.date_checked)} |`);
    }
  } else {
    lines.push('No external sources are recorded for this requirement.');
  }

  lines.push('', '## Canonical record', '', '```json', JSON.stringify(canonicalRecord, null, 2), '```', '');
  return `${lines.join('\n').trimEnd()}\n`;
}

export function vocabularyMarkdown() {
  const lines = [
    GENERATED_NOTICE,
    '',
    '# Registry vocabulary',
    '',
    'Every enum below is defined once in `tools/lib/model.ts` and enforced by `npm run validate`.',
    '',
    '## Domains',
    '',
    table(
      ['Domain', 'Title', 'Activation fact', 'Runtime-sensitive'],
      DOMAINS.map((d) => [`\`${d.domain}\``, d.title, `\`${d.activation}\``, includesValue(RUNTIME_SENSITIVE_DOMAINS, d.domain) ? 'yes' : '-']),
    ),
    '',
    'A runtime-sensitive domain describes output that a framework head-merge, an edge rewrite, or hydration can change.',
    'For those domains `verification.level: SOURCE` is a validation error: the check must inspect what is served.',
    '',
    '## Evidence tiers',
    '',
    table(['Tier', 'Meaning', 'Citation required'], EVIDENCE_TIER_VALUES.map((tier) => [tier, EVIDENCE_TIERS[tier], tier === 'INTERNAL' ? 'no' : 'yes'])),
    '',
    '## Categories',
    '',
    table(['Category', 'Experimental'], CATEGORIES.map((c) => [`\`${c}\``, includesValue(EXPERIMENTAL_CATEGORIES, c) ? 'yes' : '-'])),
    '',
    '## Change safety',
    '',
    table(['Value', 'Meaning'], CHANGE_SAFETY_VALUES.map((key) => [`\`${key}\``, CHANGE_SAFETY[key]])),
    '',
    '## Verification levels',
    '',
    table(['Level', 'Proves'], [
      ['`SOURCE`', 'The repository contains the implementation. Not evidence of served output.'],
      ['`RUNTIME`', 'The served response contains the expected result.'],
      ['`SOURCE_AND_RUNTIME`', 'Both the implementation and the served result were inspected.'],
      ['`MANUAL_EXTERNAL`', 'Requires an external platform a repository audit cannot reach. Always BLOCKED.'],
    ]),
    '',
    '## Evidence types',
    '',
    EVIDENCE_TYPES.map((t) => `- \`${t}\``).join('\n'),
    '',
    '## Review stability and intervals',
    '',
    table(['Stability', 'Re-verify after'], STABILITY_VALUES.map((s) => [`\`${s}\``, `${STABILITY[s]} days`])),
    '',
    '## Applicability and terminal statuses',
    '',
    'Applicability is decided before any change:',
    '',
    APPLICABILITY_STATUSES.map((a) => `- \`${a}\``).join('\n'),
    '',
    'A terminal status is recorded after acting:',
    '',
    TERMINAL_STATUSES.map((t) => `- \`${t}\``).join('\n'),
    '',
    '`UNCERTAIN` exists so a missing fact never becomes a silent `NOT_APPLICABLE` or a blind change.',
    '',
    '## Profile predicates',
    '',
    PROFILE_PREDICATES.map((p) => `- \`${p}\``).join('\n'),
    '',
    `Domain activation gates draw from the same set: ${ACTIVATIONS.map((a) => `\`${a}\``).join(', ')}.`,
    '',
    '## Frameworks',
    '',
    table(
      ['Framework', 'Adapter + fixture'],
      FRAMEWORKS.filter((f) => f !== 'any').map((f) => [`\`${f}\``, includesValue(FRAMEWORKS_WITH_ADAPTERS, f) ? 'yes' : 'generic guidance only']),
    ),
    '',
    '## Search surfaces',
    '',
    SURFACES.map((s) => `- \`${s}\``).join('\n'),
    '',
    'Listing a surface means "evaluate the requirement against this surface". It never means content will appear there.',
    '',
    '## Source types',
    '',
    SOURCE_TYPES.map((s) => `- \`${s}\``).join('\n'),
    '',
    '## Ledger classifications',
    '',
    CLASSIFICATIONS.map((c) => `- \`${c}\``).join('\n'),
    '',
    '## Record fields',
    '',
    table(
      ['Field', 'Required'],
      [...REQUIRED_FIELDS.map((f) => [`\`${f}\``, 'yes']), ...OPTIONAL_FIELDS.map((f) => [`\`${f}\``, 'optional'])],
    ),
    '',
    'Any other key is a validation error, which is what stops the alias fields of earlier versions from growing back.',
  ];

  return `${lines.join('\n').trimEnd()}\n`;
}

export function evidenceMarkdown({ records, sources }) {
  const tierCounts = countBy(records, (r) => r.evidence_tier);
  const confidenceCounts = countBy(records, (r) => r.confidence);
  const categoryCounts = countBy(records, (r) => r.category);

  const lines = [
    GENERATED_NOTICE,
    '',
    '# Evidence model',
    '',
    'Each requirement declares how strong the evidence behind it is, and separately how confident we are that',
    'implementing it produces the stated effect. The two are different questions: a first-party citation can still',
    'support only a low-confidence effect claim, because eligibility is not inclusion.',
    '',
    '## Tier definitions',
    '',
    table(
      ['Tier', 'Definition', 'Active requirements'],
      EVIDENCE_TIER_VALUES.map((tier) => [tier, EVIDENCE_TIERS[tier], String(tierCounts.get(tier) || 0)]),
    ),
    '',
    '## Confidence distribution',
    '',
    table(['Confidence', 'Requirements'], CONFIDENCE_LEVELS.map((c) => [c, String(confidenceCounts.get(c) || 0)])),
    '',
    '## Category distribution',
    '',
    'Categories keep established technical SEO separate from experimental GEO/LLMO in every report.',
    '',
    table(
      ['Category', 'Requirements', 'Experimental'],
      CATEGORIES.map((c) => [`\`${c}\``, String(categoryCounts.get(c) || 0), includesValue(EXPERIMENTAL_CATEGORIES, c) ? 'yes' : '-']),
    ),
    '',
    '## Language rules',
    '',
    'Requirement text and documentation may say: `may improve`, `supports`, `provides machine-readable context`,',
    '`is documented by X`, `is experimentally observed`, `is not a confirmed ranking factor`.',
    '',
    'They may not promise search position, index inclusion, AI citation, or outcomes validated only by an unobserved deployment.',
    '`npm run validate` scans registry text and `npm run docs:check` scans Markdown for those patterns.',
    '',
    '## Source manifest summary',
    '',
    table(
      ['Metric', 'Value'],
      [
        ['Citations', String(sources.total_citations)],
        ['Unique URLs', String(sources.unique_urls)],
        ['First-party (official)', String(sources.official_citations)],
        ['Third-party', String(sources.unofficial_citations)],
        ['Requirements in tiers A-D missing a citation', String(sources.requirements_missing_sources.length)],
      ],
    ),
    '',
    '### Citations by organization',
    '',
    table(
      ['Organization', 'Citations'],
      (Object.entries(sources.by_organization) as [string, number][])
        .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
        .map(([org, count]) => [org, String(count)]),
    ),
    '',
    'The full manifest, with the date each URL was last checked, is `reports/sources.json`',
    '(`npm run sources`). `npm run check-sources` performs live reachability checks and reports failures as failures.',
  ];

  return `${lines.join('\n').trimEnd()}\n`;
}

/**
 * The site types the applicability model distinguishes, each paired with the
 * benchmark case that would cover it.
 *
 * This constant is the intended coverage matrix, and it lives in code rather than
 * in prose so the gap list cannot drift. A case file appearing under
 * benchmarks/cases/ flips its row to covered on the next `npm run docs`, and a
 * case file being deleted flips it back. Rows with no case are the honest answer
 * to "which of these has scored evidence?" - not a roadmap promise, just an
 * enumeration of what is unmeasured.
 *
 * Adding a row is how you declare a gap you have decided is worth admitting.
 */
export const INTENDED_FIXTURES = [
  ['Static HTML, correct', 'clean-static', 'the control: proves the checks stay silent on a clean project'],
  ['Static HTML, defective', 'defective-static', 'page-level defects in markup, metadata, and structured data'],
  ['Crawl and sitemap misconfiguration', 'crawl-misconfig', 'clean pages, contradictory robots.txt and sitemap'],
  ['Client-rendered React SPA', 'react-spa', 'empty shell, client router, head written after load'],
  ['Vite, pre-rendered to static', 'vite-static', 'same dependencies as react-spa, complete served bytes'],
  ['Astro content collection', 'astro-content', 'content-driven build with a generated sitemap index and feed'],
  ['Ecommerce catalogue', 'ecommerce-catalog', 'product markup, faceted navigation, and catalogue pagination'],
  ['SaaS application', 'saas-app', 'authenticated routes that must stay out of the index'],
  ['Server-rendered application', 'express-ssr', 'response headers, status codes, and redirects from a real server'],
  ['Next.js App Router', 'nextjs-app-router', 'metadata API, route groups, and framework-generated files'],
  ['Editorial and news', 'news-publication', 'article markup, bylines, dates, and pagination'],
  ['User-generated content', 'news-ugc', 'submitted content, and the crawl directives it needs'],
  ['Multilingual', 'multilingual-store', 'hreflang reciprocity, x-default, and per-locale canonicals'],
];

/**
 * The benchmark cases on disk, read for their ids alone.
 *
 * `loadCases` in bench.ts does the same thing, and importing it here would pull
 * the whole check-loading and snapshot machinery into the documentation
 * generator to read a directory of JSON. Ten lines of duplication is the cheaper
 * of the two, and the coupling this avoids is the kind that makes `docs` fail
 * because a check module has a syntax error.
 */
function loadCaseFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => {
      try {
        return JSON.parse(readFileSync(join(dir, name), 'utf8'));
      } catch (error) {
        // A malformed case is a real problem, but it is `validate`'s problem, not
        // this generator's. Reported as a row rather than thrown, so one bad file
        // cannot block every other generated artefact.
        return { id: `${name} (unparseable: ${error.message})` };
      }
    });
}

/** The benchmarks/README.md coverage block. Presence of a case decides each row. */
export function fixtureCoverageMarkdown({ cases = [], benchmarks = null }: { cases?: { id: string }[]; benchmarks?: { cases?: { case_id: string; counts?: { true_positives: number; true_negatives: number } }[] } | null } = {}) {
  const byId = new Map(cases.map((entry) => [entry.id, entry]));
  const scoredById = new Map<string, { counts?: { true_positives: number; true_negatives: number } }>(
    (benchmarks?.cases || []).map((score) => [score.case_id, score]),
  );

  const rows = INTENDED_FIXTURES.map(([label, caseId, why]) => {
    const benchCase = byId.get(caseId);
    if (!benchCase) return [label, 'no fixture', `\`${caseId}\``, why];
    const score = scoredById.get(caseId);
    const counts = score?.counts;
    const detail = counts
      ? `${counts.true_positives} found / ${counts.true_negatives} silent`
      : 'not yet scored';
    return [label, `covered — ${detail}`, `\`${caseId}\``, why];
  });

  const covered = rows.filter((row) => row[1] !== 'no fixture').length;
  const extra = cases
    .map((entry) => entry.id)
    .filter((id) => !INTENDED_FIXTURES.some(([, caseId]) => caseId === id));

  const lines = [
    '<!-- Generated by `npm run docs -- --write`. Rows come from benchmarks/cases/ and the last benchmark run. -->',
    '',
    `${covered} of ${INTENDED_FIXTURES.length} intended fixtures have a scored case.`,
    '',
    table(['Site type', 'Status', 'Case id', 'What it is for'], rows),
    '',
    'A row reading "no fixture" means the requirements for that site type exist and',
    'carry sources and verification methods, but no benchmark measures whether their',
    'applicability logic behaves on a realistic project of that shape.',
  ];

  if (extra.length) {
    lines.push('', `Cases not in the intended matrix: ${extra.map((id) => `\`${id}\``).join(', ')}.`);
  }

  return lines.join('\n');
}

/** The README metrics block. Numbers are injected, never typed. */
export function metricsBlockMarkdown({ metrics, benchmarks }) {
  const rows = [
    ['Active requirements', String(metrics.requirements_total)],
    ['Distinct titles', String(metrics.requirements_unique)],
    ['With a citation', String(metrics.requirements_with_sources)],
    ['With a verification method', String(metrics.requirements_with_verification)],
    ['With a deterministic check', `${metrics.requirements_with_tests} (${Math.round(metrics.check_coverage_ratio * 100)}%)`],
    ['With a confidence rating', String(metrics.requirements_with_confidence)],
    ['Duplicate titles', String(metrics.duplicate_count)],
    ['Near-duplicate title pairs', String(metrics.near_duplicate_count)],
    ['Broken dependencies', String(metrics.broken_dependency_count)],
    ['Circular dependencies', String(metrics.circular_dependency_count)],
    ['Retired IDs (never reused)', String(metrics.requirements_removed)],
    ['Deferred IDs', String(metrics.requirements_deferred)],
    ['Deterministic checks', String(metrics.checks_defined)],
  ];

  // Every key below is one `aggregate()` in bench.ts actually emits: the case
  // totals are `case_count` and `cases_passed`, while `cases` is the per-case
  // array that only `runBenchmarks` returns, so reading it here reported a total
  // the aggregate never had. A figure the run did not produce reads "not
  // measured"; nothing here defaults to a flattering number.
  const present = (value) => value !== null && value !== undefined;
  const rate = (value) => (present(value) ? String(value) : 'not measured');
  const benchRows = benchmarks
    ? [
        [
          'Benchmark cases',
          present(benchmarks.case_count) && present(benchmarks.cases_passed)
            ? `${benchmarks.cases_passed}/${benchmarks.case_count} passing`
            : 'not measured',
        ],
        ['Precision', rate(benchmarks.precision)],
        ['Recall', rate(benchmarks.recall)],
        ['False-positive rate', rate(benchmarks.false_positive_rate)],
        ['False-negative rate', rate(benchmarks.false_negative_rate)],
        ['Verification accuracy', rate(benchmarks.verification_accuracy)],
      ]
    : [];

  const lines = [
    '<!-- All numbers below are generated by `npm run docs -- --write` from the registry and the last benchmark run. -->',
    '',
    table(['Registry', 'Value'], rows),
  ];

  if (benchRows.length) {
    lines.push('', table(['Benchmark (fixtures, checked subset only)', 'Value'], benchRows));
    lines.push(
      '',
      'Benchmarks measure the checked subset of the registry against fixture projects with planted defects.',
      'They do not measure search rankings or AI answer inclusion, and are not evidence of either. See [BENCHMARKS.md](BENCHMARKS.md).',
    );
  } else {
    lines.push('', 'Benchmark figures are absent because no benchmark run has been recorded. Run `npm run bench`.');
  }

  return lines.join('\n');
}

/* ------------------------------------------------------- block replacement */

const BLOCK_START = (marker) => `<!-- GENERATED:${marker} -->`;
const BLOCK_END = (marker) => `<!-- /GENERATED:${marker} -->`;

/** Replace the content between GENERATED markers. Missing markers are an error. */
export function applyBlock(text, marker, content) {
  const start = BLOCK_START(marker);
  const end = BLOCK_END(marker);
  const startIndex = text.indexOf(start);
  const endIndex = text.indexOf(end);
  if (startIndex === -1 || endIndex === -1 || endIndex < startIndex) {
    throw new Error(`missing GENERATED:${marker} markers`);
  }
  return `${text.slice(0, startIndex + start.length)}\n${content.trim()}\n${text.slice(endIndex)}`;
}

export function hasBlock(text, marker) {
  return text.includes(BLOCK_START(marker)) && text.includes(BLOCK_END(marker));
}

/**
 * Build every generated artifact.
 *
 * Returns whole files plus in-place blocks, each as a path/content pair so the
 * CLI can either write them or diff them without duplicating the generation
 * logic between --write and --check.
 */
/**
 * An in-place generated block.
 *
 * `missing` means the target file or its GENERATED markers were absent, so there
 * is nothing to diff; `updated` is the content with the block replaced. Exactly one
 * of the two is present, which is why this is a union rather than one shape with
 * two optional fields - `original` is read on the happy path and `missing` on the
 * other, and reading the wrong one is a silent no-op rather than an error.
 */
export type DocsBlock =
  | { path: string; marker: string; content: string; missing: string }
  | { path: string; marker: string; content: string; original: string; updated: string };

export function generateArtifacts({ records, removed = [], deferred = [], checks = [], metrics, sources, benchmarks = null, root = ROOT }) {
  const files = [
    { path: 'requirements/manifest.json', content: `${JSON.stringify(manifest({ records, removed, deferred, checks }), null, 2)}\n` },
    { path: 'requirements/registry.md', content: registryIndexMarkdown({ records, removed, deferred, checks }) },
    { path: 'references/vocabulary.md', content: vocabularyMarkdown() },
    { path: 'EVIDENCE.md', content: evidenceMarkdown({ records, sources }) },
    { path: 'schema/requirement.schema.json', content: `${JSON.stringify(requirementSchema(), null, 2)}\n` },
    { path: 'schema/ledger.schema.json', content: `${JSON.stringify(ledgerSchema(), null, 2)}\n` },
    { path: 'schema/benchmark-case.schema.json', content: `${JSON.stringify(benchmarkCaseSchema(), null, 2)}\n` },
    ...sortRecords(records).map((record) => ({
      path: `requirements/by-id/${record.id}.md`,
      content: requirementMarkdown(record),
    })),
  ];

  // Cases are read here rather than threaded in from the caller. The coverage
  // table is a function of what is on disk in benchmarks/cases/, so a caller that
  // forgot to pass them would silently generate a table claiming no fixtures
  // exist - and `docs --check` would then demand that wrong table be committed.
  const blocks: { path: string; marker: string; content: string }[] = [
    { path: 'README.md', marker: 'metrics', content: metricsBlockMarkdown({ metrics, benchmarks }) },
    {
      path: 'benchmarks/README.md',
      marker: 'coverage',
      content: fixtureCoverageMarkdown({ cases: loadCaseFiles(join(root, 'benchmarks', 'cases')), benchmarks }),
    },
  ];

  const resolved = blocks.map((block): DocsBlock => {
    const path = join(root, block.path);
    if (!existsSync(path)) {
      return { ...block, missing: `${block.path} does not exist` };
    }
    const original = readFileSync(path, 'utf8');
    if (!hasBlock(original, block.marker)) {
      return { ...block, original, missing: `${block.path} has no GENERATED:${block.marker} markers` };
    }
    return { ...block, original, updated: applyBlock(original, block.marker, block.content) };
  });

  return { files, blocks: resolved };
}
