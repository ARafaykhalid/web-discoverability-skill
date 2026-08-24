/**
 * Schema conformance for every promoted requirement.
 *
 * These tests assert *properties* of the registry, never totals. A count
 * assertion would turn every legitimate registry addition into a red build, so
 * the only cardinality claims here are "not empty" guards that stop an empty or
 * half-loaded registry from passing everything vacuously.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { loadRegistry, loadRemoved, loadDeferred, levelsFor } from '../../tools/lib/registry.mjs';
import {
  CATEGORIES,
  CHANGE_SAFETY_VALUES,
  CONFIDENCE_LEVELS,
  DOMAIN_SLUGS,
  EVIDENCE_TIER_VALUES,
  EVIDENCE_TYPES,
  ID_PATTERN,
  IMPACT_LEVELS,
  LEVELS,
  REQUIRED_FIELDS,
  SEVERITIES,
  VERIFICATION_LEVELS,
  cumulativeLevels,
} from '../../tools/lib/model.mjs';

const registry = loadRegistry();
const { records, byDomain, byId, problems } = registry;
const removed = loadRemoved();
const deferred = loadDeferred();

/** Guard against a vacuous pass: an empty collection must never satisfy a sweep. */
function assertPopulated(list, what) {
  assert.ok(
    Array.isArray(list) && list.length > 0,
    `${what} is empty, so every per-item assertion below would pass without inspecting anything`,
  );
}

function where(record) {
  return `${record.__file ?? '?'}:${record.__line ?? '?'}`;
}

/** The validator's own definition of "present and non-empty" (validate.mjs required-field). */
function isMissing(value) {
  return (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && !value.trim()) ||
    (Array.isArray(value) && value.length === 0)
  );
}

const ENUM_FIELDS = [
  ['domain', (r) => r.domain, DOMAIN_SLUGS],
  ['category', (r) => r.category, CATEGORIES],
  ['minimum_level', (r) => r.minimum_level, LEVELS],
  ['severity', (r) => r.severity, SEVERITIES],
  ['impact', (r) => r.impact, IMPACT_LEVELS],
  ['change_safety', (r) => r.change_safety, CHANGE_SAFETY_VALUES],
  ['evidence_tier', (r) => r.evidence_tier, EVIDENCE_TIER_VALUES],
  ['confidence', (r) => r.confidence, CONFIDENCE_LEVELS],
  ['verification.level', (r) => r.verification?.level, VERIFICATION_LEVELS],
];

describe('registry loading', () => {
  it('loadRegistry returns { records, byDomain, byId, problems } and reports no structural problems', () => {
    assert.deepEqual(
      Object.keys(registry).sort(),
      ['byDomain', 'byId', 'problems', 'records'],
      'loadRegistry return shape changed; every consumer (selector, docs, validator) destructures these four keys',
    );
    assert.deepEqual(
      problems,
      [],
      `loadRegistry reported structural problems, which means a declared domain file is missing or an orphan `
        + `.jsonl exists that no domain in model.mjs DOMAINS owns: ${problems.join('; ')}`,
    );
    assertPopulated(records, 'the promoted registry');
    assert.equal(
      byId.size,
      records.length,
      'byId collapsed records, which can only happen if two promoted records share an id',
    );
    for (const domain of DOMAIN_SLUGS) {
      assert.ok(byDomain.has(domain), `byDomain is missing declared domain ${domain}`);
    }
  });
});

describe('identifiers', () => {
  it('every promoted id matches ID_PATTERN', () => {
    assertPopulated(records, 'the promoted registry');
    const bad = records.filter((r) => !ID_PATTERN.test(String(r.id)));
    assert.deepEqual(
      bad.map((r) => `${where(r)} id=${JSON.stringify(r.id)}`),
      [],
      `every id must match ${ID_PATTERN}; ids are the join key for checks, ledgers, and reports, so a `
        + 'malformed id silently detaches a requirement from its evidence',
    );
  });

  it('ids are globally unique across the registry and both ledgers (a retired id is never reused)', () => {
    assertPopulated(records, 'the promoted registry');
    assertPopulated(removed, 'removed.jsonl');
    assertPopulated(deferred, 'deferred.jsonl');

    const seen = new Map();
    const collisions = [];
    const note = (id, label) => {
      if (seen.has(id)) collisions.push(`${id}: ${seen.get(id)} and ${label}`);
      else seen.set(id, label);
    };
    for (const record of records) note(record.id, where(record));
    for (const entry of removed) note(entry.id, `removed.jsonl:${entry.__line}`);
    for (const entry of deferred) note(entry.id, `deferred.jsonl:${entry.__line}`);

    assert.deepEqual(
      collisions,
      [],
      'an id appears in more than one place. The removed ledger exists so a retired id is never recycled: '
        + 'reusing one makes historical audit output point at a different requirement than it did when written',
    );
    assert.equal(
      seen.size,
      records.length + removed.length + deferred.length,
      'id accounting lost entries; every promoted, removed, and deferred id must occupy its own slot',
    );
  });
});

