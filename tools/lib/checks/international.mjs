/**
 * Internationalisation checks.
 *
 * hreflang is a cross-page contract rather than a per-page attribute: a locale
 * cluster is honoured only when every member names every other member and
 * itself, and a cluster with one missing edge is discarded whole rather than
 * partially. That is why two of these checks build a graph over the entire
 * capture before judging anything.
 *
 * The graph is also where the restraint lives. An alternate pointing at a page
 * the capture does not contain is left alone: the absence of a return link from
 * a document nobody fetched is not evidence that the return link is missing, and
 * reporting it would turn an incomplete capture into a wall of false positives.
 */
import { isAbsoluteUrl } from '../html.mjs';
import {
  linkTags, gate, findingsFor, location, ev, pathOf,
} from '../check-support.mjs';

/* ------------------------------------------------------------ the graph */

/**
 * `rel=alternate` links carrying an hreflang, taken from the whole document.
 *
 * Deliberately not head-scoped. A framework that injects alternates late can
 * land them after `</head>`, and crawlers still read them, so restricting the
 * search to the head would report a declared cluster as undeclared - a false
 * negative wearing the costume of applicability.
 */
function hreflangLinks(html) {
  return linkTags(html, 'alternate')
    .filter((tag) => 'hreflang' in tag.attrs)
    .map((tag) => ({
      value: String(tag.attrs.hreflang ?? '').trim(),
      href: String(tag.attrs.href ?? '').trim(),
      hasHref: 'href' in tag.attrs,
      index: tag.index,
      raw: tag.raw,
    }));
}

/**
 * Comparable path for a page URL or an href.
 *
 * A capture's `page.url` may be a bare path while the href beside it is fully
 * qualified, so both sides are reduced to a path before comparison. The
 * trailing slash is dropped because `/en` and `/en/` address the same resource
 * on every server this check will meet, and treating them as distinct would
 * invent a broken cluster out of a formatting difference.
 */
function pathKey(value) {
  const path = pathOf(value);
  if (path === null) return null;
  return path.length > 1 ? path.replace(/\/+$/, '') : path;
}

/**
 * Every captured page, its comparable path, and the alternates it declares.
 *
 * `byKey` covers all captured pages rather than only the annotated ones,
 * because a page that declares no hreflang at all is exactly the page most
 * likely to be missing a return edge - excluding it would hide the defect.
 */
function hreflangModel(snapshot) {
  const entries = snapshot.pages.map((page) => ({
    page,
    key: pathKey(page.url),
    links: hreflangLinks(page.rendered_html ?? page.raw_html ?? ''),
  }));
  const byKey = new Map();
  for (const entry of entries) {
    if (entry.key !== null && !byKey.has(entry.key)) byKey.set(entry.key, entry);
  }
  return { entries, byKey, declaring: entries.filter((entry) => entry.links.length) };
}

/**
 * Connected components of the hreflang graph, as lists of page paths.
 *
 * Membership is undirected on purpose. The reciprocity rule exists because a
 * one-way edge is a defect, so a one-way edge still has to place both pages in
 * the same cluster - if edges only counted when mutual, the very cases this
 * module reports would fall out of the clustering first and vanish.
 */
function clusters(model) {
  const adjacency = new Map();
  const touch = (key) => {
    if (!adjacency.has(key)) adjacency.set(key, new Set());
    return adjacency.get(key);
  };

  for (const entry of model.declaring) {
    if (entry.key === null) continue;
    touch(entry.key);
    for (const link of entry.links) {
      const target = pathKey(link.href);
      if (target === null || target === entry.key) continue;
      if (!model.byKey.has(target)) continue;
      touch(entry.key).add(target);
      touch(target).add(entry.key);
    }
  }

  const seen = new Set();
  const out = [];
  for (const key of adjacency.keys()) {
    if (seen.has(key)) continue;
    const members = [];
    const queue = [key];
    seen.add(key);
    while (queue.length) {
      const current = queue.shift();
      members.push(current);
      for (const next of adjacency.get(current) ?? []) {
        if (seen.has(next)) continue;
        seen.add(next);
        queue.push(next);
      }
    }
    out.push(members);
  }
  return out;
}

