/**
 * Unit tests for the applicability engine.
 *
 * There is no `tools/lib/applicability.mjs`: the engine is split across
 * `evaluateApplicability` (tools/lib/profile.mjs), which resolves one record's
 * `applies_when` clause against a profile, and `selectRequirements` /
 * `domainActivation` / `levelIncludes` (tools/lib/select.mjs), which layer level
 * filtering and coarse domain gating on top of it. Both halves are covered here.
 *
 * Every record and profile below is synthetic. The real registry is never read,
 * so a registry edit can never turn a logic regression into a passing test.
 */

import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { evaluateApplicability, FALSE, TRUE, UNKNOWN } from '../../tools/lib/profile.mjs';
import { domainActivation, levelIncludes, selectRequirements } from '../../tools/lib/select.mjs';
import { APPLICABILITY_STATUSES, LEVELS } from '../../tools/lib/model.mjs';

/** A profile carrying only the facts a test cares about. */
function profileOf(facts) {
  return {
    schema_version: 3,
    framework: 'static-html',
    renderer: 'static',
    facts: Object.fromEntries(
      Object.entries(facts).map(([name, value]) => [name, { value, evidence: [`${name}.fixture`] }]),
    ),
    unknowns: Object.entries(facts)
      .filter(([, value]) => value === UNKNOWN)
      .map(([name]) => name),
  };
}

/** A requirement record with only the fields the selector reads. */
function recordOf(overrides = {}) {
  return { id: 'SEO-0001', domain: 'urls', minimum_level: 'LITE', applies_when: {}, ...overrides };
}

describe('cumulative level selection', () => {
  it('selects a LITE record at RECOMMENDED', () => {
    const record = recordOf({ id: 'SEO-0010', minimum_level: 'LITE' });
    assert.equal(levelIncludes('RECOMMENDED', record), true);

    const result = selectRequirements({
      records: [record],
      profile: profileOf({ public_site: TRUE }),
      level: 'RECOMMENDED',
    });
    assert.equal(result.total, 1);
    assert.deepEqual(
      result.evaluated.map((entry) => entry.record.id),
      ['SEO-0010'],
    );
  });

  it('does not select an ULTRA record at LITE', () => {
    const record = recordOf({ id: 'SEO-0011', minimum_level: 'ULTRA' });
    assert.equal(levelIncludes('LITE', record), false);

    const result = selectRequirements({
      records: [record],
      profile: profileOf({ public_site: TRUE }),
      level: 'LITE',
    });
    assert.equal(result.total, 0);
    assert.deepEqual(result.evaluated, []);
  });

  it('includes a record at its own minimum level and every level above it', () => {
    for (const minimum of LEVELS) {
      const record = recordOf({ minimum_level: minimum });
      const expected = LEVELS.slice(LEVELS.indexOf(minimum));
      for (const level of LEVELS) {
        assert.equal(
          levelIncludes(level, record),
          expected.includes(level),
          `minimum_level ${minimum} at level ${level}`,
        );
      }
    }
  });

  it('selects a LITE record at all four levels but an ULTRA record only at ULTRA', () => {
    const records = [
      recordOf({ id: 'SEO-0012', minimum_level: 'LITE' }),
      recordOf({ id: 'SEO-0013', minimum_level: 'ULTRA' }),
    ];
    const profile = profileOf({ public_site: TRUE });
    const seen = {};
    for (const level of LEVELS) {
      seen[level] = selectRequirements({ records, profile, level }).evaluated.map((e) => e.record.id);
    }
    assert.deepEqual(seen.LITE, ['SEO-0012']);
    assert.deepEqual(seen.RECOMMENDED, ['SEO-0012']);
    assert.deepEqual(seen.EXTRA, ['SEO-0012']);
    assert.deepEqual(seen.ULTRA, ['SEO-0012', 'SEO-0013']);
  });

  it('rejects a level outside the declared vocabulary instead of guessing', () => {
    assert.throws(
      () => selectRequirements({ records: [], profile: profileOf({}), level: 'PARANOID' }),
      /unknown level PARANOID/,
    );
  });
});

