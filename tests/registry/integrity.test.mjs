/**
 * Cross-record integrity: dependency graph, conflict reciprocity, supersession
 * semantics, and the "no field is secretly a template" rule.
 *
 * Every rule that the registry data currently satisfies is paired with a
 * synthetic negative case run through `validate()`, so a passing sweep can never
 * mean "the rule stopped being enforced".
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { loadRegistry, loadRemoved, loadDeferred, normalizeText } from '../../tools/lib/registry.mjs';
import { validate, findDependencyCycles } from '../../tools/lib/validate.mjs';
import { ID_PATTERN } from '../../tools/lib/model.mjs';

const { records } = loadRegistry();
const removed = loadRemoved();
const deferred = loadDeferred();
const byId = new Map(records.map((r) => [r.id, r]));

function assertPopulated(list, what) {
  assert.ok(
    Array.isArray(list) && list.length > 0,
    `${what} is empty, so every per-item assertion below would pass without inspecting anything`,
  );
}

function where(record) {
  return `${record.__file ?? '?'}:${record.__line ?? '?'}`;
}

/** A well-formed id that no population has allocated, derived from the data. */
function unallocatedId() {
  const numbers = [...records, ...removed, ...deferred]
    .map((r) => Number(String(r.id).slice(4)))
    .filter((n) => Number.isFinite(n));
  const id = `SEO-${Math.max(...numbers) + 1}`;
  assert.ok(ID_PATTERN.test(id), `derived probe id ${id} does not match ID_PATTERN`);
  assert.ok(!byId.has(id), `probe id ${id} unexpectedly exists in the registry`);
  return id;
}

/**
 * A real (therefore valid) record, detached from its graph edges so it can be
 * validated on its own without tripping depends_on/conflicts_with resolution.
 */
function isolatedRecord(overrides = {}) {
  const clone = structuredClone(records[0]);
  delete clone.depends_on;
  delete clone.conflicts_with;
  delete clone.supersedes;
  return Object.assign(clone, overrides);
}

function rulesFrom(result) {
  return new Set(result.errors.map((e) => e.rule));
}

/** Depth-first cycle search with an explicit colour map. Returns id paths. */
function findCyclesByColour(list) {
  const graph = new Map(list.map((r) => [r.id, (r.depends_on || []).filter((d) => typeof d === 'string')]));
  const colour = new Map(); // absent = white, 'grey' = on stack, 'black' = finished
  const stack = [];
  const cycles = [];

  const visit = (id) => {
    const seen = colour.get(id);
    if (seen === 'black') return;
    if (seen === 'grey') {
      cycles.push([...stack.slice(stack.indexOf(id)), id]);
      return;
    }
    colour.set(id, 'grey');
    stack.push(id);
    for (const next of graph.get(id) || []) {
      if (graph.has(next)) visit(next);
    }
    stack.pop();
    colour.set(id, 'black');
  };

  for (const id of graph.keys()) visit(id);

  const seenKeys = new Set();
  return cycles.filter((cycle) => {
    const key = [...cycle].slice(0, -1).sort().join('>');
    if (seenKeys.has(key)) return false;
    seenKeys.add(key);
    return true;
  });
}

