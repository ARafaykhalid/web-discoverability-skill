/**
 * Single source of truth for the registry vocabulary.
 *
 * Every enum used by the validator, the selector, the docs generator, and the
 * JSON Schema emitter is defined here exactly once. Nothing in this file is
 * duplicated in Markdown by hand; `wds docs --write` regenerates the derived
 * documents.
 */

/** Domains. `activation` is the coarse gate the selector applies before per-requirement applicability. */
export const DOMAINS = [
  { domain: 'urls', title: 'URL design and HTTP routing', activation: 'always' },
  { domain: 'metadata', title: 'Document metadata', activation: 'always' },
  { domain: 'canonicals', title: 'Canonicalization', activation: 'always' },
  { domain: 'crawling', title: 'Crawlability and crawl management', activation: 'always' },
  { domain: 'robots', title: 'Robots directives', activation: 'always' },
  { domain: 'indexing', title: 'Indexability and index lifecycle', activation: 'always' },
  { domain: 'sitemaps', title: 'XML sitemaps', activation: 'always' },
  { domain: 'structured-data', title: 'Structured data and rich-result eligibility', activation: 'public_site' },
  { domain: 'entity', title: 'Entity graph and site identity', activation: 'public_site' },
  { domain: 'content', title: 'Content quality and answer readiness', activation: 'public_site' },
  { domain: 'internal-linking', title: 'Internal linking and navigation', activation: 'public_site' },
  { domain: 'images', title: 'Image discoverability and delivery', activation: 'has_images' },
  { domain: 'video', title: 'Video discoverability and accessibility', activation: 'has_video' },
  { domain: 'social-preview', title: 'Social and messaging previews', activation: 'public_site' },
  // A static document can still insert primary content or rewrite directives
  // with script. Individual requirements retain narrower script predicates.
  { domain: 'javascript-rendering', title: 'JavaScript rendering and hydration', activation: 'public_site' },
  { domain: 'performance', title: 'Performance and Core Web Vitals', activation: 'public_site' },
  { domain: 'mobile', title: 'Mobile-first indexing and small-screen delivery', activation: 'public_site' },
  { domain: 'caching', title: 'HTTP caching and freshness', activation: 'public_site' },
  // bfcache belongs to browser documents, not frameworks. Static HTML can carry
  // lifecycle handlers and session-dependent data just as a routed app can.
  { domain: 'bfcache', title: 'Back-forward cache and page lifecycle', activation: 'public_site' },
  { domain: 'accessibility', title: 'Accessibility affecting discoverability', activation: 'public_site' },
  { domain: 'security', title: 'Public-surface integrity', activation: 'always' },
  { domain: 'privacy-auth', title: 'Privacy, authentication, and environment boundaries', activation: 'always' },
  { domain: 'cdn-waf', title: 'CDN, WAF, edge, and bot delivery', activation: 'has_cdn_or_waf' },
  { domain: 'ai-crawlers', title: 'AI crawler policy', activation: 'public_site' },
  { domain: 'ai-retrieval', title: 'AI retrieval readiness', activation: 'public_site' },
  { domain: 'llms-txt', title: 'llms.txt machine-readable guidance', activation: 'public_site' },
  { domain: 'submission', title: 'Search platform submission and change notification', activation: 'public_site' },
  { domain: 'feeds', title: 'RSS and Atom feeds', activation: 'content_publication' },
  { domain: 'discover', title: 'Google Discover prerequisites', activation: 'editorial_content' },
  { domain: 'ecommerce', title: 'Ecommerce, products, and shopping surfaces', activation: 'ecommerce' },
  { domain: 'local', title: 'Local search and location entities', activation: 'local_business' },
  { domain: 'international', title: 'International and multilingual', activation: 'multilingual' },
  { domain: 'ugc', title: 'User-generated content', activation: 'ugc' },
  { domain: 'paywall', title: 'Paywalled and subscription content', activation: 'paywall_or_subscription' },
  { domain: 'documents', title: 'PDF and non-HTML document discovery', activation: 'public_documents' },
  { domain: 'analytics', title: 'Measurement integrity', activation: 'analytics_or_measurement' },
  { domain: 'operations', title: 'Discoverability operations and regression prevention', activation: 'always' },
];

