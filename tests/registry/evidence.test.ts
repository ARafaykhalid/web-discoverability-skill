/**
 * Evidence integrity: tier/source agreement, tier-D handling, experimental
 * labelling, and source manifest hygiene.
 *
 * No test here touches the network. `date_checked` freshness is compared against
 * the machine clock (`new Date()`), the same UTC-day convention validate.ts
 * uses, so the suite cannot rot into asserting a hard-coded "today".
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { loadRegistry, tokenSimilarity } from '../../tools/lib/registry.ts';
import { validate } from '../../tools/lib/validate.ts';
import {
  EVIDENCE_TIERS,
  EVIDENCE_TIER_VALUES,
  EXPERIMENTAL_CATEGORIES,
  SOURCE_TYPES,
  STABILITY,
  TIERS_REQUIRING_SOURCES,
} from '../../tools/lib/model.ts';

const { records } = loadRegistry();
const TODAY = new Date().toISOString().slice(0, 10);

function assertPopulated(list, what) {
  assert.ok(
    Array.isArray(list) && list.length > 0,
    `${what} is empty, so every per-item assertion below would pass without inspecting anything`,
  );
}

function where(record) {
  return `${record.__file ?? '?'}:${record.__line ?? '?'}`;
}

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

function isValidIsoDay(value) {
  const text = String(value);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) return false;
  const [y, m, d] = text.split('-').map(Number);
  const parsed = new Date(Date.UTC(y, m - 1, d));
  return parsed.getUTCFullYear() === y && parsed.getUTCMonth() === m - 1 && parsed.getUTCDate() === d;
}

const externalClaim = records.filter((r) => TIERS_REQUIRING_SOURCES.includes(r.evidence_tier));
const allSources = records.flatMap((r) => (r.sources || []).map((source, index) => ({ record: r, source, index })));

describe('sources are required where a tier makes an external claim', () => {
  it('every record whose evidence_tier requires sources cites at least one', () => {
    assertPopulated(records, 'the promoted registry');
    assertPopulated(externalClaim, `the set of records with evidence_tier in ${TIERS_REQUIRING_SOURCES.join('/')}`);
    const uncited = externalClaim
      .filter((r) => !Array.isArray(r.sources) || r.sources.length === 0)
      .map((r) => `${r.id} (${where(r)}) is tier ${r.evidence_tier} with no sources`);
    assert.deepEqual(
      uncited,
      [],
      `tiers ${TIERS_REQUIRING_SOURCES.join('/')} assert external platform behaviour. An uncited external claim is `
        + 'indistinguishable from a guess, which is the exact failure the tier system exists to prevent',
    );
  });

  it('an uncited external-tier record is rejected, and INTERNAL asserts no external behaviour', () => {
    const probe = isolatedRecord(externalClaim[0]);
    delete probe.sources;
    assert.ok(
      rulesFrom(validate({ records: [probe] })).has('sources-required'),
      'the sources-required rule must keep firing; without it an external claim could ship with no citation',
    );

    const internal = records.filter((r) => r.evidence_tier === 'INTERNAL');
    const wrong = internal
      .filter((r) => Array.isArray(r.sources) && r.sources.length > 0)
      .map((r) => `${r.id} (${where(r)}) is INTERNAL but cites ${r.sources.length} source(s)`);
    assert.deepEqual(
      wrong,
      [],
      `INTERNAL means "${EVIDENCE_TIERS.INTERNAL}" - citing an external document contradicts that and produces `
        + 'the sources-internal warning',
    );
  });
});

describe('source-tier-support', () => {
  it("each record's evidence_tier is backed by at least one citation graded that strongly", () => {
    assertPopulated(externalClaim, 'the set of records that must cite sources');
    const unsupported = [];
    for (const record of externalClaim) {
      const sources = record.sources || [];
      if (!sources.length) continue; // reported by the sources-required test above
      const tiers = sources.map((s) => s?.tier).filter(Boolean);
      if (!tiers.length) {
        unsupported.push(`${record.id} (${where(record)}) cites sources but none carries a tier`);
        continue;
      }
      if (!tiers.includes(record.evidence_tier)) {
        unsupported.push(
          `${record.id} (${where(record)}) claims tier ${record.evidence_tier} but its citations are graded ${tiers.join(', ')}`,
        );
      }
    }
    assert.deepEqual(
      unsupported,
      [],
      'a record may not claim stronger evidence than any of its citations provides. Tier A with only tier B '
        + 'citations presents "strong consensus" as "official specification", which is the difference between '
        + 'a fact and an inference',
    );
  });

  it('every citation tier is a known tier value', () => {
    assertPopulated(allSources, 'the set of cited sources');
    const bad = allSources
      .filter(({ source }) => !EVIDENCE_TIER_VALUES.includes(source.tier))
      .map(({ record, source, index }) => `${record.id} sources[${index}].tier=${JSON.stringify(source.tier)}`);
    assert.deepEqual(bad, [], `citation tiers must come from ${EVIDENCE_TIER_VALUES.join(', ')}`);
  });

  it('the same URL may carry different tiers on different records (per-record grading, not per-URL authority)', () => {
    /*
     * A citation's tier grades how strongly that source supports *this record's*
     * claim, not how authoritative the document is in general (see the
     * EVIDENCE_TIERS doc comment in model.ts). One Google doc can therefore be
     * tier A for a behaviour it states outright and tier B for one it only
     * implies. This test exists so nobody "normalizes" tiers per URL: that would
     * force every record citing a strong document to claim tier A whether the
     * document supports its specific claim that strongly or not.
     */
    const base = records.find(
      (r) => (r.sources || []).length === 1 && !EXPERIMENTAL_CATEGORIES.includes(r.category) && r.evidence_tier === 'A',
    );
    assert.ok(base, 'expected at least one non-experimental tier-A record with exactly one source to build a probe from');

    // A second, textually unrelated record so corpus-level duplicate rules stay quiet.
    const other = records
      .filter((r) => r.id !== base.id && !EXPERIMENTAL_CATEGORIES.includes(r.category))
      .map((r) => [tokenSimilarity(base.title, r.title), r])
      .sort((a, b) => a[0] - b[0])[0][1];

    const sharedUrl = base.sources[0].url;
    const strong = isolatedRecord(base, { id: 'SEO-9001', evidence_tier: 'A' });
    strong.sources = [{ ...base.sources[0], tier: 'A' }];
    const weak = isolatedRecord(other, { id: 'SEO-9002', evidence_tier: 'B' });
    weak.sources = [{ ...base.sources[0], tier: 'B' }];
    delete weak.caution;

    const result = validate({ records: [strong, weak] });
    const tierErrors = result.errors.filter(
      (e) => e.rule.startsWith('source-tier') || e.message.includes(sharedUrl),
    );
    assert.deepEqual(
      tierErrors.map((e) => `${e.id} ${e.rule}: ${e.message}`),
      [],
      `citing ${sharedUrl} at tier A on one record and tier B on another must remain legal. If a per-URL tier `
        + 'constant is ever introduced, tiers stop describing evidential support for a specific claim and the '
        + 'source-tier-support rule loses its meaning',
    );
  });
});