describe('dependency graph', () => {
  it('every depends_on target resolves to a promoted record', () => {
    assertPopulated(records, 'the promoted registry');
    const edges = records.flatMap((r) => (r.depends_on || []).map((target) => [r, target]));
    assertPopulated(edges, 'the depends_on edge set');

    const retired = new Set([...removed, ...deferred].map((e) => e.id));
    const dangling = edges
      .filter(([, target]) => !byId.has(target))
      .map(([record, target]) => {
        const hint = retired.has(target) ? ' (target is retired/deferred, not promoted)' : ' (target does not exist)';
        return `${record.id} (${where(record)}) depends_on ${target}${hint}`;
      });
    assert.deepEqual(
      dangling,
      [],
      'a dependency that does not resolve makes the prerequisite unenforceable: the agent is told to satisfy '
        + 'something first and there is nothing to satisfy',
    );
  });

  it('no record depends on itself', () => {
    assertPopulated(records, 'the promoted registry');
    const selfish = records
      .filter((r) => (r.depends_on || []).includes(r.id))
      .map((r) => `${r.id} (${where(r)})`);
    assert.deepEqual(selfish, [], 'a self-dependency can never be satisfied and would stall ordering');
  });

  it('the colour-map DFS finds cycles when they exist (detector is proven, not assumed)', () => {
    const triangle = [
      { id: 'SEO-9001', depends_on: ['SEO-9002'] },
      { id: 'SEO-9002', depends_on: ['SEO-9003'] },
      { id: 'SEO-9003', depends_on: ['SEO-9001'] },
    ];
    const found = findCyclesByColour(triangle);
    assert.equal(found.length, 1, `expected exactly one cycle in a 3-node ring, got ${JSON.stringify(found)}`);
    const cycle = found[0];
    assert.equal(cycle[0], cycle.at(-1), `cycle path must close on itself, got ${cycle.join(' -> ')}`);
    assert.deepEqual(
      [...cycle.slice(0, -1)].sort(),
      ['SEO-9001', 'SEO-9002', 'SEO-9003'],
      `cycle path must name every member: ${cycle.join(' -> ')}`,
    );

    assert.deepEqual(findCyclesByColour([{ id: 'SEO-9004', depends_on: ['SEO-9004'] }]).length, 1, 'a self-loop is a cycle');
    assert.deepEqual(
      findCyclesByColour([
        { id: 'SEO-9005', depends_on: ['SEO-9006', 'SEO-9007'] },
        { id: 'SEO-9006', depends_on: ['SEO-9007'] },
        { id: 'SEO-9007', depends_on: [] },
      ]),
      [],
      'a diamond-shaped DAG is not a cycle; re-visiting a finished node must not be reported',
    );
    assert.deepEqual(
      findCyclesByColour(triangle).map((c) => c.join(' -> ')).sort(),
      findDependencyCycles(triangle).map((c) => c.join(' -> ')).sort(),
      'this DFS must agree with validate.mjs findDependencyCycles, otherwise one of the two is wrong',
    );
  });

  it('the promoted registry has no dependency cycles', () => {
    assertPopulated(records, 'the promoted registry');
    const cycles = findCyclesByColour(records);
    assert.deepEqual(
      cycles.map((cycle) => cycle.join(' -> ')),
      [],
      'a dependency cycle makes the requirement order undefined: no member can be satisfied first, so an agent '
        + 'following depends_on either deadlocks or picks arbitrarily',
    );
    assert.deepEqual(
      findDependencyCycles(records).map((c) => c.join(' -> ')),
      [],
      'validate.mjs findDependencyCycles disagrees with this suite about the live registry',
    );
  });
});

describe('conflicts_with', () => {
  it('every declared conflict is reciprocal', () => {
    assertPopulated(records, 'the promoted registry');
    const edges = records.flatMap((r) => (r.conflicts_with || []).map((target) => [r, target]));
    assertPopulated(edges, 'the conflicts_with edge set');

    const problems = [];
    for (const [record, target] of edges) {
      const other = byId.get(target);
      if (!other) {
        problems.push(`${record.id} conflicts_with unknown requirement ${target}`);
        continue;
      }
      if (!(other.conflicts_with || []).includes(record.id)) {
        problems.push(`${record.id} declares a conflict with ${target}, but ${target} does not declare it back`);
      }
    }
    assert.deepEqual(
      problems,
      [],
      'conflicts must be declared on both sides. A one-sided conflict is invisible to any agent that reaches '
        + 'the pair from the other direction, which is exactly when it would apply both and break the site',
    );
  });

  it('validate() rejects a one-sided conflict', () => {
    const a = isolatedRecord({ id: 'SEO-9001', conflicts_with: ['SEO-9002'] });
    const b = isolatedRecord({
      id: 'SEO-9002',
      title: `${records[0].title} (probe B)`,
      statement: `${records[0].statement} Probe B differs so the shared-text rule does not fire.`,
      rationale: `${records[0].rationale} Probe B rationale.`,
      implementation: `${records[0].implementation} Probe B implementation.`,
    });
    b.verification = { ...b.verification, method: `${b.verification.method} Probe B method.` };
    const rules = rulesFrom(validate({ records: [a, b] }));
    assert.ok(
      rules.has('conflict-not-reciprocal'),
      `expected rule conflict-not-reciprocal to fire for a one-sided conflict, got: ${[...rules].join(', ') || 'no errors'}`,
    );
  });
});