export const DOMAIN_SLUGS = DOMAINS.map((d) => d.domain);

/**
 * Coarse domain activation gates. Every value is also a member of
 * PROFILE_PREDICATES (except `always`), so the selector needs no mapping table
 * and an activation can never name a fact the profile cannot produce.
 */
export const ACTIVATIONS = [
  'always',
  'public_site',
  'has_images',
  'has_video',
  'javascript_app',
  'has_cdn_or_waf',
  'content_publication',
  'editorial_content',
  'ecommerce',
  'local_business',
  'multilingual',
  'ugc',
  'paywall_or_subscription',
  'public_documents',
  'analytics_or_measurement',
];

export const LEVELS = ['LITE', 'RECOMMENDED', 'EXTRA', 'ULTRA'];

export const SEVERITIES = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'];

/**
 * Evidence tiers describe the strength of the *external* evidence behind a
 * requirement's claim. INTERNAL means the requirement asserts an internal
 * consistency invariant of the project itself and makes no external claim, so
 * it needs a rationale rather than a citation.
 *
 * A tier appears in two places and means the same thing in both, measured
 * against different subjects. On a record it grades the claim. On one of that
 * record's citations it grades how strongly *that source* supports *that
 * claim* - not how authoritative the document is in general. So one URL can
 * carry tier A on a record whose behaviour it states outright and tier B on a
 * record whose behaviour it only implies. The source-tier-support rule then
 * requires a record's own tier to be backed by at least one citation graded
 * that strongly.
 */
export const EVIDENCE_TIERS = {
  A: 'Official specification or first-party platform/framework documentation.',
  B: 'Strong technical consensus across multiple authoritative technical sources, or well-established implementation behaviour.',
  C: 'Empirical or observational: reproducible experiments, independent technical studies, observed crawler behaviour.',
  D: 'Experimental or speculative: emerging AI-search behaviour, undocumented crawler behaviour, hypotheses about retrieval systems.',
  INTERNAL: 'Internal consistency invariant of the project under audit; asserts no external platform behaviour.',
};

export const EVIDENCE_TIER_VALUES = Object.keys(EVIDENCE_TIERS);

/** Tiers that must carry at least one source. */
export const TIERS_REQUIRING_SOURCES = ['A', 'B', 'C', 'D'];

/**
 * Confidence that implementing the requirement produces the stated effect.
 * Deliberately separate from evidence tier: a Tier A citation can still support
 * only a LOW-confidence effect claim (for example, eligibility != inclusion).
 */
export const CONFIDENCE_LEVELS = ['HIGH', 'MEDIUM', 'LOW'];

/**
 * Category separates established technical SEO from experimental GEO/LLMO so
 * reports can never present the two as the same kind of statement.
 */
export const CATEGORIES = [
  'TECHNICAL_SEO',
  'SEARCH_DISCOVERABILITY',
  'STRUCTURED_DATA_ELIGIBILITY',
  'CONTENT_QUALITY',
  'ACCESSIBILITY',
  'AI_CRAWLER_ACCESS',
  'AI_RETRIEVAL',
  'EMERGING_GEO',
  'SECURITY_PRIVACY',
  'OPERATIONS',
];

/** Categories whose requirements are experimental by construction. */
export const EXPERIMENTAL_CATEGORIES = ['EMERGING_GEO'];

/** Change-safety classification. Drives what an agent may do without asking. */
export const CHANGE_SAFETY = {
  SAFE_AUTOMATIC:
    'Deterministic, low-risk, reversible change with no effect on indexing directives, URLs, or business facts.',
  REVIEW_REQUIRED:
    'Can affect content, URLs, indexing, redirects, canonicalization, structured data, or application behaviour. Propose a diff and require human approval.',
  BLOCKED:
    'Needs credentials, external platform access, business/legal decisions, or facts the repository does not contain. Never implement; report as NEEDS_MANUAL_ACTION.',
};

