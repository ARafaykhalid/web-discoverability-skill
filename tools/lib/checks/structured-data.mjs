/**
 * Structured data checks.
 *
 * These check that the markup is machine-readable and internally consistent. None
 * of them treats valid structured data as a guarantee of a rich result: eligibility
 * is documented by the search engines, and the decision to display one is not.
 *
 * The review check is the one with teeth. Fabricating ratings or reviews is a
 * documented spam policy violation, so it is reported and never fixed automatically.
 */
import { isAbsoluteUrl, jsonLdNodes, visibleText } from '../html.mjs';
import {
  pageCheck, gate, findingsFor, location, ev, jsonLdScripts,
} from '../check-support.mjs';

/** Properties whose values are URLs that identify a real resource. */
const URL_PROPERTIES = ['url', 'sameAs', 'logo', 'image', 'contentUrl', 'thumbnailUrl', 'mainEntityOfPage', 'target'];

/** Types that name one real-world entity per site, so two of them is a conflict. */
const SITE_SINGLETON_TYPES = new Set(['Organization', 'Corporation', 'LocalBusiness', 'WebSite']);

/**
 * Types where several real entities on one page is the ordinary shape.
 *
 * Person was in the singleton set above and does not belong there. A site has one
 * publisher, so a second Organization is a conflict however it is named - but a
 * site has many people, and an article byline plus a named comment author is two
 * of them. That is what every editorial and UGC page looks like, so reporting it
 * as one entity described twice was a false positive with no honest remedy: a
 * publisher cannot merge two people, and the only way to silence the rule was to
 * stop typing them as Person, which discards exactly the markup the rule exists to
 * protect.
 *
 * Person is kept in the grouping rather than dropped, because the defect the rule
 * was written for is real and nothing else catches it: two Person nodes for the
 * *same* reporter - one nested in `author` with an @id, one emitted loose by a
 * byline widget with none - do describe one person twice, and nothing says which
 * description holds. `name` is the discriminator, because naming which person a
 * node is about is what `name` is for. The exemption is therefore narrow: a group
 * is excused only when every node carries a name and all the names differ. A
 * repeated name, or a node with no name to compare against, leaves the nodes
 * indistinguishable and the group is still reported.
 */
const MULTI_ENTITY_TYPES = new Set(['Person']);

/** Types this rule groups at all. */
const GROUPED_TYPES = new Set([...SITE_SINGLETON_TYPES, ...MULTI_ENTITY_TYPES]);

function typesOf(node) {
  const raw = node['@type'];
  return (Array.isArray(raw) ? raw : [raw]).filter((t) => typeof t === 'string');
}

/**
 * A node's name reduced to a comparison key, or null when it has none to compare.
 *
 * Case and run-of-whitespace differences are normalised away because two nodes
 * differing only in those describe the same person, and treating them as distinct
 * would excuse the duplicate. A non-string name (an array of translations, a
 * nested object) yields null: it cannot be compared honestly, so the group falls
 * through to being reported rather than being excused on a guess.
 */
function nameKey(node) {
  if (typeof node.name !== 'string') return null;
  return node.name.trim().replace(/\s+/g, ' ').toLowerCase() || null;
}