const isXDefault = (link) => link.value.toLowerCase() === 'x-default';

/* -------------------------------------------------------- SEO-451 */

const hreflangReciprocity = {
  id: 'hreflang-reciprocity',
  requirements: ['SEO-451'],
  level: 'RUNTIME',
  title: 'hreflang clusters are reciprocal and self-referential',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const model = hreflangModel(snapshot);
    if (!model.declaring.length) {
      return {
        status: 'NOT_APPLICABLE',
        findings: [],
        detail: 'no captured page declares a rel=alternate hreflang link',
      };
    }

    const items = [];

    // Missing self reference. This is the commonest generator bug in the family:
    // the template loops over "the other locales" instead of over the locale
    // table, so every page in the cluster omits exactly itself.
    for (const entry of model.declaring) {
      if (entry.key === null) continue;
      if (entry.links.some((link) => pathKey(link.href) === entry.key)) continue;
      items.push({
        requirement_id: 'SEO-451',
        location: location(entry.page, entry.links[0].index),
        severity: 'HIGH',
        detail: `declares ${entry.links.length} hreflang alternate(s) but none names its own path ${entry.key}; a cluster missing a self reference is discarded rather than partially honoured`,
        evidence: [
          ev('RENDERED_HTML', {
            url: entry.page.url,
            observed: entry.links.map((link) => `${link.value} -> ${link.href}`),
          }),
          ev('ROUTE', { url: entry.page.url, self_path: entry.key }),
        ],
      });
    }

    // Missing return edge. Judged only when the target is itself in the capture:
    // a page that was never fetched cannot be shown to have omitted anything.
    for (const entry of model.declaring) {
      if (entry.key === null) continue;
      const judged = new Set();
      for (const link of entry.links) {
        const target = pathKey(link.href);
        if (target === null || target === entry.key || judged.has(target)) continue;
        const other = model.byKey.get(target);
        if (!other) continue;
        // Two links on one page naming the same target (say `de` and `de-AT`
        // both pointing at /de) describe one missing return edge, not two.
        judged.add(target);
        if (other.links.some((back) => pathKey(back.href) === entry.key)) continue;
        items.push({
          requirement_id: 'SEO-451',
          location: location(entry.page, link.index),
          severity: 'HIGH',
          detail: `declares hreflang="${link.value}" -> ${link.href}, but ${other.page.url} declares no alternate pointing back at ${entry.key}${other.links.length ? '' : ' (that page declares no hreflang at all)'}`,
          evidence: [
            ev('RENDERED_HTML', {
              url: other.page.url,
              observed: other.links.length
                ? other.links.map((back) => `${back.value} -> ${back.href}`)
                : 'no rel=alternate hreflang links',
            }),
            ev('ROUTE', { url: entry.page.url, points_at: other.page.url, expected_return: entry.key }),
          ],
        });
      }
    }

    // One hreflang value naming two different URLs inside a cluster is
    // unresolvable: the engine is told that two separate pages are the `de-DE`
    // version. x-default is excluded because SEO-457 owns that value, and
    // reporting the clash in both checks would count one defect twice.
    for (const members of clusters(model)) {
      const byValue = new Map();
      for (const key of members) {
        const entry = model.byKey.get(key);
        if (!entry) continue;
        for (const link of entry.links) {
          const value = link.value.toLowerCase();
          if (!value || value === 'x-default') continue;
          if (!byValue.has(value)) byValue.set(value, []);
          byValue.get(value).push({ entry, link, target: pathKey(link.href) ?? link.href });
        }
      }

      for (const [value, uses] of byValue) {
        const distinct = [...new Set(uses.map((use) => use.target))];
        if (distinct.length < 2) continue;
        // Located at the declaration that introduced the second target, so the
        // finding addresses the line a reader must open to see the clash.
        const clash = uses.find((use) => use.target !== uses[0].target);
        items.push({
          requirement_id: 'SEO-451',
          location: location(clash.entry.page, clash.link.index),
          severity: 'HIGH',
          detail: `hreflang="${value}" names ${distinct.length} different URLs across this cluster (${distinct.join(', ')}); the cluster cannot resolve which page is the ${value} version`,
          evidence: [
            ev('RENDERED_HTML', {
              url: clash.entry.page.url,
              observed: uses.map((use) => `${use.entry.page.url} declares ${use.link.value} -> ${use.link.href}`),
            }),
            ev('ROUTE', { cluster: members, hreflang: value, targets: distinct }),
          ],
        });
      }
    }

    return findingsFor(hreflangReciprocity, items);
  },
};

