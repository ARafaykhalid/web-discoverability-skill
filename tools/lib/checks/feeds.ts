/**
 * Syndication feed checks.
 *
 * A feed is one of the few artefacts a repository can judge without a server:
 * the bytes on disk are the bytes a reader will parse, so `feed-wellformed` is
 * SOURCE level and runs with no capture. Announcing the feed is a different kind
 * of claim - a link element only counts once it reaches the served document, and
 * a template that emits one proves nothing about what shipped - so
 * `feed-alternate-link-declared` is RUNTIME and stays silent without a capture
 * rather than reading source and calling it evidence.
 */
import { findTags } from '../html.ts';
import {
  gate, findingsFor, location, ev, lineAt, linkTags, pathOf,
} from '../check-support.ts';

/* --------------------------------------------------------- feed reading */

/** Which syndication format a feed's bytes actually are, or null. */
function feedFormat(path, text) {
  if (/\.json$/i.test(String(path ?? ''))) return 'json';
  if (/<feed[\s>]/i.test(text)) return 'atom';
  if (/<rss[\s>]/i.test(text)) return 'rss';
  return null;
}

/**
 * Inner text of the first `<name>` element in a region, or null.
 *
 * `findTags(...).inner` cannot supply this for `link`: html.ts classifies
 * `link` as a void element, which is right for HTML and wrong for RSS, where
 * `<link>` wraps the channel URL. A locally constructed non-global regex avoids
 * both that and the `lastIndex` leak a shared /g pattern would carry between
 * calls.
 */
function elementText(region, name) {
  const pattern = new RegExp(`<${name}(?:\\s[^>]*)?>([\\s\\S]*?)</${name}\\s*>`, 'i');
  const match = pattern.exec(String(region ?? ''));
  return match ? match[1].trim() : null;
}

/**
 * Whether a required element is absent, present but empty, or usable.
 *
 * The emptiness case is not pedantry. `<title></title>` satisfies a presence
 * test and still leaves a reader with nothing to display, which is the same
 * outcome as the element being missing, so both are reported - with the detail
 * saying which, because the two have different fixes.
 */
function elementState(region, name) {
  if (!findTags(region, name).length) return 'absent';
  return elementText(region, name) ? 'present' : 'empty';
}

/**
 * Split a feed into its repeating `entry`/`item` regions and everything outside
 * them.
 *
 * Two traps are handled here at once. First, `findTags` returns "the rest of the
 * document" as `inner` when an element is never closed, so a feed with one
 * unclosed `<entry>` would let that entry absorb every later one and every later
 * fault would silently disappear; bounding each region at the start of the next
 * occurrence keeps the remaining entries visible. Second, the complement matters
 * as much as the regions: feed-level lookups run against `outside`, so an
 * entry's own `<title>` cannot be mistaken for the channel title that is
 * actually missing.
 */
function splitRepeated(text, name, parent) {
  const tags = findTags(text, name);
  if (!tags.length) return { entries: [], outside: text };

  const close = new RegExp(`</${parent}\\s*>`, 'i');
  const bounds = tags.map((tag, i) => {
    if (i + 1 < tags.length) return [tag.index, tags[i + 1].index];
    // The last region ends at its parent's closing tag so that feed-level
    // elements written after the entries are still counted as feed-level.
    const match = close.exec(text.slice(tag.index));
    return [tag.index, match ? tag.index + match.index : text.length];
  });

  let outside = '';
  let cursor = 0;
  for (const [start, end] of bounds) {
    outside += text.slice(cursor, start);
    cursor = end;
  }
  outside += text.slice(cursor);

  return {
    entries: bounds.map(([start, end], i) => ({ index: start, ordinal: i + 1, body: text.slice(start, end) })),
    outside,
  };
}

/* -------------------------------------------------------- SEO-497 */

const ATOM_REQUIRED = ['id', 'title', 'updated'];
const RSS_CHANNEL_REQUIRED = ['title', 'link', 'description'];

