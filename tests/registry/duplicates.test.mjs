/**
 * Near-duplicate detection.
 *
 * Two things are tested here, and the second matters more than the first:
 *   1. the current registry contains no near-duplicate or subsumed titles;
 *   2. the similarity primitives themselves still behave, so (1) cannot pass
 *      because the detector silently degraded to "always zero".
 *
 * The validator compares *titles* (validate.mjs validateCorpus, rules
 * title-near-duplicate and title-subsumed), so that is the contract mirrored here.
 */
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { loadRegistry, isSubsumed, tokenSimilarity, normalizeText } from '../../tools/lib/registry.mjs';
import { DUPLICATE_THRESHOLD } from '../../tools/lib/validate.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const VALIDATE_SOURCE = join(HERE, '..', '..', 'tools', 'lib', 'validate.mjs');

const { records } = loadRegistry();

/**
 * validate.mjs keeps STOPWORDS module-private, and `isSubsumed` takes the set as
 * an argument, so the only way to test the registry against the validator's real
 * semantics is to mirror the list. The drift guard below re-reads the source and
 * fails if the two ever diverge.
 */
const STOPWORDS = new Set([
  'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'do', 'for', 'from', 'in', 'is',
  'it', 'not', 'of', 'on', 'or', 'that', 'the', 'to', 'when', 'with', 'without',
  'use', 'using', 'ensure', 'provide', 'keep', 'make', 'set',
]);

function assertPopulated(list, what) {
  assert.ok(
    (Array.isArray(list) ? list.length : (list?.size ?? 0)) > 0,
    `${what} is empty, so every per-item assertion below would pass without inspecting anything`,
  );
}

describe('similarity primitives', () => {
  it('the mirrored STOPWORDS list still matches validate.mjs', () => {
    const source = readFileSync(VALIDATE_SOURCE, 'utf8');
    const block = /const STOPWORDS = new Set\(\[([\s\S]*?)\]\)/.exec(source);
    assert.ok(block, 'could not find the STOPWORDS definition in tools/lib/validate.mjs; update this mirror');
    const words = [...block[1].matchAll(/'([^']+)'/g)].map((m) => m[1]);
    assertPopulated(words, 'the STOPWORDS list parsed out of validate.mjs');
    assert.deepEqual(
      words.slice().sort(),
      [...STOPWORDS].sort(),
      'validate.mjs STOPWORDS changed. isSubsumed takes the set as an argument, so this suite would otherwise '
        + 'test subsumption with a different stopword list than the validator uses and could go green while '
        + '`wds validate` fails (or the reverse)',
    );
  });

  it('DUPLICATE_THRESHOLD is a usable Jaccard threshold', () => {
    assert.equal(typeof DUPLICATE_THRESHOLD, 'number');
    assert.ok(
      DUPLICATE_THRESHOLD > 0 && DUPLICATE_THRESHOLD < 1,
      `DUPLICATE_THRESHOLD must sit strictly between 0 and 1 to mean anything as a Jaccard cutoff (got ${DUPLICATE_THRESHOLD})`,
    );
  });

  it('tokenSimilarity returns 1 for identical text regardless of case and punctuation', () => {
    assert.equal(tokenSimilarity('Serve one canonical URL per page', 'Serve one canonical URL per page'), 1);
    assert.equal(
      tokenSimilarity('Serve one canonical URL per page', '  serve, ONE -- canonical url per page!  '),
      1,
      'normalization happens before comparison, so formatting differences must not lower the score',
    );
  });

  it('tokenSimilarity returns 0 for token-disjoint text', () => {
    assert.equal(tokenSimilarity('alpha beta gamma', 'delta epsilon zeta'), 0);
    assert.equal(tokenSimilarity('', 'delta epsilon zeta'), 0, 'an empty side must score 0, not NaN');
    assert.equal(tokenSimilarity(null, undefined), 0, 'missing text must score 0 rather than throwing');
  });

  it('tokenSimilarity scores a known near-duplicate pair above DUPLICATE_THRESHOLD', () => {
    const a = 'Serve one canonical URL per page';
    const b = 'Serve one canonical URL for every page';
    const score = tokenSimilarity(a, b);
    assert.equal(score, 5 / 8, `Jaccard over word sets must be exact and stable; got ${score}`);
    assert.ok(
      score >= DUPLICATE_THRESHOLD,
      `a reworded restatement must be caught: ${JSON.stringify(a)} vs ${JSON.stringify(b)} scored ${score.toFixed(3)}, `
        + `below the ${DUPLICATE_THRESHOLD} threshold. If this drops, near-duplicate detection has stopped working `
        + 'and the registry sweep below becomes meaningless',
    );
  });

  it('tokenSimilarity is order-insensitive and stays below threshold for genuinely different titles', () => {
    assert.equal(
      tokenSimilarity('canonical url per page', 'page per url canonical'),
      1,
      'Jaccard over sets must be robust to reordering, which is the reason it replaced SequenceMatcher',
    );
    const score = tokenSimilarity('Serve one canonical URL per page', 'Declare hreflang annotations for every locale');
    assert.ok(
      score < DUPLICATE_THRESHOLD,
      `unrelated titles must stay well below the threshold or the rule would block legitimate additions (got ${score.toFixed(3)})`,
    );
  });

  it('isSubsumed is true only when the left title adds no meaningful word', () => {
    const narrow = 'Declare a canonical URL';
    const wide = 'Declare a canonical URL on every paginated listing page';
    assert.equal(
      isSubsumed(narrow, wide, STOPWORDS),
      true,
      `${JSON.stringify(narrow)} contributes no token that ${JSON.stringify(wide)} lacks, so it is a subset duplicate`,
    );
    assert.equal(
      isSubsumed(wide, narrow, STOPWORDS),
      false,
      'subsumption is directional: the wider title adds paginated/listing/page and is not a duplicate of the narrower one',
    );
    assert.equal(
      isSubsumed('Declare a canonical URL', 'Declare a canonical link relation', STOPWORDS),
      false,
      'a shared prefix is not subsumption when the left side still contributes a token the right side lacks',
    );
    assert.equal(
      isSubsumed('Use the canonical URL', 'Declare a canonical URL on every page', STOPWORDS),
      false,
      'after stopword removal the left side has fewer than three meaningful words, which is too little signal '
        + 'to call a duplicate; this guard is what stops short titles from matching everything',
    );
    assert.equal(isSubsumed('', 'anything at all here', STOPWORDS), false, 'empty text must never be reported as subsumed');
  });
});

