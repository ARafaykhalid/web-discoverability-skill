/**
 * Safety invariants: blast radius vs. automation, external verification vs.
 * change safety, runtime-sensitive domains, and title verifiability.
 *
 * Each rule is exercised twice: once against the live registry, and once against
 * a synthetic record run through `validate()`. The synthetic half is what stops a
 * green sweep from meaning "the rule was deleted".
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { loadRegistry } from '../../tools/lib/registry.ts';
import { validate, countControls } from '../../tools/lib/validate.ts';
import { EXPERIMENTAL_CATEGORIES, RUNTIME_SENSITIVE_DOMAINS } from '../../tools/lib/model.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const VALIDATE_SOURCE = join(HERE, '..', '..', 'tools', 'lib', 'validate.ts');

const { records } = loadRegistry();

/**
 * Mirrors the inline rule in validate.ts validateRecordShape (title-not-actionable).
 * The regex is not exported; the drift guard below re-reads the source so this
 * copy cannot fall out of step with the rule it claims to cover.
 */
const NOT_ACTIONABLE_TITLE = /^(measure|monitor|track|audit|align|consider|understand|plan)\b/i;
const NOT_ACTIONABLE_SOURCE = '/^(measure|monitor|track|audit|align|consider|understand|plan)\\b/i';

function assertPopulated(list, what) {
  assert.ok(
    Array.isArray(list) && list.length > 0,
    `${what} is empty, so every per-item assertion below would pass without inspecting anything`,
  );
}

function where(record) {
  return `${record.__file ?? '?'}:${record.__line ?? '?'}`;
}

/** A real, valid record detached from its graph edges so it can validate alone. */
function isolatedRecord(base, overrides = {}) {
  const clone = structuredClone(base);
  delete clone.depends_on;
  delete clone.conflicts_with;
  delete clone.supersedes;
  return Object.assign(clone, overrides);
}

function rulesFrom(result) {
  return new Set(result.errors.map((e) => e.rule));
}

const plainBase = records.find((r) => !EXPERIMENTAL_CATEGORIES.includes(r.category));
assert.ok(plainBase, 'expected at least one non-experimental record to build synthetic probes from');

describe('impact-safety', () => {
  it('validate() rejects a HIGH-impact change marked SAFE_AUTOMATIC', () => {
    const probe = isolatedRecord(plainBase, { impact: 'HIGH', change_safety: 'SAFE_AUTOMATIC' });
    const rules = rulesFrom(validate({ records: [probe] }));
    assert.ok(
      rules.has('impact-safety'),
      `expected impact-safety to fire, got: ${[...rules].join(', ') || 'no errors'}. Without this rule an agent `
        + 'may apply a high-blast-radius change with no human in the loop',
    );
  });

  it('no promoted record combines HIGH impact with SAFE_AUTOMATIC', () => {
    assertPopulated(records, 'the promoted registry');
    const bad = records
      .filter((r) => r.impact === 'HIGH' && r.change_safety === 'SAFE_AUTOMATIC')
      .map((r) => `${r.id} (${where(r)}) is HIGH impact and SAFE_AUTOMATIC`);
    assert.deepEqual(
      bad,
      [],
      'HIGH impact means the change can break indexing, URLs, or business facts if it is wrong. Combining that '
        + 'with SAFE_AUTOMATIC authorizes an unattended agent to make exactly the changes that need review',
    );
  });
});

