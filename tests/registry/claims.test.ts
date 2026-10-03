/**
 * Outcome-claim language.
 *
 * `findForbiddenClaims` is the only thing standing between this registry and
 * language that promises a search or AI outcome no repository change can deliver.
 * The registry sweep alone cannot prove it still works - a scanner that always
 * returned `[]` would pass - so every pattern is also exercised directly, along
 * with the disclaimer escape hatch and the clause boundary that bounds it.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { loadRegistry } from '../../tools/lib/registry.ts';
import { findForbiddenClaims } from '../../tools/lib/validate.ts';
import { FORBIDDEN_CLAIM_PATTERNS } from '../../tools/lib/model.ts';
import { assertPopulated, where } from '../helpers.ts';

const HERE = dirname(fileURLToPath(import.meta.url));
const VALIDATE_SOURCE = join(HERE, '..', '..', 'tools', 'lib', 'validate.ts');

const { records } = loadRegistry();

/** The prose fields validate.ts scans (SPECIFIC_TEXT_FIELDS plus caution and title). */
const PROSE_FIELDS = [
  ['title', (r) => r.title],
  ['statement', (r) => r.statement],
  ['rationale', (r) => r.rationale],
  ['implementation', (r) => r.implementation],
  ['verification.method', (r) => r.verification?.method],
  ['caution', (r) => r.caution],
];

/**
 * One hand-written assertion per FORBIDDEN_CLAIM_PATTERNS entry, paired with the
 * `why` that entry reports. The coverage test below fails if a pattern is added
 * without a sample, so the scanner cannot grow an untested branch.
 *
 * Every sample keeps its claim in the first clause with no disclaimer word ahead
 * of it, which is what makes the disclaimer tests meaningful.
 */
const CLAIM_SAMPLES = [
  ['Shipping this change guarantees indexing of every route.', 'no repository change guarantees a search or AI outcome'],
  ['After deployment the page will be indexed by Googlebot.', 'crawling, indexing, and citation are decided by the platform'],
  ['A valid JSON-LD block ensures rich results.', 'eligibility is not inclusion'],
  ['Compressing images boosts rankings.', 'unquantified ranking-boost claim'],
  ['This pattern is proven to increase traffic.', 'unsupported empirical claim'],
  ['This delivers a number one ranking within a week.', 'unsupported ranking claim'],
  ['The manifest guarantees AI citation.', 'AI answer inclusion is not controllable'],
  ['The adapter set is production proven at scale.', 'requires benchmark evidence this repository does not have'],
  ['This registry is the most comprehensive on the web.', 'marketing superlative, not a measurable statement'],
];

/**
 * A prohibition marker from the CLAIM_DISCLAIMER alternation in validate.ts.
 * CLAIM_DISCLAIMER itself is module-private, so the word is mirrored here and the
 * drift guard below re-reads the source to confirm it still qualifies.
 */
const DISCLAIMER_PREFIX = 'Never write that ';

/** Members of the CLAUSE_BOUNDARY character class in validate.ts. */
const CLAUSE_BOUNDARIES = ['.', ';', ':', '!', '?', ',', '(', ')', '\n', '—', '–'];

describe('registry prose makes no unsupported outcome claim', () => {
  it('no promoted record trips findForbiddenClaims in any scanned field', () => {
    assertPopulated(records, 'the promoted registry');
    let scanned = 0;
    const hits = [];
    for (const record of records) {
      for (const [field, get] of PROSE_FIELDS) {
        const value = get(record);
        if (typeof value !== 'string' || !value.trim()) continue;
        scanned += 1;
        for (const hit of findForbiddenClaims(value)) {
          hits.push(`${record.id} (${where(record)}) ${field}: "${hit.match}" in "${hit.clause}" - ${hit.why}`);
        }
      }
    }
    assert.ok(scanned > records.length, `only ${scanned} prose fields were scanned across ${records.length} records`);
    assert.deepEqual(
      hits,
      [],
      'a requirement promises an outcome the platform decides. This registry is consumed by autonomous agents '
        + 'that quote it back to users, so an unqualified promise here becomes a promise made on the reader\'s behalf',
    );
  });
});