/** Source location inside a feed file: `path` or `path:line`. */
function at(feed, text, index) {
  const line = typeof index === 'number' ? lineAt(text, index) : null;
  return line ? `${feed.path}:${line}` : feed.path;
}

function missingElement(feed, text, index, { format, element, state, scope, rule }) {
  return {
    requirement_id: 'SEO-497',
    location: at(feed, text, index),
    severity: 'HIGH',
    detail: `${scope} ${state === 'absent' ? 'has no' : 'has an empty'} <${element}> element; ${rule}`,
    evidence: [
      ev('FEED', { path: feed.path, format, element, state, scope }),
      ev('VALIDATOR_OUTPUT', { rule, element, observed: state }),
    ],
  };
}

function jsonFeedFaults(feed, text) {
  let value;
  try {
    value = JSON.parse(text);
  } catch (error) {
    return [{
      requirement_id: 'SEO-497',
      location: feed.path,
      severity: 'HIGH',
      detail: `JSON Feed does not parse: ${error.message}. A reader stops at the fault, so every item in the file reaches nobody`,
      evidence: [
        ev('VALIDATOR_OUTPUT', { parser: 'JSON.parse', message: error.message }),
        ev('FEED', { path: feed.path, format: 'json' }),
      ],
    }];
  }

  const version = value && typeof value === 'object' && !Array.isArray(value) ? value.version : undefined;
  if (typeof version === 'string' && version.startsWith('https://jsonfeed.org/version/')) return [];
  return [{
    requirement_id: 'SEO-497',
    location: feed.path,
    severity: 'HIGH',
    detail: version === undefined
      ? 'JSON Feed declares no `version`, so a reader has no way to know which revision of the format applies'
      : `JSON Feed declares version ${JSON.stringify(version)}, which is not a https://jsonfeed.org/version/ URL`,
    evidence: [
      ev('FEED', { path: feed.path, format: 'json', observed_version: version ?? null }),
      ev('VALIDATOR_OUTPUT', { expected: 'version string beginning https://jsonfeed.org/version/' }),
    ],
  }];
}

function atomFaults(feed, text) {
  const out = [];
  const root = findTags(text, 'feed')[0];
  const { entries, outside } = splitRepeated(text, 'entry', 'feed');

  for (const element of ATOM_REQUIRED) {
    const state = elementState(outside, element);
    if (state === 'present') continue;
    out.push(missingElement(feed, text, root ? root.index : null, {
      format: 'atom',
      element,
      state,
      scope: 'Atom feed',
      rule: 'RFC 4287 requires id, title, and updated on the feed element',
    }));
  }

  for (const entry of entries) {
    for (const element of ATOM_REQUIRED) {
      const state = elementState(entry.body, element);
      if (state === 'present') continue;
      out.push(missingElement(feed, text, entry.index, {
        format: 'atom',
        element,
        state,
        scope: `Atom entry ${entry.ordinal}`,
        rule: 'RFC 4287 requires id, title, and updated on every entry',
      }));
    }
  }

  return out;
}

function rssFaults(feed, text) {
  const channel = findTags(text, 'channel')[0];
  if (!channel) {
    return [{
      requirement_id: 'SEO-497',
      location: feed.path,
      severity: 'HIGH',
      detail: 'RSS feed has no <channel> element, so it carries neither feed metadata nor items a reader can enumerate',
      evidence: [
        ev('FEED', { path: feed.path, format: 'rss', observed: 'no <channel>' }),
        ev('VALIDATOR_OUTPUT', { rule: 'RSS 2.0 requires one channel inside rss' }),
      ],
    }];
  }

  const out = [];
  const { entries, outside } = splitRepeated(text, 'item', 'channel');

  for (const element of RSS_CHANNEL_REQUIRED) {
    const state = elementState(outside, element);
    if (state === 'present') continue;
    out.push(missingElement(feed, text, channel.index, {
      format: 'rss',
      element,
      state,
      scope: 'RSS channel',
      rule: 'RSS 2.0 requires title, link, and description on the channel',
    }));
  }

  for (const item of entries) {
    const title = elementState(item.body, 'title');
    const description = elementState(item.body, 'description');
    if (title === 'present' || description === 'present') continue;
    // One finding, not two: RSS 2.0 asks for a title or a description, so the
    // defect is the absence of both together rather than of either one.
    out.push({
      requirement_id: 'SEO-497',
      location: at(feed, text, item.index),
      severity: 'HIGH',
      detail: `RSS item ${item.ordinal} has no usable <title> and no usable <description> (title: ${title}, description: ${description}); RSS 2.0 requires at least one of the two, and an item with neither renders as a blank row`,
      evidence: [
        ev('FEED', { path: feed.path, format: 'rss', item: item.ordinal, title, description }),
        ev('VALIDATOR_OUTPUT', { rule: 'RSS 2.0 requires title or description on every item' }),
      ],
    });
  }

  return out;
}