/* -------------------------------------------------------- SEO-452 */

/**
 * The ISO 639-1 two-letter language subtags, as recorded in the IANA Language
 * Subtag Registry: 184 current codes plus the 6 deprecated aliases listed at the
 * end, 190 entries in total, transcribed from the registry's two-letter
 * `language` records.
 *
 * A full subtag registry is not embedded here - it is thousands of records and a
 * copy inside a check module would rot silently. Two letters is the one part of
 * the space small enough to hold honestly, and it is also the part that catches
 * the mistake the requirement is about: a region code parked where a language
 * belongs. The cost is stated plainly: a two-letter subtag missing from this
 * list would be reported wrongly, so the list is the thing to correct first if
 * this check ever produces a false positive.
 *
 * Three-letter subtags (ISO 639-2/3) are accepted on shape alone, because their
 * registry is far too large to embed - see `tagFault`.
 */
const ISO_639_1 = new Set((
  'aa ab ae af ak am an ar as av ay az '
  + 'ba be bg bh bi bm bn bo br bs '
  + 'ca ce ch co cr cs cu cv cy '
  + 'da de dv dz '
  + 'ee el en eo es et eu '
  + 'fa ff fi fj fo fr fy '
  + 'ga gd gl gn gu gv '
  + 'ha he hi ho hr ht hu hy hz '
  + 'ia id ie ig ii ik io is it iu '
  + 'ja jv '
  + 'ka kg ki kj kk kl km kn ko kr ks ku kv kw ky '
  + 'la lb lg li ln lo lt lu lv '
  + 'mg mh mi mk ml mn mr ms mt my '
  + 'na nb nd ne ng nl nn no nr nv ny '
  + 'oc oj om or os '
  + 'pa pi pl ps pt '
  + 'qu '
  + 'rm rn ro ru rw '
  + 'sa sc sd se sg si sk sl sm sn so sq sr ss st su sv sw '
  + 'ta te tg th ti tk tl tn to tr ts tt tw ty '
  + 'ug uk ur uz '
  + 've vi vo '
  + 'wa wo '
  + 'xh '
  + 'yi yo '
  + 'za zh zu '
  // Deprecated in the registry but still registered, and still interpreted by
  // search engines. Rejecting them would be a false positive against a
  // requirement that asks only for a registered subtag.
  + 'in iw ji jw mo sh'
).split(' '));

/**
 * The shape search engines parse: language, optional script, optional region.
 *
 * This is the subset of the BCP 47 grammar that hreflang actually uses. Variants
 * and extensions are legal BCP 47 and are not accepted here, because an hreflang
 * carrying one is not something a search engine will act on.
 */
const TAG_SHAPE = /^([A-Za-z]{2,3})(?:-([A-Za-z]{4}))?(?:-([A-Za-z]{2}|[0-9]{3}))?$/;

