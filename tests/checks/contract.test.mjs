/**
 * The check contract.
 *
 * Every check declares a shape (id, requirements, level, title, run) and every
 * finding it emits declares a shape (requirement_id, location, evidence,
 * severity, detail). Neither shape is enforced anywhere at runtime: `loadChecks`
 * imports whatever a module default-exports, and `normalizeResult` only rescues a
 * status it does not recognise. A check with a mistyped severity, an undeclared
 * evidence type, or a requirement id that no longer exists therefore runs, scores,
 * and reports without complaint.
 *
 * This file is that enforcement. The declaration assertions run once per check.
 * The finding assertions are driven by actually running all checks against every
 * fixture under benchmarks/fixtures, because a finding's fields can only be
 * inspected on a finding that exists - and the fixtures are the only place real
 * findings come from.
 *
 * `run` is invoked directly rather than through `runChecks`, on purpose. `runChecks`
 * catches a thrown error and converts it to an ERROR result, which would turn a
 * crashing check into a quiet status rather than a failing test.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, loadRegistry } from '../../tools/lib/registry.mjs';
import { VERIFICATION_LEVELS, SEVERITIES, EVIDENCE_TYPES } from '../../tools/lib/model.mjs';
import { loadSnapshot } from '../../tools/lib/snapshot.mjs';
import { loadChecks, CHECK_STATUSES } from '../../tools/lib/checks/index.mjs';

const FIXTURES_DIR = join(ROOT, 'benchmarks', 'fixtures');

/**
 * The control fixture. Named explicitly so an empty or renamed fixtures directory
 * fails loudly instead of turning every per-fixture assertion below into a loop
 * over nothing.
 */
const REQUIRED_FIXTURE = 'clean-static';