const jsonldParses = {
  id: 'jsonld-parses',
  requirements: ['SEO-161'],
  level: 'RUNTIME',
  title: 'Every JSON-LD block parses and declares a type',
  run(snapshot) {
    return pageCheck(jsonldParses, snapshot, (page, html) => {
      const blocks = jsonLdScripts(html);
      if (!blocks.length) return [];
      const out = [];

      for (const block of blocks) {
        if (block.error) {
          out.push({
            requirement_id: 'SEO-161',
            location: location(page, block.index),
            severity: 'HIGH',
            detail: `JSON-LD block does not parse (${block.error}); a consumer discards the whole block, so every entity inside it is invisible`,
            evidence: [
              ev('JSON_LD', { url: page.url, error: block.error, excerpt: block.raw.slice(0, 200) }),
              ev('RENDERED_HTML', { url: page.url, observed: 'script type="application/ld+json"' }),
              ev('VALIDATOR_OUTPUT', { rule: 'jsonld-parses', note: 'JSON.parse failed' }),
            ],
          });
          continue;
        }
        const value = block.value;
        const roots = Array.isArray(value) ? value : [value];
        if (!roots.some((node) => node && typeof node === 'object')) {
          out.push({
            requirement_id: 'SEO-161',
            location: location(page, block.index),
            severity: 'HIGH',
            detail: 'JSON-LD block parses but contains no object, so it describes nothing',
            evidence: [
              ev('JSON_LD', { url: page.url, parsed: typeof value }),
              ev('RENDERED_HTML', { url: page.url, observed: block.raw.slice(0, 120) }),
              ev('VALIDATOR_OUTPUT', { rule: 'jsonld-parses', note: 'no object at the root' }),
            ],
          });
          continue;
        }
        for (const node of roots) {
          if (!node || typeof node !== 'object') continue;
          const nested = Array.isArray(node['@graph']) ? node['@graph'] : null;
          const bearers = nested ?? [node];
          const untyped = bearers.filter((n) => n && typeof n === 'object' && !n['@type']);
          if (!untyped.length) continue;
          out.push({
            requirement_id: 'SEO-161',
            location: location(page, block.index),
            severity: 'HIGH',
            detail: `${untyped.length} JSON-LD node(s) declare no @type; an untyped node cannot be matched to any vocabulary and is ignored`,
            evidence: [
              ev('JSON_LD', { url: page.url, untyped_keys: untyped.map((n) => Object.keys(n).slice(0, 6)) }),
              ev('RENDERED_HTML', { url: page.url, observed: block.raw.slice(0, 200) }),
              ev('VALIDATOR_OUTPUT', { rule: 'jsonld-parses', note: 'node without @type' }),
            ],
          });
        }
        if (!roots.some((node) => node && typeof node === 'object' && node['@context'])) {
          out.push({
            requirement_id: 'SEO-161',
            location: location(page, block.index),
            severity: 'HIGH',
            detail: 'JSON-LD block declares no @context, so its property names resolve to no vocabulary',
            evidence: [
              ev('JSON_LD', { url: page.url, context: null }),
              ev('RENDERED_HTML', { url: page.url, observed: block.raw.slice(0, 120) }),
              ev('VALIDATOR_OUTPUT', { rule: 'jsonld-parses', note: 'missing @context' }),
            ],
          });
        }
      }
      return out;
    });
  },
};

const jsonldAbsoluteUrls = {
  id: 'jsonld-absolute-urls',
  requirements: ['SEO-164'],
  level: 'RUNTIME',
  title: 'JSON-LD URL properties and identifiers are absolute',
  run(snapshot) {
    return pageCheck(jsonldAbsoluteUrls, snapshot, (page, html) => {
      const nodes = jsonLdNodes(html);
      if (!nodes.length) return [];
      const out = [];
      const seen = new Set();

      const report = (property, value, node) => {
        const key = `${property}:${value}`;
        if (seen.has(key)) return;
        seen.add(key);
        out.push({
          requirement_id: 'SEO-164',
          location: location(page),
          severity: 'MEDIUM',
          detail: `${typesOf(node)[0] || 'node'}.${property} is "${value}", which is relative; structured data is consumed away from the page that served it, so a relative reference cannot be resolved`,
          evidence: [
            ev('JSON_LD', { url: page.url, node_types: typesOf(node), property, observed: value }),
            ev('RENDERED_HTML', { url: page.url, observed: `"${property}": "${value}"` }),
            ev('ROUTE', { url: page.url }),
          ],
        });
      };

      for (const node of nodes) {
        const id = node['@id'];
        // A bare-fragment @id is a documented convention for naming a node within
        // one graph, so only a path-like @id is reported.
        if (typeof id === 'string' && id && !isAbsoluteUrl(id) && !id.startsWith('#')) report('@id', id, node);

        for (const property of URL_PROPERTIES) {
          const raw = node[property];
          const values = Array.isArray(raw) ? raw : [raw];
          for (const value of values) {
            if (typeof value === 'string' && value && !isAbsoluteUrl(value)) report(property, value, node);
            if (value && typeof value === 'object' && typeof value.url === 'string' && value.url && !isAbsoluteUrl(value.url)) {
              report(`${property}.url`, value.url, node);
            }
          }
        }
      }
      return out;
    });
  },
};