/**
 * Why an hreflang value is invalid, in words, or null when it is fine.
 *
 * The order of the tests is the point: each real-world mistake is named before
 * the generic grammar failure can swallow it, so a report says "you used an
 * underscore" rather than "does not match a regular expression".
 */
function tagFault(value) {
  if (!value) return 'the hreflang attribute is empty, so the annotation names no locale at all';

  if (value.includes('_')) {
    return `"${value}" separates its subtags with "_"; BCP 47 uses "-", and the underscore form (the shape a POSIX locale or a Java Locale prints) leaves the whole tag unparseable`;
  }

  if (/^[0-9]{3}$/.test(value)) {
    return `"${value}" is a UN M.49 region code with no language subtag; hreflang needs a language first, with the region optional and second`;
  }

  const parts = value.split('-');

  // Region and script transposed - `zh-CN-Hant` for `zh-Hant-CN`. Caught before
  // the grammar test so the report can say which two subtags to swap.
  if (parts.length === 3 && /^([A-Za-z]{2}|[0-9]{3})$/.test(parts[1]) && /^[A-Za-z]{4}$/.test(parts[2])) {
    return `"${value}" orders its subtags language-region-script; BCP 47 orders them language-script-region, so "${parts[2]}" and "${parts[1]}" are transposed`;
  }

  if (!TAG_SHAPE.test(value)) {
    return `"${value}" is not a language tag of the shape hreflang accepts: a 2-3 letter language, optionally "-" a 4-letter script, optionally "-" a 2-letter or 3-digit region`;
  }

  const language = parts[0].toLowerCase();

  // Only two-letter subtags are checked against a list. A three-letter subtag is
  // accepted on shape because ISO 639-2/3 runs to thousands of codes and a
  // hand-copied subset would reject valid languages - a worse failure than
  // missing an invented one.
  //
  // This is also why `uk` passes. An author who writes hreflang="uk" meaning the
  // United Kingdom has made a mistake, but `uk` is the registered subtag for
  // Ukrainian and nothing in the markup distinguishes the two intentions, so
  // rejecting it would mean guessing. The check reports only codes that are not
  // assigned to any language.
  if (language.length === 2 && !ISO_639_1.has(language)) {
    return `"${parts[0]}" is not an assigned two-letter language subtag; a region code standing in for the language (hreflang="US" for the United States) or a region-only value is the usual cause`;
  }

  return null;
}

const hreflangValidLanguageTag = {
  id: 'hreflang-valid-language-tag',
  requirements: ['SEO-452'],
  level: 'RUNTIME',
  title: 'hreflang values are well-formed language tags with absolute hrefs',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const model = hreflangModel(snapshot);
    // Reported as inapplicable rather than passing: a project with no locale
    // annotations has not demonstrated that its language tags are valid, it has
    // simply not emitted any, and a PASS here would claim a test that never ran.
    if (!model.declaring.length) {
      return {
        status: 'NOT_APPLICABLE',
        findings: [],
        detail: 'no captured page declares a rel=alternate hreflang link',
      };
    }

    const items = [];
    for (const entry of model.declaring) {
      for (const link of entry.links) {
        const fault = isXDefault(link) ? null : tagFault(link.value);
        if (fault) {
          items.push({
            requirement_id: 'SEO-452',
            location: location(entry.page, link.index),
            severity: 'HIGH',
            detail: `invalid hreflang value: ${fault}. An unregistered or malformed tag is dropped rather than approximated, so the alternate carrying it is ignored`,
            evidence: [
              ev('RENDERED_HTML', { url: entry.page.url, observed: link.raw }),
              ev('VALIDATOR_OUTPUT', {
                value: link.value,
                grammar: 'language(2-3 alpha) [ "-" script(4 alpha) ] [ "-" region(2 alpha | 3 digit) ] | x-default',
                reference: 'RFC 5646',
              }),
            ],
          });
        }

        // A relative href is a separate defect from a malformed tag, so a link
        // carrying both is reported twice - two instances, two fixes.
        if (!isAbsoluteUrl(link.href)) {
          items.push({
            requirement_id: 'SEO-452',
            location: location(entry.page, link.index),
            severity: 'HIGH',
            detail: link.hasHref && link.href
              ? `hreflang="${link.value}" points at the relative href "${link.href}"; hreflang annotations are resolved as given and must be fully qualified`
              : `hreflang="${link.value}" carries no usable href, so the annotation names a locale but no page`,
            evidence: [
              ev('RENDERED_HTML', { url: entry.page.url, observed: link.raw }),
              ev('VALIDATOR_OUTPUT', { hreflang: link.value, href: link.href, expected: 'absolute http(s) URL' }),
            ],
          });
        }
      }
    }

    return findingsFor(hreflangValidLanguageTag, items);
  },
};

