/**
 * Regression: two different people on one page were reported as one entity
 * described twice.
 *
 * Cause. `jsonld-duplicate-entity` grouped nodes by type and reported any type in
 * `SINGLETON_TYPES` that appeared twice on a page. `Person` was in that set, and
 * the only escape hatch was "every node in the group carries the same @id" - which
 * is the case where the graph is *already* saying the nodes are one thing. Two
 * nodes for two genuinely different people, each with its own @id and its own
 * name, matched neither the exemption nor the defect: an article byline plus a
 * named comment author was reported as a duplicate entity, and that is the
 * ordinary shape of any editorial or UGC page.
 *
 * Why it mattered. The project brief says an autonomous agent can do more damage
 * through a false positive than through a missed optimisation, and this one had no
 * honest remedy. A publisher cannot merge two people into one node, and the two
 * ways to silence the rule were both destructive: give two different people the
 * same @id, or stop typing them as Person and emit bare untyped `{"@id": ...}`
 * references instead. Either one throws away the byline and comment-author markup
 * that SEO-167 exists to keep coherent, on the say-so of a rule that was wrong.
 *
 * Fix. Split the one set in two. `SITE_SINGLETON_TYPES` (Organization,
 * Corporation, LocalBusiness, WebSite) keeps the old behaviour, because a site has
 * one publisher and a second Organization node is a conflict however it is named.
 * `MULTI_ENTITY_TYPES` holds Person, where more than one entity per page is
 * normal, and a group there is excused only when every node carries a name and all
 * the names differ. Person is not dropped from the grouping, because the defect
 * the rule was written for - two Person nodes for the *same* reporter, one nested
 * in `author` with an @id and one emitted loose by a byline widget with none - is
 * real and nothing else in the suite catches it.
 *
 * Before the fix the first test here reported 1 finding: "2 separate Person nodes
 * on one page; each one claims to describe the same entity and nothing says which
 * is authoritative".
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import checks from '../../tools/lib/checks/structured-data.ts';

const check = checks.find((c) => c.id === 'jsonld-duplicate-entity');

/** A page carrying the given JSON-LD root nodes, one block each. */
function run(...nodes) {
  const blocks = nodes
    .map((node) => `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', ...node })}</script>`)
    .join('\n');
  const html = `<!doctype html><html lang="en"><head><title>Harbour dredging delayed</title>
${blocks}
</head><body><h1>Harbour dredging delayed</h1></body></html>`;
  const result = check.run({ pages: [{ url: '/news/harbour-dredging-delayed', source_file: 'news/harbour-dredging-delayed.html', raw_html: html, rendered_html: html }] });
  return result.findings ?? result;
}

const BYLINE = {
  '@type': 'NewsArticle',
  '@id': 'https://example.com/news/harbour-dredging-delayed#article',
  headline: 'Harbour dredging delayed',
  author: { '@type': 'Person', '@id': 'https://example.com/authors/mara-quill#person', name: 'Mara Quill' },
};

const COMMENTER = {
  '@type': 'Comment',
  '@id': 'https://example.com/news/harbour-dredging-delayed#comment-21',
  text: 'The 2023 plan is a public document and the sounding sheets behind it are not.',
  author: { '@type': 'Person', '@id': 'https://example.com/readers/elin-prydderch#person', name: 'Elin Prydderch' },
};

describe('a page may name more than one person', () => {
  it('stays silent on an article byline plus a named comment author', () => {
    // The false positive, in its minimal form: two people, two @ids, two names.
    // Nothing here is a duplicate of anything.
    assert.deepEqual(run(BYLINE, COMMENTER), []);
  });

  it('stays silent on a whole comment thread of distinct commenters', () => {
    // A comment page is the shape that made this urgent - the rule fired harder
    // the more readers a story attracted.
    const comments = ['Elin Prydderch', 'Cadan Roose', 'Sioned Mawr', 'Iwan Pryce', 'Nia Trethewey', 'Tomos Vane']
      .map((name, i) => ({
        '@type': 'Comment',
        '@id': `https://example.com/news/harbour-dredging-delayed#comment-${i + 21}`,
        author: { '@type': 'Person', name },
      }));
    assert.deepEqual(run(BYLINE, ...comments), []);
  });

  it('does not require an @id to tell two named people apart', () => {
    // @id is optional in valid JSON-LD, and demanding one as the price of not
    // being reported would be the same false positive wearing a different hat.
    assert.deepEqual(
      run({ '@type': 'Person', name: 'Mara Quill' }, { '@type': 'Person', name: 'Elin Prydderch' }),
      [],
    );
  });
});

