/**
 * Image checks.
 *
 * Both read served markup rather than source, because an image component decides
 * at render time what actually reaches the document: a framework `<Image>` in a
 * template may emit width, height, and a generated alt, while a bare `<img>`
 * written in MDX emits only what the author typed. Only the response tells them
 * apart.
 *
 * Neither check can see the asset bytes, and that bounds what they may claim. An
 * absent attribute is observable. Whether an alt sentence describes the picture,
 * and whether a declared width matches the file's intrinsic width, are not - so
 * they are left to the human review both requirements already ask for.
 */
import { images, findTags, stripComments, decodeEntities } from '../html.ts';
import { pageCheck, gate, location, ev } from '../check-support.ts';

/**
 * Images paired with their offset in the document.
 *
 * `images()` carries `hasAltAttribute`, the only flag that separates a missing
 * `alt` from `alt=""` - `attrs.alt` is the empty string for both, so any test
 * written against the value alone conflates them. `findTags` carries the offset
 * `location` needs but not that flag. Both are built from the same
 * `findTags(stripComments(html), 'img')` list in the same order, so pairing them
 * positionally is exact, where a second hand-rolled parse could disagree with
 * the first. Offsets are measured after comment removal, as they are everywhere
 * else in this codebase, so a document carrying comments above an image reports
 * a line slightly early.
 */
function imagesInOrder(html) {
  const tags = findTags(stripComments(html), 'img');
  return images(html).map((img, i) => ({
    ...img,
    index: tags[i]?.index ?? null,
    raw: tags[i]?.raw ?? '<img>',
  }));
}

/** True when at least one captured page serves an img element. */
function anyImagePresent(snapshot) {
  return snapshot.pages.some((page) => images(page.rendered_html ?? page.raw_html ?? '').length > 0);
}

/**
 * Alt values that name the medium instead of describing the content. Each one
 * reads identically for every image on the page, so a reader hearing it learns
 * nothing the surrounding markup did not already say.
 */
const PLACEHOLDER_ALT = new Set(['image', 'photo', 'picture', 'graphic', 'img', 'logo']);

/**
 * An alt that is just the asset's file name. Restricted to a single token
 * ending in an image extension: that is unambiguously a leaked filename, while
 * a phrase containing one ("compare figure.png with the original") may well be
 * prose about the file, and reporting it would be a guess.
 */
const FILENAME_ALT = /^\S+\.(?:jpe?g|png|gif|webp|avif|svg|bmp|tiff?|ico)$/i;

const imgAltAttributePresent = {
  id: 'img-alt-attribute-present',
  requirements: ['SEO-225'],
  level: 'RUNTIME',
  title: 'Images declare an alt attribute that describes their content',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;
    if (!anyImagePresent(snapshot)) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'no img element in any captured page' };
    }

    return pageCheck(imgAltAttributePresent, snapshot, (page, html) => {
      const out = [];
      for (const img of imagesInOrder(html)) {
        if (!img.hasAltAttribute) {
          out.push({
            requirement_id: 'SEO-225',
            location: location(page, img.index),
            severity: 'HIGH',
            detail: `img has no alt attribute at all${img.src ? ` (src="${img.src}")` : ''}; a reader who cannot see it receives nothing`,
            evidence: [
              ev('RENDERED_HTML', { url: page.url, observed: img.raw }),
              ev('ACCESSIBILITY_SCAN', { url: page.url, rule: 'WCAG 2.2 SC 1.1.1 non-text content', observed: 'alt attribute absent' }),
              ev('ROUTE', { url: page.url }),
            ],
          });
          continue;
        }

        const alt = decodeEntities(img.alt ?? '').trim();

        // `alt=""` is the HTML specification's marker for an image that carries
        // no information a reader needs - a spacer, a rule, a decorative flourish
        // beside a heading that already says the same thing. It tells assistive
        // technology to skip the element entirely, which is exactly the right
        // outcome, and an author who wrote it made a deliberate and correct
        // choice. Reporting it is the single most common false positive in
        // automated accessibility tooling, and this check must not produce it.
        // Only an alt attribute that is absent is a defect; an empty one is an
        // answer. Whitespace-only alt is treated the same way for the same
        // reason: it is used to the same effect and asserting otherwise would
        // invent a rule the specification does not have.
        if (!alt) continue;

        if (FILENAME_ALT.test(alt)) {
          out.push({
            requirement_id: 'SEO-225',
            location: location(page, img.index),
            severity: 'HIGH',
            detail: `alt text is the file name "${alt}"; the asset path is not a description of what the image shows`,
            evidence: [
              ev('RENDERED_HTML', { url: page.url, observed: img.raw }),
              ev('ACCESSIBILITY_SCAN', { url: page.url, rule: 'WCAG 2.2 SC 1.1.1 non-text content', observed: `alt="${alt}"` }),
              ev('ROUTE', { url: page.url }),
            ],
          });
          continue;
        }

        if (PLACEHOLDER_ALT.has(alt.toLowerCase())) {
          out.push({
            requirement_id: 'SEO-225',
            location: location(page, img.index),
            severity: 'HIGH',
            detail: `alt text is "${alt}" and nothing else; it names the medium rather than the content, so it conveys no information the element itself did not`,
            evidence: [
              ev('RENDERED_HTML', { url: page.url, observed: img.raw }),
              ev('ACCESSIBILITY_SCAN', { url: page.url, rule: 'WCAG 2.2 SC 1.1.1 non-text content', observed: `alt="${alt}"` }),
              ev('ROUTE', { url: page.url }),
            ],
          });
        }
      }
      return out;
    });
  },
};

