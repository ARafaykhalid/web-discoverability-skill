import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { ROOT } from './registry.ts';
import { loadSnapshot } from './snapshot.ts';
import { runChecks, loadChecks } from './checks/index.ts';
import { selectRequirements } from './select.ts';

/**
 * Benchmark scoring.
 *
 * A benchmark case is a fixture project with declared defects and declared
 * clean areas. Scoring compares what the checks actually reported against both,
 * which is what makes precision, recall, and the false-positive rate real
 * numbers rather than adjectives.
 *
 * Deliberate limitation, stated in benchmarks/README.md and in every generated
 * report: these figures measure the *checked subset* of the registry against
 * *fixture* projects. They say nothing about search rankings or AI answer
 * inclusion, and they are not evidence that the skill improves either.
 */

export const BENCHMARKS_DIR = join(ROOT, 'benchmarks', 'cases');

function normalizeLocation(value) {
  return String(value ?? '')
    .replace(/\\/g, '/')
    .replace(/^\.\//, '')
    .trim();
}

/** An expected item may be a bare check id or an object with a location. */
function normalizeExpectation(item) {
  if (typeof item === 'string') return { check_id: item, location: null, requirement_id: null };
  return {
    check_id: item.check_id ?? null,
    location: item.location ? normalizeLocation(item.location) : null,
    requirement_id: item.requirement_id ?? null,
  };
}

/**
 * Location matching is suffix-based so a case can say `index.html` and match a
 * finding located at `pages/index.html:12`, but cannot match a different file.
 */
function locationMatches(expected, actual) {
  if (!expected) return true;
  const left = normalizeLocation(expected);
  const right = normalizeLocation(actual);
  if (!right) return false;
  const withoutLine = right.replace(/:\d+(-\d+)?$/, '');
  return right === left || withoutLine === left || withoutLine.endsWith(`/${left}`) || right.startsWith(`${left}:`);
}

function findingMatches(expectation, finding) {
  if (expectation.check_id && finding.check_id !== expectation.check_id) return false;
  if (expectation.requirement_id && finding.requirement_id !== expectation.requirement_id) return false;
  return locationMatches(expectation.location, finding.location);
}

/**
 * Statuses that mean the check did not inspect the fixture.
 *
 * NEEDS_RUNTIME and ERROR are self-evident. NOT_APPLICABLE belongs here for a
 * less obvious reason: a check that decided the fixture is outside its scope
 * looked at nothing, so counting it as a true negative would pad the denominator
 * of the false-positive rate with checks that could not have produced a false
 * positive in the first place. Every fixture has some - the hreflang checks on a
 * monolingual site, the review-markup checks on a site with no reviews - and
 * admitting them would make the rate look better the more irrelevant checks a
 * case listed. The case files say in prose that they do not pad the denominator;
 * this is the code that makes that true regardless of what the prose says.
 */
const DID_NOT_INSPECT = new Set<string>(['NEEDS_RUNTIME', 'NOT_APPLICABLE', 'ERROR']);

/**
 * Score one case.
 *
 * `results` are the raw check results so the score can distinguish "the check
 * ran and found nothing" (a true negative) from "the check could not run"
 * (neither a true negative nor a miss - it is reported separately as
 * not_measured, because counting it either way would be dishonest).
 */
/**
 * A scored case. `selection_problems` is attached after scoring when the case
 * pins applicability, which is why it is declared rather than inferred: the
 * scorer builds the object without it and `runBenchmarks` adds it later.
 */
export interface CaseScore {
  case_id: string;
  fixture: string;
  counts: { true_positives: number; false_positives: number; false_negatives: number; true_negatives: number };
  precision: number | null;
  recall: number | null;
  false_positive_rate: number | null;
  false_negative_rate: number | null;
  unnecessary_findings: number;
  evidence_problems: unknown[];
  safety_problems: unknown[];
  selection_problems?: unknown[];
  not_measured: unknown[];
  true_positives: unknown[];
  false_negatives: unknown[];
  false_positives: unknown[];
  passed: boolean;
  error?: string;
}

export function scoreCase(benchCase, { findings, results, records = [] }): CaseScore {
  const expected = (benchCase.expected_findings || []).map(normalizeExpectation);
  const expectedClean = (benchCase.expected_non_findings || []).map(normalizeExpectation);
  const byId = new Map(records.map((r) => [r.id, r]));
  const statusById = new Map<string, string>(results.map((r) => [r.check_id, r.status]));

  const truePositives = [];
  const falseNegatives = [];
  const matchedFindings = new Set();

  for (const expectation of expected) {
    const status = expectation.check_id ? statusById.get(expectation.check_id) : undefined;
    if (status === undefined) {
      falseNegatives.push({ ...expectation, why: 'no such check ran' });
      continue;
    }
    // A miss either way, but the reason has to be accurate: "the check declined
    // to look" and "the check looked and found nothing" send an author to two
    // different files.
    if (DID_NOT_INSPECT.has(status)) {
      falseNegatives.push({ ...expectation, why: `check status ${status}` });
      continue;
    }
    const hit = findings.findIndex((finding, index) => !matchedFindings.has(index) && findingMatches(expectation, finding));
    if (hit >= 0) {
      matchedFindings.add(hit);
      truePositives.push({ ...expectation, finding: findings[hit] });
    } else {
      falseNegatives.push({ ...expectation, why: 'check reported no matching finding' });
    }
  }

  // Anything unmatched is a false positive. Findings that hit a region the case
  // explicitly declares clean are additionally flagged, because those are the
  // ones that would cause an autonomous agent to damage working code.
  const falsePositives = [];
  findings.forEach((finding, index) => {
    if (matchedFindings.has(index)) return;
    const declaredClean = expectedClean.some((expectation) => findingMatches(expectation, finding));
    falsePositives.push({ finding, declared_clean: declaredClean });
  });

  // True negatives: a check the case says should stay silent, which ran and did.
  const trueNegatives = [];
  const notMeasured = [];
  for (const expectation of expectedClean) {
    const status = expectation.check_id ? statusById.get(expectation.check_id) : undefined;
    if (status === undefined) {
      notMeasured.push({ ...expectation, why: 'no such check ran' });
      continue;
    }
    if (DID_NOT_INSPECT.has(status)) {
      notMeasured.push({ ...expectation, why: `check status ${status}` });
      continue;
    }
    const violated = findings.some((finding) => findingMatches(expectation, finding));
    if (!violated) trueNegatives.push(expectation);
  }

  // Evidence accuracy: does each reported finding carry evidence of a type the
  // requirement actually declares? A finding with no evidence proves nothing.
  const evidenceProblems = [];
  for (const finding of findings) {
    const record = byId.get(finding.requirement_id);
    const evidence = finding.evidence;
    if (!evidence || (Array.isArray(evidence) && !evidence.length)) {
      evidenceProblems.push({ finding: finding.check_id, problem: 'no evidence attached' });
      continue;
    }
    if (record && Array.isArray(record.verification?.evidence)) {
      const declared = record.verification.evidence;
      const types = Array.isArray(evidence) ? evidence.map((e) => e.type) : [evidence.type];
      for (const type of types.filter(Boolean)) {
        if (!declared.includes(type)) {
          evidenceProblems.push({ finding: finding.check_id, problem: `evidence type ${type} not declared by ${record.id}` });
        }
      }
    }
  }

  // Safety expectations: the case names requirements that must be classified a
  // particular way. This is what stops "we found it" from becoming "so we
  // changed it" for high-impact rules.
  const safetyProblems = [];
  for (const id of benchCase.expected_safe_fixes || []) {
    const record = byId.get(id);
    if (!record) safetyProblems.push({ id, problem: 'not in registry' });
    else if (record.change_safety !== 'SAFE_AUTOMATIC') {
      safetyProblems.push({ id, problem: `expected SAFE_AUTOMATIC, registry says ${record.change_safety}` });
    }
  }
  for (const id of benchCase.expected_blocked || []) {
    const record = byId.get(id);
    if (!record) safetyProblems.push({ id, problem: 'not in registry' });
    else if (record.change_safety === 'SAFE_AUTOMATIC') {
      safetyProblems.push({ id, problem: 'expected BLOCKED or REVIEW_REQUIRED, registry says SAFE_AUTOMATIC' });
    }
  }

  const tp = truePositives.length;
  const fp = falsePositives.length;
  const fn = falseNegatives.length;
  const tn = trueNegatives.length;

  return {
    case_id: benchCase.id,
    fixture: benchCase.fixture,
    counts: { true_positives: tp, false_positives: fp, false_negatives: fn, true_negatives: tn },
    precision: tp + fp ? tp / (tp + fp) : null,
    recall: tp + fn ? tp / (tp + fn) : null,
    false_positive_rate: fp + tn ? fp / (fp + tn) : null,
    false_negative_rate: fn + tp ? fn / (fn + tp) : null,
    unnecessary_findings: falsePositives.filter((f) => f.declared_clean).length,
    evidence_problems: evidenceProblems,
    safety_problems: safetyProblems,
    not_measured: notMeasured,
    true_positives: truePositives.map((t) => ({ check_id: t.check_id, location: t.location })),
    false_negatives: falseNegatives,
    false_positives: falsePositives.map((f) => ({
      check_id: f.finding.check_id,
      requirement_id: f.finding.requirement_id,
      location: f.finding.location,
      declared_clean: f.declared_clean,
    })),
    passed:
      fn === 0 &&
      fp === 0 &&
      evidenceProblems.length === 0 &&
      safetyProblems.length === 0,
  };
}

/** Aggregate case scores. Rates are pooled over raw counts, not averaged over cases. */
export function aggregate(scores) {
  const totals = scores.reduce(
    (acc, score) => {
      acc.true_positives += score.counts.true_positives;
      acc.false_positives += score.counts.false_positives;
      acc.false_negatives += score.counts.false_negatives;
      acc.true_negatives += score.counts.true_negatives;
      acc.unnecessary_findings += score.unnecessary_findings;
      acc.evidence_problems += score.evidence_problems.length;
      acc.safety_problems += score.safety_problems.length;
      acc.selection_problems += score.selection_problems?.length ?? 0;
      acc.not_measured += score.not_measured.length;
      return acc;
    },
    {
      true_positives: 0,
      false_positives: 0,
      false_negatives: 0,
      true_negatives: 0,
      unnecessary_findings: 0,
      evidence_problems: 0,
      safety_problems: 0,
      selection_problems: 0,
      not_measured: 0,
    },
  );

  const { true_positives: tp, false_positives: fp, false_negatives: fn, true_negatives: tn } = totals;
  const round = (value) => (value === null ? null : Number(value.toFixed(4)));

  return {
    case_count: scores.length,
    cases_passed: scores.filter((s) => s.passed).length,
    counts: totals,
    precision: round(tp + fp ? tp / (tp + fp) : null),
    recall: round(tp + fn ? tp / (tp + fn) : null),
    false_positive_rate: round(fp + tn ? fp / (fp + tn) : null),
    false_negative_rate: round(fn + tp ? fn / (fn + tp) : null),
    verification_accuracy: round(tp + fp ? 1 - totals.evidence_problems / Math.max(1, tp + fp) : null),
    scope: 'checked subset of the registry, evaluated against fixture projects only',
  };
}

export function loadCases({ dir = BENCHMARKS_DIR } = {}) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir)
    .filter((name) => name.endsWith('.json'))
    .sort()
    .map((name) => ({ __file: name, ...JSON.parse(readFileSync(join(dir, name), 'utf8')) }));
}

