/**
 * Unit tests for tools/lib/bench.mjs.
 *
 * `scoreCase` is the function that decides whether the benchmark numbers in the
 * README are honest, so it is exercised directly with synthetic findings and
 * expectations rather than through a fixture run. Nothing here touches
 * benchmarks/cases, the registry, the clock, or the network.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { aggregate, scoreCase } from '../../tools/lib/bench.mjs';

/** A finding of the shape tools/lib/snapshot.mjs `finding()` emits. */
function finding(overrides = {}) {
  return {
    requirement_id: 'SEO-0001',
    check_id: 'metadata.title',
    location: 'index.html:1',
    evidence: [{ type: 'FILE', value: 'index.html' }],
    severity: 'MEDIUM',
    detail: '',
    ...overrides,
  };
}

/** A benchmark case with both expectation lists always present. */
function benchCase(overrides = {}) {
  return {
    id: 'case-under-test',
    fixture: 'benchmarks/fixtures/nowhere',
    expected_findings: [],
    expected_non_findings: [],
    ...overrides,
  };
}

const ran = (check_id, status = 'FAIL') => ({ check_id, status });

/** A registry record with only the fields scoreCase reads. */
function record(overrides = {}) {
  return {
    id: 'SEO-0001',
    change_safety: 'REVIEW_REQUIRED',
    verification: { evidence: ['FILE'] },
    ...overrides,
  };
}

describe('unmatched findings are false positives', () => {
  it('counts a finding no expectation matches as a false positive', () => {
    const score = scoreCase(benchCase(), {
      findings: [finding()],
      results: [ran('metadata.title')],
    });
    assert.deepEqual(score.counts, {
      true_positives: 0,
      false_positives: 1,
      false_negatives: 0,
      true_negatives: 0,
    });
    assert.deepEqual(score.false_positives, [
      {
        check_id: 'metadata.title',
        requirement_id: 'SEO-0001',
        location: 'index.html:1',
        declared_clean: false,
      },
    ]);
    assert.equal(score.passed, false);
  });

  it('counts a finding from the right check at the wrong location as both a miss and a false positive', () => {
    const score = scoreCase(
      benchCase({ expected_findings: [{ check_id: 'metadata.title', location: 'index.html' }] }),
      { findings: [finding({ location: 'pages/other.html:3' })], results: [ran('metadata.title')] },
    );
    assert.equal(score.counts.true_positives, 0);
    assert.equal(score.counts.false_positives, 1);
    assert.equal(score.counts.false_negatives, 1);
  });

  it('does not let a matching check id excuse a mismatched requirement id', () => {
    const score = scoreCase(
      benchCase({ expected_findings: [{ check_id: 'metadata.title', requirement_id: 'SEO-0002' }] }),
      { findings: [finding({ requirement_id: 'SEO-0001' })], results: [ran('metadata.title')] },
    );
    assert.equal(score.counts.true_positives, 0);
    assert.equal(score.counts.false_negatives, 1);
    assert.equal(score.counts.false_positives, 1);
  });
});