describe('promoted registry has no near-duplicates', () => {
  it('no pair of titles reaches DUPLICATE_THRESHOLD, and none is subsumed by another', () => {
    assertPopulated(records, 'the promoted registry');
    const titled = records.filter((r) => typeof r.title === 'string' && r.title.trim());
    assertPopulated(titled, 'the set of promoted records with a title');
    assert.equal(titled.length, records.length, 'every promoted record must have a title to compare');

    const near = [];
    const subsumed = [];
    for (let i = 0; i < titled.length; i += 1) {
      for (let j = i + 1; j < titled.length; j += 1) {
        const a = titled[i];
        const b = titled[j];
        const score = tokenSimilarity(a.title, b.title);
        if (score >= DUPLICATE_THRESHOLD) {
          near.push(`${a.id} vs ${b.id} scored ${score.toFixed(3)}: ${JSON.stringify(a.title)} / ${JSON.stringify(b.title)}`);
          continue;
        }
        if (isSubsumed(a.title, b.title, STOPWORDS)) {
          subsumed.push(`${a.id} is contained in ${b.id}: ${JSON.stringify(a.title)} < ${JSON.stringify(b.title)}`);
        } else if (isSubsumed(b.title, a.title, STOPWORDS)) {
          subsumed.push(`${b.id} is contained in ${a.id}: ${JSON.stringify(b.title)} < ${JSON.stringify(a.title)}`);
        }
      }
    }
    assert.deepEqual(
      near,
      [],
      `titles at or above ${DUPLICATE_THRESHOLD} Jaccard similarity are the same requirement written twice; two `
        + 'records that overlap this much cannot be independently satisfied or independently reported',
    );
    assert.deepEqual(
      subsumed,
      [],
      'one title is fully contained in another, so satisfying the wider record already satisfies the narrower one '
        + 'and the audit would double-count the same control',
    );
  });

  it('titles are distinct exactly, and after normalization', () => {
    assertPopulated(records, 'the promoted registry');
    const exact = new Map();
    const normal = new Map();
    const problems = [];
    for (const record of records) {
      if (exact.has(record.title)) problems.push(`${record.id} repeats the title of ${exact.get(record.title)} verbatim`);
      else exact.set(record.title, record.id);
      const key = normalizeText(record.title);
      if (normal.has(key)) problems.push(`${record.id} is a rewording of ${normal.get(key)}: ${JSON.stringify(record.title)}`);
      else normal.set(key, record.id);
    }
    assert.deepEqual(
      problems,
      [],
      'duplicate titles make two registry entries indistinguishable in every report the tooling generates',
    );
  });
});