const feedWellformed = {
  id: 'feed-wellformed',
  requirements: ['SEO-497'],
  level: 'SOURCE',
  title: 'Published feeds satisfy the format they declare',
  run(snapshot) {
    const feeds = (snapshot.feeds || []).filter((feed) => feed && feed.path);
    if (!feeds.length) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'project publishes no feed file' };
    }

    const items = [];
    for (const feed of feeds) {
      const text = String(feed.text ?? '');
      if (!text.trim()) {
        items.push({
          requirement_id: 'SEO-497',
          location: feed.path,
          severity: 'HIGH',
          detail: 'feed file is empty, so a reader that fetches it enumerates nothing',
          evidence: [
            ev('FEED', { path: feed.path, observed: 'empty file', bytes: Buffer.byteLength(text, 'utf8') }),
            ev('VALIDATOR_OUTPUT', { expected: 'a JSON Feed document, or XML rooted at <feed> or <rss>' }),
          ],
        });
        continue;
      }

      const format = feedFormat(feed.path, text);
      if (format === 'json') items.push(...jsonFeedFaults(feed, text));
      else if (format === 'atom') items.push(...atomFaults(feed, text));
      else if (format === 'rss') items.push(...rssFaults(feed, text));
      else {
        // Neither root element present. This is also what a SPA fallback served
        // at /feed.xml looks like, which is why the first bytes are quoted.
        items.push({
          requirement_id: 'SEO-497',
          location: feed.path,
          severity: 'HIGH',
          detail: 'file is published as a feed but its root element is neither <feed> (Atom) nor <rss>, so a reader has no format to apply to it',
          evidence: [
            ev('FEED', { path: feed.path, observed: text.slice(0, 160).replace(/\s+/g, ' ').trim() }),
            ev('VALIDATOR_OUTPUT', { expected: 'root element <feed> or <rss>' }),
          ],
        });
      }
    }

    return findingsFor(feedWellformed, items);
  },
};

/* -------------------------------------------------------- SEO-498 */

/** The media types that announce a feed, mapped to the format each promises. */
const FEED_LINK_TYPES = new Map([
  ['application/rss+xml', 'rss'],
  ['application/atom+xml', 'atom'],
  ['application/feed+json', 'json'],
]);

function expectedTypeFor(format) {
  for (const [type, kind] of FEED_LINK_TYPES) if (kind === format) return type;
  return null;
}

/**
 * The feed file an alternate link points at, or null.
 *
 * Joining a declared href to a file on disk is the only resolution available:
 * this check cannot fetch, so a link naming a feed the repository does not
 * contain is left unjudged rather than reported as wrong. The join is by file
 * name because the href is a served path (`/feed.xml`) while the feed is a repo
 * path (`public/feed.xml`), and an ambiguous name is skipped for the same
 * reason - picking one of two `feed.xml` files would manufacture a finding out
 * of a coincidence.
 */