describe('MANUAL_EXTERNAL implies BLOCKED', () => {
  it('every MANUAL_EXTERNAL record is change_safety BLOCKED', () => {
    assertPopulated(records, 'the promoted registry');
    const manual = records.filter((r) => r.verification?.level === 'MANUAL_EXTERNAL');
    const bad = manual
      .filter((r) => r.change_safety !== 'BLOCKED')
      .map((r) => `${r.id} (${where(r)}) verifies MANUAL_EXTERNAL but is ${r.change_safety}`);
    assert.deepEqual(
      bad,
      [],
      'if the only way to verify a requirement is outside the repository, the repository cannot implement it. '
        + 'Anything other than BLOCKED tells an agent to try, and it will either fake the evidence or fail',
    );

    const probe = isolatedRecord(plainBase, { change_safety: 'REVIEW_REQUIRED' });
    probe.verification = { ...probe.verification, level: 'MANUAL_EXTERNAL' };
    assert.ok(
      rulesFrom(validate({ records: [probe] })).has('manual-external-blocked'),
      'the manual-external-blocked rule must keep firing, otherwise the implication above is unenforced',
    );
  });

  it('the implication is one-directional: BLOCKED does not require MANUAL_EXTERNAL', () => {
    /*
     * validate.ts only checks level MANUAL_EXTERNAL -> change_safety BLOCKED.
     * The converse is deliberately absent: plenty of requirements are blocked for
     * reasons other than external verification (missing credentials, a business
     * or legal decision, facts the repository does not contain) while still being
     * verifiable from what is served.
     */
    const probe = isolatedRecord(plainBase, { change_safety: 'BLOCKED' });
    probe.verification = {
      ...probe.verification,
      level: 'SOURCE_AND_RUNTIME',
      evidence: [...new Set([...probe.verification.evidence, 'MANUAL_ACTION'])],
    };
    const result = validate({ records: [probe] });
    assert.ok(
      !rulesFrom(result).has('manual-external-blocked'),
      'a BLOCKED record with runtime verification must stay legal; requiring the converse would force every '
        + 'blocked requirement to claim it can only be verified by hand, which is false',
    );
    assert.deepEqual(
      result.errors.map((e) => `${e.rule}: ${e.message}`),
      [],
      'a BLOCKED, runtime-verified record must produce no errors at all',
    );
  });
});

describe('runtime-sensitive domains', () => {
  const affected = records.filter((r) => RUNTIME_SENSITIVE_DOMAINS.includes(r.domain));

  it('no record in a runtime-sensitive domain verifies at SOURCE level only', () => {
    assertPopulated(RUNTIME_SENSITIVE_DOMAINS, 'RUNTIME_SENSITIVE_DOMAINS');
    assertPopulated(affected, 'the set of records in runtime-sensitive domains');
    const bad = affected
      .filter((r) => r.verification?.level === 'SOURCE')
      .map((r) => `${r.id} (${where(r)}) is in ${r.domain} and verifies at SOURCE`);
    assert.deepEqual(
      bad,
      [],
      `the ${RUNTIME_SENSITIVE_DOMAINS.length} runtime-sensitive domains describe output that a head merge, an `
        + 'edge rewrite, a CDN, or hydration can override. Reading the source file proves what the repository '
        + 'intends, not what a crawler receives, so SOURCE alone is not evidence here',
    );
  });

  it('validate() rejects SOURCE-only verification in a runtime-sensitive domain, and allows it elsewhere', () => {
    const sensitiveBase = records.find(
      (r) => RUNTIME_SENSITIVE_DOMAINS.includes(r.domain) && !EXPERIMENTAL_CATEGORIES.includes(r.category),
    );
    assert.ok(sensitiveBase, 'expected at least one record in a runtime-sensitive domain');
    const sensitive = isolatedRecord(sensitiveBase);
    sensitive.verification = { ...sensitive.verification, level: 'SOURCE' };
    assert.ok(
      rulesFrom(validate({ records: [sensitive] })).has('verification-source-insufficient'),
      'the verification-source-insufficient rule must keep firing for runtime-sensitive domains',
    );

    const insensitiveBase = records.find(
      (r) => !RUNTIME_SENSITIVE_DOMAINS.includes(r.domain) && !EXPERIMENTAL_CATEGORIES.includes(r.category),
    );
    assert.ok(insensitiveBase, 'expected at least one record outside the runtime-sensitive domains');
    const insensitive = isolatedRecord(insensitiveBase, { change_safety: 'REVIEW_REQUIRED' });
    insensitive.verification = { ...insensitive.verification, level: 'SOURCE' };
    assert.ok(
      !rulesFrom(validate({ records: [insensitive] })).has('verification-source-insufficient'),
      `the rule must stay scoped to ${RUNTIME_SENSITIVE_DOMAINS.length} domains; applying it everywhere would `
        + 'force runtime capture for requirements that are genuinely settled in the repository',
    );
  });
});