describe('tier D is quarantined', () => {
  const tierD = records.filter((r) => r.evidence_tier === 'D');

  it('tier-d-confidence: no tier-D record claims HIGH confidence', () => {
    const probe = isolatedRecord(externalClaim[0], { evidence_tier: 'D', confidence: 'HIGH', caution: 'Probe caution.' });
    assert.ok(
      rulesFrom(validate({ records: [probe] })).has('tier-d-confidence'),
      'the tier-d-confidence rule must keep firing, otherwise speculative material can be presented as settled',
    );
    const bad = tierD
      .filter((r) => r.confidence === 'HIGH')
      .map((r) => `${r.id} (${where(r)}) is tier D with HIGH confidence`);
    assert.deepEqual(
      bad,
      [],
      `tier D is "${EVIDENCE_TIERS.D}" - HIGH confidence in an unproven mechanism is a contradiction, and it is `
        + 'what makes a report read as fact when it is a hypothesis',
    );
  });

  it('tier-d-caution: every tier-D record states what is unproven', () => {
    const probe = isolatedRecord(externalClaim[0], { evidence_tier: 'D', confidence: 'MEDIUM' });
    delete probe.caution;
    assert.ok(
      rulesFrom(validate({ records: [probe] })).has('tier-d-caution'),
      'the tier-d-caution rule must keep firing, otherwise a speculative requirement can ship with no warning',
    );
    const bare = tierD
      .filter((r) => typeof r.caution !== 'string' || !r.caution.trim())
      .map((r) => `${r.id} (${where(r)}) is tier D with no caution`);
    assert.deepEqual(
      bare,
      [],
      'a tier-D requirement without a caution hands the reader a speculative instruction with no way to know it '
        + 'is speculative',
    );
  });
});

describe('experimental categories', () => {
  const experimental = records.filter((r) => EXPERIMENTAL_CATEGORIES.includes(r.category));

  it('validate() enforces the experimental labelling rules', () => {
    assertPopulated(EXPERIMENTAL_CATEGORIES, 'EXPERIMENTAL_CATEGORIES');
    const category = EXPERIMENTAL_CATEGORIES[0];
    const probe = isolatedRecord(externalClaim[0], {
      category,
      evidence_tier: 'A',
      confidence: 'HIGH',
      change_safety: 'SAFE_AUTOMATIC',
      impact: 'MEDIUM',
    });
    const rules = rulesFrom(validate({ records: [probe] }));
    for (const rule of ['experimental-tier', 'experimental-confidence', 'experimental-safety']) {
      assert.ok(
        rules.has(rule),
        `expected ${rule} to fire for a ${category} record labelled as settled, got: ${[...rules].join(', ') || 'no errors'}`,
      );
    }
  });

  it('every record in an experimental category is labelled experimental', () => {
    const problems = [];
    for (const record of experimental) {
      if (!['C', 'D'].includes(record.evidence_tier)) {
        problems.push(`${record.id} (${where(record)}) is ${record.category} but evidence_tier ${record.evidence_tier}`);
      }
      if (record.confidence === 'HIGH') {
        problems.push(`${record.id} (${where(record)}) is ${record.category} but claims HIGH confidence`);
      }
      if (record.change_safety === 'SAFE_AUTOMATIC' && record.impact !== 'LOW') {
        problems.push(`${record.id} (${where(record)}) is experimental, SAFE_AUTOMATIC, and ${record.impact} impact`);
      }
    }
    assert.deepEqual(
      problems,
      [],
      `categories ${EXPERIMENTAL_CATEGORIES.join(', ')} are experimental by construction. Presenting one as tier `
        + 'A/B or HIGH confidence erases the distinction between established technical SEO and a hypothesis about '
        + 'retrieval systems',
    );
  });
});

