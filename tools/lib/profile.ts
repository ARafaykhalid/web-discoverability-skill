import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative, extname, sep } from 'node:path';
import { PROFILE_PREDICATES, FRAMEWORKS, FRAMEWORKS_WITH_ADAPTERS, includesValue } from './model.ts';

/**
 * Tri-state facts.
 *
 * `unknown` is a first-class value, not a synonym for false. A requirement gated
 * on an unknown fact resolves to UNCERTAIN, which the safety model treats as
 * "gather evidence", never as "safe to implement".
 */
export const TRUE = true;
export const FALSE = false;
export const UNKNOWN = 'unknown';

export type FactValue = typeof TRUE | typeof FALSE | typeof UNKNOWN;

/** One profile fact: a tri-state value plus the files that produced it. */
export interface ProfileFact {
  value: FactValue;
  evidence: string[];
}

/** A lazily-reading view of a scanned project directory. */
export interface ScannedProject {
  root: string;
  files: string[];
  read: (path: string) => string;
  truncated: boolean;
  file_count: number;
  max_files: number;
}

export interface Profile {
  schema_version: number;
  root: string;
  framework: string;
  renderer: string;
  framework_evidence: string[];
  has_adapter: boolean;
  file_count: number;
  scan_truncated: boolean;
  scan_limit: number;
  facts: Record<string, ProfileFact>;
  unknowns: string[];
  problems: string[];
}

const IGNORED_DIRS = new Set([
  'node_modules', '.git', '.next', 'dist', 'build', '.svelte-kit', '.astro',
  '.venv', 'venv', '__pycache__', 'coverage', '.turbo', '.vercel', '.output',
]);

const TEXT_EXTENSIONS = new Set([
  '.js', '.jsx', '.mjs', '.cjs', '.ts', '.tsx', '.json', '.html', '.htm', '.xml',
  '.txt', '.md', '.mdx', '.astro', '.svelte', '.vue', '.py', '.toml', '.yaml',
  '.yml', '.css', '.env', '.jinja', '.j2', '',
]);

/**
 * Environment files whose name carries the environment as a suffix.
 *
 * `extname('.env.production')` is `.production`, so an extension set alone
 * cannot admit them, and `.env.production` is one of the files the production
 * origin detection below actually wants to read. Matching the basename instead
 * keeps the gate closed to arbitrary binaries: only names beginning `.env` pass.
 */
const ENV_FILE_PATTERN = /^\.env(\.[A-Za-z0-9_-]+)*$/;

function isReadableText(path) {
  const name = path.split('/').pop() ?? '';
  return TEXT_EXTENSIONS.has(extname(path).toLowerCase()) || ENV_FILE_PATTERN.test(name);
}

const MAX_FILE_BYTES = 512 * 1024;

/** Walk a project directory, returning relative paths plus lazily-read text. */
export function scanProject(root: string, { maxFiles = 4000 } = {}): ScannedProject {
  const files = [];
  let truncated = false;
  const walk = (dir) => {
    if (files.length >= maxFiles) {
      truncated = true;
      return;
    }
    let entries;
    try {
      entries = readdirSync(dir, { withFileTypes: true });
    } catch {
      return;
    }
    for (const entry of entries) {
      if (files.length >= maxFiles) {
        truncated = true;
        return;
      }
      if (entry.name.startsWith('.') && entry.name !== '.env' && entry.name !== '.htaccess' && entry.name !== '.well-known') {
        if (entry.isDirectory()) continue;
      }
      const full = join(dir, entry.name);
      if (entry.isDirectory()) {
        if (IGNORED_DIRS.has(entry.name)) continue;
        walk(full);
      } else if (entry.isFile()) {
        files.push(relative(root, full).split(sep).join('/'));
      }
    }
  };
  walk(root);

  const cache = new Map();
  const read = (path) => {
    if (cache.has(path)) return cache.get(path);
    let text = '';
    const full = join(root, path);
    try {
      if (isReadableText(path) && statSync(full).size <= MAX_FILE_BYTES) {
        text = readFileSync(full, 'utf8');
      }
    } catch {
      text = '';
    }
    cache.set(path, text);
    return text;
  };

  // The file cap is reported rather than applied silently: a truncated scan can
  // only prove presence, never absence, and a caller that cannot see the
  // truncation would read every FALSE fact as if the whole project was examined.
  return { root, files, read, truncated, file_count: files.length, max_files: maxFiles };
}

function anyPath(project, pattern) {
  return project.files.filter((f) => pattern.test(f));
}

