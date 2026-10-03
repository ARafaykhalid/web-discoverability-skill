import assert from 'node:assert/strict';

/**
 * Shared fixtures for the registry test suites.
 *
 * Every one of these was written out once per file. That is not only duplication:
 * a helper that exists in seven copies can be correct in one and wrong in six,
 * and nothing in the suite would notice. `evidence.test.ts` and `safety.test.ts`
 * had already drifted - their `isolatedRecord` took a base argument while
 * `integrity.test.ts` closed over `records[0]`, so the same name meant two things
 * in the same directory.
 */

/**
 * Refuse to run a per-item assertion against an empty list.
 *
 * Without this, a suite that stopped loading the registry would pass every
 * `for (const record of records)` assertion below it while testing nothing.
 */
export function assertPopulated(list, what) {
  const size = Array.isArray(list) ? list.length : (list?.size ?? 0);
  assert.ok(size > 0, `${what} is empty, so every per-item assertion below would pass without inspecting anything`);
}

/** A short, unique address for a record, for assertion messages. */
export function where(record) {
  return `${record.__file ?? '?'}:${record.__line ?? '?'}`;
}

/**
 * A copy of a real record with its relationships stripped and overrides applied.
 *
 * Relationships are dropped because a corpus-wide rule under test - a duplicate
 * title, a dependency cycle, a conflict that is not reciprocal - would otherwise
 * fire on every real record carrying that relationship and drown the case being
 * constructed.
 */
export function isolatedRecord(base, overrides = {}) {
  const clone = structuredClone(base);
  delete clone.depends_on;
  delete clone.conflicts_with;
  delete clone.supersedes;
  return Object.assign(clone, overrides);
}

/** The set of validator rule names in a result, for "this rule must not fire" assertions. */
export function rulesFrom(result) {
  return new Set(result.errors.map((entry) => entry.rule));
}

/** True only for a plain YYYY-MM-DD day. */
export function isValidIsoDay(value) {
  return /^\d{4}-\d{2}-\d{2}$/.test(String(value));
}

/** Today, as the validator sees it. */
export const TODAY = new Date().toISOString().slice(0, 10);