describe('source manifest hygiene', () => {
  it('every source has an absolute https URL that parses', () => {
    assertPopulated(allSources, 'the set of cited sources');
    const bad = [];
    for (const { record, source, index } of allSources) {
      const at = `${record.id} sources[${index}]`;
      if (typeof source.url !== 'string' || !source.url.trim()) {
        bad.push(`${at}.url is missing`);
        continue;
      }
      let parsed;
      try {
        parsed = new URL(source.url);
      } catch {
        bad.push(`${at}.url is not an absolute URL: ${JSON.stringify(source.url)}`);
        continue;
      }
      if (parsed.protocol !== 'https:') bad.push(`${at}.url is not https: ${source.url}`);
      if (!parsed.hostname.includes('.')) bad.push(`${at}.url has no public hostname: ${source.url}`);
    }
    assert.deepEqual(
      bad,
      [],
      'a citation that cannot be resolved by a reader is not a citation. Absolute https URLs are also what the '
        + 'source-freshness tooling re-checks, so a relative or malformed URL silently drops out of that sweep',
    );
  });

  it('every source names an organization, a title, and a known type, and declares official', () => {
    assertPopulated(allSources, 'the set of cited sources');
    const bad = [];
    for (const { record, source, index } of allSources) {
      const at = `${record.id} sources[${index}]`;
      for (const field of ['organization', 'title']) {
        if (typeof source[field] !== 'string' || !source[field].trim()) bad.push(`${at}.${field} is missing`);
      }
      if (!SOURCE_TYPES.includes(source.type)) bad.push(`${at}.type=${JSON.stringify(source.type)} is not a known source type`);
      if (typeof source.official !== 'boolean') bad.push(`${at}.official must be a boolean, got ${JSON.stringify(source.official)}`);
      if (source.official === false && source.type === 'PLATFORM_DOCUMENTATION') {
        bad.push(`${at} is PLATFORM_DOCUMENTATION but official is false`);
      }
    }
    assert.deepEqual(
      bad,
      [],
      'organization, title, and type are how a reader judges a citation without opening it, and `official` is '
        + 'what separates first-party documentation from commentary',
    );
  });

  it('every date_checked is a real ISO day and is not in the future', () => {
    assertPopulated(allSources, 'the set of cited sources');
    const bad = [];
    for (const { record, source, index } of allSources) {
      const at = `${record.id} sources[${index}].date_checked`;
      if (!isValidIsoDay(source.date_checked)) {
        bad.push(`${at}=${JSON.stringify(source.date_checked)} is not a valid YYYY-MM-DD calendar date`);
        continue;
      }
      if (String(source.date_checked) > TODAY) {
        bad.push(`${at}=${source.date_checked} is after today (${TODAY})`);
      }
    }
    assert.deepEqual(
      bad,
      [],
      `date_checked is the claim "someone read this source on this day". A future date cannot be true, and an `
        + 'unparseable one removes the record from staleness reporting entirely',
    );
  });

  it('review metadata carries a real non-future verification date and the interval its stability implies', () => {
    assertPopulated(records, 'the promoted registry');
    const bad = [];
    for (const record of records) {
      const review = record.review || {};
      if (!isValidIsoDay(review.last_verified)) {
        bad.push(`${record.id} review.last_verified=${JSON.stringify(review.last_verified)} is not a valid ISO day`);
      } else if (String(review.last_verified) > TODAY) {
        bad.push(`${record.id} review.last_verified=${review.last_verified} is after today (${TODAY})`);
      }
      const expected = STABILITY[review.stability];
      if (expected === undefined) {
        bad.push(`${record.id} review.stability=${JSON.stringify(review.stability)} is not a known stability class`);
      } else if (review.interval_days !== expected) {
        bad.push(`${record.id} review.interval_days=${JSON.stringify(review.interval_days)} should be ${expected} for ${review.stability}`);
      }
      if (typeof review.owner !== 'string' || !review.owner.trim()) {
        bad.push(`${record.id} review.owner is missing, so nobody is accountable for re-checking the evidence`);
      }
    }
    assert.deepEqual(
      bad,
      [],
      'review metadata is what makes staleness detectable. A future date, an unknown stability class, or a '
        + 'mismatched interval all mean the requirement will never be re-verified on schedule',
    );
  });
});