describe('supersedes', () => {
  /**
   * Deliberate asymmetry, per validate.mjs validateCorpus: depends_on and
   * conflicts_with are resolved against the promoted set, supersedes is not.
   * A superseded id has usually been retired, so requiring resolution would make
   * it impossible to record what a new requirement replaced.
   */
  it('a supersedes target that does not exist is accepted', () => {
    const ghost = unallocatedId();
    const result = validate({ records: [isolatedRecord({ supersedes: [ghost] })] });
    assert.deepEqual(
      result.errors.map((e) => `${e.rule}: ${e.message}`),
      [],
      'a record whose supersedes points at a non-existent id must validate cleanly. If a future refactor starts '
        + 'resolving supersedes, every record that replaced a retired requirement becomes an error and the '
        + 'replacement history has to be deleted to make the validator pass',
    );
    assert.equal(result.ok, true, 'validate() must report ok for an otherwise-valid record with a dangling supersedes');
  });

  it('depends_on with the same non-existent id is rejected, proving the asymmetry is intentional', () => {
    const ghost = unallocatedId();
    const rules = rulesFrom(validate({ records: [isolatedRecord({ depends_on: [ghost] })] }));
    assert.ok(
      rules.has('depends_on-missing'),
      `depends_on must resolve even though supersedes need not; expected depends_on-missing, got: ${[...rules].join(', ') || 'no errors'}`,
    );
  });

  it('supersedes still may not reference the record itself', () => {
    const probe = isolatedRecord();
    probe.supersedes = [probe.id];
    const rules = rulesFrom(validate({ records: [probe] }));
    assert.ok(
      rules.has('supersedes-self'),
      `self-supersession is incoherent and must stay an error; got: ${[...rules].join(', ') || 'no errors'}`,
    );
  });
});

describe('field-shared-text', () => {
  const FIELDS = [
    ['statement', (r) => r.statement],
    ['rationale', (r) => r.rationale],
    ['implementation', (r) => r.implementation],
    ['verification.method', (r) => r.verification?.method],
  ];

  for (const [field, get] of FIELDS) {
    it(`${field} is globally distinct after normalizeText`, () => {
      assertPopulated(records, 'the promoted registry');
      const groups = new Map();
      for (const record of records) {
        const value = get(record);
        if (typeof value !== 'string' || !value.trim()) continue;
        const key = normalizeText(value);
        if (!groups.has(key)) groups.set(key, []);
        groups.get(key).push(record.id);
      }
      assert.ok(groups.size > 0, `no record carries ${field}, so this comparison inspected nothing`);
      const shared = [...groups.entries()]
        .filter(([, ids]) => ids.length > 1)
        .map(([key, ids]) => `${ids.join(', ')} share ${field}: "${key.slice(0, 80)}"`);
      assert.deepEqual(
        shared,
        [],
        `${field} is identical across records after normalization. Shared text is how per-domain boilerplate `
          + 'crept in before: the field looks specified but says nothing about the individual requirement',
      );
    });
  }

  it('normalizeText collapses only formatting, so the comparison above cannot be defeated by punctuation', () => {
    assert.equal(normalizeText('Serve ONE canonical URL.'), 'serve one canonical url');
    assert.equal(
      normalizeText('Serve one canonical URL'),
      normalizeText('  serve  one, canonical -- url!  '),
      'normalizeText must ignore case, punctuation, and whitespace runs, or reworded boilerplate would slip past',
    );
    assert.notEqual(
      normalizeText('Serve one canonical URL'),
      normalizeText('Serve two canonical URLs'),
      'normalizeText must not collapse different words, or genuinely distinct records would be flagged as shared',
    );
  });
});