/** Run every benchmark case and return per-case scores plus the aggregate. */
export async function runBenchmarks({ records = [], dir = BENCHMARKS_DIR, root = ROOT, only = null } = {}) {
  const cases = loadCases({ dir }).filter((benchCase) => !only || only.includes(benchCase.id));
  const checks = await loadChecks();
  const scores = [];
  const profileChecks = [];

  for (const benchCase of cases) {
    const fixtureRoot = resolve(root, benchCase.fixture);
    if (!existsSync(fixtureRoot)) {
      scores.push({
        case_id: benchCase.id,
        fixture: benchCase.fixture,
        counts: { true_positives: 0, false_positives: 0, false_negatives: 0, true_negatives: 0 },
        precision: null,
        recall: null,
        false_positive_rate: null,
        false_negative_rate: null,
        unnecessary_findings: 0,
        evidence_problems: [],
        safety_problems: [],
        not_measured: [],
        true_positives: [],
        false_negatives: [],
        false_positives: [],
        passed: false,
        error: `fixture not found: ${benchCase.fixture}`,
      });
      continue;
    }

    const snapshot = loadSnapshot(fixtureRoot);

    // The profile comes from the snapshot rather than from a second detectProfile
    // call. They resolve identically - loadSnapshot detects with the same
    // runtimeAvailable flag - so a second call could not disagree with itself, but
    // it did read the whole tree twice.
    const profile = snapshot.profile;
    const level = benchCase.level || 'ULTRA';
    const selection = selectRequirements({ records, profile, level });

    // Checks are filtered to the requirements the selector actually offered,
    // exactly as `audit` does it.
    //
    // Running every check unconditionally here would measure a code path no user
    // invokes, and it hid a real gate bug: SEO-037 was gated on has_router, which
    // is FALSE for a static site, so `audit` never ran title-distinct-across-routes
    // on a static project while the scorer ran it and counted the finding. The
    // benchmark said the check worked; the shipped command never called it. With
    // the filter in place a wrong gate surfaces as a false negative in the case
    // that depends on it, which is where it can be seen.
    const applicableIds = selection.applicable.map((entry) => entry.record.id);
    const { findings, results } = await runChecks(snapshot, { checks, requirementIds: applicableIds });
    const score = scoreCase(benchCase, { findings, results, records });
    scores.push(score);

    // A case may also pin what the profile detector must conclude. Applicability
    // errors are the upstream cause of most false positives, so they are scored.
    if (benchCase.profile_expectations) {
      const mismatches = [];
      for (const [key, want] of Object.entries(benchCase.profile_expectations)) {
        const got = key === 'framework' ? profile.framework : profile.facts?.[key]?.value;
        if (got !== want) mismatches.push({ fact: key, expected: want, actual: got ?? null });
      }
      profileChecks.push({ case_id: benchCase.id, mismatches, passed: mismatches.length === 0 });
    }

    // Selection expectations run in both directions, and both are needed.
    //
    // `expected_not_applicable` proves the skill stays silent where a rule does
    // not belong (brief section 13). On its own it is satisfiable by a selector
    // that rejects everything, so `expected_applicable` pins the other end:
    // named requirements must actually be offered on a fixture that meets their
    // conditions. UNCERTAIN fails that assertion, because a verdict of "ask for
    // evidence" is the correct answer only when the evidence is genuinely absent
    // from the project, and here the fixture supplies it.
    const wantNotApplicable = benchCase.expected_not_applicable || [];
    const wantApplicable = benchCase.expected_applicable || [];
    if (wantNotApplicable.length || wantApplicable.length) {
      const statusById = new Map(selection.evaluated.map((entry) => [entry.record.id, entry]));
      const problems = [];

      for (const id of wantNotApplicable) {
        const entry = statusById.get(id);
        if (entry?.status === 'APPLICABLE') {
          problems.push({ id, expected: 'NOT_APPLICABLE or UNCERTAIN', actual: 'APPLICABLE', problem: `selected as APPLICABLE but case says it must not apply: ${entry.reason}` });
        }
      }

      for (const id of wantApplicable) {
        const entry = statusById.get(id);
        if (!entry) {
          // Either the id is not in the registry at all, or the case level does
          // not reach it. Both are case-authoring faults, and distinguishing
          // them is what makes the message actionable.
          const known = records.some((record) => record.id === id);
          problems.push({
            id,
            expected: 'APPLICABLE',
            actual: 'not evaluated',
            problem: known
              ? `not a candidate at level ${benchCase.level || 'ULTRA'}`
              : 'not in the registry',
          });
          continue;
        }
        if (entry.status !== 'APPLICABLE') {
          problems.push({ id, expected: 'APPLICABLE', actual: entry.status, problem: `case says this fixture satisfies the rule, selector says ${entry.status}: ${entry.reason}` });
        }
      }

      score.selection_problems = problems;
      if (problems.length) score.passed = false;
    }
  }

  return {
    generated_at: new Date().toISOString(),
    checks_available: checks.length,
    profile_checks: profileChecks,
    profile_checks_passed: profileChecks.filter((p) => p.passed).length,
    ...aggregate(scores),
    cases: scores,
  };
}
