import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { scanProject, detectProfile } from './profile.mjs';

/**
 * A site snapshot is what checks run against.
 *
 * It carries two different kinds of fact and never conflates them:
 *
 *   source facts  - files in the repository (always available)
 *   runtime facts - status, headers, redirect chain, raw vs rendered HTML
 *
 * Runtime facts come from a capture file (`snapshot.json`). For static projects
 * they can be derived from the .html files themselves, because there is no
 * runtime layer that could rewrite them. For framework projects there is no
 * honest way to infer served output from source, so `hasRuntime` is false and
 * RUNTIME-level checks report NEEDS_RUNTIME instead of guessing.
 */

export const CAPTURE_FILENAME = 'snapshot.json';

function normalizeHeaders(headers) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) {
    out[String(key).toLowerCase()] = String(value);
  }
  return out;
}

function readMaybe(root, relative) {
  if (!relative) return null;
  const path = join(root, relative);
  return existsSync(path) ? readFileSync(path, 'utf8') : null;
}

function pageFromCapture(root, entry) {
  const raw = entry.raw_html ?? readMaybe(root, entry.raw_html_path);
  const rendered = entry.rendered_html ?? readMaybe(root, entry.rendered_html_path) ?? raw;
  return {
    url: entry.url,
    status: entry.status ?? null,
    headers: normalizeHeaders(entry.headers),
    redirect_chain: Array.isArray(entry.redirect_chain) ? entry.redirect_chain : [],
    raw_html: raw,
    rendered_html: rendered,
    source_file: entry.source_file ?? entry.raw_html_path ?? null,
    indexable: entry.indexable !== false,
    origin: 'capture',
  };
}

function pagesFromStaticFiles(project) {
  const pages = [];
  const staticPrefix = !project.files.some((file) => /^index\.html?$/i.test(file))
    && project.files.some((file) => /^_site\/index\.html?$/i.test(file))
    ? '_site/'
    : '';
  for (const file of project.files) {
    if (!/\.html?$/i.test(file)) continue;
    if (/^(captures|snapshots|node_modules)\//.test(file)) continue;
    if (staticPrefix && !file.startsWith(staticPrefix)) continue;
    const html = project.read(file);
    if (!html) continue;
    const servedFile = staticPrefix ? file.slice(staticPrefix.length) : file;
    const url = '/' + servedFile.replace(/(^|\/)index\.html?$/i, '$1').replace(/\.html?$/i, '');
    pages.push({
      url: url === '/' ? '/' : url.replace(/\/$/, ''),
      status: 200,
      headers: {},
      redirect_chain: [],
      raw_html: html,
      rendered_html: html,
      source_file: file,
      indexable: true,
      origin: 'static-file',
    });
  }
  return pages;
}

/**
 * Build a snapshot for a project directory.
 *
 * `capture` may be supplied directly (tests) instead of read from disk.
 */
export function loadSnapshot(root, { capture = undefined, profile = undefined } = {}) {
  const project = scanProject(root);
  let captureData = capture;
  if (captureData === undefined) {
    const path = join(root, CAPTURE_FILENAME);
    captureData = existsSync(path) ? JSON.parse(readFileSync(path, 'utf8')) : null;
  }

  const resolvedProfile = profile ?? detectProfile(root, { runtimeAvailable: Boolean(captureData) });

  const capturedPages = (captureData?.pages || []).map((entry) => pageFromCapture(root, entry));
  const staticPages = capturedPages.length ? [] : pagesFromStaticFiles(project);
  const pages = [...capturedPages, ...staticPages];

  const findFile = (pattern) => project.files.find((f) => pattern.test(f)) ?? null;
  const findFiles = (pattern) => project.files.filter((f) => pattern.test(f));
  const asResource = (path) => (path ? { path, text: project.read(path) } : null);

  // Protocol files are matched at any depth so a monorepo (apps/web/public/
  // robots.txt) resolves, then sorted shallowest-first so the host root wins
  // over a nested copy. A framework that generates robots.txt from a route
  // module has no file here at all; that is a source fact, and it stays in
  // profile.facts.has_robots_txt rather than being fabricated into a resource.
  const shallowest = (pattern) =>
    findFiles(pattern).sort((a, b) => a.split('/').length - b.split('/').length || a.localeCompare(b))[0] ?? null;

  const robotsPath = shallowest(/(^|\/)robots\.txt$/);
  const llmsPath = shallowest(/(^|\/)llms\.txt$/);

  return {
    root,
    profile: resolvedProfile,
    files: project.files,
    read: project.read,
    has: (path) => project.files.includes(path),
    find: findFile,
    findAll: findFiles,
    pages,
    // Runtime facts exist exactly when there are pages to read them from. A
    // capture file that declares no pages carries no runtime evidence, so it
    // must not satisfy the gate - otherwise every RUNTIME check would report a
    // silent PASS having inspected nothing.
    hasRuntime: pages.length > 0,
    captureOrigin: captureData ? 'capture' : staticPages.length ? 'static-file' : null,
    capturedAt: captureData?.captured_at ?? null,
    origin: captureData?.origin ?? null,
    robots_txt: asResource(robotsPath),
    llms_txt: asResource(llmsPath),
    sitemaps: findFiles(/sitemap[^/]*\.xml$/).map(asResource),
    feeds: findFiles(/(rss|atom|feed)[^/]*\.(xml|json)$/).map(asResource),
    documents: findFiles(/\.pdf$/i),
    grep(pattern, include = /\.(js|jsx|mjs|cjs|ts|tsx|astro|svelte|vue|html|htm|py|json|md|mdx)$/i) {
      const hits = [];
      for (const file of project.files) {
        if (!include.test(file)) continue;
        const text = project.read(file);
        if (text && pattern.test(text)) hits.push(file);
      }
      return hits;
    },
  };
}

/** A finding is what a check emits. Location and evidence are mandatory. */
export function finding({ requirement_id, check_id, location, evidence, severity = 'MEDIUM', detail = '' }) {
  return { requirement_id, check_id, location, evidence, severity, detail };
}

/** Emitted when a RUNTIME check cannot run because no capture exists. */
export function needsRuntime(check) {
  return {
    check_id: check.id,
    status: 'NEEDS_RUNTIME',
    detail: 'no runtime capture available; run the check against a served origin or add snapshot.json',
  };
}
