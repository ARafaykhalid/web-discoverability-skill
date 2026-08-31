/**
 * Tolerant, dependency-free HTML inspection.
 *
 * This is deliberately not a parser. It extracts the handful of structures the
 * discoverability checks need (head elements, JSON-LD, anchors, images,
 * headings) from real-world HTML, including HTML that a framework emitted.
 */

const VOID_TAGS = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']);

export function stripComments(html) {
  return String(html ?? '').replace(/<!--[\s\S]*?-->/g, '');
}

export function stripScriptsAndStyles(html) {
  return String(html ?? '')
    .replace(/<script\b[\s\S]*?<\/script\s*>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style\s*>/gi, ' ')
    .replace(/<template\b[\s\S]*?<\/template\s*>/gi, ' ');
}

/** Parse an attribute string into a lowercase-keyed object. */
export function parseAttributes(raw) {
  const attrs = {};
  const pattern = /([a-zA-Z_:@][-a-zA-Z0-9_:.]*)\s*(?:=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'`=<>]+)))?/g;
  let match;
  while ((match = pattern.exec(String(raw ?? '')))) {
    const name = match[1].toLowerCase();
    const value = match[2] ?? match[3] ?? match[4] ?? '';
    if (!(name in attrs)) attrs[name] = value;
  }
  return attrs;
}

/**
 * Find every occurrence of a tag. Returns the attributes, the raw open tag, the
 * character offset, and (for non-void tags) the inner HTML.
 */
export function findTags(html, tagName) {
  const text = String(html ?? '');
  const name = tagName.toLowerCase();
  const open = new RegExp(`<${name}(\\s[^>]*?)?(/)?>`, 'gi');
  const out = [];
  let match;
  while ((match = open.exec(text))) {
    const attrs = parseAttributes(match[1] || '');
    const start = match.index;
    const afterOpen = open.lastIndex;
    let inner = '';
    let end = afterOpen;
    if (!VOID_TAGS.has(name) && !match[2]) {
      const close = new RegExp(`</${name}\\s*>`, 'gi');
      close.lastIndex = afterOpen;
      const closeMatch = close.exec(text);
      if (closeMatch) {
        inner = text.slice(afterOpen, closeMatch.index);
        end = close.lastIndex;
      } else {
        inner = text.slice(afterOpen);
        end = text.length;
      }
    }
    out.push({ name, attrs, raw: match[0], inner, index: start, end });
  }
  return out;
}

export function firstTag(html, tagName) {
  return findTags(html, tagName)[0] ?? null;
}

/** The contents of <head>, or the whole document when there is no head. */
export function headOf(html) {
  const head = firstTag(stripComments(html), 'head');
  return head ? head.inner : String(html ?? '');
}

export function titleText(html) {
  const tag = firstTag(headOf(html), 'title');
  return tag ? decodeEntities(tag.inner).trim() : null;
}

export function htmlLang(html) {
  const tag = firstTag(stripComments(html), 'html');
  return tag ? tag.attrs.lang || null : null;
}

/** JSON-LD blocks, each with the parsed value or the parse error. */
export function jsonLdBlocks(html) {
  const out = [];
  for (const tag of findTags(stripComments(html), 'script')) {
    const type = (tag.attrs.type || '').toLowerCase();
    if (type !== 'application/ld+json') continue;
    const raw = tag.inner.trim();
    try {
      out.push({ raw, value: JSON.parse(raw), error: null });
    } catch (error) {
      out.push({ raw, value: null, error: error.message });
    }
  }
  return out;
}

/** Flatten JSON-LD (graphs, arrays, nested nodes) into a list of typed nodes. */
export function jsonLdNodes(html) {
  const nodes = [];
  const walk = (value) => {
    if (Array.isArray(value)) {
      value.forEach(walk);
      return;
    }
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value['@graph'])) value['@graph'].forEach(walk);
    if (value['@type']) nodes.push(value);
    for (const [key, child] of Object.entries(value)) {
      if (key === '@graph') continue;
      if (child && typeof child === 'object') walk(child);
    }
  };
  for (const block of jsonLdBlocks(html)) {
    if (block.value) walk(block.value);
  }
  return nodes;
}

export function anchors(html) {
  return findTags(stripComments(html), 'a').map((tag) => ({
    href: tag.attrs.href ?? null,
    rel: (tag.attrs.rel || '').toLowerCase().split(/\s+/).filter(Boolean),
    target: tag.attrs.target ?? null,
    text: decodeEntities(stripTags(tag.inner)).trim(),
    onclick: tag.attrs.onclick ?? null,
  }));
}

export function images(html) {
  return findTags(stripComments(html), 'img').map((tag) => ({
    src: tag.attrs.src ?? tag.attrs['data-src'] ?? null,
    alt: 'alt' in tag.attrs ? tag.attrs.alt : null,
    hasAltAttribute: 'alt' in tag.attrs,
    loading: tag.attrs.loading ?? null,
    width: tag.attrs.width ?? null,
    height: tag.attrs.height ?? null,
    srcset: tag.attrs.srcset ?? null,
  }));
}

export function headings(html) {
  const body = stripScriptsAndStyles(stripComments(html));
  const out = [];
  for (const level of [1, 2, 3, 4, 5, 6]) {
    for (const tag of findTags(body, `h${level}`)) {
      out.push({ level, text: decodeEntities(stripTags(tag.inner)).trim(), index: tag.index });
    }
  }
  return out.sort((a, b) => a.index - b.index);
}

export function stripTags(html) {
  return String(html ?? '').replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
}

const ENTITIES = {
  '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#39;': "'", '&apos;': "'", '&nbsp;': ' ',
};

export function decodeEntities(text) {
  return String(text ?? '')
    .replace(/&(amp|lt|gt|quot|#39|apos|nbsp);/g, (m) => ENTITIES[m] ?? m)
    .replace(/&#[xX]([0-9a-fA-F]+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)));
}

/** Visible text, with script, style, and markup removed. */
export function visibleText(html) {
  return decodeEntities(stripTags(stripScriptsAndStyles(stripComments(html)))).replace(/\s+/g, ' ').trim();
}

export function wordCount(html) {
  const text = visibleText(html);
  return text ? text.split(/\s+/).length : 0;
}

export function isAbsoluteUrl(value) {
  return /^https?:\/\/[^\s]+$/i.test(String(value ?? ''));
}