describe('matching is greedy and one-to-one', () => {
  const twoFindings = [finding({ location: 'a.html:1' }), finding({ location: 'b.html:2' })];

  it('leaves the second of two findings unmatched when the case declares only one', () => {
    const score = scoreCase(benchCase({ expected_findings: [{ check_id: 'metadata.title' }] }), {
      findings: twoFindings,
      results: [ran('metadata.title')],
    });
    assert.equal(score.counts.true_positives, 1);
    assert.equal(score.counts.false_positives, 1);
    assert.equal(score.counts.false_negatives, 0);
    assert.equal(score.precision, 0.5);
  });

  it('needs two entries for two findings emitted by the same check', () => {
    const score = scoreCase(
      benchCase({ expected_findings: [{ check_id: 'metadata.title' }, { check_id: 'metadata.title' }] }),
      { findings: twoFindings, results: [ran('metadata.title')] },
    );
    assert.equal(score.counts.true_positives, 2);
    assert.equal(score.counts.false_positives, 0);
    assert.equal(score.counts.false_negatives, 0);
    assert.equal(score.precision, 1);
    assert.equal(score.recall, 1);
  });

  it('never lets one finding satisfy two expectations', () => {
    const score = scoreCase(
      benchCase({ expected_findings: [{ check_id: 'metadata.title' }, { check_id: 'metadata.title' }] }),
      { findings: [finding({ location: 'a.html:1' })], results: [ran('metadata.title')] },
    );
    assert.equal(score.counts.true_positives, 1);
    assert.equal(score.counts.false_negatives, 1);
    assert.equal(score.counts.false_positives, 0);
    assert.deepEqual(
      score.false_negatives.map((fn) => fn.why),
      ['check reported no matching finding'],
    );
  });

  it('matches in expectation order, so a broad entry can consume a specific entry finding', () => {
    // Documented consequence of first-fit matching: the location-free expectation
    // is evaluated first and takes a.html, leaving the a.html expectation unmet.
    const score = scoreCase(
      benchCase({
        expected_findings: [{ check_id: 'metadata.title' }, { check_id: 'metadata.title', location: 'a.html' }],
      }),
      { findings: twoFindings, results: [ran('metadata.title')] },
    );
    assert.equal(score.counts.true_positives, 1);
    assert.equal(score.counts.false_negatives, 1);
    assert.equal(score.counts.false_positives, 1);
  });
});

describe('location matching is suffix-based', () => {
  const matches = (expected, actual) => {
    const score = scoreCase(benchCase({ expected_findings: [{ check_id: 'c', location: expected }] }), {
      findings: [finding({ check_id: 'c', location: actual })],
      results: [ran('c')],
    });
    return score.counts.true_positives === 1 && score.counts.false_positives === 0;
  };

  it('matches an exact location', () => {
    assert.equal(matches('index.html', 'index.html'), true);
  });

  it('tolerates a missing :line on the expectation side', () => {
    assert.equal(matches('index.html', 'index.html:12'), true);
    assert.equal(matches('pages/index.html', 'pages/index.html:12'), true);
  });

  it('tolerates a :line range', () => {
    assert.equal(matches('pages/index.html', 'pages/index.html:12-14'), true);
  });

  it('matches a path suffix at a directory boundary', () => {
    assert.equal(matches('index.html', 'pages/index.html:12'), true);
    assert.equal(matches('index.html', 'apps/web/pages/index.html'), true);
  });

  it('refuses a suffix that is not a whole path segment', () => {
    assert.equal(matches('about.html', 'my-about.html:1'), false);
  });

  it('refuses a different file in the same directory', () => {
    assert.equal(matches('index.html', 'pages/other.html:3'), false);
  });

  it('normalises Windows separators and a leading ./ before comparing', () => {
    assert.equal(matches('index.html', 'pages\\index.html:4'), true);
    assert.equal(matches('index.html', './index.html'), true);
    assert.equal(matches('./index.html', 'index.html'), true);
  });

  it('matches any location when the expectation names none', () => {
    assert.equal(matches(undefined, 'anywhere/at/all.html:99'), true);
    assert.equal(matches(undefined, ''), true);
  });

  it('refuses to match a located expectation against a finding with no location', () => {
    assert.equal(matches('index.html', ''), false);
    assert.equal(matches('index.html', null), false);
  });
});

describe('an expectation naming a check that did not run is a false negative', () => {
  it('records why as "no such check ran"', () => {
    const score = scoreCase(benchCase({ expected_findings: [{ check_id: 'checks.that.does.not.exist' }] }), {
      findings: [],
      results: [ran('metadata.title', 'PASS')],
    });
    assert.equal(score.counts.false_negatives, 1);
    assert.deepEqual(score.false_negatives, [
      {
        check_id: 'checks.that.does.not.exist',
        location: null,
        requirement_id: null,
        why: 'no such check ran',
      },
    ]);
    assert.equal(score.recall, 0);
    assert.equal(score.passed, false);
  });

  it('records a false negative when the check ran and stayed silent', () => {
    const score = scoreCase(benchCase({ expected_findings: [{ check_id: 'metadata.title' }] }), {
      findings: [],
      results: [ran('metadata.title', 'PASS')],
    });
    assert.equal(score.counts.false_negatives, 1);
    assert.equal(score.false_negatives[0].why, 'check reported no matching finding');
  });
});