describe('applies_when: all', () => {
  const clause = { all: ['public_site', 'has_images'] };

  it('is APPLICABLE when every named fact is true', () => {
    const result = evaluateApplicability({ applies_when: clause }, profileOf({ public_site: TRUE, has_images: TRUE }));
    assert.equal(result.verdict, 'APPLICABLE');
    assert.deepEqual(result.blocking, []);
  });

  it('is NOT_APPLICABLE when any named fact is false', () => {
    const result = evaluateApplicability({ applies_when: clause }, profileOf({ public_site: TRUE, has_images: FALSE }));
    assert.equal(result.verdict, 'NOT_APPLICABLE');
    assert.deepEqual(
      result.blocking.map((b) => b.fact),
      ['has_images'],
    );
  });

  it('is UNCERTAIN when a named fact is unknown and none is false', () => {
    const result = evaluateApplicability(
      { applies_when: clause },
      profileOf({ public_site: TRUE, has_images: UNKNOWN }),
    );
    assert.equal(result.verdict, 'UNCERTAIN');
    assert.deepEqual(
      result.blocking.map((b) => b.fact),
      ['has_images'],
    );
  });

  it('lets a proven false outrank an unknown', () => {
    const result = evaluateApplicability(
      { applies_when: clause },
      profileOf({ public_site: FALSE, has_images: UNKNOWN }),
    );
    assert.equal(result.verdict, 'NOT_APPLICABLE');
  });
});

describe('applies_when: any', () => {
  const clause = { any: ['ecommerce', 'ugc'] };

  it('is APPLICABLE when at least one named fact is true', () => {
    const result = evaluateApplicability({ applies_when: clause }, profileOf({ ecommerce: FALSE, ugc: TRUE }));
    assert.equal(result.verdict, 'APPLICABLE');
  });

  it('lets a proven true outrank an unknown', () => {
    const result = evaluateApplicability({ applies_when: clause }, profileOf({ ecommerce: TRUE, ugc: UNKNOWN }));
    assert.equal(result.verdict, 'APPLICABLE');
  });

  it('is NOT_APPLICABLE only when every named fact is proven false', () => {
    const result = evaluateApplicability({ applies_when: clause }, profileOf({ ecommerce: FALSE, ugc: FALSE }));
    assert.equal(result.verdict, 'NOT_APPLICABLE');
    assert.deepEqual(
      result.blocking.map((b) => b.fact),
      ['ecommerce', 'ugc'],
    );
  });

  it('is UNCERTAIN when the only non-false fact is unknown', () => {
    const result = evaluateApplicability({ applies_when: clause }, profileOf({ ecommerce: UNKNOWN, ugc: FALSE }));
    assert.equal(result.verdict, 'UNCERTAIN');
  });

  it('treats an absent any clause as vacuously satisfied', () => {
    assert.equal(evaluateApplicability({ applies_when: {} }, profileOf({})).verdict, 'APPLICABLE');
    assert.equal(evaluateApplicability({ applies_when: { any: [] } }, profileOf({})).verdict, 'APPLICABLE');
  });
});

describe('applies_when: none', () => {
  const clause = { none: ['authentication'] };

  it('is NOT_APPLICABLE when an excluded fact is true', () => {
    const result = evaluateApplicability({ applies_when: clause }, profileOf({ authentication: TRUE }));
    assert.equal(result.verdict, 'NOT_APPLICABLE');
  });

  it('is APPLICABLE when an excluded fact is proven false', () => {
    const result = evaluateApplicability({ applies_when: clause }, profileOf({ authentication: FALSE }));
    assert.equal(result.verdict, 'APPLICABLE');
  });

  it('is UNCERTAIN when an excluded fact is unknown', () => {
    const result = evaluateApplicability({ applies_when: clause }, profileOf({ authentication: UNKNOWN }));
    assert.equal(result.verdict, 'UNCERTAIN');
    assert.deepEqual(
      result.blocking.map((b) => b.fact),
      ['authentication'],
    );
  });

  it('combines with all, and a violated none still wins', () => {
    const record = { applies_when: { all: ['public_site'], none: ['authentication'] } };
    assert.equal(
      evaluateApplicability(record, profileOf({ public_site: TRUE, authentication: FALSE })).verdict,
      'APPLICABLE',
    );
    assert.equal(
      evaluateApplicability(record, profileOf({ public_site: TRUE, authentication: TRUE })).verdict,
      'NOT_APPLICABLE',
    );
  });
});

