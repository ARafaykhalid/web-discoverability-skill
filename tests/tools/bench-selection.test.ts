/**
 * Selection assertions in the benchmark scorer.
 *
 * `expected_not_applicable` proves the skill stays silent where a rule does not
 * belong. On its own it is satisfiable by a selector that rejects everything, so
 * `expected_applicable` pins the other end. These tests exist because the pair is
 * only meaningful if both halves can actually fail: an assertion that cannot fail
 * is documentation, not a test.
 *
 * Cases are written to a temporary directory rather than benchmarks/cases so a
 * test can never be mistaken for a shipped benchmark, and so running the suite
 * cannot perturb the recorded aggregate.
 */
import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { ROOT, loadAll } from '../../tools/lib/registry.ts';
import { runBenchmarks } from '../../tools/lib/bench.ts';

let dir;
let records;

before(() => {
  dir = mkdtempSync(join(tmpdir(), 'wds-bench-selection-'));
  records = loadAll().records;
});

after(() => {
  rmSync(dir, { recursive: true, force: true });
});

/** Write one case file and score it. Returns the single case score. */
async function score(benchCase) {
  const id = benchCase.id;
  writeFileSync(join(dir, `${id}.json`), JSON.stringify(benchCase));
  const result = await runBenchmarks({ records, dir, root: ROOT, only: [id] });
  assert.equal(result.case_count, 1, 'exactly one case should have been scored');
  return result;
}

/**
 * clean-static is a plain static site that ships a robots.txt, a sitemap and a
 * feed, so the requirements gated on those facts must be offered. Using a real
 * fixture rather than a stub is deliberate: the assertion under test is about the
 * profiler and the selector agreeing, and a stub profile would test neither.
 */
const CLEAN_STATIC = 'benchmarks/fixtures/clean-static';

describe('expected_applicable passes when the fixture establishes the gating fact', () => {
  it('accepts requirements the profile satisfies', async () => {
    const result = await score({
      id: 'selection-positive-pass',
      fixture: CLEAN_STATIC,
      level: 'ULTRA',
      expected_findings: [],
      expected_non_findings: [],
      expected_applicable: ['SEO-081', 'SEO-082'],
    });
    assert.deepEqual(result.cases[0].selection_problems, []);
    assert.equal(result.counts.selection_problems, 0);
  });
});

describe('expected_applicable fails loudly rather than silently', () => {
  it('reports a requirement the selector calls NOT_APPLICABLE, with the reason', async () => {
    const result = await score({
      id: 'selection-positive-not-applicable',
      fixture: CLEAN_STATIC,
      level: 'ULTRA',
      expected_findings: [],
      expected_non_findings: [],
      expected_applicable: ['SEO-418'],
    });
    const [problem] = result.cases[0].selection_problems;
    assert.equal(problem.id, 'SEO-418');
    assert.equal(problem.expected, 'APPLICABLE');
    assert.equal(problem.actual, 'NOT_APPLICABLE');
    // The reason matters more than the verdict: a bare failure would send the
    // author looking in the fixture when the answer is in the profile.
    assert.match(problem.problem, /ecommerce/);
    assert.equal(result.cases[0].passed, false, 'a selection problem must fail the case');
    assert.equal(result.counts.selection_problems, 1);
  });

  it('distinguishes an unknown id from a rule that was evaluated and rejected', async () => {
    const result = await score({
      id: 'selection-positive-unknown-id',
      fixture: CLEAN_STATIC,
      level: 'ULTRA',
      expected_findings: [],
      expected_non_findings: [],
      expected_applicable: ['SEO-9999'],
    });
    const [problem] = result.cases[0].selection_problems;
    assert.equal(problem.actual, 'not evaluated');
    assert.equal(problem.problem, 'not in the registry');
  });

  it('distinguishes a level that does not reach the rule from an unknown id', async () => {
    // SEO-039 is RECOMMENDED, so a LITE run never evaluates it. That is a
    // case-authoring fault and the message has to say which of the two it is.
    const result = await score({
      id: 'selection-positive-level',
      fixture: CLEAN_STATIC,
      level: 'LITE',
      expected_findings: [],
      expected_non_findings: [],
      expected_applicable: ['SEO-039'],
    });
    const [problem] = result.cases[0].selection_problems;
    assert.equal(problem.actual, 'not evaluated');
    assert.equal(problem.problem, 'not a candidate at level LITE');
  });
});

describe('UNCERTAIN does not satisfy expected_applicable', () => {
  it('fails when the profile cannot decide, rather than counting it as offered', async () => {
    // This fixture is a bare directory of HTML under _site with no manifest, so
    // public_site is unknown. "Ask for evidence" is the right verdict there, and
    // it is not the same answer as "this rule applies" - a case that accepted it
    // would be asserting coverage the selector never claimed.
    const result = await score({
      id: 'selection-positive-uncertain',
      fixture: 'tests/fixtures/static-subdir-site',
      level: 'ULTRA',
      expected_findings: [],
      expected_non_findings: [],
      expected_applicable: ['SEO-081'],
    });
    const [problem] = result.cases[0].selection_problems;
    assert.equal(problem.id, 'SEO-081');
    assert.equal(problem.actual, 'UNCERTAIN');
    assert.match(problem.problem, /needs evidence|public_site/);
  });
});

describe('expected_not_applicable still works alongside its positive counterpart', () => {
  it('scores both directions in one case', async () => {
    const result = await score({
      id: 'selection-both-directions',
      fixture: CLEAN_STATIC,
      level: 'ULTRA',
      expected_findings: [],
      expected_non_findings: [],
      expected_applicable: ['SEO-081'],
      expected_not_applicable: ['SEO-418', 'SEO-081'],
    });
    // SEO-081 is asserted both ways on purpose: the contradiction must surface as
    // a failure rather than one assertion quietly winning.
    const ids = result.cases[0].selection_problems.map((p) => p.id);
    assert.deepEqual(ids, ['SEO-081']);
    assert.equal(result.cases[0].selection_problems[0].actual, 'APPLICABLE');
  });

  it('leaves selection_problems undefined when a case asserts neither', async () => {
    const result = await score({
      id: 'selection-absent',
      fixture: CLEAN_STATIC,
      level: 'ULTRA',
      expected_findings: [],
      expected_non_findings: [],
    });
    assert.equal(result.cases[0].selection_problems, undefined);
    assert.equal(result.counts.selection_problems, 0);
  });
});
