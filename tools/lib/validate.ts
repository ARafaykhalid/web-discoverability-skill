import {
  DOMAIN_SLUGS,
  LEVELS,
  SEVERITIES,
  EVIDENCE_TIER_VALUES,
  TIERS_REQUIRING_SOURCES,
  CONFIDENCE_LEVELS,
  CATEGORIES,
  EXPERIMENTAL_CATEGORIES,
  CHANGE_SAFETY_VALUES,
  IMPACT_LEVELS,
  VERIFICATION_LEVELS,
  EVIDENCE_TYPES,
  SURFACES,
  SOURCE_TYPES,
  STABILITY,
  STABILITY_VALUES,
  FRAMEWORKS,
  PROFILE_PREDICATES,
  REQUIRED_FIELDS,
  OPTIONAL_FIELDS,
  ID_PATTERN,
  CLASSIFICATIONS,
  RUNTIME_SENSITIVE_DOMAINS,
  includesValue,
  FORBIDDEN_CLAIM_PATTERNS,
} from './model.ts';
import { normalizeText, tokenSimilarity, isSubsumed } from './registry.ts';
import type { LedgerRecord, Requirement } from './model.ts';
import type { CheckList } from './checks/index.ts';

/**
 * Jaccard title similarity at or above this is treated as a near-duplicate.
 * The predecessor used SequenceMatcher >= 0.965, which never fired on any of the
 * 640 records; tests/regression/near-duplicate-threshold.test.ts pins that.
 */
export const DUPLICATE_THRESHOLD = 0.6;

const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'do', 'for', 'from', 'in', 'is',
  'it', 'not', 'of', 'on', 'or', 'that', 'the', 'to', 'when', 'with', 'without',
  'use', 'using', 'ensure', 'provide', 'keep', 'make', 'set',
]);

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;
const MIN_STATEMENT_CHARS = 40;
const MIN_IMPLEMENTATION_CHARS = 60;
const MIN_METHOD_CHARS = 40;

/**
 * Fields whose text must be requirement-specific, never a per-domain template.
 *
 * Typed, because the list is spread into further scans alongside bare
 * `['name', getter]` pairs; untyped, TypeScript reads the union of those two
 * shapes as `string | (r) => string` and every `get(record)` becomes a type
 * error, which is what it did before this annotation existed.
 */
const SPECIFIC_TEXT_FIELDS: [string, (r: Requirement) => unknown][] = [
  ['statement', (r) => r.statement],
  ['rationale', (r) => r.rationale],
  ['implementation', (r) => r.implementation],
  ['verification.method', (r) => r.verification?.method],
];

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

interface Diagnostic {
  level: 'error' | 'warning';
  rule: string;
  message: string;
  id: string | null;
  file: string | null;
  line: number | null;
}

class Diagnostics {
  entries: Diagnostic[] = [];

  add(level, rule, message, record) {
    this.entries.push({
      level,
      rule,
      message,
      id: record?.id ?? null,
      file: record?.__file ?? null,
      line: record?.__line ?? null,
    });
  }

  error(rule, message, record) {
    this.add('error', rule, message, record);
  }

  warn(rule, message, record) {
    this.add('warning', rule, message, record);
  }

  get errors() {
    return this.entries.filter((e) => e.level === 'error');
  }

  get warnings() {
    return this.entries.filter((e) => e.level === 'warning');
  }
}