export const CHANGE_SAFETY_VALUES = Object.keys(CHANGE_SAFETY);

/** Blast radius if the change is wrong. HIGH implies REVIEW_REQUIRED or BLOCKED. */
export const IMPACT_LEVELS = ['LOW', 'MEDIUM', 'HIGH'];

/**
 * What a verification actually proves.
 * SOURCE alone is explicitly insufficient for anything a runtime layer can override.
 */
export const VERIFICATION_LEVELS = [
  'SOURCE',
  'RUNTIME',
  'SOURCE_AND_RUNTIME',
  'MANUAL_EXTERNAL',
];

export const EVIDENCE_TYPES = [
  'FILE',
  'ROUTE',
  'RENDERED_HTML',
  'RAW_HTML',
  'HTTP_STATUS',
  'HTTP_HEADER',
  'REDIRECT_CHAIN',
  'JSON_LD',
  'SITEMAP',
  'ROBOTS_TXT',
  'FEED',
  'BROWSER',
  'BUILD_OUTPUT',
  'VALIDATOR_OUTPUT',
  'PERFORMANCE_MEASUREMENT',
  'ACCESSIBILITY_SCAN',
  'LOG',
  'EXTERNAL_PLATFORM',
  'MANUAL_ACTION',
];

/** Applicability decisions made before any change. */
export const APPLICABILITY_STATUSES = [
  'APPLICABLE',
  'NOT_APPLICABLE',
  'UNCERTAIN',
  'BLOCKED',
  'ALREADY_CORRECT',
];

/** Terminal results recorded after action. */
export const TERMINAL_STATUSES = [
  'IMPLEMENTED',
  'FIXED',
  'PROPOSED',
  'FAILED',
  'NEEDS_MANUAL_ACTION',
];

/** Search surfaces. Listing a surface means "evaluate here", never "will appear here". */
export const SURFACES = [
  'GOOGLE_SEARCH',
  'GOOGLE_DISCOVER',
  'GOOGLE_IMAGES',
  'GOOGLE_VIDEO',
  'GOOGLE_NEWS',
  'GOOGLE_SHOPPING',
  'BING_SEARCH',
  'AI_ASSISTANT_RETRIEVAL',
  'LOCAL_SEARCH',
  'SOCIAL_PREVIEW',
];

/** Source types for the source manifest. */
export const SOURCE_TYPES = [
  'SPECIFICATION',
  'PLATFORM_DOCUMENTATION',
  'FRAMEWORK_DOCUMENTATION',
  'VOCABULARY',
  'STANDARDS_BODY',
  'PLATFORM_POLICY',
  'EMPIRICAL_STUDY',
  'COMMUNITY_CONVENTION',
];

/** How fast the external evidence behind a requirement is expected to move. */
export const STABILITY = {
  STABLE: 365 * 2,
  SEMI_STABLE: 365,
  VOLATILE: 180,
};

export const STABILITY_VALUES = Object.keys(STABILITY);

/** Framework identifiers used by `frameworks` and the adapter docs. */
export const FRAMEWORKS = [
  'static-html',
  'next-app-router',
  'next-pages-router',
  'react-spa',
  'vite',
  'astro',
  'remix',
  'sveltekit',
  'nuxt',
  'node-server',
  'django',
  'flask-fastapi',
  'any',
];

/**
 * Frameworks with a written adapter in references/framework-adapters.md and at
 * least one fixture. Anything outside this list is "generic guidance only" and
 * must be reported as such rather than implied to have equal depth.
 */
export const FRAMEWORKS_WITH_ADAPTERS = [
  'static-html',
  'next-app-router',
  'next-pages-router',
  'react-spa',
  'vite',
  'astro',
  'remix',
  'node-server',
  'django',
  'flask-fastapi',
];