describe('an unknown fact is never read as true or as false', () => {
  it('classifies an unknown gate as UNCERTAIN, a declared applicability status', () => {
    for (const clause of [{ all: ['cms'] }, { any: ['cms'] }, { none: ['cms'] }]) {
      const result = evaluateApplicability({ applies_when: clause }, profileOf({ cms: UNKNOWN }));
      assert.equal(result.verdict, 'UNCERTAIN', JSON.stringify(clause));
      assert.notEqual(result.verdict, 'APPLICABLE');
      assert.notEqual(result.verdict, 'NOT_APPLICABLE');
      assert.ok(APPLICABILITY_STATUSES.includes(result.verdict));
    }
  });

  it('treats a fact the profile never reported as unknown, not as absent-therefore-false', () => {
    const result = evaluateApplicability({ applies_when: { all: ['cms'] } }, profileOf({}));
    assert.equal(result.verdict, 'UNCERTAIN');
    assert.deepEqual(result.facts, [{ fact: 'cms', value: UNKNOWN, evidence: [] }]);
  });

  it('carries the fact evidence through so the caller can go and look', () => {
    const result = evaluateApplicability({ applies_when: { all: ['ecommerce'] } }, profileOf({ ecommerce: UNKNOWN }));
    assert.deepEqual(result.facts, [{ fact: 'ecommerce', value: UNKNOWN, evidence: ['ecommerce.fixture'] }]);
  });

  it('routes an unknown fact into selectRequirements.uncertain, not into applicable', () => {
    const record = recordOf({ id: 'SEO-0020', domain: 'urls', applies_when: { all: ['ecommerce'] } });
    const result = selectRequirements({
      records: [record],
      profile: profileOf({ public_site: TRUE, ecommerce: UNKNOWN }),
      level: 'LITE',
    });
    assert.equal(result.evaluated[0].status, 'UNCERTAIN');
    assert.match(result.evaluated[0].reason, /needs evidence: ecommerce/);
    assert.deepEqual(result.counts, { APPLICABLE: 0, NOT_APPLICABLE: 0, UNCERTAIN: 1 });
    assert.equal(result.applicable.length, 0);
    assert.equal(result.uncertain.length, 1);
  });

  it('explains a NOT_APPLICABLE with the fact that was proven absent', () => {
    const record = recordOf({ id: 'SEO-0021', domain: 'urls', applies_when: { all: ['has_images'] } });
    const result = selectRequirements({
      records: [record],
      profile: profileOf({ public_site: TRUE, has_images: FALSE }),
      level: 'LITE',
    });
    assert.equal(result.evaluated[0].status, 'NOT_APPLICABLE');
    assert.match(result.evaluated[0].reason, /condition absent: has_images/);
  });
});

describe('coarse domain activation', () => {
  it('activates an unconditional domain without consulting the profile', () => {
    assert.deepEqual(domainActivation('urls', profileOf({})), {
      state: 'active',
      reason: 'unconditional domain',
    });
  });

  it('deactivates a domain whose activation fact is proven false', () => {
    const activation = domainActivation('images', profileOf({ has_images: FALSE }));
    assert.equal(activation.state, 'inactive');
    assert.match(activation.reason, /has_images is false/);
  });

  it('leaves a domain uncertain when its activation fact is unknown or unreported', () => {
    assert.equal(domainActivation('images', profileOf({ has_images: UNKNOWN })).state, 'uncertain');
    assert.equal(domainActivation('images', profileOf({})).state, 'uncertain');
  });

  it('reports an undeclared domain rather than defaulting it active', () => {
    assert.equal(domainActivation('not-a-domain', profileOf({})).state, 'unknown-domain');
  });

  it('short-circuits records in an inactive domain to NOT_APPLICABLE', () => {
    const record = recordOf({ id: 'SEO-0030', domain: 'images' });
    const result = selectRequirements({
      records: [record],
      profile: profileOf({ public_site: TRUE, has_images: FALSE }),
      level: 'LITE',
    });
    assert.equal(result.evaluated[0].status, 'NOT_APPLICABLE');
    assert.match(result.evaluated[0].reason, /domain images inactive/);
    assert.deepEqual(result.evaluated[0].facts, []);
    assert.ok(result.inactiveDomains.includes('images'));
  });

  it('downgrades an otherwise APPLICABLE record to UNCERTAIN in an uncertain domain', () => {
    const record = recordOf({ id: 'SEO-0031', domain: 'ecommerce', applies_when: {} });
    const result = selectRequirements({
      records: [record],
      profile: profileOf({ public_site: TRUE, ecommerce: UNKNOWN }),
      level: 'LITE',
    });
    assert.equal(result.evaluated[0].status, 'UNCERTAIN');
    assert.match(result.evaluated[0].reason, /ecommerce is unknown/);
    assert.ok(result.uncertainDomains.includes('ecommerce'));
  });

  it('honours an explicit domain filter', () => {
    const records = [recordOf({ id: 'SEO-0040', domain: 'urls' }), recordOf({ id: 'SEO-0041', domain: 'metadata' })];
    const result = selectRequirements({
      records,
      profile: profileOf({ public_site: TRUE }),
      level: 'LITE',
      domains: ['metadata'],
    });
    assert.deepEqual(
      result.evaluated.map((e) => e.record.id),
      ['SEO-0041'],
    );
  });
});
