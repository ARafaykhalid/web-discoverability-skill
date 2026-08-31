/**
 * The review backlog: removed.jsonl (retired) and deferred.jsonl (reviewed but
 * not yet specified well enough to promote).
 *
 * These two ledgers are what make the registry's size honest: an id that is not
 * shipped is explained rather than dropped. The last test in this file pins the
 * matching product decision in the other direction - the validator must never
 * enforce a minimum requirement count.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { loadRegistry, loadRemoved, loadDeferred } from '../../tools/lib/registry.ts';
import { validate } from '../../tools/lib/validate.ts';
import { CLASSIFICATIONS, ID_PATTERN } from '../../tools/lib/model.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const TOOLS_LIB = join(HERE, '..', '..', 'tools', 'lib');

const { records } = loadRegistry();
const removed = loadRemoved();
const deferred = loadDeferred();

/** The review taxonomy named in the contributing workflow. A subset of CLASSIFICATIONS. */
const REVIEW_TAXONOMY = [
  'VALID',
  'NEEDS_SOURCE',
  'NEEDS_REWORDING',
  'NEEDS_TEST',
  'DUPLICATE',
  'SPECULATIVE',
  'OBSOLETE',
  'UNSAFE',
  'NOT_ACTIONABLE',
];

function assertPopulated(list, what) {
  assert.ok(
    Array.isArray(list) && list.length > 0,
    `${what} is empty, so every per-item assertion below would pass without inspecting anything`,
  );
}

function idNumber(id) {
  return Number(String(id).slice(4));
}