describe('expected_non_findings does not suppress a false positive', () => {
  it('still counts the finding, and additionally flags it as unnecessary', () => {
    const score = scoreCase(benchCase({ expected_non_findings: ['metadata.title'] }), {
      findings: [finding()],
      results: [ran('metadata.title', 'PASS')],
    });
    assert.equal(score.counts.false_positives, 1);
    assert.equal(score.unnecessary_findings, 1);
    assert.equal(score.false_positives[0].declared_clean, true);
    assert.equal(score.passed, false);
  });

  it('withholds the true negative for a clean area the checks actually reported on', () => {
    const score = scoreCase(benchCase({ expected_non_findings: ['metadata.title'] }), {
      findings: [finding()],
      results: [ran('metadata.title', 'PASS')],
    });
    assert.equal(score.counts.true_negatives, 0);
  });

  it('accepts the bare-string and object forms of a clean expectation alike', () => {
    const asString = scoreCase(benchCase({ expected_non_findings: ['metadata.title'] }), {
      findings: [],
      results: [ran('metadata.title', 'PASS')],
    });
    const asObject = scoreCase(benchCase({ expected_non_findings: [{ check_id: 'metadata.title' }] }), {
      findings: [],
      results: [ran('metadata.title', 'PASS')],
    });
    assert.equal(asString.counts.true_negatives, 1);
    assert.equal(asObject.counts.true_negatives, 1);
    assert.equal(asString.passed, true);
  });

  it('scopes a located clean expectation to that location', () => {
    // The finding is elsewhere, so the declared-clean region really is clean:
    // the true negative is earned, even though the finding is a false positive.
    const score = scoreCase(
      benchCase({ expected_non_findings: [{ check_id: 'metadata.title', location: 'clean.html' }] }),
      { findings: [finding({ location: 'dirty.html:2' })], results: [ran('metadata.title')] },
    );
    assert.equal(score.counts.true_negatives, 1);
    assert.equal(score.counts.false_positives, 1);
    assert.equal(score.false_positives[0].declared_clean, false);
  });
});

describe('NEEDS_RUNTIME and ERROR are not measurements', () => {
  for (const status of ['NEEDS_RUNTIME', 'ERROR']) {
    it(`reports a clean expectation as not_measured, not a true negative, for ${status}`, () => {
      const score = scoreCase(benchCase({ expected_non_findings: ['runtime.canonical'] }), {
        findings: [],
        results: [ran('runtime.canonical', status)],
      });
      assert.equal(score.counts.true_negatives, 0);
      assert.deepEqual(score.not_measured, [
        { check_id: 'runtime.canonical', location: null, requirement_id: null, why: `check status ${status}` },
      ]);
      assert.equal(score.false_positive_rate, null, 'a rate with no denominator must stay null');
    });

    it(`reports a defect expectation as a false negative for ${status}`, () => {
      const score = scoreCase(benchCase({ expected_findings: [{ check_id: 'runtime.canonical' }] }), {
        findings: [],
        results: [ran('runtime.canonical', status)],
      });
      assert.equal(score.counts.false_negatives, 1);
      assert.equal(score.false_negatives[0].why, `check status ${status}`);
      assert.deepEqual(score.not_measured, []);
    });
  }

  it('earns a true negative only when the check actually ran and stayed silent', () => {
    const score = scoreCase(benchCase({ expected_non_findings: ['runtime.canonical'] }), {
      findings: [],
      results: [ran('runtime.canonical', 'PASS')],
    });
    assert.equal(score.counts.true_negatives, 1);
    assert.deepEqual(score.not_measured, []);
    assert.equal(score.false_positive_rate, 0);
  });

  it('reports a clean expectation for a check that never ran as not_measured too', () => {
    const score = scoreCase(benchCase({ expected_non_findings: ['never.ran'] }), {
      findings: [],
      results: [],
    });
    assert.equal(score.counts.true_negatives, 0);
    assert.equal(score.not_measured.length, 1);
    assert.equal(score.not_measured[0].why, 'no such check ran');
  });
});

