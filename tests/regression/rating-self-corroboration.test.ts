/**
 * Regression: the ratingValue corroboration rule could never fire.
 *
 * Cause. `jsonld-review-without-source` asks whether the aggregate score in the
 * markup appears anywhere in the page a visitor receives. It asked by searching
 * the whole HTML string - and the whole HTML string contains the
 * `<script type="application/ld+json">` block that declares the value. The value
 * therefore always corroborated itself. The rule was unreachable by construction:
 * no input existed that could trip it, including a page displaying no rating at
 * all, which is precisely the input it was written for.
 *
 * Why it mattered. SEO-173 is CRITICAL and BLOCKED. Fabricated review and rating
 * markup is a documented spam policy violation for both Google and Bing, so this
 * is one of the few rules whose whole purpose is to refuse to act and escalate.
 * A dead rule of that kind is worse than an absent one: the registry claimed
 * coverage, the check reported PASS, and the benchmark scored the pass as a true
 * negative. `benchmarks/cases/ecommerce-catalog.json` is the fixture that exposed
 * it; it had documented the gap in prose and left the case one expectation short.
 *
 * Fix. Search `visibleText(html)` instead of `html`. visibleText strips comments,
 * scripts, styles and tags, so what remains is the prose a reader actually gets -
 * which is what "the page must show the rating it claims" means.
 *
 * Before the fix the first test here reported zero findings.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import checks from '../../tools/lib/checks/structured-data.ts';

const check = checks.find((c) => c.id === 'jsonld-review-without-source');

/**
 * A page whose markup claims a score, parameterised by the body it serves.
 *
 * reviewCount is present and non-zero so the sibling rule about an uncounted
 * rating stays silent: this test has to be able to attribute a finding to the
 * corroboration rule alone, and two rules firing on one node would not prove
 * which one ran.
 */
function page(body) {
  const html = `<!doctype html><html><head><title>Tote</title>
<script type="application/ld+json">
{"@context":"https://schema.org","@type":"Product","name":"Tote",
 "aggregateRating":{"@type":"AggregateRating","ratingValue":"4.8","reviewCount":"37","bestRating":"5"}}
</script>
</head><body>${body}</body></html>`;
  return { url: '/tote', source_file: 'tote.html', raw_html: html, rendered_html: html };
}

function run(body) {
  const result = check.run({ pages: [page(body)] });
  return result.findings ?? result;
}

describe('a rating must be corroborated by text the visitor can see', () => {
  it('reports a score that appears only inside the JSON-LD block', () => {
    const findings = run('<h1>Tote</h1><p>An 18oz canvas tote.</p>');
    assert.equal(findings.length, 1, 'the page shows no rating anywhere, so the claim is unsupported');
    assert.match(findings[0].detail, /ratingValue 4\.8 but that value appears nowhere/);
    assert.equal(findings[0].requirement_id, 'SEO-173');
    assert.equal(findings[0].severity, 'CRITICAL');
  });

  it('stays silent when the page displays the score', () => {
    // The other half of the contract, and the reason the fix is a narrowing
    // rather than a deletion. A rule that fired on every rating would be as
    // useless as one that fired on none, and it would push an agent toward
    // deleting honest markup.
    assert.deepEqual(run('<h1>Tote</h1><p>Rated 4.8 out of 5 by 37 buyers.</p>'), []);
  });

  it('does not accept a comment or a style block as corroboration', () => {
    // visibleText is what makes this true. These are three places a value can sit
    // in the served bytes without ever reaching a reader; the pre-fix code treated
    // all of them as proof.
    for (const body of [
      '<h1>Tote</h1><!-- internal note: aggregate is 4.8 -->',
      '<h1>Tote</h1><style>.r::after{content:"4.8"}</style>',
      '<h1>Tote</h1><script>const rating = "4.8";</script>',
    ]) {
      assert.equal(run(body).length, 1, body);
    }
  });

  it('carries a MANUAL_ACTION evidence item rather than a proposed fix', () => {
    // SEO-173 is BLOCKED. The evidence has to say a person is required, because
    // the two correct remedies - publish the real ratings, or delete the claim -
    // cannot be told apart from the page, and guessing between them is how an
    // unsupported claim becomes a fabricated one.
    const [finding] = run('<h1>Tote</h1>');
    const types = finding.evidence.map((item) => item.type);
    assert.ok(types.includes('MANUAL_ACTION'), types.join(','));
    assert.ok(types.includes('JSON_LD'), types.join(','));
  });
});
