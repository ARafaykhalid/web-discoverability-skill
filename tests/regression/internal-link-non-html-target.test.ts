/**
 * Regression: a link to a non-HTML file the site actually ships was reported as
 * broken.
 *
 * Cause. `internal-links-resolve` cannot fetch, so a path matching no captured
 * page falls back to asking whether the repository ships a file that could serve
 * it. `staticCandidates` built that list by appending HTML extensions and nothing
 * else: for `/atom.xml` it asked whether `atom.xml.html`, `atom.xml.htm`,
 * `atom.xml/index.html` or `atom.xml/index.htm` existed. It never asked whether
 * `atom.xml` existed. Any target the capture had not visited and that was not an
 * HTML page - a feed, a PDF, an .ics invitation, /robots.txt - was therefore
 * reported as resolving to nothing.
 *
 * Why it mattered. This is a HIGH-severity finding about a link the site controls,
 * and the remedy an agent would infer from it is to delete the link or repoint it.
 * The link was correct and the file was right there in the tree; the check had
 * simply looked for it under names it could not have. A capture is a sample by
 * design - the check's own comments say so - so "the crawl did not visit this
 * route" is the normal case the disk fallback exists to cover, and it was covering
 * only a third of it.
 *
 * Fix. `staticCandidates` probes the literal path before the extension-appending
 * candidates. That cannot hide a real defect, because a link is only excused when
 * a file with precisely that path exists on disk; a path that exists nowhere still
 * matches nothing and is still reported. The `.html`/`.htm` candidates stay, since
 * an extensionless route like `/about` is served by `about.html` or
 * `about/index.html` and the href names neither. The finding's wording changed from
 * "no HTML file in the repository" to "no file in the repository" to match what is
 * now actually checked.
 *
 * Before the fix the first test here reported 4 findings, one for each shipped
 * non-HTML file: /atom.xml, /papers/tide-survey.pdf, /events/harbour-board.ics and
 * /robots.txt.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import checks from '../../tools/lib/checks/internal-linking.ts';

const check = checks.find((c) => c.id === 'internal-links-resolve');

/** Files the repository ships. Only `atom.xml` doubles as a captured route. */
const SHIPPED = ['index.html', 'about.html', 'atom.xml', 'papers/tide-survey.pdf', 'events/harbour-board.ics', 'robots.txt'];

/**
 * A two-page site whose home page carries the given hrefs.
 *
 * Two pages, because the check reports NOT_APPLICABLE on a capture of one - a
 * single page proves nothing about where its links go. `/about` is captured so the
 * fixture also exercises the ordinary matched-page path, and every non-HTML target
 * below is outside the capture, which is the situation the disk fallback is for.
 */
function run(hrefs, { files = SHIPPED } = {}) {
  const home = `<!doctype html><html lang="en"><head><title>The Marram Coast Record</title></head><body>
${hrefs.map((href) => `<a href="${href}">${href}</a>`).join('\n')}
</body></html>`;
  const about = '<!doctype html><html lang="en"><head><title>About</title></head><body><a href="/">Home</a></body></html>';
  const result = check.run({
    pages: [
      { url: '/', source_file: 'index.html', raw_html: home, rendered_html: home, origin: 'static-file', status: 200 },
      { url: '/about', source_file: 'about.html', raw_html: about, rendered_html: about, origin: 'static-file', status: 200 },
    ],
    has: (path) => files.includes(path),
  });
  return result.findings ?? result;
}

const hrefsOf = (findings) => findings.map((f) => f.evidence[0].href);

describe('a link resolves when its target ships, whatever the extension', () => {
  it('stays silent on a feed, a PDF, an .ics and robots.txt', () => {
    // The false positive, in its minimal form: four files that are in the tree
    // and outside the capture. Each one was reported because the check looked for
    // it as `<path>.html` and `<path>/index.html`.
    assert.deepEqual(run(['/atom.xml', '/papers/tide-survey.pdf', '/events/harbour-board.ics', '/robots.txt']), []);
  });

  it('names the literal path among the files it checked', () => {
    // The evidence is the reason this bug was invisible: it listed four
    // candidates, none of which was the file the author had shipped.
    const [finding] = run(['/atom.xml'], { files: ['index.html', 'about.html'] });
    assert.ok(finding, 'a target that exists nowhere must still be reported');
    assert.ok(finding.evidence[0].files_checked.includes('atom.xml'), finding.evidence[0].files_checked.join(','));
  });

  it('resolves a shipped file through a document-relative href', () => {
    // Same fallback, reached by the other route through resolveTarget.
    assert.deepEqual(run(['atom.xml', 'papers/tide-survey.pdf']), []);
  });

  it('ignores a query string and a fragment on a shipped file', () => {
    assert.deepEqual(run(['/atom.xml?utm_source=nav', '/papers/tide-survey.pdf#page=4']), []);
  });

  it('still resolves an extensionless route served by a .html file', () => {
    // The candidates the fix added must not have displaced the ones that were
    // already right: `/about` is captured, and an uncaptured `/contact` served by
    // `contact.html` must still resolve off disk.
    assert.deepEqual(run(['/about', '/contact'], { files: [...SHIPPED, 'contact.html'] }), []);
    assert.deepEqual(run(['/guides'], { files: [...SHIPPED, 'guides/index.html'] }), []);
  });
});

describe('a link to a path that exists nowhere is still reported', () => {
  it('reports a withdrawn HTML route', () => {
    // The defect the check exists for, unchanged.
    const findings = run(['/news/harbour-survey-leaked']);
    assert.equal(findings.length, 1);
    assert.match(findings[0].detail, /matches no captured page and no file in the repository/);
    assert.equal(findings[0].requirement_id, 'SEO-212');
    assert.equal(findings[0].severity, 'HIGH');
  });

  it('reports a non-HTML target that was never published', () => {
    // The half of the fix that would be missed by a change that simply stopped
    // reporting anything with a file extension. A PDF named in a link and absent
    // from the tree is a broken link exactly like a missing page is.
    const findings = run(['/papers/missing-survey.pdf', '/feeds/deleted.xml', '/events/cancelled.ics']);
    assert.deepEqual(hrefsOf(findings), ['/papers/missing-survey.pdf', '/feeds/deleted.xml', '/events/cancelled.ics']);
  });

  it('separates the shipped targets from the absent ones on the same page', () => {
    // Both behaviours at once, which is what a real page looks like.
    const findings = run(['/atom.xml', '/papers/missing-survey.pdf', '/robots.txt', '/news/harbour-survey-leaked']);
    assert.deepEqual(hrefsOf(findings), ['/papers/missing-survey.pdf', '/news/harbour-survey-leaked']);
  });

  it('does not treat a directory prefix of a shipped file as a resolvable target', () => {
    // `papers/tide-survey.pdf` is in the tree; `/papers` is not a file and no
    // index.html serves it. A literal probe that matched by prefix would have
    // silently excused a broken section link.
    assert.deepEqual(hrefsOf(run(['/papers', '/papers/'])), ['/papers', '/papers/']);
  });
});