describe('passed requires all four conditions', () => {
  const cleanArgs = {
    findings: [finding()],
    results: [ran('metadata.title')],
    records: [record()],
  };
  const cleanCase = benchCase({ expected_findings: [{ check_id: 'metadata.title', location: 'index.html' }] });

  it('passes when there are no false positives, no misses, and no evidence or safety problems', () => {
    const score = scoreCase(cleanCase, cleanArgs);
    assert.deepEqual(score.counts, {
      true_positives: 1,
      false_positives: 0,
      false_negatives: 0,
      true_negatives: 0,
    });
    assert.deepEqual(score.evidence_problems, []);
    assert.deepEqual(score.safety_problems, []);
    assert.equal(score.passed, true);
  });

  it('fails on a false positive alone', () => {
    const score = scoreCase(cleanCase, {
      ...cleanArgs,
      findings: [finding(), finding({ location: 'extra.html:9' })],
    });
    assert.equal(score.counts.false_positives, 1);
    assert.equal(score.counts.false_negatives, 0);
    assert.equal(score.passed, false);
  });

  it('fails on a false negative alone', () => {
    const score = scoreCase(
      benchCase({
        expected_findings: [
          { check_id: 'metadata.title', location: 'index.html' },
          { check_id: 'metadata.title', location: 'missed.html' },
        ],
      }),
      cleanArgs,
    );
    assert.equal(score.counts.false_positives, 0);
    assert.equal(score.counts.false_negatives, 1);
    assert.equal(score.passed, false);
  });

  it('fails on an evidence problem alone: a finding that carries no evidence', () => {
    const score = scoreCase(cleanCase, { ...cleanArgs, findings: [finding({ evidence: [] })] });
    assert.equal(score.counts.false_positives, 0);
    assert.equal(score.counts.false_negatives, 0);
    assert.deepEqual(score.evidence_problems, [{ finding: 'metadata.title', problem: 'no evidence attached' }]);
    assert.equal(score.passed, false);
  });

  it('fails on an evidence problem alone: an evidence type the requirement never declares', () => {
    const score = scoreCase(cleanCase, {
      ...cleanArgs,
      findings: [finding({ evidence: [{ type: 'RENDERED_HTML' }] })],
    });
    assert.deepEqual(score.evidence_problems, [
      { finding: 'metadata.title', problem: 'evidence type RENDERED_HTML not declared by SEO-0001' },
    ]);
    assert.equal(score.passed, false);
  });

  it('fails on a safety problem alone: expected_safe_fixes naming a REVIEW_REQUIRED record', () => {
    const score = scoreCase(benchCase({ ...cleanCase, expected_safe_fixes: ['SEO-0001'] }), cleanArgs);
    assert.equal(score.counts.false_positives, 0);
    assert.equal(score.counts.false_negatives, 0);
    assert.deepEqual(score.safety_problems, [
      { id: 'SEO-0001', problem: 'expected SAFE_AUTOMATIC, registry says REVIEW_REQUIRED' },
    ]);
    assert.equal(score.passed, false);
  });

  it('fails on a safety problem alone: expected_blocked naming a SAFE_AUTOMATIC record', () => {
    const score = scoreCase(benchCase({ ...cleanCase, expected_blocked: ['SEO-0002'] }), {
      ...cleanArgs,
      records: [record(), record({ id: 'SEO-0002', change_safety: 'SAFE_AUTOMATIC' })],
    });
    assert.deepEqual(score.safety_problems, [
      { id: 'SEO-0002', problem: 'expected BLOCKED or REVIEW_REQUIRED, registry says SAFE_AUTOMATIC' },
    ]);
    assert.equal(score.passed, false);
  });

  it('fails when a safety expectation names an id that is not in the registry at all', () => {
    const score = scoreCase(benchCase({ ...cleanCase, expected_safe_fixes: ['SEO-9999'] }), cleanArgs);
    assert.deepEqual(score.safety_problems, [{ id: 'SEO-9999', problem: 'not in registry' }]);
    assert.equal(score.passed, false);
  });

  it('accepts BLOCKED as well as REVIEW_REQUIRED for expected_blocked', () => {
    const score = scoreCase(benchCase({ ...cleanCase, expected_blocked: ['SEO-0001'] }), {
      ...cleanArgs,
      records: [record({ change_safety: 'BLOCKED' })],
    });
    assert.deepEqual(score.safety_problems, []);
    assert.equal(score.passed, true);
  });

  it('does not fail on not_measured, which is reported separately', () => {
    const score = scoreCase(
      benchCase({ ...cleanCase, expected_non_findings: ['runtime.canonical'] }),
      { ...cleanArgs, results: [ran('metadata.title'), ran('runtime.canonical', 'NEEDS_RUNTIME')] },
    );
    assert.equal(score.not_measured.length, 1);
    assert.equal(score.passed, true);
  });
});

