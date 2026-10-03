/**
 * Document structure checks.
 *
 * A heading is the cheapest structural signal a document carries: it is in the
 * served response, it is not written by client script into an empty shell, and it
 * is the first thing both a reader and a retrieval system parse. A page with no
 * primary heading, or with three competing ones, has not told anyone what it is.
 */
import { headings } from '../html.ts';
import { pageCheck, location, ev } from '../check-support.ts';

const primaryHeadingPresent = {
  id: 'primary-heading-present',
  requirements: ['SEO-195'],
  level: 'RUNTIME',
  title: 'Exactly one top-level heading per page',
  run(snapshot) {
    return pageCheck(primaryHeadingPresent, snapshot, (page, html) => {
      // `headings()` strips script, style, template, and comments, so a heading a
      // crawler never receives is not counted as one the page has.
      const top = headings(html).filter((h) => h.level === 1);
      const observed = headings(html).map((h) => `${'#'.repeat(h.level)} ${h.text}`);
      const evidenceFor = (detail) => [
        ev('RENDERED_HTML', { url: page.url, observed, detail }),
        ev('ROUTE', { url: page.url }),
      ];

      if (!top.length) {
        return [{
          requirement_id: 'SEO-195',
          location: location(page),
          severity: 'MEDIUM',
          detail: 'no h1 in the served response, so the page states no top-level subject',
          evidence: evidenceFor('no <h1> element'),
        }];
      }
      if (top.length > 1) {
        return [{
          requirement_id: 'SEO-195',
          location: location(page, top[1].index),
          severity: 'MEDIUM',
          detail: `${top.length} h1 elements in one response (${top.map((h) => JSON.stringify(h.text)).join(', ')}); a document has one top-level subject`,
          evidence: evidenceFor(`${top.length} <h1> elements`),
        }];
      }
      if (!top[0].text) {
        return [{
          requirement_id: 'SEO-195',
          location: location(page, top[0].index),
          severity: 'MEDIUM',
          detail: 'h1 is present but empty, so the top-level subject is a blank line',
          evidence: evidenceFor('<h1></h1>'),
        }];
      }
      return [];
    });
  },
};

export default [primaryHeadingPresent];