/**
 * JavaScript rendering checks.
 *
 * These compare the bytes a crawler receives first against the bytes a browser
 * ends up with. The comparison is only possible when a capture supplies both, and
 * when it does not the checks say so rather than inferring one from the other -
 * a source file cannot tell you what the client did to the document afterwards.
 */
import { wordCount, titleText, headings } from '../html.mjs';
import { gate, findingsFor, location, ev, linkTags } from '../check-support.mjs';

/**
 * Pages where raw and rendered HTML are genuinely different documents.
 *
 * `loadSnapshot` sets rendered to raw when the capture supplies no rendered file,
 * so identical strings mean "not measured", not "no difference". Treating that as a
 * pass would report a clean bill of health for a client-rendered app whose capture
 * simply never ran a browser.
 */
function comparablePages(snapshot) {
  return snapshot.pages.filter((page) =>
    typeof page.raw_html === 'string'
    && typeof page.rendered_html === 'string'
    && page.raw_html !== page.rendered_html);
}

const contentInInitialHtml = {
  id: 'content-in-initial-html',
  requirements: ['SEO-593'],
  level: 'RUNTIME',
  title: 'Primary content is present in the initial HTML',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const pages = comparablePages(snapshot);
    if (!pages.length) {
      return {
        status: 'NOT_APPLICABLE',
        findings: [],
        detail: 'no page in the capture supplies both raw and rendered HTML, so the difference between them was never measured',
      };
    }

    const items = [];
    for (const page of pages) {
      const rawWords = wordCount(page.raw_html);
      const renderedWords = wordCount(page.rendered_html);
      const shortfall = renderedWords - rawWords;

      // Two conditions together, so a page that simply hydrates a few widgets is
      // not reported: the initial response must carry less than half the text, and
      // the missing amount must be large enough to be the content rather than
      // chrome. Both numbers are in the evidence so the judgement is auditable.
      if (renderedWords > 0 && rawWords < renderedWords / 2 && shortfall >= 100) {
        items.push({
          requirement_id: 'SEO-593',
          location: location(page),
          severity: 'CRITICAL',
          detail: `initial HTML carries ${rawWords} words and the rendered document carries ${renderedWords}; ${shortfall} words of the page exist only after client-side execution, so any consumer that does not run scripts sees a fraction of the content`,
          evidence: [
            ev('RAW_HTML', { url: page.url, word_count: rawWords }),
            ev('RENDERED_HTML', { url: page.url, word_count: renderedWords, shortfall }),
            ev('ROUTE', { url: page.url }),
          ],
        });
      }

      const rawTitle = titleText(page.raw_html);
      const renderedTitle = titleText(page.rendered_html);
      if (!rawTitle && renderedTitle) {
        items.push({
          requirement_id: 'SEO-593',
          location: location(page),
          severity: 'CRITICAL',
          detail: `the title "${renderedTitle}" is set only after client-side execution; the initial response has no title at all`,
          evidence: [
            ev('RAW_HTML', { url: page.url, title: null }),
            ev('RENDERED_HTML', { url: page.url, title: renderedTitle }),
            ev('ROUTE', { url: page.url }),
          ],
        });
      }

      const rawH1 = headings(page.raw_html).filter((h) => h.level === 1);
      const renderedH1 = headings(page.rendered_html).filter((h) => h.level === 1);
      if (!rawH1.length && renderedH1.length) {
        items.push({
          requirement_id: 'SEO-593',
          location: location(page),
          severity: 'CRITICAL',
          detail: `the page heading "${renderedH1[0].text}" appears only after client-side execution, so the initial response states nothing about what the page is`,
          evidence: [
            ev('RAW_HTML', { url: page.url, h1_count: 0 }),
            ev('RENDERED_HTML', { url: page.url, h1_count: renderedH1.length, first_h1: renderedH1[0].text }),
            ev('ROUTE', { url: page.url }),
          ],
        });
      }
    }
    return findingsFor(contentInInitialHtml, items);
  },
};

function canonicalHrefs(html) {
  return linkTags(html, 'canonical').map((tag) => (tag.attrs.href || '').trim()).filter(Boolean);
}

const clientMutatesCanonical = {
  id: 'client-mutates-canonical',
  requirements: ['SEO-597'],
  level: 'RUNTIME',
  title: 'Client-side code does not change the canonical URL',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const pages = comparablePages(snapshot);
    if (!pages.length) {
      return {
        status: 'NOT_APPLICABLE',
        findings: [],
        detail: 'no page in the capture supplies both raw and rendered HTML, so no client-side mutation could be observed',
      };
    }

    const items = [];
    for (const page of pages) {
      const before = canonicalHrefs(page.raw_html);
      const after = canonicalHrefs(page.rendered_html);
      const same = before.length === after.length && before.every((href, i) => href === after[i]);
      if (same) continue;

      // Whether a crawler sees the mutation depends on when it snapshots the
      // document, and that is not observable from here. The finding reports the
      // divergence and leaves the consequence unasserted.
      const detail = !before.length
        ? `no canonical in the initial response; the client adds ${after.join(', ')} afterwards, so the canonical exists only for consumers that execute scripts`
        : !after.length
          ? `the initial response declares canonical ${before.join(', ')} and the client removes it`
          : `canonical changes from ${before.join(', ')} to ${after.join(', ')} during client-side execution; which value a consumer records depends on when it read the document`;

      items.push({
        requirement_id: 'SEO-597',
        location: location(page),
        severity: 'HIGH',
        detail,
        evidence: [
          ev('RAW_HTML', { url: page.url, canonical: before }),
          ev('RENDERED_HTML', { url: page.url, canonical: after }),
          ev('BROWSER', { url: page.url, note: 'rendered values captured after client-side execution' }),
        ],
      });
    }
    return findingsFor(clientMutatesCanonical, items);
  },
};

export default [contentInInitialHtml, clientMutatesCanonical];