describe('required fields', () => {
  it('every required field is present and non-empty on every promoted record', () => {
    assertPopulated(records, 'the promoted registry');
    assertPopulated(REQUIRED_FIELDS, 'REQUIRED_FIELDS');
    const missing = [];
    for (const record of records) {
      for (const field of REQUIRED_FIELDS) {
        if (isMissing(record[field])) missing.push(`${record.id} (${where(record)}) is missing ${field}`);
      }
    }
    assert.deepEqual(
      missing,
      [],
      'a required field is absent or blank. Every field in REQUIRED_FIELDS is load-bearing for selection, '
        + 'safety classification, or verification, so a blank one produces a requirement an agent cannot act on',
    );
  });

  it('verification is an object with a method, and no unknown top-level shape', () => {
    assertPopulated(records, 'the promoted registry');
    const bad = [];
    for (const record of records) {
      const v = record.verification;
      if (!v || typeof v !== 'object' || Array.isArray(v)) {
        bad.push(`${record.id}: verification must be an object (got ${JSON.stringify(v)})`);
        continue;
      }
      if (typeof v.method !== 'string' || !v.method.trim()) {
        bad.push(`${record.id}: verification.method must describe an observation`);
      }
    }
    assert.deepEqual(bad, [], 'verification is the only thing that turns a requirement into a testable claim');
  });
});

describe('enumerated fields', () => {
  for (const [field, get, allowed] of ENUM_FIELDS) {
    it(`${field} is always one of ${allowed.length} allowed values`, () => {
      assertPopulated(records, 'the promoted registry');
      const bad = records
        .filter((r) => !allowed.includes(get(r)))
        .map((r) => `${r.id} (${where(r)}) has ${field}=${JSON.stringify(get(r))}`);
      assert.deepEqual(
        bad,
        [],
        `${field} must be one of: ${allowed.join(', ')}. Off-enum values bypass the selector and the safety `
          + 'rules that switch on this field, so the record would be filtered or classified by accident',
      );
    });
  }

  it('minimum_level agrees with cumulativeLevels and never lands outside LEVELS', () => {
    assertPopulated(records, 'the promoted registry');
    const bad = [];
    for (const record of records) {
      const levels = levelsFor(record);
      const expected = cumulativeLevels(record.minimum_level);
      if (!levels.length) {
        bad.push(`${record.id}: minimum_level ${JSON.stringify(record.minimum_level)} expands to no levels`);
        continue;
      }
      if (levels[0] !== record.minimum_level) {
        bad.push(`${record.id}: cumulative levels start at ${levels[0]}, not minimum_level ${record.minimum_level}`);
      }
      if (levels[levels.length - 1] !== LEVELS[LEVELS.length - 1]) {
        bad.push(`${record.id}: cumulative levels stop at ${levels[levels.length - 1]}, not ${LEVELS.at(-1)}`);
      }
      if (levels.join(',') !== expected.join(',')) {
        bad.push(`${record.id}: levelsFor disagrees with cumulativeLevels`);
      }
    }
    assert.deepEqual(
      bad,
      [],
      'levels are derived, never stored: a minimum_level that does not expand into a suffix of LEVELS would '
        + 'make a requirement invisible at the tiers that should include it',
    );
  });
});

describe('verification evidence', () => {
  it('verification.evidence is a non-empty array of known evidence types', () => {
    assertPopulated(records, 'the promoted registry');
    const bad = [];
    for (const record of records) {
      const evidence = record.verification?.evidence;
      if (!Array.isArray(evidence) || evidence.length === 0) {
        bad.push(`${record.id} (${where(record)}): verification.evidence must be a non-empty array`);
        continue;
      }
      for (const type of evidence) {
        if (!EVIDENCE_TYPES.includes(type)) {
          bad.push(`${record.id}: unknown evidence type ${JSON.stringify(type)}`);
        }
      }
      if (evidence.length === EVIDENCE_TYPES.length) {
        bad.push(`${record.id}: evidence lists every known type, which carries no information`);
      }
      const duplicates = evidence.filter((e, i) => evidence.indexOf(e) !== i);
      if (duplicates.length) bad.push(`${record.id}: evidence repeats ${[...new Set(duplicates)].join(', ')}`);
    }
    assert.deepEqual(
      bad,
      [],
      'evidence types tell the agent what to actually look at. An empty list, an unknown type, or a blanket '
        + 'list of every type all mean the same thing in practice: the requirement cannot be verified',
    );
  });
});