function matchFeed(feeds, href) {
  const path = pathOf(href) ?? String(href ?? '').split(/[?#]/)[0];
  const name = path.split('/').filter(Boolean).pop();
  if (!name) return null;
  const matches = feeds.filter((feed) => feed.path.split('/').pop() === name);
  return matches.length === 1 ? matches[0] : null;
}

const feedAlternateLinkDeclared = {
  id: 'feed-alternate-link-declared',
  requirements: ['SEO-498'],
  level: 'RUNTIME',
  title: 'Pages announce the feed with a correctly typed alternate link',
  run(snapshot) {
    const feeds = (snapshot.feeds || []).filter((feed) => feed && feed.path);
    // A framework can generate the feed from a route module with no file on
    // disk, so the profile fact is consulted before concluding there is nothing
    // to announce.
    const generated = snapshot.profile?.facts?.has_feeds?.value === true;
    if (!feeds.length && !generated) {
      return { status: 'NOT_APPLICABLE', findings: [], detail: 'project publishes no feed' };
    }

    const blocked = gate(snapshot);
    if (blocked) return blocked;

    // Whole-document rather than head-scoped: a feed link belongs in the head,
    // but reporting a site as not announcing its feed because the link landed a
    // few bytes late would be a false positive about the thing that matters
    // least here.
    const declared = [];
    for (const page of snapshot.pages) {
      const html = page.rendered_html ?? page.raw_html ?? '';
      if (!html) continue;
      for (const tag of linkTags(html, 'alternate')) {
        const type = String(tag.attrs.type ?? '').toLowerCase().trim();
        if (!FEED_LINK_TYPES.has(type)) continue;
        declared.push({ page, type, href: String(tag.attrs.href ?? '').trim(), index: tag.index });
      }
    }

    const items = [];

    if (!declared.length) {
      // One finding, not one per page: the requirement's condition is that no
      // captured page announces the feed, which is a single site-level fact.
      // The home page carries it when the capture has one, because that is where
      // a reader looks first.
      const page = snapshot.pages.find((candidate) => pathOf(candidate.url) === '/') ?? snapshot.pages[0];
      items.push({
        requirement_id: 'SEO-498',
        location: location(page),
        severity: 'MEDIUM',
        detail: `project publishes ${feeds.length ? feeds.map((feed) => feed.path).join(', ') : 'a generated feed'} but none of the ${snapshot.pages.length} captured page(s) declares <link rel="alternate"> with a feed media type, so a reader has to guess the address`,
        evidence: [
          ev('RENDERED_HTML', { url: page.url, observed: 'no link[rel=alternate] carrying a feed media type on any captured page' }),
          ev('FEED', { feeds: feeds.map((feed) => feed.path), pages_inspected: snapshot.pages.length }),
        ],
      });
      return findingsFor(feedAlternateLinkDeclared, items);
    }

    for (const entry of declared) {
      const target = matchFeed(feeds, entry.href);
      if (!target) continue;
      const actual = feedFormat(target.path, String(target.text ?? ''));
      // A file that is not a recognisable feed at all is `feed-wellformed`'s
      // defect, and naming it here too would report one fault under two
      // requirements.
      if (!actual) continue;
      if (FEED_LINK_TYPES.get(entry.type) === actual) continue;

      items.push({
        requirement_id: 'SEO-498',
        location: location(entry.page, entry.index),
        severity: 'MEDIUM',
        detail: `alternate link announces type="${entry.type}" but ${target.path} is ${actual === 'json' ? 'a JSON Feed' : `an ${actual.toUpperCase()} feed`}; the declared media type is how a reader chooses a parser, so the wrong one makes the feed unreadable even though it is served`,
        evidence: [
          ev('RENDERED_HTML', { url: entry.page.url, observed: `rel=alternate type="${entry.type}" href="${entry.href}"` }),
          ev('FEED', { path: target.path, actual_format: actual, declared_type: entry.type, expected_type: expectedTypeFor(actual) }),
        ],
      });
    }

    return findingsFor(feedAlternateLinkDeclared, items);
  },
};

export default [feedWellformed, feedAlternateLinkDeclared];
