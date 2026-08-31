/**
 * Document metadata checks.
 *
 * These read served output, not source. A framework can merge, override, or drop
 * head elements between the source file and the response, so a `<title>` in a
 * component proves nothing about what a crawler receives.
 */
import { titleText, htmlLang, firstTag, stripComments } from '../html.ts';
import {
  pageCheck, gate, findingsFor, location, ev, headMetaTags, headTags,
} from '../check-support.ts';

const titleElementSingle = {
  id: 'title-element-single',
  requirements: ['SEO-033'],
  level: 'RUNTIME',
  title: 'Exactly one non-empty title element per page',
  run(snapshot) {
    return pageCheck(titleElementSingle, snapshot, (page, html) => {
      const out = [];
      const tags = headTags(html, 'title');
      const nonEmpty = tags.filter((t) => t.inner.trim().length > 0);

      if (!tags.length) {
        out.push({
          requirement_id: 'SEO-033',
          location: location(page),
          severity: 'HIGH',
          detail: 'served document has no title element',
          evidence: [ev('RENDERED_HTML', { url: page.url, observed: 'no <title> element' }), ev('ROUTE', { url: page.url })],
        });
        return out;
      }
      if (tags.length > 1) {
        out.push({
          requirement_id: 'SEO-033',
          location: location(page, tags[1].index),
          severity: 'HIGH',
          detail: `${tags.length} title elements served; crawlers use one and the choice is not yours`,
          evidence: [
            ev('RENDERED_HTML', { url: page.url, observed: tags.map((t) => t.inner.trim()) }),
            ev('ROUTE', { url: page.url }),
          ],
        });
      }
      if (!nonEmpty.length) {
        out.push({
          requirement_id: 'SEO-033',
          location: location(page, tags[0].index),
          severity: 'HIGH',
          detail: 'title element is present but empty',
          evidence: [ev('RENDERED_HTML', { url: page.url, observed: '<title></title>' }), ev('ROUTE', { url: page.url })],
        });
      }
      return out;
    });
  },
};

const metaDescriptionSingle = {
  id: 'meta-description-single',
  requirements: ['SEO-034'],
  level: 'RUNTIME',
  title: 'One non-empty meta description per indexable page',
  run(snapshot) {
    return pageCheck(metaDescriptionSingle, snapshot, (page, html) => {
      const out = [];
      const tags = headMetaTags(html).filter(({ attrs }) => (attrs.name || '').toLowerCase() === 'description');

      if (!tags.length) {
        out.push({
          requirement_id: 'SEO-034',
          location: location(page),
          severity: 'MEDIUM',
          detail: 'no meta description served; the snippet is left entirely to the engine',
          evidence: [ev('RENDERED_HTML', { url: page.url, observed: 'no meta[name=description]' }), ev('ROUTE', { url: page.url })],
        });
        return out;
      }
      if (tags.length > 1) {
        out.push({
          requirement_id: 'SEO-034',
          location: location(page, tags[1].index),
          severity: 'MEDIUM',
          detail: `${tags.length} meta descriptions served`,
          evidence: [
            ev('RENDERED_HTML', { url: page.url, observed: tags.map(({ attrs }) => attrs.content || '') }),
            ev('ROUTE', { url: page.url }),
          ],
        });
      }
      const empty = tags.filter(({ attrs }) => !(attrs.content || '').trim());
      if (empty.length) {
        out.push({
          requirement_id: 'SEO-034',
          location: location(page, empty[0].index),
          severity: 'MEDIUM',
          detail: 'meta description is present but empty',
          evidence: [ev('RENDERED_HTML', { url: page.url, observed: 'content=""' }), ev('ROUTE', { url: page.url })],
        });
      }
      return out;
    }, { indexableOnly: true });
  },
};

const htmlLangPresent = {
  id: 'html-lang-present',
  requirements: ['SEO-035'],
  level: 'RUNTIME',
  title: 'Root html element declares a language',
  run(snapshot) {
    return pageCheck(htmlLangPresent, snapshot, (page, html) => {
      const lang = htmlLang(html);
      if (lang && lang.trim()) return [];
      const root = firstTag(stripComments(html), 'html');
      return [{
        requirement_id: 'SEO-035',
        location: location(page, root ? root.index : null),
        severity: 'HIGH',
        detail: root ? 'html element has no usable lang attribute' : 'served document has no html element',
        evidence: [
          ev('RENDERED_HTML', { url: page.url, observed: root ? root.raw : 'no <html> element' }),
          ev('ROUTE', { url: page.url }),
        ],
      }];
    });
  },
};

const viewportDeclared = {
  id: 'viewport-declared',
  requirements: ['SEO-036'],
  level: 'RUNTIME',
  title: 'Mobile viewport declared in the document head',
  run(snapshot) {
    return pageCheck(viewportDeclared, snapshot, (page, html) => {
      const tags = headMetaTags(html).filter(({ attrs }) => (attrs.name || '').toLowerCase() === 'viewport');
      const usable = tags.filter(({ attrs }) => /width\s*=/i.test(attrs.content || ''));
      if (usable.length) return [];
      return [{
        requirement_id: 'SEO-036',
        location: location(page, tags[0]?.index ?? null),
        severity: 'HIGH',
        detail: tags.length
          ? 'viewport meta declares no width, so small-screen layout is not controlled'
          : 'no viewport meta served; mobile-first evaluation sees a desktop-width layout',
        evidence: [
          ev('RENDERED_HTML', { url: page.url, observed: tags.length ? tags[0].attrs.content || '' : 'no meta[name=viewport]' }),
          ev('ROUTE', { url: page.url }),
        ],
      }];
    });
  },
};

const titleDistinctAcrossRoutes = {
  id: 'title-distinct-across-routes',
  requirements: ['SEO-037'],
  level: 'RUNTIME',
  title: 'Indexable routes have distinct titles',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const pages = snapshot.pages.filter((p) => p.indexable !== false);
    if (pages.length < 2) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'fewer than two indexable pages to compare' };
    }

    // Grouped by title so one duplicate pair yields one finding, not two.
    const groups = new Map();
    for (const page of pages) {
      const title = titleText(page.rendered_html ?? page.raw_html ?? '');
      if (!title) continue;
      const key = title.trim().toLowerCase();
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(page);
    }

    const items = [];
    for (const [, shared] of groups) {
      if (shared.length < 2) continue;
      // The first page keeps the title; the rest are reported.
      for (const page of shared.slice(1)) {
        items.push({
          requirement_id: 'SEO-037',
          location: location(page),
          severity: 'MEDIUM',
          detail: `title is shared with ${shared.length - 1} other indexable route(s): ${shared.filter((p) => p !== page).map((p) => p.url).join(', ')}`,
          evidence: [
            ev('RENDERED_HTML', { url: page.url, observed: titleText(page.rendered_html ?? page.raw_html ?? '') }),
            ev('ROUTE', { url: page.url, shared_with: shared.filter((p) => p !== page).map((p) => p.url) }),
          ],
        });
      }
    }
    return findingsFor(titleDistinctAcrossRoutes, items);
  },
};

export default [titleElementSingle, metaDescriptionSingle, htmlLangPresent, viewportDeclared, titleDistinctAcrossRoutes];