describe('findForbiddenClaims covers every pattern', () => {
  it('every FORBIDDEN_CLAIM_PATTERNS entry has a hand-written sample', () => {
    assertPopulated(FORBIDDEN_CLAIM_PATTERNS, 'FORBIDDEN_CLAIM_PATTERNS');
    assertPopulated(CLAIM_SAMPLES, 'the hand-written claim samples');
    const missing = FORBIDDEN_CLAIM_PATTERNS
      .filter(([, why]) => !CLAIM_SAMPLES.some(([, expected]) => expected === why))
      .map(([pattern, why]) => `${pattern} (${why})`);
    assert.deepEqual(
      missing,
      [],
      'a forbidden-claim pattern has no sample in this test, so nothing proves it ever matches. Add one string '
        + 'per pattern to CLAIM_SAMPLES',
    );
    const stale = CLAIM_SAMPLES
      .filter(([, why]) => !FORBIDDEN_CLAIM_PATTERNS.some(([, expected]) => expected === why))
      .map(([text, why]) => `${JSON.stringify(text)} expects a "why" no pattern reports: ${why}`);
    assert.deepEqual(stale, [], 'a sample expects a pattern that no longer exists; remove or update it');
  });

  for (const [text, why] of CLAIM_SAMPLES) {
    it(`catches: ${JSON.stringify(text)}`, () => {
      const hits = findForbiddenClaims(text);
      assert.ok(
        hits.some((hit) => hit.why === why),
        `expected a hit explained by "${why}", got ${JSON.stringify(hits)}`,
      );
      for (const hit of hits) {
        assert.ok(hit.match && text.includes(hit.match), `reported match ${JSON.stringify(hit.match)} is not in the input`);
        assert.ok(hit.clause && hit.clause.endsWith(hit.match), `clause ${JSON.stringify(hit.clause)} must end at the match`);
      }
    });
  }

  it('a missing or non-string input yields no hits instead of throwing', () => {
    assert.deepEqual(findForbiddenClaims(undefined), []);
    assert.deepEqual(findForbiddenClaims(null), []);
    assert.deepEqual(findForbiddenClaims(''), []);
    assert.deepEqual(findForbiddenClaims('Serve one canonical URL per page.'), []);
  });
});

