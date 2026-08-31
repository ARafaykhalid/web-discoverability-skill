/**
 * Regression: `sameUrl('/', '/')` was false, so a page whose canonical is the site
 * root was reported as disagreeing with itself.
 *
 * Cause. `sameUrl` normalises by dropping the fragment and then stripping a
 * trailing slash, and it rejects an empty result on purpose - two absent values are
 * not a match, and returning true for them would make a missing og:url agree with a
 * missing canonical. But the trailing-slash strip applied to `/` leaves the empty
 * string, so the root path was normalised into the value the function treats as
 * "nothing was supplied" and every comparison involving it returned false.
 *
 * Why it mattered. `og-url-matches-canonical` is the only caller, and its message
 * is built from the two raw values: a home page declaring `<link rel="canonical"
 * href="/">` and `<meta property="og:url" content="/">` produced
 * `og:url is / but the canonical is /; the two name different documents` - a MEDIUM
 * SEO-577 finding about one document, naming the same string twice. That is worse
 * than a missed defect: it is unfixable by construction, so an agent acting on the
 * report would edit correct markup until the two values differed.
 *
 * Fix. `base.replace(/\/$/, '') || base` in tools/lib/check-support.ts, so a trim
 * that consumes the whole value is undone. `/` addresses a page and `''` addresses
 * nothing, and the empty-result rejection that makes two missing values disagree is
 * left intact.
 *
 * The fix was already present in check-support.ts when this file was written; the
 * comment above `sameUrl` describes the defect in the past tense and nothing pinned
 * it. This is the test that would have caught it. Against the pre-fix
 * normalisation, three of the assertions below fail: the root-path pair, the root
 * with a fragment, and the end-to-end run of the check.
 *
 * No fixture would have caught it either, and that is not a coincidence. Every
 * fixture that canonicalises its home page does so absolutely, and
 * `https://example.com/` normalises to `https://example.com` - a non-empty string -
 * so the trim never consumed the whole value there. The bug was reachable only from
 * a relative root, which is what a hand-written home page most often carries.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { sameUrl } from '../../tools/lib/check-support.ts';
import checks from '../../tools/lib/checks/social-preview.ts';

const check = checks.find((c) => c.id === 'og-url-matches-canonical');

/** A home page parameterised by the two values that are supposed to agree. */
function page(canonical, ogUrl) {
  const html = `<!doctype html><html lang="en"><head><title>Ridgeline Field Notes</title>
<link rel="canonical" href="${canonical}">
<meta property="og:title" content="Ridgeline Field Notes">
<meta property="og:url" content="${ogUrl}">
</head><body><h1>Ridgeline Field Notes</h1></body></html>`;
  return { url: '/', source_file: 'index.html', raw_html: html, rendered_html: html };
}

function run(canonical, ogUrl) {
  return check.run({ pages: [page(canonical, ogUrl)] });
}

describe('the root path is an address, not an absent value', () => {
  it('matches / against itself', () => {
    assert.equal(sameUrl('/', '/'), true, 'this is the whole defect: the root path normalised to the empty string and was then rejected as missing');
  });

  it('matches / against / with a fragment', () => {
    // The fragment strip and the slash strip compound here. Pre-fix both sides
    // normalised to the empty string and the pair was rejected, which is the same
    // failure arriving by a second route.
    assert.equal(sameUrl('/', '/#main'), true);
    assert.equal(sameUrl('/#main', '/'), true);
  });

  it('still refuses two values that address nothing', () => {
    // The reason the fix is `|| base` rather than deleting the empty-result test.
    // A page with no canonical and no og:url has not declared them equal, and a
    // fix that dropped this guard would turn every page missing both into a pass.
    assert.equal(sameUrl('', ''), false);
    assert.equal(sameUrl(null, undefined), false, 'both sides coerce to the empty string, and neither names a document');
    assert.equal(sameUrl('#', '#'), false, 'a value that is only a fragment addresses no document either');
  });

  it('does not let the root match an absent value', () => {
    assert.equal(sameUrl('/', ''), false, 'a declared root and a missing value are not the same claim');
    assert.equal(sameUrl('', '/'), false);
    assert.equal(sameUrl('/', null), false);
  });

  it('keeps ignoring a trailing slash on a non-root path', () => {
    // The behaviour the strip exists for, and the reason the fix had to be narrow.
    // Removing the strip would have fixed the root case and broken this one.
    assert.equal(sameUrl('/about/', '/about'), true);
    assert.equal(sameUrl('https://ridgeline.example/about/', 'https://ridgeline.example/about'), true);
  });

  it('was never broken for an absolute root, which is why the fixtures stayed green', () => {
    assert.equal(sameUrl('https://ridgeline.example/', 'https://ridgeline.example/'), true);
    assert.equal(sameUrl('https://ridgeline.example/', 'https://ridgeline.example'), true, 'the strip is what makes these two agree, and the result is non-empty either way');
  });

  it('still reports two different documents as different', () => {
    assert.equal(sameUrl('/', '/home'), false, 'a fix that returned true for everything would satisfy every assertion above');
    assert.equal(sameUrl('/a', '/b'), false);
  });
});

describe('og-url-matches-canonical says nothing about a home page that agrees with itself', () => {
  it('passes when the canonical and og:url are both the root path', () => {
    const result = run('/', '/');
    assert.deepEqual(result.findings, [], 'pre-fix this emitted "og:url is / but the canonical is /; the two name different documents" - one finding, naming one string twice');
    assert.equal(result.status, 'PASS');
  });

  it('still reports a real mismatch on the same page shape', () => {
    // The negative control. The check has to remain able to fire, or the
    // assertion above would be satisfied by a check that never reports anything.
    const result = run('/', '/home');
    assert.equal(result.status, 'FAIL');
    assert.equal(result.findings.length, 1);
    assert.equal(result.findings[0].detail, 'og:url is /home but the canonical is /; the two name different documents');
    assert.equal(result.findings[0].requirement_id, 'SEO-577');
    assert.equal(result.findings[0].location, 'index.html:4', 'the finding points at the og:url line, not at the canonical, because that is the tag the author would edit');
  });
});