const SOURCE_FILES = /\.(js|jsx|mjs|cjs|ts|tsx|astro|svelte|vue|html|htm|py|json|md|mdx|jinja|j2)$/i;

function grep(project, pattern, { include = SOURCE_FILES, limit = 400 } = {}) {
  const hits = [];
  for (const file of project.files) {
    if (!include.test(file)) continue;
    const text = project.read(file);
    if (!text) continue;
    if (pattern.test(text)) {
      hits.push(file);
      if (hits.length >= limit) break;
    }
  }
  return hits;
}

/**
 * Files where every pattern matches.
 *
 * Some signals only mean something in combination, and a single regex cannot
 * express "both of these appear in this module" once the two occurrences are
 * separated by arbitrary code - a character class cannot cross the punctuation
 * in between. Testing per file is the honest form of that conjunction.
 */
function grepAll(project, patterns, { include = SOURCE_FILES, limit = 400 } = {}) {
  const hits = [];
  for (const file of project.files) {
    if (!include.test(file)) continue;
    const text = project.read(file);
    if (!text) continue;
    if (patterns.every((pattern) => pattern.test(text))) {
      hits.push(file);
      if (hits.length >= limit) break;
    }
  }
  return hits;
}

function fact(value, evidence) {
  return { value, evidence: evidence ? [].concat(evidence).slice(0, 5) : [] };
}

/**
 * Whether a written adapter and fixture back this framework.
 *
 * Outside `FRAMEWORKS_WITH_ADAPTERS` the guidance is generic, and a report that
 * only names the framework implies a depth of coverage that does not exist.
 */
function hasAdapter(framework) {
  return includesValue(FRAMEWORKS_WITH_ADAPTERS, framework);
}

/**
 * Build a structured site profile from a project directory.
 *
 * Every fact carries evidence (the files that produced it) or is `unknown`.
 * Detection is deliberately conservative: absence of a signal yields `unknown`
 * for anything that could plausibly exist outside the repository (a CDN, a
 * production origin, a CMS-driven catalogue), and `false` only when the
 * repository positively demonstrates absence.
 */
