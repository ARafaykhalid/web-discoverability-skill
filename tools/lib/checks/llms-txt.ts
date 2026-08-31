/**
 * llms.txt checks.
 *
 * llms.txt is a community proposal, not a standard, and no AI platform documents
 * reading it. These checks therefore verify only that the file is what it claims to
 * be - plain text with resolvable links - and say nothing about whether publishing
 * one affects how any assistant treats the site. The bound requirements carry the
 * evidence tier and the caution that make that limitation explicit.
 */
import { resourceCheck, lineAt, ev } from '../check-support.ts';

/** Markup that means the file is not the plain-text document it is meant to be. */
const HTML_TAG = /<\/?(?:html|head|body|div|span|script|style|p|a|ul|li|table|h[1-6])\b[^>]*>/i;

/**
 * Links in a markdown document.
 *
 * Inline links are what the format uses, so those are extracted precisely.
 * Angle-bracket autolinks and bare URLs are collected too, because a list of
 * resources written by hand mixes all three.
 */
function markdownLinks(text) {
  const out = [];
  const inline = /\[[^\]]*\]\(\s*([^)\s]+)(?:\s+"[^"]*")?\s*\)/g;
  let match;
  while ((match = inline.exec(text))) {
    out.push({ target: match[1], index: match.index, form: 'inline link' });
  }
  const autolink = /<((?:https?:)?\/\/[^>\s]+)>/gi;
  while ((match = autolink.exec(text))) {
    out.push({ target: match[1], index: match.index, form: 'autolink' });
  }
  return out;
}

const llmsTxtPlainText = {
  id: 'llms-txt-plain-text',
  requirements: ['SEO-305'],
  level: 'SOURCE',
  title: 'llms.txt is plain text, not markup',
  run(snapshot) {
    return resourceCheck(llmsTxtPlainText, snapshot.llms_txt, (text, path) => {
      const out = [];
      const trimmed = text.trim();

      if (!trimmed) {
        return [{
          requirement_id: 'SEO-305',
          location: path,
          severity: 'LOW',
          detail: 'llms.txt is empty, so it provides no context to anything that reads it',
          evidence: [
            ev('FILE', { path, bytes: text.length }),
            ev('HTTP_STATUS', { observed: null, note: 'file present in the repository; not fetched' }),
          ],
        }];
      }

      const tag = HTML_TAG.exec(text);
      if (tag) {
        out.push({
          requirement_id: 'SEO-305',
          location: `${path}:${lineAt(text, tag.index)}`,
          severity: 'LOW',
          detail: `llms.txt contains HTML markup (${tag[0]}); the format is plain text in markdown, and markup here is usually the sign of a build step writing a page into it`,
          evidence: [
            ev('FILE', { path, observed: tag[0], line: lineAt(text, tag.index) }),
            ev('HTTP_HEADER', { expected: 'content-type: text/plain', note: 'not verified from source alone' }),
          ],
        });
      }

      // A markdown document that starts with a heading is what the proposal
      // describes. Anything else is still plain text, so this is the only
      // structural expectation worth stating.
      if (!/^#\s+\S/m.test(trimmed.split('\n')[0] || '')) {
        out.push({
          requirement_id: 'SEO-305',
          location: `${path}:1`,
          severity: 'LOW',
          detail: 'llms.txt does not open with a markdown H1 naming the site, which is the one structural element the proposal specifies',
          evidence: [
            ev('FILE', { path, observed: trimmed.split('\n')[0].slice(0, 120) }),
            ev('HTTP_STATUS', { observed: null, note: 'file present in the repository; not fetched' }),
          ],
        });
      }
      return out;
    });
  },
};

const llmsTxtAbsoluteHttpsLinks = {
  id: 'llms-txt-absolute-https-links',
  requirements: ['SEO-306'],
  level: 'SOURCE',
  title: 'llms.txt links are absolute HTTPS URLs',
  run(snapshot) {
    return resourceCheck(llmsTxtAbsoluteHttpsLinks, snapshot.llms_txt, (text, path) => {
      const out = [];
      for (const link of markdownLinks(text)) {
        const line = lineAt(text, link.index);
        const target = link.target;

        // The file is read on its own, detached from the page that linked to it,
        // so a relative target has no base to resolve against.
        if (/^https:\/\//i.test(target)) continue;
        if (target.startsWith('#')) continue;

        const reason = /^http:\/\//i.test(target)
          ? 'uses http, so a reader following it is redirected or refused before reaching the content'
          : /^\/\//.test(target)
            ? 'is protocol-relative, which has no protocol to inherit when the file is read on its own'
            : 'is relative, and llms.txt is read without the page context needed to resolve it';

        out.push({
          requirement_id: 'SEO-306',
          location: `${path}:${line}`,
          severity: 'LOW',
          detail: `${link.form} target "${target}" ${reason}`,
          evidence: [
            ev('FILE', { path, line, observed: target }),
            ev('HTTP_STATUS', { url: target, observed: null, note: 'not fetched' }),
            ev('BUILD_OUTPUT', { note: 'absolute URLs must be produced by whatever generates this file' }),
          ],
        });
      }
      return out;
    });
  },
};

export default [llmsTxtPlainText, llmsTxtAbsoluteHttpsLinks];
