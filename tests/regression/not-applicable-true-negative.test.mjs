/**
 * Regression: a check that reported NOT_APPLICABLE was counted as a true
 * negative.
 *
 * Cause. `scoreCase` classified an `expected_non_findings` entry as "not
 * measured" for NEEDS_RUNTIME and ERROR only. NOT_APPLICABLE fell through to the
 * true-negative branch, because the code asked "did this check report a finding?"
 * rather than "did this check inspect anything?" - and a check outside its own
 * scope reports no finding for the same reason a check that passed does.
 *
 * Why it mattered. `false_positive_rate = fp / (fp + tn)`, so every admitted
 * NOT_APPLICABLE enlarged the denominator with a check that could not have
 * produced a false positive. Listing irrelevant checks in a case would have
 * improved the published rate. Every shipped case already avoided this by
 * authoring discipline, and the discipline was written down in the fixture notes
 * - which is exactly the situation where a convention decays silently the first
 * time someone does not read the notes.
 *
 * Fix. `DID_NOT_INSPECT` in tools/lib/bench.mjs, applied to both directions:
 * such an entry is `not_measured` when the case expected silence, and a false
 * negative naming the status when the case expected a finding.
 *
 * Before the fix the first test here reported tn=1 and not_measured=0.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { scoreCase } from '../../tools/lib/bench.mjs';

/**
 * The minimal reproduction: one check, one status, no fixture and no registry.
 * Scoring is a pure function of the case and the run results, so a fixture would
 * add a filesystem dependency without adding coverage.
 */
function score(status, benchCase) {
  return scoreCase(benchCase, {
    findings: [],
    results: [{ check_id: 'some-check', status, findings: [] }],
    records: [],
  });
}

const CLEAN = { id: 'r', expected_findings: [], expected_non_findings: [{ check_id: 'some-check' }] };
const DEFECTIVE = { id: 'r', expected_findings: [{ check_id: 'some-check' }], expected_non_findings: [] };

describe('a check that did not inspect the fixture is not a true negative', () => {
  it('counts NOT_APPLICABLE as not measured', () => {
    const result = score('NOT_APPLICABLE', CLEAN);
    assert.equal(result.counts.true_negatives, 0, 'a check outside its scope inspected nothing');
    assert.deepEqual(
      result.not_measured.map((entry) => entry.why),
      ['check status NOT_APPLICABLE'],
      'and it has to say which status, or the gap is unactionable',
    );
  });

  it('counts NEEDS_RUNTIME and ERROR the same way', () => {
    for (const status of ['NEEDS_RUNTIME', 'ERROR']) {
      const result = score(status, CLEAN);
      assert.equal(result.counts.true_negatives, 0, status);
      assert.equal(result.not_measured[0].why, `check status ${status}`);
    }
  });

  it('still counts a check that ran and stayed silent', () => {
    // The other half of the contract. A fix that suppressed PASS as well would
    // satisfy every assertion above and measure nothing at all.
    const result = score('PASS', CLEAN);
    assert.equal(result.counts.true_negatives, 1);
    assert.deepEqual(result.not_measured, []);
  });

  it('keeps the false-positive denominator free of checks that never looked', () => {
    // fp / (fp + tn) with one real false positive. Admitting the NOT_APPLICABLE
    // entry as a true negative would halve the reported rate.
    const result = scoreCase(
      { id: 'r', expected_findings: [], expected_non_findings: [{ check_id: 'inspected' }, { check_id: 'skipped' }] },
      {
        findings: [{ check_id: 'inspected', requirement_id: 'SEO-001', location: 'index.html', evidence: [{ type: 'FILE' }] }],
        results: [
          { check_id: 'inspected', status: 'FAIL', findings: [] },
          { check_id: 'skipped', status: 'NOT_APPLICABLE', findings: [] },
        ],
        records: [],
      },
    );
    assert.equal(result.counts.false_positives, 1);
    assert.equal(result.counts.true_negatives, 0);
    assert.equal(result.false_positive_rate, 1);
  });
});

describe('an expected finding blocked by status is a miss that names the status', () => {
  it('reports NOT_APPLICABLE distinctly from "found nothing"', () => {
    // Both are false negatives, but one sends the author to the applicability
    // gate and the other to the check body.
    const skipped = score('NOT_APPLICABLE', DEFECTIVE);
    assert.equal(skipped.counts.false_negatives, 1);
    assert.equal(skipped.false_negatives[0].why, 'check status NOT_APPLICABLE');

    const ranAndMissed = score('PASS', DEFECTIVE);
    assert.equal(ranAndMissed.counts.false_negatives, 1);
    assert.equal(ranAndMissed.false_negatives[0].why, 'check reported no matching finding');
  });
});