describe('titles stay verifiable', () => {
  it('countControls counts the separate controls a title names', () => {
    assert.equal(countControls(''), 0, 'an empty title names no control');
    assert.equal(countControls('Serve one canonical URL'), 1, 'a plain phrase is one control');
    assert.equal(countControls('Mobile and desktop parity'), 2, '"and" separates two controls');
    assert.equal(countControls('a, b, and c'), 3, 'the JSDoc contract: "a, b, and c" is three controls');
    assert.equal(
      countControls('Declare sitemaps, canonicals, and robots directives'),
      3,
      'the empty fragment produced by ", and" must not be counted',
    );
    assert.equal(
      countControls('Serve an Android app link'),
      1,
      '"and" must only split on word boundaries, or every title containing Android would look compound',
    );
  });

  it('the mirrored not-actionable prefix still matches validate.ts', () => {
    const source = readFileSync(VALIDATE_SOURCE, 'utf8');
    assert.ok(
      source.includes(NOT_ACTIONABLE_SOURCE),
      `the title-not-actionable regex in tools/lib/validate.ts no longer reads ${NOT_ACTIONABLE_SOURCE}; update the `
        + 'mirror in this test so it keeps covering the real rule',
    );
  });

  it('the not-actionable prefix matches process verbs and nothing else', () => {
    for (const title of [
      'Measure Core Web Vitals on key templates',
      'Monitor crawl error rates',
      'Track index coverage',
      'Audit pagination URL stability',
      'Align metadata with the entity graph',
      'Consider a paywall strategy',
      'Understand crawler budget',
      'Plan the sitemap split',
    ]) {
      assert.ok(NOT_ACTIONABLE_TITLE.test(title), `${JSON.stringify(title)} states a process and must be rejected`);
    }
    for (const title of [
      'Serve one canonical URL per page',
      'Planning documents remain excluded from the sitemap',
      'Auditable change history exists for robots directives',
      'Declare a self-referential canonical on every indexable page',
    ]) {
      assert.ok(
        !NOT_ACTIONABLE_TITLE.test(title),
        `${JSON.stringify(title)} names a verifiable control and must be accepted; the rule is anchored and `
          + 'word-bounded so it must not fire on words that merely start with a process verb',
      );
    }
  });

  it('no promoted title is compound or process-shaped', () => {
    assertPopulated(records, 'the promoted registry');
    const compound = records
      .filter((r) => countControls(r.title) > 2)
      .map((r) => `${r.id} (${where(r)}) names ${countControls(r.title)} controls: ${JSON.stringify(r.title)}`);
    assert.deepEqual(
      compound,
      [],
      'a title that names three or more controls cannot be independently verified: one of the controls can pass '
        + 'while another fails and the record has no single answer',
    );

    const process = records
      .filter((r) => NOT_ACTIONABLE_TITLE.test(String(r.title).trim()))
      .map((r) => `${r.id} (${where(r)}): ${JSON.stringify(r.title)}`);
    assert.deepEqual(
      process,
      [],
      'a title that starts with a process verb describes an activity, not a state. "Monitor X" can never be '
        + 'confirmed or refuted by a check, so it cannot be audited',
    );
  });

  it('validate() rejects compound and process-shaped titles', () => {
    const compound = isolatedRecord(plainBase, { title: 'Declare sitemaps, canonicals, and robots directives' });
    assert.ok(
      rulesFrom(validate({ records: [compound] })).has('title-compound'),
      'the title-compound rule must keep firing',
    );
    const process = isolatedRecord(plainBase, { title: 'Monitor crawl error rates in the server log' });
    assert.ok(
      rulesFrom(validate({ records: [process] })).has('title-not-actionable'),
      'the title-not-actionable rule must keep firing',
    );
  });
});