/** Profile facts a requirement may gate on. Keep in sync with tools/lib/profile.mjs. */
export const PROFILE_PREDICATES = [
  'public_site',
  'javascript_app',
  'client_rendered',
  'server_rendered',
  'static_generated',
  'has_router',
  'has_images',
  'has_video',
  'has_feeds',
  'has_sitemap',
  'has_robots_txt',
  'has_llms_txt',
  'has_structured_data',
  'has_cdn_or_waf',
  'has_service_worker',
  'multilingual',
  'ecommerce',
  'local_business',
  'ugc',
  'paywall_or_subscription',
  'authentication',
  'content_publication',
  'editorial_content',
  'public_documents',
  'analytics_or_measurement',
  'api_driven_content',
  'monorepo',
  'cms',
  'pagination',
  'faceted_navigation',
  'has_production_origin',
  'runtime_available',
  'has_client_javascript',
];

export const REQUIRED_FIELDS = [
  'id',
  'domain',
  'title',
  'statement',
  'rationale',
  'category',
  'minimum_level',
  'severity',
  'impact',
  'change_safety',
  'evidence_tier',
  'confidence',
  'applies_when',
  'implementation',
  'verification',
  'review',
];

export const OPTIONAL_FIELDS = [
  'surfaces',
  'frameworks',
  'framework_notes',
  'depends_on',
  'conflicts_with',
  'sources',
  'caution',
  'supersedes',
];

export const ID_PATTERN = /^SEO-\d{3,4}$/;

/**
 * Classifications used by the review ledgers (requirements/removed.jsonl and
 * requirements/deferred.jsonl). Every record reviewed out of the active registry
 * carries one, so "why isn't this a requirement any more?" always has an answer.
 */
export const CLASSIFICATIONS = [
  'VALID',
  'NEEDS_SOURCE',
  'NEEDS_REWORDING',
  'NEEDS_TEST',
  'DUPLICATE',
  'SPECULATIVE',
  'OBSOLETE',
  'UNSAFE',
  'NOT_ACTIONABLE',
  'SPLIT',
  'MERGED',
  'OUT_OF_SCOPE',
];

/**
 * Domains whose requirements describe output a runtime layer can override
 * (a framework head-merge, a CDN, an edge rewrite, hydration). For these,
 * source-level verification alone is not evidence: brief-grade verification
 * must inspect what is actually served.
 */
export const RUNTIME_SENSITIVE_DOMAINS = [
  'urls',
  'metadata',
  'canonicals',
  'crawling',
  'robots',
  'indexing',
  'sitemaps',
  'structured-data',
  'social-preview',
  'javascript-rendering',
  'caching',
  'cdn-waf',
  'international',
  'paywall',
];

/**
 * Language that asserts an outcome no repository change can guarantee. Scanned
 * across registry text and Markdown by `wds validate` and the docs check.
 * Each entry is [pattern, why] so the failure message teaches the rule.
 */
export const FORBIDDEN_CLAIM_PATTERNS = [
  [/\bguarantee(s|d)?\s+(ranking|rankings|traffic|indexing|inclusion|citation|visibility)/i, 'no repository change guarantees a search or AI outcome'],
  [/\bwill\s+(rank|be\s+indexed|be\s+cited|appear\s+in\s+(google|bing|ai))/i, 'crawling, indexing, and citation are decided by the platform'],
  [/\bensures?\s+(ranking|rankings|indexation|indexing|rich\s+results?|citation)/i, 'eligibility is not inclusion'],
  [/\bboosts?\s+(ranking|rankings|seo\s+score)/i, 'unquantified ranking-boost claim'],
  [/\bproven\s+to\s+(rank|increase\s+traffic)/i, 'unsupported empirical claim'],
  [/\b(number\s+one|#1)\s+(ranking|on\s+google)/i, 'unsupported ranking claim'],
  [/\bguarantees?\s+ai\s+(citation|visibility|inclusion)/i, 'AI answer inclusion is not controllable'],
  [/\bproduction\s+proven\b/i, 'requires benchmark evidence this repository does not have'],
  [/\bmost\s+comprehensive\b/i, 'marketing superlative, not a measurable statement'],
];

export function cumulativeLevels(minimum) {
  return LEVELS.slice(LEVELS.indexOf(minimum));
}