describe('rates are null when the denominator is zero', () => {
  it('reports every rate as null for an empty case', () => {
    const score = scoreCase(benchCase(), { findings: [], results: [] });
    assert.deepEqual(score.counts, {
      true_positives: 0,
      false_positives: 0,
      false_negatives: 0,
      true_negatives: 0,
    });
    assert.equal(score.precision, null);
    assert.equal(score.recall, null);
    assert.equal(score.false_positive_rate, null);
    assert.equal(score.false_negative_rate, null);
  });

  it('nulls only the rates whose denominator is empty', () => {
    // One true positive and one miss: precision and recall exist; the
    // false-positive rate has no fp+tn denominator and stays null.
    const score = scoreCase(
      benchCase({
        expected_findings: [
          { check_id: 'metadata.title', location: 'index.html' },
          { check_id: 'metadata.title', location: 'missed.html' },
        ],
      }),
      { findings: [finding()], results: [ran('metadata.title')] },
    );
    assert.equal(score.precision, 1);
    assert.equal(score.recall, 0.5);
    assert.equal(score.false_negative_rate, 0.5);
    assert.equal(score.false_positive_rate, null);
  });

  it('never substitutes zero for an unmeasured rate', () => {
    const score = scoreCase(benchCase(), { findings: [], results: [] });
    for (const key of ['precision', 'recall', 'false_positive_rate', 'false_negative_rate']) {
      assert.notEqual(score[key], 0, `${key} must be null, not a flattering zero`);
    }
  });
});

describe('aggregate pools raw counts rather than averaging cases', () => {
  it('pools totals across cases instead of averaging their rates', () => {
    const a = scoreCase(benchCase({ id: 'a', expected_findings: [{ check_id: 'c' }] }), {
      findings: [finding({ check_id: 'c' })],
      results: [ran('c')],
    });
    const b = scoreCase(benchCase({ id: 'b' }), {
      findings: [finding({ check_id: 'c' }), finding({ check_id: 'c', location: 'x.html:1' })],
      results: [ran('c')],
    });
    const total = aggregate([a, b]);
    assert.deepEqual(total.counts.true_positives, 1);
    assert.deepEqual(total.counts.false_positives, 2);
    assert.equal(total.case_count, 2);
    assert.equal(total.cases_passed, 1);
    // Pooled: 1 / (1 + 2). Averaging the per-case precisions would give 0.5.
    assert.equal(total.precision, 0.3333);
  });

  it('keeps a pooled rate null when its denominator is empty across every case', () => {
    const empty = scoreCase(benchCase(), { findings: [], results: [] });
    const total = aggregate([empty, empty]);
    assert.equal(total.precision, null);
    assert.equal(total.recall, null);
    assert.equal(total.false_positive_rate, null);
    assert.equal(total.false_negative_rate, null);
    assert.equal(total.verification_accuracy, null);
  });
});