const jsonldDuplicateEntity = {
  id: 'jsonld-duplicate-entity',
  requirements: ['SEO-167'],
  level: 'RUNTIME',
  title: 'One node per real-world entity per page',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const withJsonLd = snapshot.pages.filter((p) => jsonLdNodes(p.rendered_html ?? p.raw_html ?? '').length > 0);
    if (!withJsonLd.length) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'no page serves JSON-LD' };
    }

    const items = [];
    for (const page of withJsonLd) {
      const nodes = jsonLdNodes(page.rendered_html ?? page.raw_html);

      // Two nodes of a singleton type on one page describe the same thing twice,
      // and a consumer has no rule for choosing between them.
      const byType = new Map();
      for (const node of nodes) {
        for (const type of typesOf(node)) {
          if (!GROUPED_TYPES.has(type)) continue;
          if (!byType.has(type)) byType.set(type, []);
          byType.get(type).push(node);
        }
      }
      for (const [type, group] of byType) {
        if (group.length < 2) continue;
        const ids = group.map((n) => n['@id'] ?? null);
        // Distinct @id values are how one graph legitimately references a node
        // more than once, so identical ids are not a duplicate.
        if (ids.every(Boolean) && new Set(ids).size === 1) continue;
        const names = group.map(nameKey);
        // For a type that legitimately repeats, distinct names on every node are
        // proof that the nodes are distinct entities and there is nothing to
        // reconcile. Extending this to Organization would excuse the case the rule
        // was written for - a stale second publisher block under its own name - so
        // it is deliberately limited to MULTI_ENTITY_TYPES.
        if (MULTI_ENTITY_TYPES.has(type) && names.every(Boolean) && new Set(names).size === group.length) continue;
        items.push({
          requirement_id: 'SEO-167',
          location: location(page),
          severity: 'MEDIUM',
          detail: `${group.length} separate ${type} nodes on one page; each one claims to describe the same entity and nothing says which is authoritative`,
          evidence: [
            ev('JSON_LD', { url: page.url, entity_type: type, ids, names: group.map((n) => n.name ?? null) }),
            ev('RENDERED_HTML', { url: page.url, observed: `${group.length} ${type} nodes` }),
            ev('VALIDATOR_OUTPUT', { rule: 'jsonld-duplicate-entity', note: 'repeated singleton type' }),
          ],
        });
      }

      // A repeated @id is unambiguously wrong: an identifier that names two
      // different shapes makes the graph self-contradicting.
      const byId = new Map();
      for (const node of nodes) {
        const id = node['@id'];
        if (typeof id !== 'string' || !id) continue;
        if (!byId.has(id)) byId.set(id, []);
        byId.get(id).push(node);
      }
      for (const [id, group] of byId) {
        if (group.length < 2) continue;
        const shapes = new Set(group.map((n) => JSON.stringify(Object.keys(n).sort())));
        if (shapes.size < 2) continue;
        items.push({
          requirement_id: 'SEO-167',
          location: location(page),
          severity: 'MEDIUM',
          detail: `@id "${id}" is used by ${group.length} nodes with different property sets, so one identifier names two different entities`,
          evidence: [
            ev('JSON_LD', { url: page.url, id, types: group.map((n) => typesOf(n)) }),
            ev('RENDERED_HTML', { url: page.url, observed: `@id ${id} repeated` }),
            ev('VALIDATOR_OUTPUT', { rule: 'jsonld-duplicate-entity', note: 'conflicting @id' }),
          ],
        });
      }
    }
    return findingsFor(jsonldDuplicateEntity, items);
  },
};

/**
 * Review and rating markup that has no verifiable source behind it.
 *
 * Both Google and Bing document that review markup must reflect reviews actually
 * collected and displayed on the page. Markup that no visible content supports is
 * the reason this check exists, and it is why the bound requirement is BLOCKED:
 * the fix is either to publish the real reviews or to remove the claim, and an
 * agent cannot decide which without knowing whether the reviews exist.
 */