/* -------------------------------------------------------- SEO-457 */

const hreflangXdefaultSingle = {
  id: 'hreflang-xdefault-single',
  requirements: ['SEO-457'],
  level: 'RUNTIME',
  title: 'x-default names one fallback page per cluster',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const model = hreflangModel(snapshot);
    const declaring = model.declaring.filter((entry) => entry.links.some(isXDefault));
    if (!declaring.length) {
      return {
        status: 'NOT_APPLICABLE',
        findings: [],
        detail: 'no captured page declares hreflang="x-default"',
      };
    }

    const items = [];
    const sourceEvidence = (page) => (page.source_file ? [ev('FILE', { path: page.source_file })] : []);

    for (const entry of declaring) {
      const defaults = entry.links.filter(isXDefault);
      if (defaults.length < 2) continue;
      const targets = [...new Set(defaults.map((link) => pathKey(link.href) ?? link.href))];
      items.push({
        requirement_id: 'SEO-457',
        location: location(entry.page, defaults[1].index),
        severity: 'MEDIUM',
        detail: targets.length > 1
          ? `${defaults.length} x-default annotations on one page naming ${targets.length} different fallbacks (${targets.join(', ')}); only one page can be the locale-neutral fallback, and which one is an editorial decision this check cannot make`
          : `${defaults.length} x-default annotations on one page, all naming ${targets[0]}; the repeat is redundant and obscures which declaration the generator intended`,
        evidence: [
          ev('RENDERED_HTML', { url: entry.page.url, observed: defaults.map((link) => link.raw) }),
          ev('ROUTE', { url: entry.page.url, x_default_targets: targets }),
          ...sourceEvidence(entry.page),
        ],
      });
    }

    for (const members of clusters(model)) {
      const uses = [];
      for (const key of members) {
        const entry = model.byKey.get(key);
        if (!entry) continue;
        // One declaration per page. A page carrying two x-defaults is already
        // reported above; counting both here would report that defect twice.
        const first = entry.links.find(isXDefault);
        if (first) uses.push({ entry, link: first, target: pathKey(first.href) ?? first.href });
      }

      const distinct = [...new Set(uses.map((use) => use.target))];
      if (distinct.length < 2) continue;
      const clash = uses.find((use) => use.target !== uses[0].target);
      items.push({
        requirement_id: 'SEO-457',
        location: location(clash.entry.page, clash.link.index),
        severity: 'MEDIUM',
        detail: `pages in one locale cluster nominate ${distinct.length} different x-default pages (${distinct.join(', ')}); every unmatched requester is sent somewhere different depending on which page the engine read`,
        evidence: [
          ev('RENDERED_HTML', {
            url: clash.entry.page.url,
            observed: uses.map((use) => `${use.entry.page.url} declares x-default -> ${use.link.href}`),
          }),
          ev('ROUTE', { cluster: members, x_default_targets: distinct }),
          ...sourceEvidence(clash.entry.page),
        ],
      });
    }

    return findingsFor(hreflangXdefaultSingle, items);
  },
};

export default [hreflangReciprocity, hreflangValidLanguageTag, hreflangXdefaultSingle];