export function detectProfile(root: string, { runtimeAvailable = false, captureOrigin = null } = {}): Profile {
  const project = scanProject(root);
  const problems = [];
  const pkgPath = join(root, 'package.json');
  let pkg = null;
  if (existsSync(pkgPath)) {
    try {
      pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    } catch {
      pkg = null;
    }
  }
  const deps = { ...(pkg?.dependencies || {}), ...(pkg?.devDependencies || {}) };
  const dep = (name) => Object.prototype.hasOwnProperty.call(deps, name);
  const has = (pattern) => anyPath(project, pattern).length > 0;

  // ---- framework / renderer ------------------------------------------------
  // Each branch records the signal it matched, because that string is published
  // as `framework_evidence` and has to name a dependency or file a reader can
  // open. The Python signals are resolved up front for the same reason: the
  // branch conditions below only report *that* something matched, not which file.
  let framework = 'unknown';
  let renderer = 'unknown';
  const frameworkEvidence = [];
  const nodeServerDep = ['express', 'fastify', 'hono'].find(dep);
  const djangoFiles = [
    ...anyPath(project, /(^|\/)manage\.py$/),
    ...grep(project, /django/i, { include: /requirements.*\.txt$|pyproject\.toml$|settings\.py$/ }),
  ];
  const pythonAppFiles = grep(project, /\b(from\s+fastapi|import\s+fastapi|from\s+flask|import\s+flask)/i, { include: /\.py$/ });

  if (dep('next')) {
    const appRouter = has(/^(src\/)?app\/(layout|page)\.(t|j)sx?$/);
    const pagesRouter = has(/^(src\/)?pages\/(_app|index)\.(t|j)sx?$/);
    framework = appRouter ? 'next-app-router' : pagesRouter ? 'next-pages-router' : 'next-app-router';
    frameworkEvidence.push('package.json:next');
    renderer = 'hybrid';
  } else if (dep('astro')) {
    framework = 'astro';
    frameworkEvidence.push('package.json:astro');
    const cfg = anyPath(project, /^astro\.config\./)[0];
    const cfgText = cfg ? project.read(cfg) : '';
    renderer = /output\s*:\s*['"]server['"]/.test(cfgText) ? 'ssr' : 'ssg';
  } else if (dep('@remix-run/react') || dep('@remix-run/node')) {
    framework = 'remix';
    renderer = 'ssr';
    frameworkEvidence.push('package.json:@remix-run');
  } else if (dep('@sveltejs/kit')) {
    framework = 'sveltekit';
    renderer = 'hybrid';
    frameworkEvidence.push('package.json:@sveltejs/kit');
  } else if (dep('nuxt')) {
    framework = 'nuxt';
    renderer = 'hybrid';
    frameworkEvidence.push('package.json:nuxt');
  } else if (dep('vite') && (dep('react') || dep('vue') || dep('svelte'))) {
    framework = 'vite';
    renderer = 'csr';
    frameworkEvidence.push('package.json:vite');
  } else if (dep('react-scripts') || (dep('react') && has(/^(src\/)?index\.(t|j)sx?$/))) {
    framework = 'react-spa';
    renderer = 'csr';
    frameworkEvidence.push('package.json:react');
  } else if (nodeServerDep) {
    framework = 'node-server';
    renderer = 'ssr';
    frameworkEvidence.push(`package.json:${nodeServerDep}`);
  } else if (djangoFiles.length) {
    framework = 'django';
    renderer = 'ssr';
    frameworkEvidence.push(djangoFiles[0]);
  } else if (pythonAppFiles.length) {
    framework = 'flask-fastapi';
    renderer = 'ssr';
    frameworkEvidence.push(pythonAppFiles[0]);
  } else if (has(/^index\.html?$/) || has(/^public\/index\.html?$/)) {
    framework = 'static-html';
    renderer = 'static';
    frameworkEvidence.push('index.html');
  }

  const isJsFramework = ['next-app-router', 'next-pages-router', 'react-spa', 'vite', 'astro', 'remix', 'sveltekit', 'nuxt'].includes(framework);

  // ---- rendering facts ----------------------------------------------------
  const clientRendered = renderer === 'csr' ? TRUE : renderer === 'unknown' ? UNKNOWN : FALSE;
  const serverRendered = ['ssr', 'hybrid'].includes(renderer) ? TRUE : renderer === 'unknown' ? UNKNOWN : FALSE;
  const staticGenerated = ['ssg', 'static', 'hybrid'].includes(renderer) ? TRUE : renderer === 'unknown' ? UNKNOWN : FALSE;

  // ---- discovery resources -----------------------------------------------
  const robotsFiles = anyPath(project, /(^|\/)(public\/|static\/|src\/)?robots\.txt$|(^|\/)app\/robots\.(t|j)s$|(^|\/)robots\.(t|j)s$/);
  const sitemapFiles = anyPath(project, /sitemap[^/]*\.xml$|(^|\/)app\/sitemap\.(t|j)s$|(^|\/)sitemap\.(t|j)s$|next-sitemap\.config/);
  const llmsFiles = anyPath(project, /(^|\/)llms(-full)?\.txt$|(^|\/)app\/llms\.txt\//);
  const feedFiles = anyPath(project, /(rss|atom|feed)[^/]*\.(xml|json)$|(^|\/)(feed|rss)\/route\.(t|j)s$/);
  const pdfFiles = anyPath(project, /\.pdf$/i);
  const imageFiles = anyPath(project, /\.(png|jpe?g|webp|avif|gif|svg)$/i);

  const structuredDataHits = grep(project, /application\/ld\+json|"@context"\s*:\s*"https?:\/\/schema\.org/);
  const clientScriptHits = grep(project, /<script\b[^>]*(?:src\s*=|type\s*=\s*["']?module)|\bdocument\.(?:querySelector|getElementById|head)|\bwindow\.(?:addEventListener|location)/i);
  const imageMarkupHits = grep(project, /<img[\s>]|next\/image|<Image[\s>]|astro:assets/);
  const videoHits = grep(project, /<video[\s>]|youtube\.com\/embed|player\.vimeo\.com|VideoObject|mux-player/);
  const hreflangHits = grep(project, /hreflang|alternates\s*:\s*\{[^}]*languages|i18n\s*:|next-intl|react-i18next|LANGUAGE_CODE|LOCALE_PATHS/);
  const ecommerceHits = grep(project, /"@type"\s*:\s*"(Product|Offer)"|addToCart|add_to_cart|\bcheckout\b|stripe|shopify|commercejs|medusa|cart/i);
  const authHits = grep(project, /next-auth|@clerk|auth0|supabase\.auth|passport|django\.contrib\.auth|flask_login|fastapi_users|getServerSession|withAuth/);
  const ugcHits = grep(project, /\bcomments?\b.*\b(post|create|submit)|<textarea|reviews?\.(create|post)|DiscussionForumPosting|user_generated|moderation/i);
  const paywallHits = grep(project, /isAccessibleForFree|paywall|subscription|entitlement|metered|stripe\.subscriptions/i);
  const analyticsHits = grep(project, /gtag\(|googletagmanager|G-[A-Z0-9]{8,}|posthog|plausible|@vercel\/analytics|umami|matomo/);
  const cdnHits = anyPath(project, /^(vercel|netlify)\.(json|toml)$|^wrangler\.(toml|json)$|^_headers$|^\.htaccess$|^nginx\.conf$|^cloudfront/);
  const monorepoHits = anyPath(project, /^pnpm-workspace\.yaml$|^turbo\.json$|^lerna\.json$|^nx\.json$/);
  const cmsHits = grep(project, /@sanity|contentful|strapi|@wordpress|prismic|payloadcms|keystone|directus|wagtail|graphcms|hygraph/);
  const swHits = anyPath(project, /(^|\/)(service-worker|sw)\.(js|ts)$|workbox/);
  const paginationHits = grep(project, /[?&]page=|\/page\/|paginate|pageSize|Paginator|useInfiniteQuery|infinite-?scroll/i);
  const facetHits = grep(project, /[?&](filter|facet|sort|refine)=|searchParams\.(filter|sort)|facets?\[/i);
  // `api_driven_content` needs both halves of client-side fetching. A data
  // library is conclusive on its own, but the commonest React form - an effect
  // that calls bare `fetch` - has no library to name, and it cannot be written as
  // one pattern: `useEffect\([^)]*fetch\(` stops at the first `)`, which in real
  // code closes the callback's own parameter list long before the request. So the
  // effect hook and the request are required in the same module instead. Dropping
  // the signal was the alternative, but nothing else here detects that form, and
  // the fact would then read FALSE for exactly the apps it exists to describe.
  const apiLibraryHits = grep(project, /useQuery\(|useSWR\(|axios\.get\(/);
  const apiEffectHits = grepAll(project, [/\buseEffect\s*\(/, /\bfetch\s*\(/], { include: /\.(jsx|tsx|js|mjs|cjs|ts)$/i });
  const apiContentHits = [...new Set([...apiLibraryHits, ...apiEffectHits])];
  const localHits = grep(project, /"@type"\s*:\s*"(LocalBusiness|Restaurant|Store|Dentist|MedicalClinic)"|openingHours|streetAddress|PostalAddress/);
  const editorialHits = grep(project, /"@type"\s*:\s*"(Article|NewsArticle|BlogPosting)"|(^|\/)(blog|posts|articles|news)\//);
  const publishHits = anyPath(project, /(^|\/)(content|posts|blog|_posts|articles)\/[^/]+\.(md|mdx|json)$/);

  const originCandidates = [];
  for (const file of ['next.config.js', 'next.config.mjs', 'next.config.ts', 'astro.config.mjs', 'astro.config.ts', 'svelte.config.js', 'nuxt.config.ts', '.env', '.env.production', 'CNAME', 'vercel.json', 'netlify.toml', 'settings.py', 'app/layout.tsx', 'src/app/layout.tsx'].filter((f) => project.files.includes(f))) {
    const text = project.read(file);
    if (/https?:\/\/[a-z0-9.-]+\.[a-z]{2,}/i.test(text) && !/localhost|127\.0\.0\.1|example\.(com|org)/i.test(text)) {
      originCandidates.push(file);
    } else if (file === 'CNAME' && text.trim()) {
      originCandidates.push(file);
    }
  }
  const metadataBaseHits = grep(project, /metadataBase|siteUrl|SITE_URL|PUBLIC_SITE_URL|canonical.*https?:\/\//i);

  // A repository can look non-public while being deployed publicly. Anything we
  // cannot prove from the repository stays `unknown`. A capture is the exception:
  // `wds capture` only records what an HTTP request to the origin actually
  // returned, so a directory holding pages is direct evidence the site is public -
  // without it, a captured live site has no framework for the detector to find,
  // every domain activation is `uncertain`, and the selector applies nothing.
  const captureEvidence = captureOrigin ? [`snapshot.json origin ${captureOrigin}`] : [];
  const publicSite = framework === 'unknown' ? (runtimeAvailable ? TRUE : UNKNOWN) : TRUE;

  const facts = {
    public_site: fact(publicSite, [...frameworkEvidence, ...captureEvidence].slice(0, 5)),
    javascript_app: fact(
      isJsFramework || clientScriptHits.length ? TRUE : framework === 'unknown' ? (runtimeAvailable ? FALSE : UNKNOWN) : FALSE,
      [...frameworkEvidence, ...captureEvidence, ...clientScriptHits].slice(0, 5),
    ),
    client_rendered: fact(clientRendered, frameworkEvidence),
    server_rendered: fact(serverRendered, frameworkEvidence),
    static_generated: fact(staticGenerated, frameworkEvidence),
    has_router: fact(isJsFramework || ['django', 'flask-fastapi', 'node-server'].includes(framework) ? TRUE : framework === 'static-html' ? FALSE : UNKNOWN, frameworkEvidence),
    has_images: fact(imageMarkupHits.length || imageFiles.length ? TRUE : FALSE, [...imageMarkupHits.slice(0, 3), ...imageFiles.slice(0, 2)]),
    has_video: fact(videoHits.length ? TRUE : FALSE, videoHits),
    has_feeds: fact(feedFiles.length ? TRUE : FALSE, feedFiles),
    has_sitemap: fact(sitemapFiles.length ? TRUE : FALSE, sitemapFiles),
    has_robots_txt: fact(robotsFiles.length ? TRUE : FALSE, robotsFiles),
    has_llms_txt: fact(llmsFiles.length ? TRUE : FALSE, llmsFiles),
    has_structured_data: fact(structuredDataHits.length ? TRUE : FALSE, structuredDataHits),
    has_cdn_or_waf: fact(cdnHits.length ? TRUE : UNKNOWN, cdnHits),
    has_service_worker: fact(swHits.length ? TRUE : FALSE, swHits),
    multilingual: fact(hreflangHits.length ? TRUE : UNKNOWN, hreflangHits),
    ecommerce: fact(ecommerceHits.length >= 2 ? TRUE : ecommerceHits.length === 1 ? UNKNOWN : FALSE, ecommerceHits),
    local_business: fact(localHits.length ? TRUE : UNKNOWN, localHits),
    ugc: fact(ugcHits.length >= 2 ? TRUE : ugcHits.length === 1 ? UNKNOWN : FALSE, ugcHits),
    paywall_or_subscription: fact(paywallHits.length ? TRUE : FALSE, paywallHits),
    authentication: fact(authHits.length ? TRUE : FALSE, authHits),
    content_publication: fact(publishHits.length || feedFiles.length || editorialHits.length ? TRUE : FALSE, [...publishHits.slice(0, 3), ...editorialHits.slice(0, 2)]),
    editorial_content: fact(editorialHits.length && publishHits.length ? TRUE : editorialHits.length ? UNKNOWN : FALSE, editorialHits),
    public_documents: fact(pdfFiles.length ? TRUE : FALSE, pdfFiles),
    analytics_or_measurement: fact(analyticsHits.length ? TRUE : FALSE, analyticsHits),
    api_driven_content: fact(apiContentHits.length ? TRUE : FALSE, apiContentHits),
    monorepo: fact(monorepoHits.length || Array.isArray(pkg?.workspaces) ? TRUE : FALSE, monorepoHits),
    cms: fact(cmsHits.length ? TRUE : FALSE, cmsHits),
    pagination: fact(paginationHits.length ? TRUE : FALSE, paginationHits),
    faceted_navigation: fact(facetHits.length ? TRUE : FALSE, facetHits),
    has_production_origin: fact(originCandidates.length || metadataBaseHits.length ? TRUE : UNKNOWN, [...originCandidates, ...metadataBaseHits.slice(0, 2)]),
    runtime_available: fact(runtimeAvailable ? TRUE : UNKNOWN, runtimeAvailable ? ['runtime snapshot supplied'] : []),
    has_client_javascript: fact(clientScriptHits.length ? TRUE : FALSE, clientScriptHits),
  };

  // Operator overrides are authoritative for selection, including deliberate
  // contradictions, but are never silent: evidence records both conclusions and
  // `problems` exposes contradictions for human and JSON output.
  const overridePath = join(root, 'project-profile.json');
  let overriddenFramework = framework;
  let overriddenFrameworkEvidence = frameworkEvidence;
  if (existsSync(overridePath)) {
    let override = null;
    try {
      override = JSON.parse(readFileSync(overridePath, 'utf8'));
    } catch (error) {
      problems.push(`project-profile.json is malformed JSON: ${error.message}`);
    }
    if (override && (typeof override !== 'object' || Array.isArray(override))) {
      problems.push('project-profile.json must contain an object');
    } else if (override) {
      if (override.framework !== undefined) {
        if (typeof override.framework !== 'string' || !FRAMEWORKS.includes(override.framework) || override.framework === 'any') {
          problems.push(`project-profile.json framework must be one of ${FRAMEWORKS.filter((name) => name !== 'any').join(', ')}`);
        } else {
          if (framework !== 'unknown' && framework !== override.framework) {
            problems.push(`project-profile.json framework ${override.framework} contradicts detected framework ${framework}`);
          }
          overriddenFramework = override.framework;
          overriddenFrameworkEvidence = [`project-profile.json override (detected ${framework})`, ...frameworkEvidence].slice(0, 5);
        }
      }
      if (override.facts !== undefined && (typeof override.facts !== 'object' || override.facts === null || Array.isArray(override.facts))) {
        problems.push('project-profile.json facts must contain an object');
      } else {
        for (const [key, value] of Object.entries(override.facts || {})) {
          if (!includesValue(PROFILE_PREDICATES, key)) {
            problems.push(`project-profile.json contains unknown fact ${key}`);
            continue;
          }
          if (typeof value !== 'boolean') {
            problems.push(`project-profile.json fact ${key} must be boolean`);
            continue;
          }
          const detected = facts[key].value;
          if (detected !== UNKNOWN && detected !== value) {
            problems.push(`project-profile.json fact ${key}=${value} contradicts detected value ${detected}`);
          }
          facts[key] = fact(value, [`project-profile.json override: ${value} (detected ${detected})`, ...facts[key].evidence]);
        }
      }
    }
  }

  return {
    schema_version: 3,
    root,
    framework: overriddenFramework,
    renderer,
    // The signal that concluded the framework, so a reader can disagree with the
    // conclusion by inspecting the same file or dependency the detector used.
    framework_evidence: overriddenFrameworkEvidence,
    has_adapter: hasAdapter(overriddenFramework),
    file_count: project.files.length,
    scan_truncated: project.truncated,
    scan_limit: project.max_files,
    facts,
    unknowns: Object.entries(facts).filter(([, f]) => f.value === UNKNOWN).map(([k]) => k),
    problems,
  };
}

function factValue(profile, name) {
  const entry = profile.facts?.[name];
  if (!entry) return UNKNOWN;
  return entry.value;
}

function combineAll(values) {
  if (values.some((v) => v === FALSE)) return FALSE;
  if (values.some((v) => v === UNKNOWN)) return UNKNOWN;
  return TRUE;
}

function combineAny(values) {
  if (!values.length) return TRUE;
  if (values.some((v) => v === TRUE)) return TRUE;
  if (values.some((v) => v === UNKNOWN)) return UNKNOWN;
  return FALSE;
}

function combineNone(values) {
  if (values.some((v) => v === TRUE)) return FALSE;
  if (values.some((v) => v === UNKNOWN)) return UNKNOWN;
  return TRUE;
}

export interface UsedFact {
  fact: string;
  value: FactValue;
  evidence: string[];
}

export interface Applicability {
  verdict: 'APPLICABLE' | 'NOT_APPLICABLE' | 'UNCERTAIN';
  facts: UsedFact[];
  blocking: UsedFact[];
}

/**
 * Evaluate a requirement's `applies_when` against a profile.
 *
 * Returns APPLICABLE, NOT_APPLICABLE, or UNCERTAIN plus the facts responsible,
 * so an agent (or a report) can always answer "does this apply to this site?".
 */
export function evaluateApplicability(record, profile): Applicability {
  const clause = record.applies_when || {};
  const used = [];
  const collect = (names) =>
    (names || []).map((name) => {
      const value = factValue(profile, name);
      used.push({ fact: name, value, evidence: profile.facts?.[name]?.evidence ?? [] });
      return value;
    });

  const results = [
    combineAll(collect(clause.all)),
    combineAny(collect(clause.any)),
    combineNone(collect(clause.none)),
  ];

  const verdict = results.some((r) => r === FALSE)
    ? 'NOT_APPLICABLE'
    : results.some((r) => r === UNKNOWN)
      ? 'UNCERTAIN'
      : 'APPLICABLE';

  return {
    verdict,
    facts: used,
    blocking: used.filter((u) => (verdict === 'NOT_APPLICABLE' ? u.value === FALSE : u.value === UNKNOWN)),
  };
}