/**
 * A percentage in `width` or `height`.
 *
 * The HTML dimension attributes take non-negative integers, so a percentage is
 * not a declared intrinsic size at all - it is a CSS sizing intent written in
 * the wrong place, and the space the image occupies is reserved by an aspect
 * ratio in a stylesheet this check cannot read. Demanding pixels there would
 * report a layout that already reserves its space correctly as broken, so those
 * images are skipped rather than reported.
 */
const CSS_PERCENTAGE = /^\s*\d+(?:\.\d+)?\s*%\s*$/;

/** A dimension attribute counts as declared only when it carries a value. */
function declared(value) {
  return typeof value === 'string' && value.trim().length > 0;
}

const imgDimensionsDeclared = {
  id: 'img-dimensions-declared',
  requirements: ['SEO-227'],
  level: 'RUNTIME',
  title: 'Images declare both width and height so their space is reserved',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;
    if (!anyImagePresent(snapshot)) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'no img element in any captured page' };
    }

    return pageCheck(imgDimensionsDeclared, snapshot, (page, html) => {
      const out = [];
      for (const img of imagesInOrder(html)) {
        if (CSS_PERCENTAGE.test(img.width ?? '') || CSS_PERCENTAGE.test(img.height ?? '')) continue;

        const hasWidth = declared(img.width);
        const hasHeight = declared(img.height);
        if (hasWidth && hasHeight) continue;

        // One finding per image, not one per absent attribute: the defect is the
        // single unreserved box, and a browser that lacks either number cannot
        // reserve it any better than one that lacks both.
        const detail = hasWidth
          ? 'img declares width but no height, so the reserved box has no vertical extent'
          : hasHeight
            ? 'img declares height but no width, so the reserved box has no horizontal extent'
            : 'img declares neither width nor height, so the browser cannot reserve space and the content below it moves when the asset arrives';

        out.push({
          requirement_id: 'SEO-227',
          location: location(page, img.index),
          severity: 'MEDIUM',
          detail: `${detail}${img.src ? ` (src="${img.src}")` : ''}`,
          evidence: [
            ev('RENDERED_HTML', { url: page.url, observed: img.raw }),
            // BROWSER, not PERFORMANCE_MEASUREMENT: the attributes are read from
            // the served document, and no layout shift was actually measured.
            ev('BROWSER', {
              url: page.url,
              width: hasWidth ? img.width : null,
              height: hasHeight ? img.height : null,
            }),
          ],
        });
      }
      return out;
    });
  },
};

export default [imgAltAttributePresent, imgDimensionsDeclared];