const jsonldReviewWithoutSource = {
  id: 'jsonld-review-without-source',
  requirements: ['SEO-173'],
  level: 'RUNTIME',
  title: 'Review and rating markup is backed by on-page content',
  run(snapshot) {
    const blocked = gate(snapshot);
    if (blocked) return blocked;

    const items = [];
    let inspected = 0;

    for (const page of snapshot.pages) {
      const html = page.rendered_html ?? page.raw_html ?? '';
      const nodes = jsonLdNodes(html);
      const rated = nodes.filter((n) => n.aggregateRating || n.review || typesOf(n).some((t) => t === 'Review' || t === 'AggregateRating'));
      if (!rated.length) continue;
      inspected += 1;

      for (const node of rated) {
        const type = typesOf(node)[0] || 'node';
        const aggregate = node.aggregateRating && typeof node.aggregateRating === 'object' ? node.aggregateRating : null;
        const reviews = Array.isArray(node.review) ? node.review : node.review ? [node.review] : [];

        if (aggregate) {
          const count = aggregate.reviewCount ?? aggregate.ratingCount ?? null;
          if (count === null || count === undefined || Number(count) === 0) {
            items.push({
              requirement_id: 'SEO-173',
              location: location(page),
              severity: 'CRITICAL',
              detail: `${type} declares an aggregateRating with no reviewCount or ratingCount; a rating with no stated number of ratings behind it cannot be verified against anything`,
              evidence: [
                ev('JSON_LD', { url: page.url, node_type: type, aggregateRating: aggregate }),
                ev('RENDERED_HTML', { url: page.url, observed: 'aggregateRating without a count' }),
                ev('MANUAL_ACTION', { required: 'confirm the ratings exist and are displayed, or remove the markup' }),
              ],
            });
          }
          // The number in the markup has to be traceable to something a visitor can
          // see. Text search is a weak instrument, so this reports the absence of
          // corroboration for a human to resolve, not a proven fabrication.
          //
          // Searching `html` here made the rule unreachable: the document contains
          // the ld+json block that declares ratingValue, so the value always
          // corroborated itself and a page displaying no rating anywhere passed.
          // visibleText drops scripts, styles, comments and tags, so what is left is
          // the prose a reader receives - which is what the requirement is about.
          const value = aggregate.ratingValue;
          if (value !== undefined && value !== null && !visibleText(html).includes(String(value))) {
            items.push({
              requirement_id: 'SEO-173',
              location: location(page),
              severity: 'CRITICAL',
              detail: `${type} declares ratingValue ${value} but that value appears nowhere in the served page; review markup must reflect ratings the page actually shows`,
              evidence: [
                ev('JSON_LD', { url: page.url, node_type: type, ratingValue: value }),
                ev('RENDERED_HTML', { url: page.url, observed: 'ratingValue not present in page content' }),
                ev('MANUAL_ACTION', { required: 'display the real rating on the page or remove the markup' }),
              ],
            });
          }
        }

        for (const review of reviews) {
          if (!review || typeof review !== 'object') continue;
          const author = review.author;
          const named = typeof author === 'string' ? author : author && typeof author === 'object' ? author.name : null;
          if (named) continue;
          items.push({
            requirement_id: 'SEO-173',
            location: location(page),
            severity: 'CRITICAL',
            detail: `${type} carries a Review with no named author; an unattributed review cannot be traced to a reviewer, and inventing one is a documented spam policy violation`,
            evidence: [
              ev('JSON_LD', { url: page.url, node_type: type, review_keys: Object.keys(review) }),
              ev('RENDERED_HTML', { url: page.url, observed: 'review without author' }),
              ev('MANUAL_ACTION', { required: 'attribute the review to its real author or remove it' }),
            ],
          });
        }
      }
    }

    if (!inspected) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'no page serves review or rating markup' };
    }
    return findingsFor(jsonldReviewWithoutSource, items);
  },
};

export default [jsonldParses, jsonldAbsoluteUrls, jsonldDuplicateEntity, jsonldReviewWithoutSource];