/** Fixtures are discovered, not listed: other work adds them and this must not need editing. */
function fixtureNames() {
  if (!existsSync(FIXTURES_DIR)) return [];
  return readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

/**
 * The same normalisation `runChecks` applies, minus the error rescue.
 *
 * The check contract documents `run` as returning either a findings array or a
 * `{ status, findings, detail }` object, so both forms are accepted here. Anything
 * else is a contract violation and is left to fail the status assertion with the
 * raw value visible.
 */
function normalize(raw) {
  if (Array.isArray(raw)) return { status: raw.length ? 'FAIL' : 'PASS', findings: raw, detail: '', shape: 'array' };
  if (raw && typeof raw === 'object') {
    const findings = raw.findings ?? [];
    return {
      status: raw.status ?? (Array.isArray(findings) && findings.length ? 'FAIL' : 'PASS'),
      findings,
      detail: raw.detail ?? '',
      shape: 'object',
    };
  }
  return { status: undefined, findings: [], detail: '', shape: typeof raw };
}

/**
 * What kind of artefact a level claims to have inspected.
 *
 * `check.level` and `record.verification.level` are drawn from the same
 * vocabulary but they are not the same statement. The record's level says what
 * evidence the requirement *needs* before it may be called satisfied; the check's
 * level says what the check *reads*. Every check in this repository binds a
 * SOURCE_AND_RUNTIME record, so requiring equality would fail all of them and
 * would be asserting something no one ever claimed.
 *
 * Expressing each level as the set of artefact classes it covers makes the honest
 * relation statable: the check's set must be a subset of the record's. That
 * permits a SOURCE check to back a SOURCE_AND_RUNTIME record - the check reads a
 * repository file, the requirement additionally wants the served response
 * confirmed, and the gap is real but is under-delivery, which the coverage report
 * already discloses. It forbids the inversion, where a check advertises RUNTIME
 * evidence for a record that only ever asked for SOURCE, because there the
 * registry would be promising a verification strength derived from an artefact the
 * requirement never scoped.
 *
 * MANUAL_EXTERNAL maps to the empty set, so any check binding such a record fails
 * the non-empty assertion below: a requirement whose verification is defined as
 * external and manual cannot have its level satisfied by a static analyser, and an
 * automated check claiming otherwise is exactly the overreach the verification
 * model exists to prevent.
 */
const ARTEFACTS = {
  SOURCE: ['SOURCE'],
  RUNTIME: ['RUNTIME'],
  SOURCE_AND_RUNTIME: ['SOURCE', 'RUNTIME'],
  MANUAL_EXTERNAL: [],
};

const checks = await loadChecks();
const { records } = loadRegistry();
const byId = new Map(records.map((record) => [record.id, record]));
const fixtures = fixtureNames();

/**
 * Every check run against every fixture, once, up front.
 *
 * Running inside each `it` would re-parse four snapshots per check. Running here
 * costs one pass and lets the per-check assertions read a cached result, at the
 * price that a crash in any check fails at import rather than in a named test -
 * which is acceptable, because a check that throws on a fixture has no contract to
 * report on.
 */
const snapshots = fixtures.map((name) => ({ name, snapshot: loadSnapshot(join(FIXTURES_DIR, name)) }));
const outcomes = new Map();
for (const check of checks) {
  const perFixture = [];
  for (const { name, snapshot } of snapshots) {
    perFixture.push({ fixture: name, result: normalize(await check.run(snapshot)) });
  }
  outcomes.set(check.id, perFixture);
}

describe('check registry loads cleanly', () => {
  it('reports no load problems', () => {
    assert.deepEqual(
      checks.problems,
      [],
      'a check module that fails to export a check, or two checks sharing an id, is silently dropped from every '
        + 'report; loadChecks records that in `problems` and nothing else reads it',
    );
  });

  it('found checks to inspect', () => {
    assert.ok(checks.length > 0, 'no checks loaded, so every per-check assertion below would inspect nothing');
  });

  it('found the control fixture', () => {
    assert.ok(
      fixtures.includes(REQUIRED_FIXTURE),
      `benchmarks/fixtures must contain ${REQUIRED_FIXTURE}; without it the finding assertions run against `
        + `nothing and pass vacuously (found: ${fixtures.join(', ') || 'nothing'})`,
    );
  });

  it('has unique check ids', () => {
    const seen = new Map();
    const clashes = [];
    for (const check of checks) {
      if (seen.has(check.id)) clashes.push(`${check.id} is exported by both ${seen.get(check.id)} and ${check.__file}`);
      else seen.set(check.id, check.__file);
    }
    assert.deepEqual(
      clashes,
      [],
      'check ids are what `verification.automated_check` points at and what --only selects, so a collision makes '
        + 'one of the two checks unaddressable',
    );
  });
});

describe('every check declares a usable contract', () => {
  for (const check of checks) {
    describe(check.id || '(check with no id)', () => {
      it('has a non-empty string id', () => {
        assert.equal(typeof check.id, 'string', `check in ${check.__file} has a non-string id`);
        assert.ok(check.id.trim().length > 0, `check in ${check.__file} has a blank id`);
      });

      it('declares at least one requirement, and every one resolves', () => {
        assert.ok(Array.isArray(check.requirements), 'requirements must be an array');
        assert.ok(
          check.requirements.length > 0,
          'a check bound to no requirement produces findings that cannot be scored, because precision and recall '
            + 'are measured per requirement',
        );
        const missing = check.requirements.filter((id) => !byId.has(id));
        assert.deepEqual(
          missing,
          [],
          `${check.id} cites requirement ids that are not promoted records: ${missing.join(', ')}. A finding citing a `
            + 'deferred or removed id is unreportable',
        );
      });

      it('declares a level from the shared vocabulary', () => {
        assert.ok(
          VERIFICATION_LEVELS.includes(check.level),
          `level ${JSON.stringify(check.level)} is outside ${VERIFICATION_LEVELS.join('|')}; runChecks gates on the `
            + 'exact string "RUNTIME", so a misspelling silently disables the runtime gate',
        );
      });

      it('declares a level the bound records can support', () => {
        const mine = ARTEFACTS[check.level] ?? [];
        assert.ok(
          mine.length > 0,
          `${check.id} declares level ${check.level}, which covers no inspectable artefact; an automated check cannot `
            + 'deliver MANUAL_EXTERNAL verification',
        );
        for (const id of check.requirements) {
          const record = byId.get(id);
          if (!record) continue;
          const theirs = ARTEFACTS[record.verification?.level] ?? [];
          const excess = mine.filter((artefact) => !theirs.includes(artefact));
          assert.deepEqual(
            excess,
            [],
            `${check.id} is level ${check.level} but ${id} declares verification.level ${record.verification?.level}, `
              + `which does not cover ${excess.join(' or ')}. The registry would advertise evidence from an artefact `
              + 'the requirement never scoped',
          );
        }
      });

      it('is the designated automation for at least one of its requirements', () => {
        const designated = check.requirements.filter((id) => byId.get(id)?.verification?.automated_check === check.id);
        assert.ok(
          designated.length > 0,
          `no requirement among ${check.requirements.join(', ')} names ${check.id} in verification.automated_check, so `
            + 'the coverage report will call all of them unchecked while this check runs on every audit. Reachability '
            + 'rather than a strict two-way binding: a check may also contribute evidence to requirements it is not '
            + 'the designated automation for, and that is not a defect',
        );
      });

      it('has a non-empty title', () => {
        assert.equal(typeof check.title, 'string', 'title must be a string; it is printed verbatim in reports');
        assert.ok(check.title.trim().length > 0, 'a blank title leaves the report row unlabelled');
      });

      it('has a callable run', () => {
        assert.equal(typeof check.run, 'function', 'run must be callable');
      });
    });
  }
});

describe('every check returns a well-formed result on every fixture', () => {
  for (const check of checks) {
    for (const { fixture, result } of outcomes.get(check.id) ?? []) {
      describe(`${check.id} on ${fixture}`, () => {
        it('returns a known status and a findings array', () => {
          assert.ok(
            CHECK_STATUSES.includes(result.status),
            `status ${JSON.stringify(result.status)} is outside ${CHECK_STATUSES.join('|')} (run returned a `
              + `${result.shape})`,
          );
          assert.ok(Array.isArray(result.findings), 'findings must be an array even when empty');
        });

        it('agrees with its own findings about whether it failed', () => {
          // The two directions are separate defects. A FAIL with no findings is a
          // verdict with no evidence behind it; findings under any other status
          // are evidence the report will not attribute to a failure.
          if (result.status === 'FAIL') {
            assert.ok(
              result.findings.length > 0,
              'FAIL with no findings asserts a defect and then names none, so nothing can be fixed',
            );
          } else {
            assert.equal(
              result.findings.length,
              0,
              `status ${result.status} carries ${result.findings.length} finding(s); only FAIL means "defects found", `
                + 'and findings emitted under any other status are dropped from the verdict while still reaching '
                + 'the report',
            );
          }
        });

        it('explains any status that is neither PASS nor FAIL', () => {
          if (result.status === 'PASS' || result.status === 'FAIL') return;
          assert.equal(typeof result.detail, 'string', `${result.status} must carry a string detail`);
          assert.ok(
            result.detail.trim().length > 0,
            `${result.status} with no detail tells a reader the check did not judge but not why, which is `
              + 'indistinguishable from the check being broken',
          );
        });
      });
    }
  }
});

describe('every finding is attributable', () => {
  /** Findings from every check on every fixture, flattened with their provenance. */
  const emitted = [];
  for (const check of checks) {
    for (const { fixture, result } of outcomes.get(check.id) ?? []) {
      for (const [i, item] of (result.findings ?? []).entries()) {
        emitted.push({ check, fixture, index: i, finding: item });
      }
    }
  }

  it('the fixtures produce findings to inspect', () => {
    assert.ok(
      emitted.length > 0,
      'no fixture produced a single finding, so every assertion in this block would pass without inspecting '
        + 'anything. At least one fixture must contain defects',
    );
  });

  it('cites a requirement the check declares and the registry holds', () => {
    const problems = [];
    for (const { check, fixture, finding } of emitted) {
      if (!byId.has(finding.requirement_id)) {
        problems.push(`${check.id} on ${fixture} cites ${finding.requirement_id}, which is not a promoted record`);
        continue;
      }
      if (!check.requirements.includes(finding.requirement_id)) {
        problems.push(
          `${check.id} on ${fixture} cites ${finding.requirement_id}, which it does not declare in `
            + `requirements (${check.requirements.join(', ')})`,
        );
      }
    }
    assert.deepEqual(problems, [], problems.join('\n'));
  });

  it('carries the severity its requirement declares', () => {
    // The benchmark harness validates evidence types against the bound record and
    // never looks at severity, so a check is free to report a CRITICAL control at
    // LOW. Nothing downstream would notice, and the triage order every consumer
    // of these reports uses is severity.
    const problems = [];
    for (const { check, fixture, finding } of emitted) {
      const record = byId.get(finding.requirement_id);
      if (!record) continue;
      if (!SEVERITIES.includes(finding.severity)) {
        problems.push(`${check.id} on ${fixture} emitted severity ${JSON.stringify(finding.severity)}, which is outside ${SEVERITIES.join('|')}`);
        continue;
      }
      if (finding.severity !== record.severity) {
        problems.push(
          `${check.id} on ${fixture} reports ${finding.requirement_id} at ${finding.severity} but the record declares `
            + `${record.severity}; the registry and the report would rank the same defect differently`,
        );
      }
    }
    assert.deepEqual(problems, [], problems.join('\n'));
  });

  it('carries evidence, all of it declared by the requirement', () => {
    // Subset, never equality: `verification.evidence` lists the artefacts that
    // *may* substantiate the requirement, and a check that can honestly produce
    // two of the four is not thereby defective. Demanding all four would push
    // checks into fabricating the evidence they cannot gather, which is the
    // failure mode the whole verification model is built to prevent.
    const problems = [];
    for (const { check, fixture, finding } of emitted) {
      const record = byId.get(finding.requirement_id);
      if (!record) continue;
      const items = finding.evidence;
      if (!Array.isArray(items) || items.length === 0) {
        problems.push(`${check.id} on ${fixture} emitted a finding with no evidence; an unevidenced finding is an assertion`);
        continue;
      }
      const declared = record.verification?.evidence ?? [];
      for (const item of items) {
        if (!item || typeof item !== 'object') {
          problems.push(`${check.id} on ${fixture} emitted a non-object evidence item (${JSON.stringify(item)})`);
          continue;
        }
        if (!EVIDENCE_TYPES.includes(item.type)) {
          problems.push(`${check.id} on ${fixture} emitted evidence type ${JSON.stringify(item.type)}, which is not in the evidence vocabulary`);
          continue;
        }
        if (!declared.includes(item.type)) {
          problems.push(
            `${check.id} on ${fixture} emitted evidence type ${item.type} for ${record.id}, which declares only `
              + `${declared.join(', ') || 'nothing'}`,
          );
        }
      }
    }
    assert.deepEqual(problems, [], problems.join('\n'));
  });

  it('names a location', () => {
    const problems = [];
    for (const { check, fixture, finding } of emitted) {
      if (typeof finding.location !== 'string' || !finding.location.trim()) {
        problems.push(`${check.id} on ${fixture} emitted location ${JSON.stringify(finding.location)}; benchmark cases match locations by suffix, so a finding with none can never be attributed to a case`);
      }
    }
    assert.deepEqual(problems, [], problems.join('\n'));
  });

  it('explains itself in a sentence', () => {
    // Length is a crude proxy for a real explanation, and it is the only one
    // available without reading the prose. It is set where it is because a detail
    // shorter than this cannot state both what was observed and why that matters,
    // and those two facts are what makes a finding actionable rather than a label.
    const MIN_DETAIL = 40;
    const problems = [];
    for (const { check, fixture, finding } of emitted) {
      if (typeof finding.detail !== 'string') {
        problems.push(`${check.id} on ${fixture} emitted a non-string detail (${JSON.stringify(finding.detail)})`);
        continue;
      }
      const detail = finding.detail.trim();
      if (detail.length < MIN_DETAIL) {
        problems.push(
          `${check.id} on ${fixture} emitted a ${detail.length}-character detail ${JSON.stringify(detail)}; a finding `
            + `shorter than ${MIN_DETAIL} characters cannot say both what is wrong and why it matters`,
        );
      }
    }
    assert.deepEqual(problems, [], problems.join('\n'));
  });

  it('stamps its own check id onto every finding', () => {
    const problems = [];
    for (const { check, fixture, finding } of emitted) {
      if (finding.check_id !== check.id) {
        problems.push(`${check.id} on ${fixture} emitted a finding stamped check_id ${JSON.stringify(finding.check_id)}`);
      }
    }
    assert.deepEqual(
      problems,
      [],
      `${problems.join('\n')}\nA finding whose check_id names another check sends anyone reading the report to the `
        + 'wrong module',
    );
  });
});