describe('one person described twice is still reported', () => {
  it('reports two Person nodes carrying the same name', () => {
    // The other half of the contract, and the reason Person stays in the
    // grouping. This is the byline-widget defect: the reporter appears once
    // inside NewsArticle.author with an @id and once as a loose block with none,
    // so nothing ties the two together and nothing says which is authoritative.
    const findings = run(BYLINE, { '@type': 'Person', name: 'Mara Quill', jobTitle: 'Reporter', url: 'https://example.com/authors/mara-quill' });
    assert.equal(findings.length, 1);
    assert.match(findings[0].detail, /2 separate Person nodes on one page/);
    assert.equal(findings[0].requirement_id, 'SEO-167');
    assert.equal(findings[0].check_id, 'jsonld-duplicate-entity');
  });

  it('normalises case and whitespace before deciding two names differ', () => {
    // "Mara  Quill" and "mara quill" are one reporter. Comparing raw strings
    // would let a template inconsistency buy an exemption.
    for (const second of ['mara quill', 'Mara  Quill', '  Mara Quill  ']) {
      assert.equal(run(BYLINE, { '@type': 'Person', name: second, jobTitle: 'Reporter' }).length, 1, second);
    }
  });

  it('reports two Person nodes when there is no name to tell them apart', () => {
    // An unnamed Person cannot be shown to be a different person, so the
    // exemption does not apply. The rule reports rather than guessing, including
    // when only one of the two nodes is named.
    assert.equal(run({ '@type': 'Person', url: 'https://example.com/a' }, { '@type': 'Person', url: 'https://example.com/b' }).length, 1);
    assert.equal(run(BYLINE, { '@type': 'Person', jobTitle: 'Reporter' }).length, 1);
  });

  it('still reports two Organization nodes under different names', () => {
    // The narrowing must not leak to the site singletons. A site has one
    // publisher, so a second Organization block left behind by a legacy template
    // is a conflict precisely *because* it carries a different name - which is
    // the case a name-based exemption applied to every type would have excused.
    const findings = run(
      { '@type': 'Organization', '@id': 'https://example.com/#org-primary', name: 'The Marram Coast Record' },
      { '@type': 'Organization', '@id': 'https://example.com/#org-secondary', name: 'Marram Coast Publishing' },
    );
    assert.equal(findings.length, 1);
    assert.match(findings[0].detail, /2 separate Organization nodes on one page/);
  });

  it('still reports a WebSite node emitted twice', () => {
    assert.equal(
      run(
        { '@type': 'WebSite', '@id': 'https://example.com/#website', name: 'The Marram Coast Record' },
        { '@type': 'WebSite', '@id': 'https://example.com/#site', name: 'Marram Coast Record' },
      ).length,
      1,
    );
  });

  it('keeps the conflicting-@id rule working for Person', () => {
    // The second rule in this check is independent of the singleton grouping and
    // must not have been narrowed with it: one identifier naming two different
    // shapes is unambiguously wrong whatever the names say.
    const findings = run(
      { '@type': 'Person', '@id': 'https://example.com/authors/mara-quill#person', name: 'Mara Quill' },
      { '@type': 'Person', '@id': 'https://example.com/authors/mara-quill#person', name: 'Elin Prydderch', jobTitle: 'Reader' },
    );
    assert.equal(findings.length, 1);
    assert.match(findings[0].detail, /is used by 2 nodes with different property sets/);
    assert.equal(findings[0].requirement_id, 'SEO-167');
  });
});