function isNonEmptyString(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

function isStringArray(value) {
  return Array.isArray(value) && value.every((v) => typeof v === 'string');
}

function enumRule(diag, record, field, value, allowed) {
  if (!allowed.includes(value)) {
    diag.error(`enum-${field}`, `${field} must be one of ${allowed.join(', ')} (got ${JSON.stringify(value)})`, record);
    return false;
  }
  return true;
}

/**
 * Count the clauses a title names. A title that names three or more separate
 * controls cannot be verified as one requirement, so the validator rejects it.
 * "a, b, and c" -> 3; "mobile and desktop" -> 2; a plain phrase -> 1.
 */
export function countControls(title) {
  const text = String(title ?? '').trim();
  if (!text) return 0;
  return text
    .split(/,|\band\b/i)
    .map((part) => part.trim())
    .filter(Boolean).length;
}

/**
 * Prohibitions and disclaimers are the language this project wants.
 * "Adding llms.txt does not guarantee AI visibility" and "Do not guarantee
 * rankings" must both be allowed, while "This guarantees rankings" must not be.
 * The forbidden patterns describe *assertions*, so a marker of negation,
 * prohibition, or quotation in the same clause clears the match.
 */
const CLAIM_DISCLAIMER =
  /\b(no|not|never|cannot|can'?t|don'?t|doesn'?t|won'?t|without|avoid|avoids|forbid|forbidden|forbids|prohibit|prohibited|reject|rejects|refrain|nothing|neither|nor|rather\s+than|instead\s+of|claim|claims|claiming|claimed|imply|implies|implying|say|says|saying|assert|asserts|asserting|language|wording|superlative)\b/i;

const CLAUSE_BOUNDARY = /[.;:!?,()\n—–]/;

/**
 * Find unqualified outcome claims in a piece of text.
 *
 * `context` narrows the reported span to the clause the match sits in, so a
 * failure message points at the actual assertion rather than a whole paragraph.
 *
 * Every occurrence is judged on its own clause, not just the first. Scanning
 * once per pattern let a field disclaim a phrase and then assert it: "Nothing
 * here guarantees rankings. This guarantees rankings." reported nothing, because
 * the first match cleared and the second was never examined. Each pattern is
 * cloned with the global flag so `lastIndex` is local to this call - advancing a
 * shared regex would make results depend on who scanned last.
 */
export function findForbiddenClaims(text) {
  const value = String(text ?? '');
  const hits = [];
  for (const [pattern, why] of FORBIDDEN_CLAIM_PATTERNS) {
    const scanner = new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`);
    let match = scanner.exec(value);
    while (match) {
      // A zero-length match would never advance lastIndex on its own.
      if (match[0] === '') {
        scanner.lastIndex += 1;
        match = scanner.exec(value);
        continue;
      }

      let clauseStart = 0;
      for (let i = match.index - 1; i >= 0; i -= 1) {
        if (CLAUSE_BOUNDARY.test(value[i])) {
          clauseStart = i + 1;
          break;
        }
      }
      const prefix = value.slice(clauseStart, match.index);
      if (!CLAIM_DISCLAIMER.test(prefix)) {
        hits.push({ match: match[0], why, clause: value.slice(clauseStart, match.index + match[0].length).trim() });
      }
      match = scanner.exec(value);
    }
  }
  return hits;
}

/** Depth-first cycle search over depends_on. Returns each cycle as an id path. */
export function findDependencyCycles(records: Requirement[]) {
  const graph = new Map<string, string[]>(
    records.map((r) => [r.id, (r.depends_on ?? []).filter((d): d is string => typeof d === 'string')]),
  );
  const state = new Map();
  const cycles = [];
  const stack = [];

  const visit = (id) => {
    if (state.get(id) === 'done') return;
    if (state.get(id) === 'open') {
      const start = stack.indexOf(id);
      cycles.push([...stack.slice(start), id]);
      return;
    }
    state.set(id, 'open');
    stack.push(id);
    for (const next of graph.get(id) || []) {
      if (graph.has(next)) visit(next);
    }
    stack.pop();
    state.set(id, 'done');
  };

  for (const id of graph.keys()) visit(id);

  // De-duplicate rotations of the same cycle.
  const seen = new Set();
  return cycles.filter((cycle) => {
    const key = [...cycle].slice(0, -1).sort().join('>');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function validateSources(diag, record) {
  const tier = record.evidence_tier;
  const sources = record.sources;

  if (TIERS_REQUIRING_SOURCES.includes(tier)) {
    if (!Array.isArray(sources) || sources.length === 0) {
      diag.error('sources-required', `evidence_tier ${tier} makes an external claim and must cite at least one source`, record);
      return;
    }
  } else if (Array.isArray(sources) && sources.length > 0) {
    diag.warn('sources-internal', 'evidence_tier INTERNAL asserts no external behaviour; sources are unexpected', record);
  }

  for (const [index, source] of (sources || []).entries()) {
    const at = `sources[${index}]`;
    if (!source || typeof source !== 'object') {
      diag.error('source-shape', `${at} must be an object`, record);
      continue;
    }
    if (!isNonEmptyString(source.url) || !/^https:\/\//.test(source.url)) {
      diag.error('source-url', `${at}.url must be an https URL`, record);
    }
    for (const field of ['organization', 'title']) {
      if (!isNonEmptyString(source[field])) diag.error('source-field', `${at}.${field} is required`, record);
    }
    if (!SOURCE_TYPES.includes(source.type)) {
      diag.error('source-type', `${at}.type must be one of ${SOURCE_TYPES.join(', ')}`, record);
    }
    if (typeof source.official !== 'boolean') {
      diag.error('source-official', `${at}.official must be a boolean`, record);
    }
    if (!ISO_DATE.test(String(source.date_checked))) {
      diag.error('source-date', `${at}.date_checked must be YYYY-MM-DD`, record);
    }
    if (!EVIDENCE_TIER_VALUES.includes(source.tier)) {
      diag.error('source-tier', `${at}.tier must be one of ${EVIDENCE_TIER_VALUES.join(', ')}`, record);
    }
    if (source.official === false && source.type === 'PLATFORM_DOCUMENTATION') {
      diag.error('source-official-consistency', `${at} is PLATFORM_DOCUMENTATION but official is false`, record);
    }
  }

  // The record's tier must be supported by at least one source of that tier.
  if (TIERS_REQUIRING_SOURCES.includes(tier) && Array.isArray(sources) && sources.length) {
    const tiers = sources.map((s) => s?.tier).filter(Boolean);
    if (tiers.length && !tiers.includes(tier)) {
      diag.error(
        'source-tier-support',
        `evidence_tier ${tier} is not supported by any cited source (source tiers: ${tiers.join(', ')})`,
        record,
      );
    }
  }
}

function validateVerification(diag, record, checkIds) {
  const v = record.verification;
  if (!v || typeof v !== 'object' || Array.isArray(v)) {
    diag.error('verification-shape', 'verification must be an object', record);
    return;
  }

  enumRule(diag, record, 'verification.level', v.level, VERIFICATION_LEVELS);

  if (!isNonEmptyString(v.method) || v.method.trim().length < MIN_METHOD_CHARS) {
    diag.error(
      'verification-method',
      `verification.method must describe an observation of at least ${MIN_METHOD_CHARS} characters`,
      record,
    );
  }

  if (!isStringArray(v.evidence) || v.evidence.length === 0) {
    diag.error('verification-evidence', 'verification.evidence must be a non-empty array of evidence types', record);
  } else {
    for (const type of v.evidence) {
      if (!EVIDENCE_TYPES.includes(type)) {
        diag.error('verification-evidence-type', `unknown evidence type ${JSON.stringify(type)}`, record);
      }
    }
    if (v.evidence.length === EVIDENCE_TYPES.length) {
      diag.error(
        'verification-evidence-blanket',
        'verification.evidence lists every evidence type, which carries no information',
        record,
      );
    }
  }

  if (v.automated_check !== null && v.automated_check !== undefined) {
    if (!isNonEmptyString(v.automated_check)) {
      diag.error('verification-check', 'verification.automated_check must be a check id or null', record);
    } else if (checkIds && !checkIds.has(v.automated_check)) {
      diag.error('verification-check-missing', `automated_check ${v.automated_check} is not a registered check`, record);
    }
  }

  // Brief section 12: a source file is not evidence when a runtime layer can override it.
  if (v.level === 'SOURCE' && RUNTIME_SENSITIVE_DOMAINS.includes(record.domain)) {
    diag.error(
      'verification-source-insufficient',
      `domain ${record.domain} describes served output; verification.level SOURCE is insufficient (use RUNTIME or SOURCE_AND_RUNTIME)`,
      record,
    );
  }

  if (v.level === 'MANUAL_EXTERNAL' && record.change_safety !== 'BLOCKED') {
    diag.error(
      'manual-external-blocked',
      'verification.level MANUAL_EXTERNAL requires change_safety BLOCKED (it cannot be implemented from the repository)',
      record,
    );
  }

  if (record.change_safety === 'BLOCKED' && isStringArray(v.evidence)) {
    const external = v.evidence.some((e) => ['EXTERNAL_PLATFORM', 'MANUAL_ACTION'].includes(e));
    if (!external) {
      diag.warn(
        'blocked-evidence',
        'change_safety BLOCKED usually needs EXTERNAL_PLATFORM or MANUAL_ACTION evidence',
        record,
      );
    }
  }
}

function validateReview(diag, record, today) {
  const review = record.review;
  if (!review || typeof review !== 'object' || Array.isArray(review)) {
    diag.error('review-shape', 'review must be an object', record);
    return;
  }
  if (!enumRule(diag, record, 'review.stability', review.stability, STABILITY_VALUES)) return;

  const expected = STABILITY[review.stability];
  if (review.interval_days !== expected) {
    diag.error(
      'review-interval',
      `review.interval_days must be ${expected} for stability ${review.stability} (got ${JSON.stringify(review.interval_days)})`,
      record,
    );
  }
  if (!ISO_DATE.test(String(review.last_verified))) {
    diag.error('review-last-verified', 'review.last_verified must be YYYY-MM-DD', record);
  } else if (review.last_verified > today) {
    diag.error('review-future', `review.last_verified ${review.last_verified} is in the future`, record);
  }
  if (!isNonEmptyString(review.owner)) {
    diag.error('review-owner', 'review.owner is required', record);
  }
}

function validateAppliesWhen(diag, record) {
  const clause = record.applies_when;
  if (!clause || typeof clause !== 'object' || Array.isArray(clause)) {
    diag.error('applies-when-shape', 'applies_when must be an object with optional all/any/none arrays', record);
    return;
  }
  const allowedKeys = ['all', 'any', 'none'];
  for (const key of Object.keys(clause)) {
    if (!allowedKeys.includes(key)) {
      diag.error('applies-when-key', `applies_when.${key} is not a valid clause (use all/any/none)`, record);
    }
  }
  for (const key of allowedKeys) {
    const list = clause[key];
    if (list === undefined) continue;
    if (!isStringArray(list)) {
      diag.error('applies-when-list', `applies_when.${key} must be an array of profile predicates`, record);
      continue;
    }
    for (const predicate of list) {
      if (!includesValue(PROFILE_PREDICATES, predicate)) {
        diag.error('applies-when-predicate', `unknown profile predicate ${JSON.stringify(predicate)} in applies_when.${key}`, record);
      }
    }
    const duplicates = list.filter((p, i) => list.indexOf(p) !== i);
    if (duplicates.length) {
      diag.error('applies-when-duplicate', `applies_when.${key} repeats ${duplicates.join(', ')}`, record);
    }
  }
  const all = new Set(clause.all || []);
  for (const predicate of clause.none || []) {
    if (all.has(predicate)) {
      diag.error('applies-when-contradiction', `applies_when requires and forbids ${predicate}`, record);
    }
  }
}

function validateRecordShape(diag, record, checkIds, today) {
  for (const field of REQUIRED_FIELDS) {
    const value = record[field];
    const missing =
      value === undefined ||
      value === null ||
      (typeof value === 'string' && !value.trim()) ||
      (Array.isArray(value) && value.length === 0);
    if (missing) diag.error('required-field', `missing required field: ${field}`, record);
  }

  const known = new Set([...REQUIRED_FIELDS, ...OPTIONAL_FIELDS, '__file', '__line']);
  for (const field of Object.keys(record)) {
    if (!known.has(field)) {
      diag.error('unknown-field', `unknown field ${field} (alias and legacy fields are not permitted)`, record);
    }
  }
  if ('levels' in record) {
    diag.error('derived-field', 'levels is derived from minimum_level and must not be stored', record);
  }

  if (!ID_PATTERN.test(String(record.id))) {
    diag.error('id-pattern', `id must match ${ID_PATTERN} (got ${JSON.stringify(record.id)})`, record);
  }

  enumRule(diag, record, 'domain', record.domain, DOMAIN_SLUGS);
  enumRule(diag, record, 'category', record.category, CATEGORIES);
  enumRule(diag, record, 'minimum_level', record.minimum_level, LEVELS);
  enumRule(diag, record, 'severity', record.severity, SEVERITIES);
  enumRule(diag, record, 'impact', record.impact, IMPACT_LEVELS);
  enumRule(diag, record, 'change_safety', record.change_safety, CHANGE_SAFETY_VALUES);
  enumRule(diag, record, 'evidence_tier', record.evidence_tier, EVIDENCE_TIER_VALUES);
  enumRule(diag, record, 'confidence', record.confidence, CONFIDENCE_LEVELS);

  if (record.__file && record.__file !== `${record.domain}.jsonl`) {
    diag.error('domain-file-mismatch', `record lives in ${record.__file} but declares domain ${record.domain}`, record);
  }

  if (isNonEmptyString(record.statement) && record.statement.trim().length < MIN_STATEMENT_CHARS) {
    diag.error('statement-length', `statement must be at least ${MIN_STATEMENT_CHARS} characters and state a testable condition`, record);
  }
  if (isNonEmptyString(record.implementation) && record.implementation.trim().length < MIN_IMPLEMENTATION_CHARS) {
    diag.error('implementation-length', `implementation must be at least ${MIN_IMPLEMENTATION_CHARS} characters of concrete guidance`, record);
  }

  if (isNonEmptyString(record.title)) {
    if (countControls(record.title) > 2) {
      diag.error(
        'title-compound',
        `title bundles multiple controls and cannot be independently verified: ${JSON.stringify(record.title)}`,
        record,
      );
    }
    if (/^(measure|monitor|track|audit|align|consider|understand|plan)\b/i.test(record.title.trim())) {
      diag.error(
        'title-not-actionable',
        `title starts with a process verb; state the control that can be verified instead: ${JSON.stringify(record.title)}`,
        record,
      );
    }
  }

  // The statement must not be the title wearing a template.
  if (isNonEmptyString(record.statement) && isNonEmptyString(record.title)) {
    const statement = normalizeText(record.statement);
    const title = normalizeText(record.title);
    if (statement === title) {
      diag.error('statement-restates-title', 'statement repeats the title verbatim instead of stating a testable condition', record);
    }
    if (/^(verify|check|confirm) (the )?(concrete|independently testable)/i.test(record.statement.trim())) {
      diag.error('statement-templated', 'statement uses the legacy template wrapper instead of a condition', record);
    }
  }

  validateAppliesWhen(diag, record);
  validateVerification(diag, record, checkIds);
  validateReview(diag, record, today);
  validateSources(diag, record);

  if (record.surfaces !== undefined) {
    if (!isStringArray(record.surfaces)) {
      diag.error('surfaces-shape', 'surfaces must be an array of surface identifiers', record);
    } else {
      for (const surface of record.surfaces) {
        if (!SURFACES.includes(surface)) diag.error('surfaces-value', `unknown surface ${JSON.stringify(surface)}`, record);
      }
    }
  }
  if (record.frameworks !== undefined) {
    if (!isStringArray(record.frameworks)) {
      diag.error('frameworks-shape', 'frameworks must be an array of framework identifiers', record);
    } else {
      for (const framework of record.frameworks) {
        if (!FRAMEWORKS.includes(framework)) diag.error('frameworks-value', `unknown framework ${JSON.stringify(framework)}`, record);
      }
    }
  }

  // Safety invariants.
  if (record.impact === 'HIGH' && record.change_safety === 'SAFE_AUTOMATIC') {
    diag.error(
      'impact-safety',
      'impact HIGH must not be SAFE_AUTOMATIC; a high-blast-radius change requires review',
      record,
    );
  }
  if (EXPERIMENTAL_CATEGORIES.includes(record.category)) {
    if (!['C', 'D'].includes(record.evidence_tier)) {
      diag.error('experimental-tier', `category ${record.category} is experimental and must be evidence_tier C or D`, record);
    }
    if (record.confidence === 'HIGH') {
      diag.error('experimental-confidence', `category ${record.category} must not claim HIGH confidence`, record);
    }
    if (record.change_safety === 'SAFE_AUTOMATIC' && record.impact !== 'LOW') {
      diag.error('experimental-safety', 'experimental requirements may only be SAFE_AUTOMATIC at LOW impact', record);
    }
  }
  if (record.evidence_tier === 'D') {
    if (!isNonEmptyString(record.caution)) {
      diag.error('tier-d-caution', 'evidence_tier D requires a caution field stating what is unproven', record);
    }
    if (record.confidence === 'HIGH') {
      diag.error('tier-d-confidence', 'evidence_tier D cannot support HIGH confidence', record);
    }
  }

  // Forbidden claim language.
  const scanned: [string, (r: Requirement) => unknown][] = [
    ...SPECIFIC_TEXT_FIELDS,
    ['caution', (r) => r.caution],
    ['title', (r) => r.title],
  ];
  for (const [field, get] of scanned) {
    for (const hit of findForbiddenClaims(get(record))) {
      diag.error('claim-language', `${field} contains "${hit.match}": ${hit.why}`, record);
    }
  }
}

function validateCorpus(diag, records) {
  // Identifier uniqueness.
  const byId = new Map();
  for (const record of records) {
    if (byId.has(record.id)) {
      diag.error('id-duplicate', `duplicate id, also defined in ${byId.get(record.id).__file}:${byId.get(record.id).__line}`, record);
    } else {
      byId.set(record.id, record);
    }
  }

  // Title uniqueness, exact then normalized then near.
  const titles = new Map();
  const normalized = new Map();
  for (const record of records) {
    if (!isNonEmptyString(record.title)) continue;
    if (titles.has(record.title)) {
      diag.error('title-duplicate', `duplicate title, also on ${titles.get(record.title)}`, record);
    } else {
      titles.set(record.title, record.id);
    }
    const key = normalizeText(record.title);
    if (normalized.has(key)) {
      diag.error('title-duplicate-normalized', `title is a rewording of ${normalized.get(key)}`, record);
    } else {
      normalized.set(key, record.id);
    }
  }

  for (let i = 0; i < records.length; i += 1) {
    for (let j = i + 1; j < records.length; j += 1) {
      const a = records[i];
      const b = records[j];
      if (!isNonEmptyString(a.title) || !isNonEmptyString(b.title)) continue;
      const similarity = tokenSimilarity(a.title, b.title);
      if (similarity >= DUPLICATE_THRESHOLD) {
        diag.error(
          'title-near-duplicate',
          `title is ${similarity.toFixed(2)} similar to ${b.id} (${JSON.stringify(b.title)}); merge or differentiate`,
          a,
        );
      } else if (isSubsumed(a.title, b.title, STOPWORDS)) {
        diag.error('title-subsumed', `title is fully contained in ${b.id} (${JSON.stringify(b.title)})`, a);
      } else if (isSubsumed(b.title, a.title, STOPWORDS)) {
        diag.error('title-subsumed', `title is fully contained in ${a.id} (${JSON.stringify(a.title)})`, b);
      }
    }
  }

  // No field may become a per-domain template again.
  for (const [field, get] of SPECIFIC_TEXT_FIELDS) {
    const groups = new Map();
    for (const record of records) {
      const value = get(record);
      if (!isNonEmptyString(value)) continue;
      const key = normalizeText(value);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(record);
    }
    for (const [, group] of groups) {
      if (group.length < 2) continue;
      const ids = group.map((r) => r.id).join(', ');
      for (const record of group) {
        diag.error('field-shared-text', `${field} is identical across ${group.length} records (${ids})`, record);
      }
    }
  }

  // Dependencies and conflicts.
  for (const record of records) {
    for (const [field, values] of [
      ['depends_on', record.depends_on],
      ['conflicts_with', record.conflicts_with],
      ['supersedes', record.supersedes],
    ]) {
      if (values === undefined) continue;
      if (!isStringArray(values)) {
        diag.error(`${field}-shape`, `${field} must be an array of requirement ids`, record);
        continue;
      }
      for (const target of values) {
        if (target === record.id) {
          diag.error(`${field}-self`, `${field} references itself`, record);
        } else if (field !== 'supersedes' && !byId.has(target)) {
          diag.error(`${field}-missing`, `${field} references unknown requirement ${target}`, record);
        }
      }
    }
  }

  for (const cycle of findDependencyCycles(records)) {
    const record = byId.get(cycle[0]);
    diag.error('dependency-cycle', `circular dependency: ${cycle.join(' -> ')}`, record);
  }

  // Conflicts must be declared on both sides so neither ordering hides them.
  for (const record of records) {
    for (const target of record.conflicts_with || []) {
      const other = byId.get(target);
      if (other && !(other.conflicts_with || []).includes(record.id)) {
        diag.error('conflict-not-reciprocal', `${target} does not declare the conflict with ${record.id}`, record);
      }
    }
  }

  return byId;
}

function validateLedgers(diag, { records, removed, deferred }) {
  const active = new Set(records.map((r) => r.id));
  const seen = new Map();

  for (const [name, entries] of [
    ['removed', removed || []],
    ['deferred', deferred || []],
  ]) {
    for (const entry of entries) {
      const context = { id: entry.id, __file: `${name}.jsonl`, __line: entry.__line };
      if (!ID_PATTERN.test(String(entry.id))) {
        diag.error('ledger-id', `${name}.jsonl id must match ${ID_PATTERN}`, context);
      }
      if (!isNonEmptyString(entry.title)) {
        diag.error('ledger-title', `${name}.jsonl entry needs the original title`, context);
      }
      if (!CLASSIFICATIONS.includes(entry.classification)) {
        diag.error('ledger-classification', `${name}.jsonl classification must be one of ${CLASSIFICATIONS.join(', ')}`, context);
      }
      // A retired id has to say what replaced it or why nothing did. A deferred id
      // held back only for rewording is covered by the criteria published once in
      // DEFERRED_READMISSION_CRITERIA; anything else is held back for its own
      // reason and has to say it.
      const stated = entry.reason ?? entry.blocker;
      if (!isNonEmptyString(stated) && !(name === 'deferred' && entry.classification === 'NEEDS_REWORDING')) {
        diag.error(
          'ledger-reason',
          name === 'deferred'
            ? `deferred.jsonl entry ${entry.id} is classified ${entry.classification}, which the shared re-admission criteria do not cover, so it needs a blocker`
            : `removed.jsonl entry needs a reason`,
          context,
        );
      }
      if (active.has(entry.id)) {
        diag.error('ledger-id-active', `id ${entry.id} is in ${name}.jsonl but also active in the registry`, context);
      }
      if (seen.has(entry.id)) {
        diag.error('ledger-id-reused', `id ${entry.id} appears in both ${seen.get(entry.id)}.jsonl and ${name}.jsonl`, context);
      } else {
        seen.set(entry.id, name);
      }
      if (entry.replaced_by !== undefined) {
        const targets = Array.isArray(entry.replaced_by) ? entry.replaced_by : [entry.replaced_by];
        for (const target of targets) {
          if (!active.has(target)) {
            diag.error('ledger-replacement', `replaced_by references ${target}, which is not an active requirement`, context);
          }
        }
      }
    }
  }
}

/**
 * Every allocated id must be accounted for exactly once.
 *
 * A registry that advertises a count is only trustworthy if the ids it does not
 * ship are explained rather than dropped. Once either ledger is populated, this
 * requires that every id from SEO-001 up to the highest allocated id appears in
 * exactly one of: the active registry, removed.jsonl, or deferred.jsonl. Ids
 * appearing in two populations are already caught by ledger-id-active and
 * ledger-id-reused, so only gaps are reported here.
 *
 * The span is derived from the data rather than hard-coded, so allocating
 * SEO-641 and beyond extends the contract automatically.
 */
function validateIdSpace(diag, { records, removed, deferred }) {
  const entries = [...(removed || []), ...(deferred || [])];
  if (!entries.length) return;

  const numberOf = (id) => Number(String(id).slice(4));
  const allocated = new Set();
  for (const id of [...records.map((r) => r.id), ...entries.map((e) => e.id)]) {
    if (ID_PATTERN.test(String(id))) allocated.add(numberOf(id));
  }
  if (!allocated.size) return;

  const highest = Math.max(...[...allocated].map(Number));
  const gaps: number[] = [];
  for (let n = 1; n <= highest; n += 1) if (!allocated.has(n)) gaps.push(n);
  if (!gaps.length) return;

  // Collapse runs so the message stays readable when a whole block is missing.
  const ranges = [];
  for (const n of gaps) {
    const last = ranges[ranges.length - 1];
    if (last && last[1] === n - 1) last[1] = n;
    else ranges.push([n, n]);
  }
  const pad = (n) => `SEO-${String(n).padStart(3, '0')}`;
  const shown = ranges.slice(0, 12).map(([a, b]) => (a === b ? pad(a) : `${pad(a)}-${pad(b)}`));
  const suffix = ranges.length > shown.length ? ` and ${ranges.length - shown.length} more ranges` : '';
  diag.error(
    'id-space-gap',
    `${gaps.length} allocated ids below ${pad(highest)} are in neither the registry nor a ledger: `
      + `${shown.join(', ')}${suffix}`,
    null,
  );
}

function validateChecks(diag, records, checks) {
  if (!checks) return;
  const byId = new Map(records.map((r) => [r.id, r]));
  for (const check of checks) {
    if (!isNonEmptyString(check.id)) {
      diag.error('check-id', 'every check needs an id', null);
      continue;
    }
    const context = { id: check.id, __file: 'tools/lib/checks', __line: null };
    // Field name matches the check contract documented in tools/lib/checks/index.ts.
    if (!isStringArray(check.requirements) || check.requirements.length === 0) {
      diag.error('check-requirements', `check ${check.id} must list the requirement ids it verifies`, context);
      continue;
    }
    for (const id of check.requirements) {
      if (!byId.has(id)) {
        diag.error('check-orphan', `check ${check.id} references unknown requirement ${id}`, context);
      }
    }
    if (!VERIFICATION_LEVELS.includes(check.level)) {
      diag.error('check-level', `check ${check.id} level must be one of ${VERIFICATION_LEVELS.join(', ')}`, context);
    }
    if (typeof check.run !== 'function') {
      diag.error('check-run', `check ${check.id} must expose run(snapshot)`, context);
    }
  }
}

/** What `validate` reads. Every field is required or defaulted; none is inferred. */
export interface ValidateOptions {
  records?: Requirement[];
  removed?: LedgerRecord[];
  deferred?: LedgerRecord[];
  checks?: CheckList | null;
  problems?: string[];
  /** YYYY-MM-DD. Defaults to now, so a test can pin it. */
  today?: string;
}

/**
 * Validate the whole registry.
 *
 * Pure: takes already-loaded data so tests can feed deliberately-invalid records
 * without touching disk. Returns diagnostics plus counts; the caller decides how
 * to print and whether to exit non-zero.
 */
export function validate({ records, removed = [], deferred = [], checks = null, problems = [], today = todayIso() }: ValidateOptions = {}) {
  const diag = new Diagnostics();

  for (const problem of problems) {
    diag.error('registry-structure', problem, null);
  }

  const checkIds = checks ? new Set(checks.map((c) => c.id)) : null;

  for (const record of records) {
    validateRecordShape(diag, record, checkIds, today);
  }
  validateCorpus(diag, records);
  validateLedgers(diag, { records, removed, deferred });
  validateIdSpace(diag, { records, removed, deferred });
  validateChecks(diag, records, checks);

  return {
    ok: diag.errors.length === 0,
    errors: diag.errors,
    warnings: diag.warnings,
    entries: diag.entries,
    counts: {
      records: records.length,
      removed: (removed || []).length,
      deferred: (deferred || []).length,
      errors: diag.errors.length,
      warnings: diag.warnings.length,
    },
  };
}

/** Group diagnostics by rule for compact reporting. */
export function summarizeByRule(entries: Diagnostic[]) {
  const out = new Map();
  for (const entry of entries) {
    if (!out.has(entry.rule)) out.set(entry.rule, 0);
    out.set(entry.rule, out.get(entry.rule) + 1);
  }
  return [...out.entries()].sort((a, b) => b[1] - a[1]);
}
