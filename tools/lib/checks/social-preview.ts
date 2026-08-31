/**
 * Social and messaging preview checks.
 *
 * Preview properties are the only metadata a link unfurl reads, and they are the
 * metadata frameworks most often emit twice - once from a layout default and once
 * from a page override. Reading served output is what makes the duplicate visible.
 */
import {
  pageCheck, gate, findingsFor, location, ev, metaTagsAnywhere, linkTags, sameUrl,
} from '../check-support.ts';

/**
 * Preview properties as authored, not as specified.
 *
 * Open Graph uses `property` and Twitter cards use `name`, and real documents mix
 * them up constantly - `<meta name="og:title">` is common and most consumers
 * accept it. Both attributes are collected so a duplicate is caught regardless of
 * which one carried it, and the attribute used is reported so a fix can be exact.
 */
function previewProps(html) {
  const out = [];
  for (const { attrs, index } of metaTagsAnywhere(html)) {
    const property = (attrs.property || '').trim().toLowerCase();
    const name = (attrs.name || '').trim().toLowerCase();
    const key = property || name;
    if (!/^(og|twitter|article|product|book|profile|music|video):/.test(key)) continue;
    out.push({
      key,
      attribute: property ? 'property' : 'name',
      content: (attrs.content || '').trim(),
      index,
    });
  }
  return out;
}

/** True when any page in the capture declares a preview property at all. */
function anyPreviewProps(snapshot) {
  return snapshot.pages.some((page) => previewProps(page.rendered_html ?? page.raw_html ?? '').length > 0);
}

const ogUrlMatchesCanonical = {
  id: 'og-url-matches-canonical',
  requirements: ['SEO-577'],
  level: 'RUNTIME',
  title: 'Preview URL property matches the canonical URL',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;
    if (!anyPreviewProps(snapshot)) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'no page declares a preview property' };
    }

    const items = [];
    for (const page of snapshot.pages) {
      const html = page.rendered_html ?? page.raw_html;
      if (!html) continue;
      const props = previewProps(html);
      if (!props.length) continue;

      const ogUrls = props.filter((p) => p.key === 'og:url');
      const canonicals = linkTags(html, 'canonical')
        .map((tag) => (tag.attrs.href || '').trim())
        .filter(Boolean);

      if (!ogUrls.length) {
        items.push({
          requirement_id: 'SEO-577',
          location: location(page),
          severity: 'MEDIUM',
          detail: 'page declares preview properties but no og:url, so an unfurl attributes the preview to whatever URL was shared, including a tracking variant',
          evidence: [
            ev('RENDERED_HTML', { url: page.url, observed: props.map((p) => p.key) }),
            ev('ROUTE', { url: page.url }),
          ],
        });
        continue;
      }
      if (!canonicals.length) continue;

      for (const prop of ogUrls) {
        if (canonicals.some((href) => sameUrl(href, prop.content))) continue;
        items.push({
          requirement_id: 'SEO-577',
          location: location(page, prop.index),
          severity: 'MEDIUM',
          detail: `og:url is ${prop.content || '(empty)'} but the canonical is ${canonicals[0]}; the two name different documents`,
          evidence: [
            ev('RENDERED_HTML', { url: page.url, og_url: prop.content, canonical: canonicals[0] }),
            ev('RAW_HTML', { url: page.url, observed: `<meta ${prop.attribute}="og:url" content="${prop.content}">` }),
            ev('ROUTE', { url: page.url }),
          ],
        });
      }
    }
    return findingsFor(ogUrlMatchesCanonical, items);
  },
};

const ogImageAltPresent = {
  id: 'og-image-alt-present',
  requirements: ['SEO-579'],
  level: 'RUNTIME',
  title: 'Preview image declares alternative text',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const withImage = snapshot.pages.filter((page) =>
      previewProps(page.rendered_html ?? page.raw_html ?? '').some((p) => p.key === 'og:image'));
    if (!withImage.length) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'no page declares og:image' };
    }

    const items = [];
    for (const page of withImage) {
      const html = page.rendered_html ?? page.raw_html;
      const props = previewProps(html);
      const alts = props.filter((p) => p.key === 'og:image:alt' && p.content);
      if (alts.length) continue;
      const image = props.find((p) => p.key === 'og:image');
      items.push({
        requirement_id: 'SEO-579',
        location: location(page, image?.index ?? null),
        severity: 'LOW',
        detail: 'og:image has no non-empty og:image:alt, so the preview image is unlabelled for anyone who cannot see it',
        evidence: [
          ev('RENDERED_HTML', { url: page.url, og_image: image?.content ?? null, og_image_alt: null }),
          ev('RAW_HTML', { url: page.url, observed: 'no meta og:image:alt with content' }),
          ev('ROUTE', { url: page.url }),
        ],
      });
    }
    return findingsFor(ogImageAltPresent, items);
  },
};

/**
 * Repeats of og:image are legitimate - the vocabulary allows several candidate
 * images and consumers pick one - so image properties are excluded from the
 * duplicate rule. Everything else names exactly one value, and a second value
 * means one of the two is being silently discarded.
 */
const REPEATABLE = /^og:image(:|$)|^og:video(:|$)|^og:audio(:|$)|^article:tag$|^og:locale:alternate$/;

const ogDuplicateProperties = {
  id: 'og-duplicate-properties',
  requirements: ['SEO-584'],
  level: 'RUNTIME',
  title: 'No duplicate or conflicting preview properties',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;
    if (!anyPreviewProps(snapshot)) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'no page declares a preview property' };
    }

    const items = [];
    for (const page of snapshot.pages) {
      const html = page.rendered_html ?? page.raw_html;
      if (!html) continue;

      const groups = new Map();
      for (const prop of previewProps(html)) {
        if (REPEATABLE.test(prop.key)) continue;
        if (!groups.has(prop.key)) groups.set(prop.key, []);
        groups.get(prop.key).push(prop);
      }

      for (const [key, props] of groups) {
        const values = [...new Set(props.map((p) => p.content))];
        if (values.length < 2) continue;
        const attributes = [...new Set(props.map((p) => p.attribute))];
        items.push({
          requirement_id: 'SEO-584',
          location: location(page, props[1].index),
          severity: 'MEDIUM',
          detail: `${key} is declared ${props.length} times with ${values.length} different values via ${attributes.join(' and ')}; which one an unfurl uses is not under your control`,
          evidence: [
            ev('RENDERED_HTML', { url: page.url, property: key, values }),
            ev('RAW_HTML', { url: page.url, observed: props.map((p) => `${p.attribute}="${p.key}" content="${p.content}"`) }),
            ev('ROUTE', { url: page.url }),
          ],
        });
      }
    }
    return findingsFor(ogDuplicateProperties, items);
  },
};

export default [ogUrlMatchesCanonical, ogImageAltPresent, ogDuplicateProperties];