describe('the disclaimer escape hatch', () => {
  it('the mirrored disclaimer marker is still part of CLAIM_DISCLAIMER in validate.ts', () => {
    const source = readFileSync(VALIDATE_SOURCE, 'utf8');
    const definition = /const CLAIM_DISCLAIMER =\s*([\s\S]*?);/.exec(source);
    assert.ok(definition, 'could not find the CLAIM_DISCLAIMER definition in tools/lib/validate.ts');
    const marker = DISCLAIMER_PREFIX.trim().split(/\s+/)[0].toLowerCase();
    assert.ok(
      definition[1].includes(`|${marker}|`) || definition[1].includes(`(${marker}|`),
      `${JSON.stringify(marker)} is no longer an alternative in CLAIM_DISCLAIMER, so the prefix used by these tests `
        + `would not clear anything: ${definition[1].slice(0, 200)}`,
    );
    assert.ok(
      /CLAUSE_BOUNDARY\s*=\s*\/\[/.test(source),
      'CLAUSE_BOUNDARY is no longer a character class in validate.ts; the boundary tests below mirror it',
    );
  });

  it('a disclaimer in the same clause clears every sample', () => {
    assertPopulated(CLAIM_SAMPLES, 'the hand-written claim samples');
    for (const [text] of CLAIM_SAMPLES) {
      const disclaimed = `${DISCLAIMER_PREFIX}${text}`;
      assert.deepEqual(
        findForbiddenClaims(disclaimed),
        [],
        `${JSON.stringify(disclaimed)} prohibits the claim rather than making it. Prohibitions and disclaimers are `
          + 'the language this project wants, so the scanner must not flag them or the documentation could not '
          + 'describe its own rules',
      );
    }
    // Negation, not only prohibition, must clear a claim too.
    assert.deepEqual(
      findForbiddenClaims('Adding llms.txt does not guarantee AI visibility.'),
      [],
      'a negated claim is the honest form of the statement and must remain writable',
    );
  });

  it('clearing is bounded to the clause: a disclaimer does not license a later clause', () => {
    const [claim] = CLAIM_SAMPLES[0];
    for (const boundary of CLAUSE_BOUNDARIES) {
      const text = `Never write that${boundary} ${claim}`;
      const hits = findForbiddenClaims(text);
      assert.ok(
        hits.length > 0,
        `a disclaimer before ${JSON.stringify(boundary)} must not clear the claim after it. `
          + `${JSON.stringify(text)} produced no hits, which means one honest sentence would license every `
          + 'unsupported claim that follows it in the same field',
      );
      assert.ok(
        hits.every((hit) => !hit.clause.toLowerCase().includes('never')),
        `the reported clause must start after ${JSON.stringify(boundary)}, not swallow the disclaimer: ${JSON.stringify(hits)}`,
      );
    }
  });

  it('a disclaimer after the claim does not clear it, because only the prefix is inspected', () => {
    const hits = findForbiddenClaims('A valid JSON-LD block ensures rich results, or not.');
    assert.ok(
      hits.some((hit) => hit.why === 'eligibility is not inclusion'),
      'the scanner inspects the text before the match only; a trailing hedge does not turn an assertion into a '
        + `disclaimer, and must not clear it: ${JSON.stringify(hits)}`,
    );
  });

  /*
   * Regression: the scanner used to call `pattern.exec(value)` once per pattern,
   * so it only ever examined the *first* occurrence. When that first occurrence
   * was disclaimed it continued to the next pattern, and every later occurrence
   * of the same pattern in the same field went unexamined - so any field could
   * smuggle an outcome promise past `claim-language` by disclaiming it once
   * first. `findForbiddenClaims` now clones each pattern with the global flag and
   * judges every match on its own clause.
   */
  it('a disclaimed claim earlier in the field does not license a repeat of the same pattern later', () => {
    const text = 'Nothing here guarantees rankings. This guarantees rankings.';
    const hits = findForbiddenClaims(text);
    assert.ok(
      hits.length > 0,
      `${JSON.stringify(text)} contains an honest disclaimer followed by the exact claim it disclaims. The second `
        + 'sentence is an unsupported outcome promise and must be reported, or any field can smuggle a claim by '
        + 'disclaiming it once first',
    );
  });

  it('judges each occurrence on its own clause rather than on the first one it finds', () => {
    // Order must not matter. Both arrangements contain exactly one assertion.
    const disclaimerFirst = findForbiddenClaims('Nothing here guarantees rankings. This guarantees rankings.');
    const claimFirst = findForbiddenClaims('This guarantees rankings. Nothing here guarantees rankings.');
    assert.equal(
      disclaimerFirst.length,
      claimFirst.length,
      'the same two sentences in the opposite order must produce the same verdict; a difference means the scanner '
        + `stops at whichever it happens to meet first: ${JSON.stringify({ disclaimerFirst, claimFirst })}`,
    );

    const both = findForbiddenClaims('This guarantees rankings, and that guarantees rankings too.');
    assert.equal(
      both.length,
      2,
      `two undisclaimed occurrences of one pattern are two claims, not one: ${JSON.stringify(both)}`,
    );
  });

  it('still clears a prohibition or disclaimer at every occurrence', () => {
    assert.deepEqual(
      findForbiddenClaims('Do not guarantee rankings, and never claim it guarantees rankings.'),
      [],
      'scanning every match must not turn prohibitions into violations; both clauses carry a disclaimer marker',
    );
  });
});