function asArray(value) {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

/**
 * Replacement bookkeeping between the promoted set and the retired ledger.
 *
 * Retirement-with-replacement is recorded on the ledger entry as `replaced_by`
 * (retired -> promoted). `supersedes` is the optional promoted-side counterpart;
 * validate.ts never resolves it, so the only thing checked here is that it never
 * points at a live requirement and never contradicts an existing `replaced_by`.
 */
function replacementProblems({ records: promoted, removed: retiredEntries }) {
  const active = new Set(promoted.map((r) => r.id));
  const retired = new Map(retiredEntries.map((e) => [e.id, e]));
  const problems = [];

  for (const entry of retiredEntries) {
    if (entry.replaced_by === undefined) continue;
    const targets = asArray(entry.replaced_by);
    if (!targets.length) {
      problems.push(`removed ${entry.id} declares replaced_by with no target`);
    }
    for (const target of targets) {
      if (target === entry.id) problems.push(`removed ${entry.id} lists itself as its own replacement`);
      else if (!active.has(target)) {
        problems.push(`removed ${entry.id} is replaced_by ${target}, which is not a promoted requirement`);
      }
    }
  }

  for (const record of promoted) {
    for (const target of asArray(record.supersedes)) {
      if (active.has(target)) {
        problems.push(`${record.id} supersedes ${target}, which is still promoted`);
      }
      const entry = retired.get(target);
      if (entry && entry.replaced_by !== undefined && !asArray(entry.replaced_by).includes(record.id)) {
        problems.push(
          `${record.id} supersedes retired ${target}, but ${target}.replaced_by names ${asArray(entry.replaced_by).join(', ')}`,
        );
      }
    }
  }
  return problems;
}

describe('removed.jsonl', () => {
  it('every retired entry carries an id, the original title, a classification, and a reason', () => {
    assertPopulated(removed, 'removed.jsonl');
    const problems = [];
    for (const entry of removed) {
      const at = `removed.jsonl:${entry.__line} (${entry.id})`;
      if (!ID_PATTERN.test(String(entry.id))) problems.push(`${at} id does not match ${ID_PATTERN}`);
      if (typeof entry.title !== 'string' || !entry.title.trim()) problems.push(`${at} is missing the original title`);
      if (!CLASSIFICATIONS.includes(entry.classification)) {
        problems.push(`${at} classification ${JSON.stringify(entry.classification)} is not in the review taxonomy`);
      }
      if (typeof entry.reason !== 'string' || !entry.reason.trim()) problems.push(`${at} is missing a reason`);
    }
    assert.deepEqual(
      problems,
      [],
      'the retired ledger is the answer to "why is this not a requirement any more?". An entry without a '
        + 'classification and a reason retires an id with no record of the decision',
    );
  });

  it('the documented review taxonomy is a subset of CLASSIFICATIONS', () => {
    assertPopulated(REVIEW_TAXONOMY, 'the documented review taxonomy');
    const missing = REVIEW_TAXONOMY.filter((value) => !CLASSIFICATIONS.includes(value));
    assert.deepEqual(
      missing,
      [],
      'a classification used by the review workflow is not in model.ts CLASSIFICATIONS, so the validator would '
        + 'reject a correctly-reviewed ledger entry',
    );
  });

  it('every reason is specific enough to act on', () => {
    assertPopulated(removed, 'removed.jsonl');
    const vague = removed
      .filter((entry) => String(entry.reason ?? '').trim().length < 40)
      .map((entry) => `removed.jsonl:${entry.__line} (${entry.id}) reason is ${String(entry.reason ?? '').trim().length} chars`);
    assert.deepEqual(
      vague,
      [],
      'a one-word reason cannot be reviewed later. Re-admission depends on knowing what would have to change',
    );
  });
});

describe('deferred.jsonl', () => {
  it('every deferred entry reserves a well-formed id that is not promoted', () => {
    assertPopulated(deferred, 'deferred.jsonl');
    const active = new Set(records.map((r) => r.id));
    const problems = [];
    for (const entry of deferred) {
      const at = `deferred.jsonl:${entry.__line} (${entry.id})`;
      if (!ID_PATTERN.test(String(entry.id))) problems.push(`${at} id does not match ${ID_PATTERN}`);
      if (active.has(entry.id)) problems.push(`${at} is also promoted, so the id is both reserved and in use`);
      if (typeof entry.title !== 'string' || !entry.title.trim()) problems.push(`${at} is missing the original title`);
    }
    assert.deepEqual(
      problems,
      [],
      'a deferred entry reserves its id so the id can never be handed to a different requirement while the '
        + 'original is still under review',
    );
  });

  it('every deferred entry states a blocker and a classification', () => {
    assertPopulated(deferred, 'deferred.jsonl');
    const problems = [];
    for (const entry of deferred) {
      const at = `deferred.jsonl:${entry.__line} (${entry.id})`;
      if (typeof entry.blocker !== 'string' || !entry.blocker.trim()) problems.push(`${at} is missing a blocker`);
      else if (entry.blocker.trim().length < 40) problems.push(`${at} blocker is too short to act on`);
      if (!CLASSIFICATIONS.includes(entry.classification)) {
        problems.push(`${at} classification ${JSON.stringify(entry.classification)} is not in the review taxonomy`);
      }
    }
    assert.deepEqual(
      problems,
      [],
      'the blocker is what turns "not shipped" into a work item. Without it a deferred id is indistinguishable '
        + 'from a silently abandoned one',
    );
  });
});

describe('id populations are disjoint and fully accounted for', () => {
  it('no id appears in more than one of promoted, removed, deferred', () => {
    assertPopulated(records, 'the promoted registry');
    assertPopulated(removed, 'removed.jsonl');
    assertPopulated(deferred, 'deferred.jsonl');

    const populations = [
      ['promoted', records.map((r) => r.id)],
      ['removed', removed.map((e) => e.id)],
      ['deferred', deferred.map((e) => e.id)],
    ];
    const owner = new Map();
    const overlaps = [];
    for (const [name, ids] of populations) {
      for (const id of ids) {
        if (owner.has(id)) overlaps.push(`${id} is in both ${owner.get(id)} and ${name}`);
        else owner.set(id, name);
      }
    }
    assert.deepEqual(
      overlaps,
      [],
      'an id in two populations means the registry both ships and disowns the same requirement, and every count '
        + 'derived from the three files becomes wrong',
    );
  });

  it('every allocated id below the ceiling is accounted for exactly once, so new ids start above it', () => {
    const all = [...records.map((r) => r.id), ...removed.map((e) => e.id), ...deferred.map((e) => e.id)];
    assertPopulated(all, 'the union of promoted, removed, and deferred ids');
    const numbers = all.map(idNumber);
    assert.ok(numbers.every(Number.isInteger), 'every id must end in an integer for the id space to be checkable');

    const allocated = new Set(numbers);
    assert.equal(allocated.size, numbers.length, 'an id number is allocated twice');

    const highest = Math.max(...numbers);
    const gaps = [];
    for (let n = 1; n <= highest; n += 1) if (!allocated.has(n)) gaps.push(`SEO-${String(n).padStart(3, '0')}`);
    assert.deepEqual(
      gaps.slice(0, 20),
      [],
      `${gaps.length} id(s) at or below SEO-${highest} appear in neither the registry nor a ledger. A gap is an id `
        + 'that was allocated and then quietly forgotten, which is the failure the two ledgers exist to prevent',
    );

    const nextId = highest + 1;
    assert.ok(
      nextId >= 641,
      `the next id to allocate is SEO-${nextId}, but v1 allocated ids through SEO-640. A new requirement must take `
        + 'the next unused number, never an id the ledgers already account for',
    );
    assert.ok(!allocated.has(nextId), `SEO-${nextId} must still be free`);
  });
});

describe('replacement linkage', () => {
  it('the linkage checker catches the failures it is meant to catch', () => {
    const clean = replacementProblems({
      records: [{ id: 'SEO-9001', supersedes: ['SEO-9500'] }, { id: 'SEO-9002' }],
      removed: [{ id: 'SEO-9003', replaced_by: 'SEO-9001' }, { id: 'SEO-9004' }],
    });
    assert.deepEqual(
      clean,
      [],
      'a retired entry replaced by a promoted record, plus a promoted record superseding an id that was never '
        + 'ledgered, is the normal case and must not be reported',
    );

    const dirty = replacementProblems({
      records: [{ id: 'SEO-9001', supersedes: ['SEO-9002'] }, { id: 'SEO-9002' }],
      removed: [
        { id: 'SEO-9003', replaced_by: 'SEO-9404' },
        { id: 'SEO-9005', replaced_by: 'SEO-9005' },
        { id: 'SEO-9006', replaced_by: 'SEO-9002' },
      ],
    });
    assert.equal(dirty.length, 3, `expected three problems, got ${JSON.stringify(dirty)}`);
    assert.ok(dirty.some((p) => p.includes('SEO-9404')), 'a replacement pointing at nothing must be reported');
    assert.ok(dirty.some((p) => p.includes('its own replacement')), 'a self-replacement must be reported');
    assert.ok(
      dirty.some((p) => p.includes('SEO-9001 supersedes SEO-9002, which is still promoted')),
      'superseding a live requirement must be reported',
    );
  });

  it('the real ledgers and registry agree about replacements', () => {
    assertPopulated(removed, 'removed.jsonl');
    assert.deepEqual(
      replacementProblems({ records, removed }),
      [],
      'replacement bookkeeping is broken. A retired requirement that names a replacement must name a live one, '
        + 'and a promoted record must never claim to supersede a requirement that is still shipping',
    );

    // Property, not count: whichever entries are classified MERGED must say what they merged into.
    const unlinked = removed
      .filter((entry) => entry.classification === 'MERGED' && asArray(entry.replaced_by).length === 0)
      .map((entry) => `removed.jsonl:${entry.__line} (${entry.id}) is MERGED with no replaced_by`);
    assert.deepEqual(
      unlinked,
      [],
      'MERGED means the requirement still exists somewhere else. Without replaced_by the merge target is lost and '
        + 'the reader cannot follow the requirement forward',
    );
  });
});

describe('the validator enforces no minimum requirement count', () => {
  it('an empty registry validates cleanly', () => {
    const result = validate({ records: [], removed: [], deferred: [], checks: [] });
    assert.deepEqual(
      result.errors.map((e) => `${e.rule}: ${e.message}`),
      [],
      'validate() must not require the registry to contain anything. A count floor would make the validator a '
        + 'marketing check: shrinking the registry by retiring a bad requirement would fail the build, so the '
        + 'incentive would be to keep weak requirements to hold the number up',
    );
    assert.equal(result.ok, true, 'an empty registry must be structurally valid, merely empty');
    assert.equal(result.counts.records, 0, 'counts must report reality rather than a floor');
  });

  it('a single-record registry validates cleanly', () => {
    assertPopulated(records, 'the promoted registry');
    const only = structuredClone(records[0]);
    delete only.depends_on;
    delete only.conflicts_with;
    const result = validate({ records: [only], removed: [], deferred: [] });
    assert.deepEqual(
      result.errors.map((e) => `${e.rule}: ${e.message}`),
      [],
      'one well-formed requirement is a valid registry; nothing may demand a second one',
    );
  });

  it('neither validate.ts nor model.ts contains a minimum-count assertion', () => {
    const FLOOR_PATTERNS = [
      /\b(records|requirements|registry|active|promoted)\s*\.\s*length\s*[<>]=?\s*\d+/i,
      /\b(records|requirements|registry|active|promoted)\s*\.\s*length\s*!==?\s*\d+/i,
      /\bMIN(IMUM)?_(RECORD|RECORDS|REQUIREMENT|REQUIREMENTS|COUNT|REGISTRY|TOTAL)\b/,
      /\b(EXPECTED|REQUIRED)_(RECORD|RECORDS|REQUIREMENT|REQUIREMENTS|COUNT|TOTAL)\b/,
      /at least \d+\s+(record|requirement|entr)/i,
      /\bfewer than \d+\s+(record|requirement)/i,
    ];
    const found = [];
    let scanned = 0;
    for (const file of ['validate.ts', 'model.ts']) {
      const text = readFileSync(join(TOOLS_LIB, file), 'utf8');
      assert.ok(text.length > 0, `${file} is empty, so this scan proved nothing`);
      const lines = text.split(/\r?\n/);
      scanned += lines.length;
      lines.forEach((line, index) => {
        for (const pattern of FLOOR_PATTERNS) {
          if (pattern.test(line)) found.push(`tools/lib/${file}:${index + 1}: ${line.trim()}`);
        }
      });
    }
    assert.ok(scanned > 100, `expected to scan both source files, only saw ${scanned} lines`);
    assert.deepEqual(
      found,
      [],
      'a minimum-requirement-count assertion appeared in the validator. This was a deliberate product decision: '
        + 'the registry is validated on the quality of each requirement, never on how many there are, so that '
        + 'retiring a bad requirement is always allowed to reduce the total',
    );
  });
});
