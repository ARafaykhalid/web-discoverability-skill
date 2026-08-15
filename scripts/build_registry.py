#!/usr/bin/env python3
"""Build the modular SEO requirement registry from curated domain topic lists."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "requirements"
LEVELS = ["LITE", "RECOMMENDED", "EXTRA", "ULTRA"]


def topics(lite: str, recommended: str, extra: str, ultra: str) -> dict[str, list[str]]:
    return {
        "LITE": [item.strip() for item in lite.split("|") if item.strip()],
        "RECOMMENDED": [item.strip() for item in recommended.split("|") if item.strip()],
        "EXTRA": [item.strip() for item in extra.split("|") if item.strip()],
        "ULTRA": [item.strip() for item in ultra.split("|") if item.strip()],
    }


DOMAINS = {
    "architecture": {
        "title": "Repository and application architecture",
        "activation": "always",
        "applies": "Every repository containing a public or potentially public web surface.",
        "why": "Correct ownership and rendering decisions depend on an accurate architecture model.",
        "who": "Search crawlers, users, deploy systems, and maintainers.",
        "when": "Before audit or implementation and after material architecture changes.",
        "where": "Repository manifests, routes, apps, packages, servers, CMS, edge, and deployment configuration.",
        "dependencies": [],
        "conflicts": ["Do not apply one app's configuration to unrelated apps."],
        "topics": topics(
            "Detect package manager and workspace root|Detect primary language and runtime|Detect public application entry points|Classify application type",
            "Detect framework and major version|Map public routes and route ownership|Classify rendering modes by route|Detect monorepo apps and shared packages|Detect deployment platform and production origin|Detect CMS and content ownership",
            "Map frontend backend API and edge ownership|Detect multi-domain and multi-tenant boundaries|Inventory public media feeds and documents",
            "Detect serverless workers and scheduled publishers|Map authentication and authorization boundaries|Record architecture uncertainty and confidence",
        ),
    },
    "urls": {
        "title": "URL design and HTTP routing",
        "activation": "always",
        "applies": "All crawlable routes and public resources.",
        "why": "Stable, unambiguous URLs improve crawling, consolidation, sharing, and maintenance.",
        "who": "Search crawlers, link resolvers, users, analytics, and caches.",
        "when": "At route creation, migration, publication, and deployment.",
        "where": "Routers, route handlers, middleware, edge rules, CMS slugs, and server configuration.",
        "dependencies": ["architecture"],
        "conflicts": ["Redirects must not break APIs, authentication, locale routing, or signed URLs."],
        "topics": topics(
            "Use one production HTTPS origin|Keep public URLs stable and deterministic|Return accurate HTTP status codes|Avoid crawlable duplicate query variants",
            "Normalize host and protocol with redirects|Choose and enforce trailing-slash policy|Use descriptive human-readable slugs|Preserve valid inbound URLs during migrations|Prevent redirect chains and loops|Return 404 or 410 for removed resources",
            "Control faceted-navigation URL expansion|Normalize case and percent encoding safely|Audit pagination URL stability",
            "Validate soft-404 behavior at scale|Separate public routes from action and API endpoints|Document URL migration rollback and monitoring",
        ),
    },
    "metadata": {
        "title": "Document metadata and previews",
        "activation": "always",
        "applies": "Indexable HTML pages and shareable public content.",
        "why": "Accurate metadata communicates page identity and improves result and share previews.",
        "who": "Search engines, social preview systems, browsers, and users.",
        "when": "At route render, content publication, and metadata updates.",
        "where": "HTML head, framework metadata APIs, server templates, and CMS fields.",
        "dependencies": ["architecture", "urls"],
        "conflicts": ["Metadata must not contradict visible content, canonicals, robots, or locale."],
        "topics": topics(
            "Render one descriptive title per indexable page|Render one accurate meta description per indexable page|Declare document language|Set a valid mobile viewport",
            "Use unique route-aware titles|Keep titles aligned with visible primary heading|Generate metadata on the server when required for crawling|Set Open Graph title description URL and type|Set social preview image with dimensions and alt text|Set Twitter card metadata when useful",
            "Audit title truncation and boilerplate balance|Provide content-specific preview images|Declare theme color and supported color schemes accurately",
            "Prevent stale metadata after cache revalidation|Validate metadata for parameterized and fallback routes|Test preview parsers against production-equivalent URLs",
        ),
    },
    "canonicals": {
        "title": "Canonicalization",
        "activation": "always",
        "applies": "Public pages with indexable or duplicate URL variants.",
        "why": "Canonical signals consolidate equivalent URLs and reduce indexing ambiguity.",
        "who": "Google, Bing, other indexers, and syndication consumers.",
        "when": "At render, URL migration, locale rollout, and duplicate-content creation.",
        "where": "HTML link elements, HTTP headers for non-HTML, sitemaps, feeds, and platform configuration.",
        "dependencies": ["urls", "metadata"],
        "conflicts": ["Canonical targets must not be noindex, blocked, redirected, private, or locale-incompatible."],
        "topics": topics(
            "Emit an absolute self-canonical for unique indexable pages|Use the production canonical origin|Keep canonical targets indexable and successful|Exclude tracking parameters from canonical URLs",
            "Canonicalize duplicate route aliases|Align internal links with canonical URLs|Align sitemap URLs with canonical URLs|Canonicalize paginated pages intentionally|Use HTTP Link canonicals for eligible non-HTML resources|Prevent canonical tags from depending on untrusted host headers",
            "Resolve canonical and hreflang relationships|Audit cross-domain canonical intent|Handle syndicated content canonicals explicitly",
            "Detect canonical signal conflicts in rendered output|Validate canonicals across ISR SSR SSG and fallback states|Monitor search-selected canonical divergence",
        ),
    },
    "crawling": {
        "title": "Crawlability and crawl management",
        "activation": "always",
        "applies": "Public content and resources required to render or discover it.",
        "why": "Search systems need reliable access without being sent into traps or private areas.",
        "who": "Search crawlers, AI crawlers, uptime systems, and security controls.",
        "when": "Continuously, especially after routing, WAF, deployment, or content changes.",
        "where": "Navigation, robots controls, server responses, CDN, WAF, APIs, and rendering resources.",
        "dependencies": ["architecture", "urls"],
        "conflicts": ["Crawl access must not expose private data or weaken security."],
        "topics": topics(
            "Keep indexable pages reachable by crawlable links|Allow required rendering resources|Avoid infinite crawl spaces|Keep public navigation available without user gestures",
            "Control calendar and search-result crawl traps|Control session and tracking parameter crawling|Avoid crawler-dependent cloaking|Return consistent content to legitimate crawlers and users|Limit low-value filter and sort combinations|Expose finite pagination paths",
            "Manage crawl demand for very large sites|Validate JavaScript-rendered link discovery|Audit crawl behavior behind consent systems",
            "Analyze server logs for crawler waste|Model crawl budgets per host and tenant|Test crawler behavior through failover infrastructure",
        ),
    },
    "robots": {
        "title": "Robots directives",
        "activation": "always",
        "applies": "Public hosts, HTML pages, and non-HTML resources with indexing policy.",
        "why": "Robots controls must express crawl, indexing, and preview policy without contradictions.",
        "who": "Search and AI crawlers that honor robots standards and directives.",
        "when": "At deployment, environment creation, route publication, and policy change.",
        "where": "robots.txt, meta robots, X-Robots-Tag, CDN, and application responses.",
        "dependencies": ["architecture", "crawling"],
        "conflicts": ["robots.txt blocking can prevent crawlers from seeing noindex; directives vary by crawler."],
        "topics": topics(
            "Serve robots.txt at the host root|Reference the canonical sitemap from robots.txt|Keep production crawl policy distinct from non-production policy|Use noindex for pages that must not appear in search",
            "Use X-Robots-Tag for non-HTML resources|Apply nofollow only when link-following policy requires it|Configure max-image-preview intentionally|Configure max-snippet intentionally|Configure max-video-preview intentionally|Avoid unsupported or contradictory directives",
            "Audit noarchive and nosnippet tradeoffs|Control translated and parameterized route directives|Validate robots behavior for multiple user-agent groups",
            "Test robots parsing against standards edge cases|Monitor accidental sitewide disallow changes|Version and review crawler policy changes",
        ),
    },
    "indexing": {
        "title": "Indexability and index lifecycle",
        "activation": "always",
        "applies": "Pages and resources considered for search indexing.",
        "why": "Clear lifecycle signals keep valuable pages indexable and private or low-value pages out.",
        "who": "Search indexers, site owners, legal teams, and users.",
        "when": "At publish, update, removal, migration, access-model change, and incident response.",
        "where": "Status codes, robots directives, canonicals, sitemaps, CMS state, and authentication layers.",
        "dependencies": ["urls", "robots", "canonicals"],
        "conflicts": ["Do not include noindex, redirected, private, or noncanonical URLs in indexing feeds."],
        "topics": topics(
            "Index only public valuable canonical pages|Exclude private authenticated and admin pages|Exclude drafts previews and staging content|Remove deleted content with accurate lifecycle responses",
            "Prevent indexable internal search results|Prevent indexable error and empty-state pages|Keep pagination indexability intentional|Handle expired content with an explicit policy|Detect accidental noindex on production pages|Detect indexable duplicate content clusters",
            "Design reindexing after major migrations|Manage indexability for user-specific pages|Audit orphaned indexed URLs",
            "Reconcile indexed inventory with canonical inventory|Model deletion propagation and legal removals|Track index coverage anomalies by template",
        ),
    },
    "sitemaps": {
        "title": "XML sitemap infrastructure",
        "activation": "always",
        "applies": "Sites with indexable canonical URLs.",
        "why": "Sitemaps provide a clean, maintainable discovery inventory and update signal.",
        "who": "Google, Bing, other sitemap consumers, and operators.",
        "when": "At deploy and whenever indexable content is added, updated, moved, or removed.",
        "where": "Framework sitemap routes, generators, CMS jobs, storage, and sitemap indexes.",
        "dependencies": ["urls", "canonicals", "indexing"],
        "conflicts": ["Sitemaps must not list noindex, redirected, failed, private, or noncanonical URLs."],
        "topics": topics(
            "Serve a valid XML sitemap or sitemap index|List only absolute canonical indexable URLs|Use accurate last modification dates|Keep sitemap URLs on the intended verified site",
            "Split sitemaps within protocol limits|Use sitemap indexes for multiple content groups|Regenerate sitemaps after content lifecycle changes|Exclude alternate parameter and tracking URLs|Expose image sitemap extensions when valuable|Expose video sitemap extensions when valuable",
            "Partition sitemaps by content type or freshness|Support multi-app and multi-domain sitemap ownership|Compress large sitemaps safely",
            "Validate every sitemap URL sample over HTTP|Monitor sitemap generation failures and staleness|Reconcile sitemap inventory with route and CMS inventories",
        ),
    },
    "google-search": {
        "title": "Google Search readiness",
        "activation": "public_site",
        "applies": "Public sites seeking Google Search visibility.",
        "why": "Google-specific diagnostics and policies complement general technical foundations.",
        "who": "Googlebot, Google Search Console users, and site operators.",
        "when": "At launch, migration, template change, incident, and recurring review.",
        "where": "Site verification, Search Console, rendered pages, sitemaps, and server logs.",
        "dependencies": ["indexing", "sitemaps", "structured-data"],
        "conflicts": ["Do not claim Search Console verification, indexing, ranking, or rich results without evidence."],
        "topics": topics(
            "Prepare a verifiable Google Search Console property|Expose a crawlable homepage and key landing pages|Meet Google spam policy fundamentals|Avoid intrusive interstitials that obstruct primary content",
            "Submit canonical sitemaps through manual action|Inspect representative URLs with production rendering|Review page indexing classifications|Review enhancement reports for applicable rich results|Monitor manual actions and security issues|Preserve verification tokens during deployments",
            "Use Search Console API only with authorized credentials|Segment properties for protocols domains and subdomains intentionally|Correlate template changes with search performance",
            "Reconcile URL Inspection samples with application state|Create migration annotations and comparison windows|Automate anomaly alerts from exported Search Console data",
        ),
    },
    "bing-indexnow": {
        "title": "Bing, Copilot, and IndexNow readiness",
        "activation": "public_site",
        "applies": "Public sites seeking Bing or participating IndexNow discovery.",
        "why": "Bing tooling and IndexNow can improve diagnostics and update discovery when implemented safely.",
        "who": "Bingbot, Bing Webmaster Tools, Copilot search systems, and IndexNow participants.",
        "when": "At launch and on eligible URL additions, updates, and deletions.",
        "where": "Bing verification, IndexNow key file or API, CMS hooks, deploy jobs, and sitemaps.",
        "dependencies": ["indexing", "sitemaps", "urls"],
        "conflicts": ["Never expose secrets or submit private, noncanonical, or unchanged URLs indiscriminately."],
        "topics": topics(
            "Prepare a verifiable Bing Webmaster Tools property|Allow Bingbot to reach intended public content|Publish a valid IndexNow key when IndexNow is used|Submit only canonical public URLs to IndexNow",
            "Trigger IndexNow on meaningful additions updates and deletions|Batch IndexNow submissions within service limits|Retry transient IndexNow failures safely|Keep IndexNow keys out of secret-only locations when public verification is required|Preserve Bing verification during deployments|Review Bing crawl and indexing diagnostics",
            "Deduplicate event-driven IndexNow submissions|Coordinate IndexNow with CMS and deployment publishers|Monitor submission success without treating it as indexing proof",
            "Support multi-host IndexNow key ownership|Audit Copilot-facing page clarity and citations|Reconcile Bing indexed inventory with canonical inventory",
        ),
    },
    "structured-data": {
        "title": "Structured data and rich-result eligibility",
        "activation": "public_site",
        "applies": "Public pages representing supported entities or content types.",
        "why": "Accurate structured data improves machine understanding and may establish feature eligibility.",
        "who": "Schema.org consumers, Google, Bing, and AI systems.",
        "when": "At render and whenever visible entity facts change.",
        "where": "Server-rendered JSON-LD or equivalent structured markup tied to visible content.",
        "dependencies": ["metadata", "canonicals", "entity"],
        "conflicts": ["Do not mark up hidden, false, unsupported, or user-specific claims as public facts."],
        "topics": topics(
            "Emit valid JSON-LD syntax|Match structured data to visible page content|Use the most specific truthful Schema.org types|Use canonical absolute URLs in structured data",
            "Provide required properties for targeted Google features|Provide recommended properties when accurate|Avoid duplicate conflicting entity objects|Keep structured data server-rendered when crawler execution is uncertain|Represent breadcrumbs only when visible navigation supports them|Validate structured data after template changes",
            "Separate Schema.org validity from Google feature eligibility|Model multiple eligible page types without markup spam|Handle user-generated ratings and reviews truthfully",
            "Test structured data across fallback error and empty states|Version structured-data generators and schemas|Monitor rich-result eligibility regressions without guarantees",
        ),
    },
    "entity": {
        "title": "Entity graph and site identity",
        "activation": "public_site",
        "applies": "Sites with identifiable brands, people, organizations, products, places, or creative works.",
        "why": "A coherent graph reduces ambiguity and connects pages to stable real-world entities.",
        "who": "Search knowledge systems, AI systems, users, and content maintainers.",
        "when": "At identity setup, entity creation, rebrand, and profile changes.",
        "where": "Structured data, visible identity content, metadata, canonical URLs, and authoritative profiles.",
        "dependencies": ["metadata", "canonicals"],
        "conflicts": ["Do not invent entities, credentials, profiles, awards, reviews, or relationships."],
        "topics": topics(
            "Define one stable WebSite entity identifier|Define the truthful site publisher entity|Connect WebPage entities to the WebSite|Keep visible branding consistent with site-name signals",
            "Use stable entity identifiers across pages|Connect authors and creators to content they produced|Use sameAs only for verified authoritative profiles|Distinguish person organization brand and product entities|Connect primary page entities with mainEntity or about|Avoid disconnected duplicate entities",
            "Model parent subsidiary and brand relationships accurately|Represent multi-tenant entity ownership explicitly|Reconcile CMS entity IDs with public canonical IDs",
            "Audit entity facts against authoritative sources|Track entity merges splits and rebrands|Validate graph connectivity across content types",
        ),
    },
    "content": {
        "title": "Content quality and answer readiness",
        "activation": "public_site",
        "applies": "Public landing pages, articles, documentation, product content, and other indexable copy.",
        "why": "Useful, original, clear content is the foundation of search and AI discoverability.",
        "who": "Users, search quality systems, answer engines, and editors.",
        "when": "At creation, review, substantive update, and content retirement.",
        "where": "Visible page content, CMS, templates, authoring workflows, and editorial metadata.",
        "dependencies": ["architecture", "indexing"],
        "conflicts": ["Avoid keyword stuffing, fake freshness, doorway pages, mass thin content, and hidden text."],
        "topics": topics(
            "Give each indexable page a clear primary purpose|Provide original user-relevant value|Use one descriptive visible primary heading|Keep critical information in crawlable text",
            "Answer the page's primary intent directly|Use descriptive subheadings and logical sections|Identify authors or responsible organizations when relevant|Provide accurate publication and modification dates|Cite primary sources for factual claims when useful|Remove or consolidate materially thin duplicate pages",
            "Structure concise answer passages for answer engines|Maintain topic clusters without manufacturing pages|Disclose material AI-assisted or sponsored content when required",
            "Audit content decay and factual staleness|Measure template-level duplication and boilerplate|Enforce editorial quality gates for scaled content",
        ),
    },
    "internal-linking": {
        "title": "Internal linking and navigation",
        "activation": "public_site",
        "applies": "Sites with more than one public page.",
        "why": "Internal links distribute discovery, context, and user pathways across the site.",
        "who": "Users, search crawlers, screen-reader users, and site maintainers.",
        "when": "At information-architecture changes and content publication or retirement.",
        "where": "Navigation, breadcrumbs, body copy, related content, sitemaps, and templates.",
        "dependencies": ["urls", "content"],
        "conflicts": ["Avoid excessive, hidden, repetitive, or misleading links and orphan creation."],
        "topics": topics(
            "Link every important page from crawlable site paths|Use descriptive anchor text|Keep navigation links as real URLs|Avoid broken internal links",
            "Provide breadcrumbs for deep hierarchies when useful|Link related content contextually|Prevent important pages from becoming orphaned|Prefer canonical destination URLs in links|Control links to noindex and private routes|Keep footer and boilerplate links purposeful",
            "Model hub and spoke relationships for large topics|Audit link equity traps caused by filters and pagination|Use faceted links selectively",
            "Analyze internal graph depth and centrality|Monitor orphan creation in CMS publishing|Test navigation under JavaScript failure and hydration delay",
        ),
    },
    "images": {
        "title": "Image SEO and delivery",
        "activation": "has_images",
        "applies": "Sites serving meaningful or decorative images.",
        "why": "Accessible, efficient, crawlable images improve page experience and image discovery.",
        "who": "Users, assistive technology, image search, Discover, and performance systems.",
        "when": "At asset creation, upload, transformation, render, and content update.",
        "where": "Image components, HTML, CDN transforms, CMS metadata, sitemaps, and source files.",
        "dependencies": ["content", "performance"],
        "conflicts": ["Do not invent licensing or alt text, expose private images, or lazy-load the likely LCP image."],
        "topics": topics(
            "Provide meaningful alt text for informative images|Use empty alt text for decorative images|Reserve image dimensions to prevent layout shift|Serve responsive image sizes",
            "Use efficient image formats appropriate to content|Compress images without unacceptable quality loss|Load below-the-fold images lazily|Prioritize likely LCP images|Use descriptive stable image URLs or filenames|Keep important images crawlable without authentication",
            "Provide image licensing metadata when truthful and useful|Add image sitemap data for discovery-critical assets|Preserve EXIF IPTC or XMP rights data when required",
            "Validate CDN transformations for crawler user agents|Audit duplicate image variants and canonical asset URLs|Monitor image search and Discover eligibility regressions",
        ),
    },
    "video": {
        "title": "Video SEO and accessibility",
        "activation": "has_video",
        "applies": "Pages whose primary or meaningful supporting content includes video.",
        "why": "Complete, accessible video metadata supports understanding, playback, and video discovery.",
        "who": "Users, video search, assistive technology, crawlers, and media platforms.",
        "when": "At video publication, replacement, metadata update, and hosting change.",
        "where": "Video player, HTML, JSON-LD, captions, transcripts, thumbnails, and video sitemaps.",
        "dependencies": ["content", "images", "structured-data"],
        "conflicts": ["Do not use VideoObject for decorative motion or inaccessible/private media."],
        "topics": topics(
            "Provide a descriptive video title|Provide an accurate video description|Provide crawlable representative thumbnails|Provide captions for spoken content",
            "Provide transcripts when useful|Declare upload date and duration accurately|Expose contentUrl or embedUrl appropriately|Use VideoObject only for real video content|Keep player and thumbnail mobile-friendly|Avoid blocking required player resources",
            "Create video sitemap entries for discovery-critical videos|Mark live video metadata accurately|Connect clips and key moments when supported and truthful",
            "Validate playback and metadata for crawler renderers|Monitor expired removed and replaced video lifecycle|Audit third-party embed privacy performance and indexability",
        ),
    },
    "discover": {
        "title": "Google Discover readiness",
        "activation": "editorial_content",
        "applies": "Eligible public editorial, news, media, blog, and timely content.",
        "why": "Discover readiness depends on quality, mobile experience, previews, and trustworthy presentation.",
        "who": "Mobile users and Google Discover systems.",
        "when": "At article publication, significant update, template change, and media change.",
        "where": "Article pages, metadata, images, author information, mobile UX, and Search Console.",
        "dependencies": ["content", "images", "google-search"],
        "conflicts": ["Never guarantee Discover inclusion or use clickbait, misleading previews, or fake freshness."],
        "topics": topics(
            "Keep Discover-eligible pages indexable and mobile accessible|Use compelling non-misleading titles|Provide substantial original value|Avoid intrusive interstitials over primary content",
            "Provide large high-quality representative images|Allow large image previews when strategy permits|Show clear author or publisher identity|Use accurate publication and modification dates|Avoid sensational or withheld-context preview text|Keep primary content immediately usable",
            "Maintain topical expertise and content credibility|Refresh content only when materially updated|Audit Discover traffic separately from Search traffic",
            "Validate image crop safety across Discover surfaces|Monitor manual actions and policy-sensitive topics|Build editorial incident rollback for misleading metadata",
        ),
    },
    "ai-search": {
        "title": "AI search, AEO, GEO, LLMO, and answer discoverability",
        "activation": "public_site",
        "applies": "Public content intended to be understood, cited, summarized, or recommended by AI systems.",
        "why": "Clear facts, entities, answers, provenance, and accessible pages improve machine comprehension readiness.",
        "who": "AI answer engines, search assistants, users, and content owners.",
        "when": "At publication, factual update, entity change, and machine-discovery policy review.",
        "where": "Visible content, structured data, citations, feeds, metadata, crawler policy, and machine-readable resources.",
        "dependencies": ["content", "entity", "structured-data"],
        "conflicts": ["Do not promise citations, fabricate authority, or optimize with spammy generated text."],
        "topics": topics(
            "State primary answers and value propositions clearly|Use consistent names for important entities|Keep factual claims attributable and current|Expose important content in accessible server-readable text",
            "Structure definitions steps comparisons and FAQs naturally|Cite authoritative primary sources where useful|Distinguish facts opinions and marketing claims|Provide author and publisher provenance|Keep canonical pages accessible to permitted AI search crawlers|Use stable fragment headings for precise references",
            "Provide concise machine-comprehensible summaries|Map AEO GEO LEO LLMO SXO AXO AIO AISEO GAIO AAIO and XEO tactics to real user value|Audit citation-worthy evidence and source transparency",
            "Measure AI referral traffic without over-attribution|Test answer extraction against ambiguous page sections|Maintain correction and retraction signals for AI consumers",
        ),
    },
    "ai-crawlers": {
        "title": "AI crawler policy",
        "activation": "public_site",
        "applies": "Public hosts making explicit choices about search, training, assistant, or user-triggered AI crawlers.",
        "why": "Crawler policies should align with business goals, privacy, content rights, and discoverability.",
        "who": "Google, Bing, OpenAI, Anthropic, and other identified crawler operators.",
        "when": "At launch, policy change, crawler identity update, and legal or business review.",
        "where": "robots.txt, terms, WAF, logs, authentication, and crawler policy records.",
        "dependencies": ["robots", "security"],
        "conflicts": ["Do not block blindly, rely on spoofable user agents alone, or allow private content."],
        "topics": topics(
            "Inventory relevant AI crawler identities and purposes|Separate search indexing crawlers from model-training crawlers|Define allow or disallow policy per crawler purpose|Keep private and authenticated content unavailable regardless of robots policy",
            "Document business impact for each crawler decision|Express supported policies in robots.txt accurately|Align WAF behavior with published crawler policy|Verify legitimate crawler access without user-agent-only trust|Review crawler operator documentation from primary sources|Avoid contradictory wildcard and named-agent groups",
            "Analyze logs for unexpected AI crawler behavior|Rate-limit abusive automation without blocking legitimate search|Coordinate licensing terms with technical controls",
            "Maintain a dated crawler policy matrix|Test policy changes through CDN and origin layers|Monitor new crawler identities and retired tokens",
        ),
    },
    "llms-txt": {
        "title": "llms.txt machine-readable guidance",
        "activation": "public_site",
        "applies": "Sites whose content strategy benefits from an optional concise machine-readable guide.",
        "why": "A maintained llms.txt can offer useful navigation to important public resources without being a ranking claim.",
        "who": "Tools and AI systems choosing to consume the emerging convention.",
        "when": "At launch and when important public content or URLs change.",
        "where": "The public /llms.txt route or static asset and its content source.",
        "dependencies": ["urls", "content", "ai-search"],
        "conflicts": ["Do not include secrets, private URLs, spam, inaccurate summaries, or ranking claims."],
        "topics": topics(
            "Serve llms.txt publicly at the root when adopted|Use absolute canonical HTTPS URLs|Describe the site and important resources concisely|Exclude private draft admin and secret URLs",
            "Link only maintained high-value public pages|Keep descriptions factual and non-promotional|Generate llms.txt from maintainable source data|Update llms.txt after canonical URL changes|Return a successful plain-text response|Avoid treating llms.txt as an official search ranking factor",
            "Group resources by audience or content type|Provide optional deeper documentation links without dumping the sitemap|Validate referenced URLs automatically",
            "Track convention changes from primary project sources|Version llms.txt content and rollback policy|Measure consumer access without assuming downstream use",
        ),
    },
    "performance": {
        "title": "Performance and Core Web Vitals",
        "activation": "public_site",
        "applies": "Public user-facing pages and their critical resources.",
        "why": "Fast, stable, responsive experiences support users, crawling, and search experience signals.",
        "who": "Users, browsers, search systems, crawlers, and operators.",
        "when": "During implementation, before release, and through field monitoring.",
        "where": "Rendering, JavaScript, CSS, fonts, images, servers, CDN, and third parties.",
        "dependencies": ["architecture"],
        "conflicts": ["Do not sacrifice correctness, accessibility, security, or critical functionality for synthetic scores."],
        "topics": topics(
            "Optimize likely Largest Contentful Paint elements|Prevent avoidable Cumulative Layout Shift|Keep interactions responsive for Interaction to Next Paint|Reduce avoidable server response latency",
            "Limit render-blocking CSS and scripts|Code-split noncritical JavaScript|Avoid unnecessary client rendering for static content|Load fonts with efficient subsets and fallbacks|Preconnect only to critical origins|Control third-party script cost",
            "Measure field and lab performance separately|Set route and template performance budgets|Audit hydration and long-task bottlenecks",
            "Monitor Core Web Vitals by percentile and device class|Profile cold starts and edge-region latency|Regression-test critical rendering paths under constrained networks",
        ),
    },
    "caching": {
        "title": "HTTP caching and freshness",
        "activation": "public_site",
        "applies": "Public pages and assets where caching is safe and useful.",
        "why": "Correct caching improves speed and efficiency while preserving freshness and privacy.",
        "who": "Browsers, CDNs, crawlers, origins, and users.",
        "when": "At response generation, deployment, revalidation, and content updates.",
        "where": "HTTP headers, application cache APIs, CDN rules, reverse proxies, and storage.",
        "dependencies": ["architecture", "security"],
        "conflicts": ["Never cache private, personalized, authenticated, or legally restricted responses publicly."],
        "topics": topics(
            "Set explicit Cache-Control for public static assets|Use content-hashed immutable asset URLs|Prevent shared caching of private responses|Keep HTML freshness aligned with content update needs",
            "Use ETag validators where stable and beneficial|Use Last-Modified when accurate and maintainable|Support conditional requests and 304 responses|Configure stale-while-revalidate intentionally|Vary responses only on necessary request headers|Purge or revalidate changed canonical content",
            "Audit CDN and origin cache-key alignment|Prevent cache poisoning and unkeyed-input variance|Model freshness for CMS webhooks and ISR",
            "Test cache behavior across authenticated state transitions|Measure crawler cache validation efficiency|Monitor stale content incidents and purge failures",
        ),
    },
    "bfcache": {
        "title": "Back-forward cache and page lifecycle",
        "activation": "interactive_app",
        "applies": "Browser-rendered sites and applications with history navigation.",
        "why": "BFCache can make return navigation instant when page lifecycle handling is compatible.",
        "who": "Browser users and frontend maintainers.",
        "when": "During navigation architecture changes and performance reviews.",
        "where": "Browser event handlers, page lifecycle code, connections, and SPA routing.",
        "dependencies": ["performance"],
        "conflicts": ["Do not break data correctness, security, or real-time connection behavior to force BFCache eligibility."],
        "topics": topics(
            "Avoid unnecessary unload event handlers|Use pagehide and pageshow lifecycle events correctly|Restore stale UI state safely after BFCache navigation|Preserve form and scroll state intentionally",
            "Close or suspend incompatible connections when required|Handle persisted pageshow events|Avoid cache-control directives that unnecessarily block BFCache|Test history navigation on critical journeys|Revalidate sensitive data after restoration|Keep analytics from double-counting restored pages",
            "Audit third-party scripts that block BFCache|Measure BFCache hit rate where browser tooling permits|Test SPA and full-document navigation interactions",
            "Automate BFCache eligibility checks for critical templates|Document unavoidable blockers with business rationale|Monitor lifecycle regressions after browser upgrades",
        ),
    },
    "accessibility": {
        "title": "Accessibility and WCAG 2.2 AA readiness",
        "activation": "public_site",
        "applies": "All user-facing interfaces and public content.",
        "why": "Accessible experiences improve usability, semantic clarity, and equitable discovery.",
        "who": "People with disabilities, assistive technologies, all users, and maintainers.",
        "when": "During design, implementation, content entry, and regression review.",
        "where": "HTML, CSS, JavaScript, content, forms, media, components, and design systems.",
        "dependencies": ["architecture"],
        "conflicts": ["Do not claim formal WCAG conformance without a proper conformance assessment."],
        "topics": topics(
            "Use semantic landmarks and native elements|Provide complete keyboard access|Show visible focus indicators|Maintain a logical heading hierarchy",
            "Associate form controls with accessible labels|Provide useful validation and error messages|Meet applicable text and UI contrast requirements|Respect reduced-motion preferences|Provide skip navigation for repeated content|Expose dynamic status messages accessibly",
            "Meet applicable target-size requirements|Keep focus unobscured and predictable|Test reflow and zoom without loss of content",
            "Perform screen-reader testing on critical journeys|Audit WCAG 2.2 AA criteria by component and template|Track accessibility regressions in design-system releases",
        ),
    },
    "security": {
        "title": "SEO security and public-surface integrity",
        "activation": "always",
        "applies": "Repositories and deployments that expose or generate public web content.",
        "why": "Compromise, leakage, spam injection, and unsafe previews can destroy trust and search visibility.",
        "who": "Users, search engines, security teams, operators, and content owners.",
        "when": "Continuously and during incident response, deployment, and access-control changes.",
        "where": "Application code, dependencies, CMS, headers, logs, routes, storage, and infrastructure.",
        "dependencies": ["architecture"],
        "conflicts": ["Security controls must preserve legitimate public crawler access without weakening protection."],
        "topics": topics(
            "Keep secrets out of public code and responses|Prevent indexing of authenticated and private content|Protect admin preview and draft routes|Detect malicious redirects and injected links",
            "Detect hacked pages and spam content|Apply appropriate security headers without breaking rendering|Prevent open redirects on public routes|Keep dependency and CMS security posture reviewable|Avoid exposing source maps or debug output unintentionally|Separate user-controlled content from trusted metadata",
            "Monitor cloaking indicators and crawler-specific compromises|Validate content-security policy impact on critical rendering|Audit signed URL and media authorization leakage",
            "Maintain search-focused incident response and removal procedures|Scan indexed inventories for unexpected paths|Correlate security events with traffic and index anomalies",
        ),
    },
    "cdn-waf": {
        "title": "CDN, WAF, edge, and bot delivery",
        "activation": "has_cdn_or_waf",
        "applies": "Sites delivered or protected through CDN, WAF, reverse proxy, edge middleware, or bot management.",
        "why": "Edge controls determine whether public content reaches legitimate crawlers consistently and safely.",
        "who": "Users, crawlers, CDN/WAF operators, and origin services.",
        "when": "At rule changes, migrations, incidents, and periodic bot testing.",
        "where": "CDN, WAF, edge redirects, cache rules, bot rules, rate limits, and origin headers.",
        "dependencies": ["crawling", "security", "caching"],
        "conflicts": ["Do not disable security broadly or trust user-agent strings without verification."],
        "topics": topics(
            "Return intended status codes through the edge|Allow verified legitimate search crawlers to public pages|Avoid CAPTCHA or JavaScript challenges on crawl-critical pages|Preserve canonical host and protocol redirects",
            "Keep robots sitemap and verification files reachable|Align edge and origin redirect logic|Align CDN cache keys with application variance|Prevent WAF false positives on crawlable URLs|Rate-limit abusive bots without harming legitimate crawling|Preserve response headers required for indexing and caching",
            "Test conditional requests through CDN and origin|Audit geographic and IPv6 delivery differences|Validate stale-if-error behavior for public pages",
            "Continuously test major crawler access paths|Monitor edge rule deployments for SEO regressions|Document emergency bypass with narrow scope and expiry",
        ),
    },
    "ecommerce": {
        "title": "Ecommerce, products, and shopping surfaces",
        "activation": "ecommerce",
        "applies": "Sites offering products, purchasable variants, catalogs, or shopping discovery.",
        "why": "Accurate product data and crawlable commerce pages support users and shopping eligibility.",
        "who": "Shoppers, Google Shopping, Bing Shopping, merchants, and crawlers.",
        "when": "At product creation, inventory, price, availability, shipping, return, and variant updates.",
        "where": "Product pages, catalog APIs, structured data, feeds, Merchant Center, images, and checkout boundaries.",
        "dependencies": ["urls", "structured-data", "images"],
        "conflicts": ["Do not create fake products, prices, availability, ratings, reviews, shipping, or return claims."],
        "topics": topics(
            "", 
            "Expose one canonical public URL per sellable product|Keep visible price and availability current|Provide Product structured data for eligible products|Use stable product identifiers such as SKU GTIN or MPN when valid|Provide high-quality crawlable product images|Keep variants represented consistently across URLs markup and feeds|Make out-of-stock lifecycle behavior intentional|Expose shipping and return information accurately|Separate product pages from cart checkout and account pages|Prepare Merchant Center verification as a manual action",
            "Generate product feeds consistent with website data|Model aggregate ratings only from genuine visible reviews|Handle regional price and availability variants",
            "Validate feed-to-page parity at scale|Monitor disapprovals and stale inventory through authorized services|Design product deletion replacement and redirect lifecycle",
        ),
    },
    "local": {
        "title": "Local search and location entities",
        "activation": "local_business",
        "applies": "Businesses serving physical locations or defined service areas.",
        "why": "Consistent truthful location information improves local user trust and eligibility readiness.",
        "who": "Local customers, maps and local search systems, and business operators.",
        "when": "At location launch, move, closure, hours change, and profile update.",
        "where": "Location pages, visible contact data, structured data, maps profiles, and citations.",
        "dependencies": ["entity", "structured-data", "content"],
        "conflicts": ["Do not create fake locations, virtual-office claims, or inconsistent NAP data."],
        "topics": topics(
            "",
            "Publish consistent business name address and phone data|Create useful unique pages for real locations|Use the most specific truthful LocalBusiness type|Publish accurate opening hours and exceptions|Represent service areas accurately|Provide accessible contact and directions information|Keep map pins and coordinates accurate|Prepare Google Business Profile ownership as a manual action|Link location entities to the parent organization|Handle moved and closed locations with explicit lifecycle rules",
            "Manage practitioner and department entities without duplication|Localize location-page content for actual services|Audit major citation consistency",
            "Monitor local profile and site fact divergence|Model multi-brand shared-location relationships|Detect doorway-like thin location page generation",
        ),
    },
    "international": {
        "title": "International and multilingual SEO",
        "activation": "multilingual_or_multiregional",
        "applies": "Sites serving more than one language or regional market.",
        "why": "Explicit locale signals help users and search engines reach the correct language or region version.",
        "who": "International users, crawlers, translators, and regional operators.",
        "when": "At locale launch, translation update, URL migration, and market expansion.",
        "where": "Locale routes, HTML language tags, hreflang, canonicals, sitemaps, metadata, and content systems.",
        "dependencies": ["urls", "canonicals", "sitemaps"],
        "conflicts": ["Do not add hreflang to monolingual sites or canonicalize distinct translations to one language."],
        "topics": topics(
            "",
            "Declare the correct page language|Use stable crawlable locale URLs|Provide self-referential and reciprocal hreflang|Use valid language and region codes|Keep locale canonicals within the intended equivalent page|Translate titles descriptions and visible content|Avoid automatic locale redirects that block crawlers|Provide a usable language selector with real links|Include x-default only when it represents a genuine fallback|Keep structured data localized and factually consistent",
            "Generate hreflang through sitemaps when operationally safer|Handle partially translated content explicitly|Model regional pricing and legal differences",
            "Validate full hreflang clusters at scale|Monitor missing reciprocal and broken locale URLs|Plan locale retirement migrations without cluster collapse",
        ),
    },
    "ugc": {
        "title": "UGC, community, profiles, and moderation",
        "activation": "ugc",
        "applies": "Platforms publishing user-generated posts, profiles, comments, listings, or discussions.",
        "why": "UGC can add value but also creates spam, duplication, moderation, and crawl-scale risks.",
        "who": "Community users, moderators, crawlers, abuse teams, and site owners.",
        "when": "At submission, moderation, publication, edit, deletion, and account enforcement.",
        "where": "UGC routes, moderation systems, link rendering, profile pages, robots, and structured data.",
        "dependencies": ["security", "indexing", "content"],
        "conflicts": ["Do not index private, unmoderated, abusive, empty, or mass-spam user content."],
        "topics": topics(
            "",
            "Define indexability thresholds for user-generated pages|Moderate spam and malicious content before or after publication|Mark untrusted outbound links appropriately|Prevent empty and near-empty profile indexing|Use stable canonical URLs for discussions and posts|Handle deleted banned and anonymized users safely|Control pagination and infinite-scroll crawl paths|Expose author identity only within privacy policy|Separate staff editorial and user-generated content|Prevent UGC from injecting metadata or structured data",
            "Model discussion forum or Q&A structured data only when eligible|Detect duplicate cross-posted and templated UGC|Set reputation and quality thresholds for indexing",
            "Audit crawl demand by UGC quality cohort|Monitor abuse-driven index spikes|Design legal takedown propagation and evidence retention",
        ),
    },
    "paywall": {
        "title": "Paywall, subscription, and membership content",
        "activation": "paywall_or_subscription",
        "applies": "Sites limiting content through subscriptions, memberships, registration, or metering.",
        "why": "Access controls, previews, and indexing policy must remain consistent, secure, and truthful.",
        "who": "Subscribers, anonymous users, crawlers, publishers, and access-control systems.",
        "when": "At access-model design, subscription changes, article publication, and entitlement changes.",
        "where": "Server rendering, authentication, structured data, robots, previews, caching, and subscription systems.",
        "dependencies": ["security", "indexing", "structured-data"],
        "conflicts": ["Do not bypass paywalls, expose subscriber content, cloak, or cache entitlements publicly."],
        "topics": topics(
            "",
            "Define indexability policy for paywalled pages|Expose a truthful public preview when intended|Keep authenticated full content protected at the server|Mark paywalled portions with supported structured data when applicable|Prevent public caches from storing entitled content|Keep canonical URLs stable across access states|Avoid crawler-only full-content delivery that violates policy|Separate registration walls from paid subscription walls|Provide clear subscription and login user journeys|Exclude account billing and entitlement routes from indexing",
            "Handle metered-access counters without crawler traps|Model multi-part paywalled content accurately|Audit snippet controls against business strategy",
            "Test cache and authorization boundaries under crawler-like requests|Monitor accidental entitlement leakage|Document platform-policy changes affecting subscription indexing",
        ),
    },
    "feeds": {
        "title": "RSS, Atom, and content feeds",
        "activation": "content_publication",
        "applies": "Sites publishing recurring articles, releases, podcasts, media, or updates where feeds add value.",
        "why": "Valid feeds support syndication, subscribers, crawlers, and update discovery.",
        "who": "Feed readers, aggregators, users, search systems, and publishers.",
        "when": "At content publication, update, deletion, and feed generator changes.",
        "where": "Feed routes, XML generators, HTML discovery links, CMS, and caching.",
        "dependencies": ["urls", "content", "canonicals"],
        "conflicts": ["Do not expose drafts, private content, secrets, or duplicate malformed entries."],
        "topics": topics(
            "",
            "Serve valid RSS or Atom when publication cadence justifies it|Add feed autodiscovery metadata to relevant pages|Use canonical absolute entry URLs|Publish accurate entry titles and dates|Exclude drafts private and deleted content|Keep stable unique entry identifiers|Escape and encode feed content correctly|Use correct feed MIME types|Limit feed size and pagination intentionally|Keep feed summaries or full content aligned with policy",
            "Offer category or topic feeds only when useful|Include media enclosures with accurate metadata|Validate WebSub or hub integrations when used",
            "Monitor feed generation failures and staleness|Reconcile feeds with canonical publication inventory|Test consumer compatibility across representative readers",
        ),
    },
    "pdf": {
        "title": "PDF and non-HTML document discovery",
        "activation": "public_documents",
        "applies": "Public PDFs, office documents, reports, downloads, and generated non-HTML resources.",
        "why": "Documents need intentional indexing, metadata, accessibility, and privacy treatment.",
        "who": "Document users, search crawlers, assistive technology, and content owners.",
        "when": "At document generation, upload, replacement, and access-policy change.",
        "where": "Document files, HTTP headers, download pages, storage, generators, and canonical HTML alternatives.",
        "dependencies": ["security", "indexing"],
        "conflicts": ["Do not expose private reports, embedded personal data, drafts, or inaccessible document-only content."],
        "topics": topics(
            "",
            "Classify each public document as indexable or nonindexable|Use descriptive document filenames|Set accurate document titles and metadata|Provide accessible tagged PDFs when required|Use X-Robots-Tag for non-HTML indexing control|Provide a canonical HTML alternative when beneficial|Link documents from contextual HTML pages|Return correct MIME types and status codes|Remove private metadata and hidden data before publication|Handle replaced and removed documents with explicit lifecycle rules",
            "Provide document language and reading order|Optimize document file size without damaging quality|Extract searchable text from scanned documents when lawful",
            "Inventory orphaned indexed documents|Validate generated-document privacy boundaries|Monitor document duplication across revisions",
        ),
    },
    "analytics": {
        "title": "Analytics and measurement integrity",
        "activation": "analytics_or_measurement",
        "applies": "Sites measuring search, content, conversion, or AI referral behavior.",
        "why": "Reliable measurement supports diagnosis without polluting user experience or privacy.",
        "who": "Analysts, product teams, marketers, privacy teams, and users.",
        "when": "At analytics setup, consent change, route change, campaign launch, and reporting review.",
        "where": "Analytics tags, consent management, server events, URL parameters, and dashboards.",
        "dependencies": ["urls", "performance", "security"],
        "conflicts": ["Do not leak personal data, bypass consent, or let analytics scripts block critical rendering."],
        "topics": topics(
            "",
            "Measure organic search landing sessions accurately|Preserve referrer data through internal redirects|Classify AI referral sources transparently|Avoid sending personal data in page URLs or analytics payloads|Respect applicable consent choices|Prevent duplicate pageview events in SPA navigation|Exclude internal and automated traffic where justified|Track canonical page identity rather than unstable variants|Measure search conversions with documented attribution limits|Control analytics script performance cost",
            "Annotate migrations releases and major content changes|Segment reporting by template device and country|Reconcile client and server measurement gaps",
            "Monitor analytics schema and tag regressions|Audit dark traffic and AI attribution uncertainty|Maintain data retention and access governance",
        ),
    },
    "monitoring": {
        "title": "Search and discoverability monitoring",
        "activation": "public_site",
        "applies": "Production public sites with ongoing operational responsibility.",
        "why": "Discoverability can regress after deploys, content changes, or infrastructure incidents.",
        "who": "Operators, developers, SEO teams, security teams, and content owners.",
        "when": "Continuously and after releases, migrations, incidents, and policy changes.",
        "where": "Synthetic checks, logs, dashboards, webmaster platforms, alerts, and incident systems.",
        "dependencies": ["testing", "google-search", "bing-indexnow"],
        "conflicts": ["Do not claim monitoring exists unless checks, ownership, and alert delivery are configured."],
        "topics": topics(
            "",
            "Monitor homepage and critical route availability|Monitor robots.txt and sitemap availability|Monitor accidental noindex and canonical changes|Monitor structured-data parse failures|Monitor Core Web Vitals trends|Monitor crawler error-rate and status-code shifts|Monitor unexpected indexed or public paths|Monitor certificate and canonical-host failures|Assign owners and severity for discoverability alerts|Document external-service checks requiring credentials",
            "Monitor sitemap inventory drift|Correlate deploys with search and crawl anomalies|Track content freshness and stale-feed failures",
            "Build multi-region crawler-path synthetic tests|Maintain search incident runbooks and rollback criteria|Review alert precision and missed incidents periodically",
        ),
    },
    "testing": {
        "title": "Verification and regression prevention",
        "activation": "always",
        "applies": "Every audited or modified repository.",
        "why": "Evidence-based verification prevents false completion claims and catches cross-domain regressions.",
        "who": "Developers, reviewers, operators, users, and search systems.",
        "when": "Before changes, after each subsystem change, before release, and in the final audit loop.",
        "where": "Repository commands, HTTP probes, rendered output, browsers, validators, and CI.",
        "dependencies": ["architecture"],
        "conflicts": ["Use actual project commands; do not run destructive, unavailable, or unauthorized tests."],
        "topics": topics(
            "Inspect project manifests before selecting validation commands|Verify changed routes return intended status codes|Verify rendered titles descriptions canonicals and robots|Verify robots.txt and sitemap responses",
            "Validate structured data syntax and page alignment|Check representative internal links for failures|Verify no private route became public or indexable|Check changed pages for major accessibility regressions|Check changed pages for unacceptable performance regressions|Record actual commands outputs and limitations",
            "Test representative SSR SSG ISR and client-rendered states|Compare pre-change and post-change search-critical output|Validate CDN and origin behavior separately when applicable",
            "Run a second independent requirement audit pass|Reconcile every applicable requirement with evidence|Maintain regression fixtures for critical templates and resources",
        ),
    },
    "social-preview": {
        "title": "Social and messaging previews",
        "activation": "public_site",
        "applies": "Public pages likely to be shared through social or messaging platforms.",
        "why": "Accurate previews improve recognition and click confidence without misleading users.",
        "who": "Users and social, messaging, and collaboration preview crawlers.",
        "when": "At page publication, metadata update, image replacement, and domain migration.",
        "where": "Open Graph, Twitter card fields, preview images, canonicals, and crawler access controls.",
        "dependencies": ["metadata", "images"],
        "conflicts": ["Preview metadata must not contradict the page, expose private data, or use misleading images."],
        "topics": topics(
            "Provide a canonical Open Graph URL|Use truthful Open Graph titles and descriptions|Provide accessible preview-image alt text|Keep preview images publicly fetchable",
            "Set accurate Open Graph content types|Provide image width height and MIME hints|Use summary-large-image cards only with suitable imagery|Avoid duplicate conflicting preview tags|Generate previews for dynamic content server-side|Use fallback preview assets intentionally",
            "Validate preview crops and safe areas|Version preview images when caches must refresh|Audit platform-specific parser differences",
            "Test previews through production-equivalent bot paths|Monitor stale preview cache incidents|Prevent user content from injecting unsafe preview metadata",
        ),
    },
    "javascript-rendering": {
        "title": "JavaScript rendering and hydration",
        "activation": "javascript_app",
        "applies": "React, Next.js, Remix, Astro, Vite, SPA, hybrid, and other JavaScript-rendered applications.",
        "why": "Critical content and signals must survive rendering modes, hydration, and crawler capabilities.",
        "who": "Users, browsers, crawlers, framework runtimes, and developers.",
        "when": "At route and component design, framework upgrades, and rendering regressions.",
        "where": "Server components, client components, loaders, route modules, hydration, and generated HTML.",
        "dependencies": ["architecture", "metadata", "crawling"],
        "conflicts": ["Do not force client rendering where server or static output is available and appropriate."],
        "topics": topics(
            "Render primary content in initial HTML when practical|Render search-critical metadata on the server|Use crawlable anchor elements for navigation|Keep content usable when hydration is delayed",
            "Avoid client-only canonical and robots mutations|Handle route loading error and not-found states accurately|Prevent hydration mismatches in structured data|Expose dynamic-route content without requiring user interaction|Use framework-native metadata and route APIs|Keep streaming fallbacks free of misleading indexable content",
            "Validate rendered DOM and raw HTML separately|Audit lazy component boundaries around primary content|Control infinite scroll with crawlable pagination",
            "Test crawler rendering after framework upgrades|Monitor client exception impact on content discovery|Compare edge node and browser rendering outputs",
        ),
    },
    "mobile-ux": {
        "title": "Mobile search experience and SXO",
        "activation": "public_site",
        "applies": "Public sites used or crawled through mobile viewports.",
        "why": "Responsive, unobstructed mobile experiences support users and mobile-first search evaluation.",
        "who": "Mobile users, mobile crawlers, assistive technology, and product teams.",
        "when": "During responsive design, component changes, and production experience reviews.",
        "where": "Layouts, navigation, dialogs, forms, media, viewport configuration, and touch interactions.",
        "dependencies": ["accessibility", "performance"],
        "conflicts": ["Do not hide meaningful content or actions solely to simplify mobile layouts."],
        "topics": topics(
            "Keep primary content equivalent across mobile and desktop|Avoid horizontal scrolling for normal content|Keep navigation usable on small screens|Avoid interstitials that obscure primary content",
            "Size touch targets for reliable interaction|Keep text readable without forced zoom|Place key content early without deceptive reordering|Ensure sticky elements do not obscure content or focus|Test forms with mobile keyboards and autofill|Use responsive media without overflow",
            "Audit fold behavior without treating above-the-fold as a ranking formula|Test orientation changes and dynamic viewport units|Measure mobile conversion friction alongside search traffic",
            "Test low-memory and low-bandwidth mobile behavior|Monitor mobile-only rendering and indexing divergence|Regression-test critical journeys on representative devices",
        ),
    },
    "privacy-auth": {
        "title": "Privacy, authentication, and environment boundaries",
        "activation": "always",
        "applies": "Sites with authentication, personalization, previews, staging, analytics, or private data.",
        "why": "Discoverability work must never expose private content or confuse environment boundaries.",
        "who": "Users, security and privacy teams, crawlers, operators, and regulators.",
        "when": "At environment setup, auth changes, preview creation, consent updates, and deployment.",
        "where": "Authentication middleware, headers, robots, DNS, deployments, caches, logs, and analytics.",
        "dependencies": ["architecture", "security", "robots"],
        "conflicts": ["Robots directives are not access control; privacy must be enforced server-side."],
        "topics": topics(
            "Protect nonproduction environments with real access control|Keep authenticated pages out of public sitemaps|Prevent personalized content from leaking into shared caches|Keep preview URLs unguessable and nonindexable",
            "Avoid exposing secrets through metadata feeds or source maps|Separate consent state from crawler access decisions|Prevent login logout and callback routes from indexing|Use generic safe metadata on unauthorized responses|Keep tenant data isolated across hosts and cache keys|Audit public APIs for private content enumeration",
            "Define retention for crawl and analytics logs|Handle right-to-erasure effects on public URLs|Audit consent-manager effects on primary content rendering",
            "Test authorization boundaries using alternate hosts and headers|Monitor staging-domain discovery and certificate transparency exposure|Maintain emergency deindexing plans without treating them as access control",
        ),
    },
}


# Preserve the original contiguous ID allocation while strengthening records that
# previously compressed several requested controls into vague or incomplete topics.
# These overrides are intentionally requirement-sized: related protocol attributes
# may be grouped when they share one implementation owner and one verification pass.
TITLE_OVERRIDES = {
    "SEO-011": "Map frontend, backend, API, CMS, edge, CDN, and external-service ownership",
    "SEO-012": "Map monorepo workspaces, public apps, shared SEO utilities, domains, and canonical boundaries",
    "SEO-013": "Inventory public images, videos, feeds, PDFs, manifests, JSON endpoints, and generated social assets",
    "SEO-014": "Detect Next.js App Router and Pages Router metadata, route, runtime, caching, and generated-resource ownership",
    "SEO-015": "Detect React SPA, SSR, SSG, and Python Django, FastAPI, and Flask rendering and routing ownership",
    "SEO-081": "Serve a syntactically valid robots.txt at each public host root",
    "SEO-082": "Reference canonical sitemap indexes from the correct robots.txt host",
    "SEO-083": "Separate production, staging, crawler-specific, and wildcard robots policies without contradictory groups",
    "SEO-084": "Apply meta robots noindex, index, nofollow, and follow directives intentionally",
    "SEO-085": "Apply X-Robots-Tag to HTML or non-HTML responses that require header-level control",
    "SEO-086": "Use rel nofollow, ugc, and sponsored on links according to trust and compensation policy",
    "SEO-087": "Set max-image-preview deliberately, including large previews required by the Discover image strategy",
    "SEO-088": "Set max-snippet deliberately and preserve useful search previews",
    "SEO-089": "Set max-video-preview deliberately for pages with indexable video",
    "SEO-090": "Implement nosnippet and data-nosnippet without hiding required visible or structured content",
    "SEO-091": "Evaluate noarchive, notranslate, and unavailable_after only where supported and justified",
    "SEO-092": "Use indexifembedded only for eligible embedded content with an intentional noindex policy",
    "SEO-093": "Keep Googlebot, image, news, video, Bingbot, and approved AI crawler policies purpose-specific",
    "SEO-094": "Resolve robots.txt, meta robots, X-Robots-Tag, canonical, and sitemap precedence conflicts",
    "SEO-095": "Keep CSS, JavaScript, images, video, and other rendering resources crawlable when public pages depend on them",
    "SEO-096": "Monitor, version, parse-test, and roll back crawler directive changes",
    "SEO-129": "Prepare the correct Google Search Console property and DNS or file verification as a manual action",
    "SEO-130": "Verify Google Search crawl, index, snippet, image, video, news, and Lens-related eligibility prerequisites",
    "SEO-134": "Use URL Inspection and production-equivalent rendering for representative canonical URLs",
    "SEO-135": "Review Page indexing classifications, crawl stats, soft 404s, and duplicate canonical decisions",
    "SEO-136": "Review enhancements and rich-result reports without equating Schema.org validity with Google eligibility",
    "SEO-137": "Review Google manual actions and security issues through authorized evidence",
    "SEO-138": "Review HTTPS and Core Web Vitals reports and preserve verification across deployments",
    "SEO-139": "Use Search Console exports and APIs only with authorized credentials, rate limits, retries, and failure isolation",
    "SEO-141": "Analyze Search Console clicks, impressions, CTR, position, and query trends by page and search type",
    "SEO-142": "Analyze Discover, image, video, and news reporting only when those Search Console reports are available",
    "SEO-144": "Automate authorized Search Console monitoring without claiming external account setup or coverage",
    "SEO-145": "Prepare Bing Webmaster Tools site verification and sitemap submission as evidenced manual actions",
    "SEO-146": "Verify Bingbot access, crawl controls, URL inspection, indexing, and crawl-error diagnostics",
    "SEO-147": "Host the IndexNow key correctly and use the documented endpoint and keyLocation rules",
    "SEO-148": "Submit only canonical public URLs and exclude private, blocked, redirected, and noindex URLs from IndexNow",
    "SEO-149": "Submit IndexNow additions, material updates, and deletions from the authoritative publish lifecycle",
    "SEO-150": "Batch and rate-limit IndexNow submissions within current protocol and endpoint limits",
    "SEO-151": "Run IndexNow asynchronously with bounded retries, timeout handling, and per-URL failure isolation",
    "SEO-152": "Protect IndexNow submission credentials while exposing only the required public verification key",
    "SEO-154": "Review Bing URL Inspection, Site Scan, SEO reports, backlinks, search performance, and crawl diagnostics",
    "SEO-155": "Deduplicate IndexNow events idempotently and log request, response, retry, and exclusion outcomes",
    "SEO-156": "Integrate IndexNow with CMS, ecommerce, deployment, and deletion events without blocking page rendering",
    "SEO-157": "Monitor IndexNow delivery without treating it as indexing proof or an XML sitemap replacement",
    "SEO-158": "Use Bing Webmaster APIs only with authorized credentials, rate limits, retries, and failure isolation",
    "SEO-159": "Review Bing Copilot, AI Performance, and AI visibility reporting only where the authorized product exposes it",
    "SEO-160": "Assess Yahoo, DuckDuckGo, Brave, and other downstream search surfaces without unsupported submission claims",
    "SEO-165": "Target only currently supported Google structured-data features and satisfy page-specific eligibility requirements",
    "SEO-166": "Record current Bing structured-data support separately from Schema.org and Google support",
    "SEO-170": "Test Schema.org validity, Google rich-result eligibility, Bing support, visible-content parity, and rendered JSON-LD",
    "SEO-171": "Classify every schema use as Schema.org validity, Google eligibility, Bing support, search usefulness, and AI relevance",
    "SEO-172": "Model Article, NewsArticle, CreativeWork, SoftwareApplication, WebApplication, and other truthful page entities without markup spam",
    "SEO-174": "Do not use unsupported rich-result schema merely because a type is valid in Schema.org",
    "SEO-177": "Define stable absolute @id values for WebSite and canonical site identity",
    "SEO-178": "Define truthful Person or Organization publisher entities and connect brand ownership",
    "SEO-179": "Connect WebPage to WebSite with isPartOf and to canonical URL and primary entities",
    "SEO-180": "Implement WebSite name and alternateName with visible, title, favicon, canonical, and entity-name consistency",
    "SEO-182": "Connect author, creator, and publisher relationships to Article and CreativeWork entities",
    "SEO-185": "Use mainEntity, mainEntityOfPage, about, and mentions to express truthful page relationships",
    "SEO-186": "Detect disconnected, duplicate, and conflicting JSON-LD entities and @id values",
    "SEO-192": "Validate a coherent graph across WebSite, WebPage, Person, Organization, Article, BreadcrumbList, ImageObject, VideoObject, and eligible SearchAction",
    "SEO-194": "Provide original value, information gain, first-hand evidence, or useful synthesis without fabricated expertise",
    "SEO-198": "Use semantic headings, concise passages, definitions, tables, lists, and question-answer sections where natural",
    "SEO-199": "Identify truthful authors, publishers, experience, expertise, and responsibility where relevant",
    "SEO-200": "Publish accurate created and modified dates and prevent fake freshness",
    "SEO-202": "Prune or consolidate thin, duplicate, cannibalizing, and obsolete content with safe lifecycle handling",
    "SEO-203": "Create retrieval-friendly answer passages with stable headings, entity context, dates, and source attribution",
    "SEO-204": "Map search intent, queries, topics, entities, content clusters, and contextual internal links without doorway pages",
    "SEO-205": "Implement only technically actionable off-page signals such as attribution, syndication canonicals, sponsored links, and link reclamation",
    "SEO-207": "Apply programmatic and enterprise SEO quality gates to templates, inventories, variants, and large-scale publishing",
    "SEO-208": "Detect keyword stuffing, unnatural headings or anchors, fake facts or reviews, schema spam, cloaking, scaled abuse, and reputation abuse",
    "SEO-227": "Declare intrinsic image dimensions and appropriate aspect ratios to prevent layout shift and bad crops",
    "SEO-228": "Serve responsive images with srcset and sizes or the framework-equivalent such as next/image",
    "SEO-229": "Choose WebP, AVIF, or another supported image format according to content and browser delivery needs",
    "SEO-230": "Compress and cache images through the origin or CDN without stripping required rights metadata",
    "SEO-231": "Lazy-load below-the-fold images while excluding likely LCP and explicitly prioritized images",
    "SEO-233": "Use stable descriptive filenames, captions, nearby context, and accessible image relationships",
    "SEO-234": "Keep important images crawlable for Google Images and Lens-related discovery without exposing private media",
    "SEO-235": "Publish truthful image licensing metadata: ImageObject creditText, creator, copyrightNotice, license, and acquireLicensePage data when available",
    "SEO-237": "Preserve or intentionally manage EXIF, IPTC, XMP, creator, credit, copyright, and licensing metadata",
    "SEO-240": "Monitor Google Images, Discover image performance, preview controls, and licensing eligibility without guarantees",
    "SEO-241": "Publish a truthful VideoObject name and description aligned with visible video content",
    "SEO-242": "Publish crawlable representative thumbnails, poster images, and thumbnail metadata",
    "SEO-243": "Publish accurate uploadDate, duration, contentUrl, embedUrl, and player URL values when applicable",
    "SEO-244": "Provide synchronized captions, subtitles, and accessible controls for spoken or meaningful video",
    "SEO-245": "Provide a crawlable transcript and connect it to the primary video page",
    "SEO-246": "Provide chapters, clips, or key moments only when timestamps and labels are accurate",
    "SEO-247": "Keep the primary video visibly prominent on a dedicated indexable watch or content page",
    "SEO-248": "Keep VideoObject, visible page facts, player configuration, and video sitemap data consistent",
    "SEO-249": "Configure poster, preload, lazy loading, autoplay, and muted autoplay for usable mobile playback",
    "SEO-250": "Keep JavaScript players, iframe embeds, YouTube, Vimeo, and self-hosted resources crawlable as intended",
    "SEO-251": "Generate valid video sitemap entries with canonical page, thumbnail, title, description, and player or content URLs",
    "SEO-252": "Deliver self-hosted video through suitable CDN, codec, resolution, bandwidth, and aspect-ratio variants",
    "SEO-253": "Protect Core Web Vitals and mobile behavior when loading video players and media",
    "SEO-254": "Test Google video eligibility, rendered player visibility, thumbnail access, and video indexing prerequisites",
    "SEO-255": "Handle live, expired, removed, replaced, and third-party video lifecycle states",
    "SEO-256": "Monitor video Search, video pages in Discover where applicable, accessibility, privacy, and embed regressions",
    "SEO-257": "Confirm Discover eligibility prerequisites without implying inclusion can be forced",
    "SEO-258": "Use accurate, compelling, non-clickbait headlines and preview text without withheld context",
    "SEO-259": "Publish original, helpful, policy-compliant editorial content with clear topical relevance",
    "SEO-260": "Avoid intrusive interstitials, deceptive ads, and layouts that obstruct primary content",
    "SEO-261": "Provide crawlable representative images at least 1200 pixels wide when the Discover strategy requires large previews",
    "SEO-262": "Allow max-image-preview:large when approved and keep image dimensions, aspect ratios, alt text, and crops suitable",
    "SEO-263": "Show consistent publisher, site, and truthful author identity on Discover-targeted content",
    "SEO-264": "Use accurate freshness, publication, and modification signals without cosmetic date changes",
    "SEO-266": "Keep Discover-targeted pages fast, mobile-friendly, accessible, and strong on Core Web Vitals",
    "SEO-269": "Analyze Search Console Discover reporting, traffic, pages, countries, and dates only when the report exists",
    "SEO-271": "Monitor Discover content policies, manual actions, ad experience, and sensitive-topic risks",
    "SEO-273": "Provide concise direct answers and definitions while preserving complete user-oriented context",
    "SEO-274": "Use consistent explicit entity names, relationships, identifiers, dates, and terminology",
    "SEO-275": "Keep factual claims, statistics, citations, and source attribution accurate and current",
    "SEO-276": "Expose canonical content in semantic, accessible, server-readable HTML with stable URLs",
    "SEO-277": "Structure retrieval-friendly sections, comparisons, steps, tables, lists, and FAQs only where natural",
    "SEO-280": "Publish truthful author, publisher, creator, correction, and provenance signals",
    "SEO-282": "Use stable descriptive headings and fragments for passage-level discovery and citation",
    "SEO-283": "Provide machine-readable summaries and metadata without robotic AI-only duplicate text",
    "SEO-284": "Classify AEO, GEO, LEO, LLMO, MEO, VEO, AISEO, GAIO, AAIO, AIO, AXO, SXO, and XEO without presenting industry terms as ranking factors",
    "SEO-285": "Audit citation readiness, evidence quality, knowledge-graph clarity, and source transparency",
    "SEO-287": "Test AI answer extraction and passage interpretation while recording output as experimental evidence",
    "SEO-289": "Maintain a crawler matrix that separates search indexing, AI retrieval, AI training, user-triggered fetching, and preview generation",
    "SEO-290": "Define purpose-specific policies for Googlebot, Googlebot-Image, Googlebot-News, and Googlebot-Video",
    "SEO-291": "Define Google-Extended policy separately from Google Search indexing controls",
    "SEO-292": "Define Bingbot and other documented Microsoft crawler policies separately from Bing AI reporting",
    "SEO-293": "Define GPTBot policy for model-training access without conflating it with OpenAI search",
    "SEO-294": "Define OAI-SearchBot policy for search discovery according to current OpenAI documentation",
    "SEO-295": "Define ChatGPT-User policy for user-triggered fetching according to current OpenAI documentation",
    "SEO-296": "Define ClaudeBot and other documented Anthropic crawler policies by stated purpose",
    "SEO-297": "Define PerplexityBot policy according to current operator documentation and business goals",
    "SEO-298": "Define Amazonbot and Applebot policies according to their documented purposes",
    "SEO-299": "Define Bytespider and documented Meta crawler policies with legal, training, search, and security review",
    "SEO-300": "Keep private and authenticated content protected regardless of robots.txt or crawler identity",
    "SEO-301": "Align crawler policy with licensing, terms, copyright, attribution, and business implications",
    "SEO-302": "Align robots.txt, CDN, WAF, rate limits, challenge behavior, and recommended crawler policy",
    "SEO-303": "Verify crawler access through CDN and origin without trusting spoofable user-agent strings alone",
    "SEO-304": "Monitor crawler identities, logs, policy changes, security implications, and retired user-agent tokens",
    "SEO-311": "Consider llms-full.txt only when justified, maintainable, public, and supported by current ecosystem evidence",
    "SEO-331": "Measure LCP, INP, CLS, TTFB, FCP, and Speed Index in appropriate field and lab contexts",
    "SEO-332": "Set budgets for JavaScript bundles, hydration, long tasks, main-thread work, fonts, images, video, and third parties",
    "SEO-333": "Audit preload, preconnect, DNS, TLS, HTTP/2, HTTP/3, Brotli, gzip, CDN, edge, streaming, and server-rendering tradeoffs",
    "SEO-335": "Profile WebGL, Three.js, React Three Fiber, GSAP, ScrollTrigger, Lenis, GLB, textures, animation, memory, and mobile cost when present",
    "SEO-341": "Use ETag and If-None-Match validators where stable, correct, and beneficial",
    "SEO-342": "Use Last-Modified and If-Modified-Since only when timestamps are accurate",
    "SEO-343": "Return correct 304 responses without bodies or lost cache metadata",
    "SEO-344": "Configure stale-while-revalidate and stale-if-error intentionally across browser, CDN, and origin layers",
    "SEO-347": "Distinguish public, private, personalized, and authenticated cache behavior and prevent cache poisoning",
    "SEO-353": "Avoid unnecessary unload and beforeunload handlers that block BFCache",
    "SEO-354": "Use pageshow and pagehide, including persisted state, for BFCache-safe lifecycle handling",
    "SEO-355": "Restore scroll, form, SPA navigation, and browser-history state safely after BFCache navigation",
    "SEO-357": "Suspend or restore WebSocket, realtime, WebGL, and other incompatible resources safely",
    "SEO-362": "Test BFCache on mobile and desktop and document actual blockers rather than adding claim-only code",
    "SEO-369": "Use semantic HTML, landmarks, headings, accessible names, and robust ARIA only where needed",
    "SEO-370": "Provide complete keyboard access and alternatives to dragging interactions",
    "SEO-371": "Meet WCAG 2.2 AA focus appearance and focus-not-obscured requirements",
    "SEO-373": "Provide labels, accessible authentication, error identification, suggestions, and redundant-entry support",
    "SEO-374": "Meet applicable contrast, text spacing, reflow, zoom, and target-size requirements",
    "SEO-375": "Respect reduced motion and keep animation, video, and 3D experiences operable",
    "SEO-376": "Test screen readers, dialogs, modals, status messages, forms, and dynamic content on critical journeys",
    "SEO-383": "Separate SEO, accessibility, and UX findings while documenting meaningful overlap",
    "SEO-389": "Detect hacked pages, pharmaceutical spam, Japanese keyword hacks, doorway injection, hidden links, and injected structured data",
    "SEO-390": "Apply HTTPS, HSTS, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and secure cookies safely",
    "SEO-394": "Prevent user-controlled content from injecting metadata, canonicals, hreflang, robots directives, sitemaps, or JSON-LD",
    "SEO-395": "Detect cloaking, malicious redirects, malware, phishing, compromised sitemaps, robots, canonicals, and hreflang",
    "SEO-396": "Protect against XSS, SSRF, host-header attacks, open redirects, cache poisoning, and exposed public admin or API surfaces",
    "SEO-417": "Keep category, product, variant, filter, sort, faceted, and pagination URLs crawlable only according to catalog policy",
    "SEO-418": "Keep visible price, currency, availability, condition, shipping, and returns accurate",
    "SEO-419": "Publish eligible Product and Offer structured data with genuine Review or AggregateRating only when visible and authentic",
    "SEO-420": "Publish valid GTIN, MPN, brand, SKU, and variant identifiers when they genuinely exist",
    "SEO-421": "Provide compliant product images, image metadata, videos, and canonical product URLs",
    "SEO-422": "Keep product variants consistent across canonical URLs, structured data, feeds, and landing pages",
    "SEO-423": "Handle out-of-stock, discontinued, temporary, replaced, and removed products intentionally",
    "SEO-424": "Publish accurate shipping and return policies in pages, structured data, and feeds where supported",
    "SEO-426": "Prepare Google Merchant Center verification, diagnostics, free listings, and shopping-surface ownership as manual actions",
    "SEO-427": "Generate primary and supplemental product feeds with canonical URLs and current catalog facts",
    "SEO-430": "Validate structured-data, primary-feed, supplemental-feed, page, price, and inventory parity at scale",
    "SEO-431": "Monitor Merchant Center diagnostics, disapprovals, feed freshness, image issues, and stale inventory",
    "SEO-439": "Prepare Google Business Profile and Bing Places ownership and verification as evidenced manual actions",
    "SEO-450": "Choose stable language or country URLs using subdirectories, subdomains, or ccTLDs with documented tradeoffs",
    "SEO-454": "Translate visible content, titles, descriptions, Open Graph, structured data, feeds, and sitemap alternates",
    "SEO-455": "Avoid IP, browser-language, or cookie redirects that prevent crawlers or users reaching locale URLs",
    "SEO-461": "Localize currency, dates, phone formats, addresses, legal facts, and business data consistently",
    "SEO-465": "Define indexability thresholds for comments, forums, profiles, reviews, ratings, and other UGC pages",
    "SEO-466": "Moderate spam, fake reviews, automated spam, AI-generated spam, malware, and reputation abuse",
    "SEO-467": "Mark untrusted, ugc, nofollow, and sponsored outbound links according to policy",
    "SEO-474": "Prevent UGC from injecting metadata, canonicals, robots directives, links, or structured data",
    "SEO-475": "Use DiscussionForumPosting, QAPage, ProfilePage, Review, and rating schema only when eligible and truthful",
    "SEO-481": "Define crawl, index, canonical, sitemap, and snippet policy for paywalled, metered, login-walled, and subscription content",
    "SEO-482": "Expose a truthful lead-in or public preview without leaking entitled content",
    "SEO-483": "Keep full content and user entitlements protected by server-side authentication and authorization",
    "SEO-484": "Implement supported paywall markup with isAccessibleForFree and accurate CSS selectors when applicable",
    "SEO-487": "Set crawler access policy without cloaking or weakening authentication",
    "SEO-493": "Audit noindex, nosnippet, max-snippet, canonical, and structured-data consistency against subscription strategy",
    "SEO-497": "Serve valid RSS, Atom, article, blog, author, or category feeds only when meaningful content justifies them",
    "SEO-498": "Add link rel=alternate feed discovery with correct MIME type and canonical feed URL",
    "SEO-500": "Publish accurate item titles, descriptions, publication dates, modified dates, and canonical URLs",
    "SEO-506": "Choose full or excerpt content with duplicate-content, licensing, and distribution policy in mind",
    "SEO-508": "Include images, media enclosures, and accessible media metadata when applicable",
    "SEO-510": "Set safe feed caching, validation, availability monitoring, and failure handling",
    "SEO-513": "Classify PDFs, DOC or DOCX, spreadsheets, downloads, and public assets as indexable, noindex, or private",
    "SEO-515": "Set filename, document title, author, language, dates, copyright, and other public document metadata accurately",
    "SEO-517": "Use X-Robots-Tag and HTTP Link canonical headers for non-HTML indexing and canonical control",
    "SEO-518": "Resolve duplicate HTML and PDF or document versions with intentional canonical and linking policy",
    "SEO-520": "Return correct status, Content-Type, Content-Disposition, caching, and security headers for documents",
    "SEO-523": "Provide accessible reading order, headings, tags, language, links, and text extraction for public documents",
    "SEO-526": "Inventory orphaned, outdated, accidentally indexed, and private documents and apply safe lifecycle handling",
    "SEO-529": "Configure GA4, Google Tag Manager, PostHog, Vercel Analytics, or equivalent measurement without duplicate analytics",
    "SEO-531": "Classify identifiable AI referral traffic transparently without overstating attribution",
    "SEO-533": "Implement consent, Consent Mode where applicable, privacy, and regional measurement choices",
    "SEO-534": "Prevent duplicate pageviews and conversions during SPA, SSR, and restored BFCache navigation",
    "SEO-540": "Segment clicks, impressions, CTR, position, Discover, image, video, shopping, country, device, and template reporting",
    "SEO-545": "Monitor uptime, HTTP status, redirects, canonical hosts, and representative public routes",
    "SEO-546": "Monitor robots.txt, XML sitemaps, RSS or Atom feeds, llms.txt, and verification resources",
    "SEO-548": "Monitor metadata, structured data, entity graphs, rich-result eligibility, and feed-to-page consistency",
    "SEO-550": "Monitor crawl errors, CDN or WAF 403, 429, 503, challenge HTML, and legitimate crawler access",
    "SEO-554": "Monitor authorized Search Console, Bing Webmaster, IndexNow, Merchant Center, analytics, CMS, image CDN, and video-provider integrations",
    "SEO-557": "Monitor content publication, freshness, sitemap, feed, IndexNow, image, video, and Merchant Center failures",
    "SEO-558": "Test external APIs for authentication, rate limits, retries, timeouts, logging, and failure isolation without blocking public rendering",
    "SEO-601": "Use Next.js metadata, generateMetadata, metadataBase, metadata files, opengraph-image, twitter-image, sitemap.ts, and robots.ts correctly",
    "SEO-602": "Test Next.js layouts, route groups, dynamic segments, generateStaticParams, loading, error, not-found, streaming, and fallback output",
    "SEO-604": "Audit Server Components, Client Components, use client boundaries, Server Actions, next/image, next/font, and search-critical content",
    "SEO-606": "Test Next.js redirects, rewrites, headers, middleware, Route Handlers, Node or Edge runtime, static export, caching, revalidation, and ISR",
    "SEO-608": "Compare SSR, SSG, SPA, hydration, client routing, virtualized content, and edge or browser rendering outputs",
    "SEO-611": "Provide clear information scent, breadcrumbs, navigation, related content, filtering, and internal search on small screens",
    "SEO-615": "Keep above-the-fold purpose, content hierarchy, visual hierarchy, and CTA clarity user-oriented",
    "SEO-617": "Support task completion, form recovery, accessible errors, and mobile authentication flows",
    "SEO-621": "Measure search intent satisfaction, interaction quality, conversions, and internal-search outcomes",
    "SEO-624": "Regression-test mobile usability, accessibility, 404 recovery, intrusive UI, and critical journeys on representative devices",
}

AI_TERMS = ["AEO", "GEO", "LEO", "LLMO", "MEO", "VEO", "AISEO", "GAIO", "AAIO", "AIO", "AXO", "SXO", "XEO"]

SEARCH_SURFACES = [
    "GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "GOOGLE_NEWS",
    "GOOGLE_SHOPPING", "BING_SEARCH", "BING_COPILOT", "BING_AI_PERFORMANCE", "AI_SEARCH",
    "LLM_RETRIEVAL", "LOCAL_SEARCH", "SOCIAL_PREVIEW",
]

DOMAIN_SURFACES = {
    "architecture": SEARCH_SURFACES,
    "urls": ["GOOGLE_SEARCH", "BING_SEARCH", "AI_SEARCH", "LLM_RETRIEVAL", "LOCAL_SEARCH", "SOCIAL_PREVIEW"],
    "metadata": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_NEWS", "BING_SEARCH", "AI_SEARCH", "SOCIAL_PREVIEW"],
    "canonicals": ["GOOGLE_SEARCH", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "GOOGLE_NEWS", "GOOGLE_SHOPPING", "BING_SEARCH", "AI_SEARCH", "LLM_RETRIEVAL"],
    "crawling": ["GOOGLE_SEARCH", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "GOOGLE_NEWS", "GOOGLE_SHOPPING", "BING_SEARCH", "BING_COPILOT", "AI_SEARCH", "LLM_RETRIEVAL"],
    "robots": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "GOOGLE_NEWS", "BING_SEARCH", "BING_COPILOT", "AI_SEARCH", "LLM_RETRIEVAL"],
    "indexing": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "GOOGLE_NEWS", "GOOGLE_SHOPPING", "BING_SEARCH", "AI_SEARCH"],
    "sitemaps": ["GOOGLE_SEARCH", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "GOOGLE_NEWS", "GOOGLE_SHOPPING", "BING_SEARCH"],
    "google-search": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "GOOGLE_NEWS"],
    "bing-indexnow": ["BING_SEARCH", "BING_COPILOT", "BING_AI_PERFORMANCE"],
    "structured-data": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "GOOGLE_NEWS", "GOOGLE_SHOPPING", "BING_SEARCH", "AI_SEARCH", "LLM_RETRIEVAL", "LOCAL_SEARCH"],
    "entity": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_NEWS", "GOOGLE_SHOPPING", "BING_SEARCH", "BING_COPILOT", "AI_SEARCH", "LLM_RETRIEVAL", "LOCAL_SEARCH"],
    "content": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "GOOGLE_NEWS", "BING_SEARCH", "BING_COPILOT", "AI_SEARCH", "LLM_RETRIEVAL", "LOCAL_SEARCH"],
    "internal-linking": ["GOOGLE_SEARCH", "BING_SEARCH", "AI_SEARCH", "LLM_RETRIEVAL", "LOCAL_SEARCH"],
    "images": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_IMAGES", "GOOGLE_NEWS", "GOOGLE_SHOPPING", "BING_SEARCH", "AI_SEARCH", "SOCIAL_PREVIEW"],
    "video": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_VIDEO", "GOOGLE_NEWS", "BING_SEARCH", "AI_SEARCH", "SOCIAL_PREVIEW"],
    "discover": ["GOOGLE_DISCOVER", "GOOGLE_IMAGES", "GOOGLE_NEWS"],
    "ai-search": ["BING_COPILOT", "BING_AI_PERFORMANCE", "AI_SEARCH", "LLM_RETRIEVAL"],
    "ai-crawlers": ["GOOGLE_SEARCH", "BING_SEARCH", "BING_COPILOT", "AI_SEARCH", "LLM_RETRIEVAL"],
    "llms-txt": ["AI_SEARCH", "LLM_RETRIEVAL"],
    "performance": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "BING_SEARCH", "AI_SEARCH", "LOCAL_SEARCH"],
    "caching": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "BING_SEARCH", "AI_SEARCH", "LLM_RETRIEVAL"],
    "bfcache": ["GOOGLE_SEARCH", "BING_SEARCH"],
    "accessibility": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "BING_SEARCH", "AI_SEARCH", "LLM_RETRIEVAL", "LOCAL_SEARCH"],
    "security": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "GOOGLE_NEWS", "GOOGLE_SHOPPING", "BING_SEARCH", "AI_SEARCH", "LLM_RETRIEVAL", "LOCAL_SEARCH"],
    "cdn-waf": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "GOOGLE_NEWS", "GOOGLE_SHOPPING", "BING_SEARCH", "BING_COPILOT", "AI_SEARCH", "LLM_RETRIEVAL"],
    "ecommerce": ["GOOGLE_SEARCH", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "GOOGLE_SHOPPING", "BING_SEARCH", "AI_SEARCH"],
    "local": ["GOOGLE_SEARCH", "BING_SEARCH", "AI_SEARCH", "LOCAL_SEARCH"],
    "international": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "GOOGLE_NEWS", "GOOGLE_SHOPPING", "BING_SEARCH", "AI_SEARCH", "LOCAL_SEARCH"],
    "ugc": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "BING_SEARCH", "AI_SEARCH", "LLM_RETRIEVAL"],
    "paywall": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_NEWS", "BING_SEARCH", "AI_SEARCH", "LLM_RETRIEVAL"],
    "feeds": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_NEWS", "BING_SEARCH", "AI_SEARCH", "LLM_RETRIEVAL"],
    "pdf": ["GOOGLE_SEARCH", "BING_SEARCH", "AI_SEARCH", "LLM_RETRIEVAL"],
    "analytics": SEARCH_SURFACES,
    "monitoring": SEARCH_SURFACES,
    "testing": SEARCH_SURFACES,
    "social-preview": ["SOCIAL_PREVIEW"],
    "javascript-rendering": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "GOOGLE_IMAGES", "GOOGLE_VIDEO", "BING_SEARCH", "BING_COPILOT", "AI_SEARCH", "LLM_RETRIEVAL"],
    "mobile-ux": ["GOOGLE_SEARCH", "GOOGLE_DISCOVER", "BING_SEARCH", "AI_SEARCH", "LOCAL_SEARCH"],
    "privacy-auth": SEARCH_SURFACES,
}

OFFICIAL_SOURCES = {
    "google-search": ["https://developers.google.com/search/docs", "https://search.google.com/search-console/about"],
    "discover": ["https://developers.google.com/search/docs/appearance/google-discover"],
    "bing-indexnow": ["https://www.bing.com/webmasters/about", "https://www.indexnow.org/documentation"],
    "structured-data": ["https://schema.org/docs/documents.html", "https://developers.google.com/search/docs/appearance/structured-data/search-gallery"],
    "entity": ["https://schema.org/docs/documents.html", "https://developers.google.com/search/docs/appearance/site-names"],
    "robots": ["https://developers.google.com/search/docs/crawling-indexing/robots-meta-tag", "https://www.rfc-editor.org/rfc/rfc9309"],
    "ai-crawlers": ["https://platform.openai.com/docs/bots", "https://developers.google.com/search/docs/crawling-indexing/overview-google-crawlers"],
    "llms-txt": ["https://llmstxt.org/"],
    "accessibility": ["https://www.w3.org/TR/WCAG22/"],
    "performance": ["https://web.dev/vitals/"],
    "bfcache": ["https://web.dev/articles/bfcache"],
    "ecommerce": ["https://support.google.com/merchants/", "https://developers.google.com/search/docs/appearance/structured-data/product"],
    "international": ["https://developers.google.com/search/docs/specialty/international/localized-versions"],
}

EVIDENCE_TYPES = [
    "FILE", "LINE", "ROUTE", "HTTP_RESPONSE", "HTML", "HEADER", "JSON_LD", "SITEMAP",
    "ROBOTS", "BROWSER", "BUILD", "LINT", "TYPECHECK", "PERFORMANCE", "ACCESSIBILITY",
    "EXTERNAL_PLATFORM", "MANUAL_ACTION",
]

ALLOWED_STATUSES = [
    "APPLICABLE", "NOT_APPLICABLE", "BLOCKED", "ALREADY_CORRECT", "IMPLEMENTED", "FIXED",
    "FAILED", "NEEDS_MANUAL_ACTION",
]


def search_surface_matrix(domain: str) -> dict[str, str]:
    relevant = set(DOMAIN_SURFACES.get(domain, []))
    return {surface: "RELEVANT" if surface in relevant else "NOT_RELEVANT" for surface in SEARCH_SURFACES}


def requirement_type(requirement_id: str, domain: str) -> str:
    if requirement_id == "SEO-284":
        return "INDUSTRY_TERMINOLOGY"
    if domain == "llms-txt":
        return "EMERGING_MACHINE_GUIDANCE"
    if domain == "ai-search":
        return "AI_RETRIEVAL_BEST_PRACTICE"
    if domain in {"google-search", "bing-indexnow", "discover"}:
        return "PLATFORM_REQUIREMENT_OR_ELIGIBILITY"
    return "TECHNICAL_BEST_PRACTICE"


def platform_status(requirement_id: str, domain: str) -> str:
    if requirement_id == "SEO-284":
        return "INDUSTRY_TERM"
    if domain == "llms-txt":
        return "EMERGING_PRACTICE"
    if domain in {"google-search", "bing-indexnow", "discover"}:
        return "OFFICIAL_PLATFORM_CONCEPT"
    return "ESTABLISHED_PRACTICE"


def source_classification(requirement_id: str, domain: str) -> str:
    if requirement_id == "SEO-284":
        return "INDUSTRY_TERMINOLOGY"
    if domain == "llms-txt":
        return "EMERGING_EXTERNAL_SPECIFICATION"
    if domain in OFFICIAL_SOURCES:
        return "OFFICIAL_DOCUMENTATION_OR_STANDARD"
    return "ESTABLISHED_TECHNICAL_PRACTICE"


def verification_for(domain: str, title: str) -> str:
    if domain in {"google-search", "bing-indexnow", "discover", "ecommerce", "analytics", "monitoring"}:
        return (
            f"Inspect repository readiness for '{title}', then verify any external state only through authorized "
            "platform output or record NEEDS_MANUAL_ACTION. Capture local files/routes plus platform evidence; do not infer setup."
        )
    if domain in {"robots", "canonicals", "crawling", "indexing", "sitemaps", "caching", "cdn-waf", "pdf"}:
        return (
            f"Request representative applicable URLs and resources, inspect raw status, redirects, headers, and body, "
            f"and confirm '{title}' at both origin and edge when applicable. Record exact HTTP evidence and conflicts."
        )
    if domain in {"structured-data", "entity"}:
        return (
            f"Inspect rendered JSON-LD and visible content on representative templates; validate syntax, graph identity, "
            f"platform eligibility, and factual parity for '{title}'. Record JSON_LD, HTML, route, and validator evidence."
        )
    if domain == "accessibility":
        return (
            f"Inspect semantic output and test representative critical journeys with keyboard, browser accessibility tools, "
            f"and assistive technology as appropriate for '{title}'. Record scope and avoid unsupported conformance claims."
        )
    return (
        f"Inspect the authoritative implementation owner and representative applicable routes, then verify rendered, HTTP, "
        f"browser, generated, or repository output proves '{title}'. Record exact evidence and any NOT_APPLICABLE condition."
    )


def id_list(start: int, end: int) -> list[str]:
    return [f"SEO-{number:03d}" for number in range(start, end + 1)]


def coverage_areas() -> list[dict]:
    """Map every requested audit area to concrete stable requirements."""
    area_ids = {
        "SEO": id_list(17, 224),
        "Technical SEO": id_list(17, 176),
        "On-page SEO": id_list(33, 48) + id_list(177, 224),
        "Technically actionable off-page SEO": ["SEO-205", "SEO-467"],
        "Programmatic SEO": ["SEO-027", "SEO-202", "SEO-207", "SEO-208"],
        "Enterprise SEO": ["SEO-008", "SEO-012", "SEO-124", "SEO-207", "SEO-555"],
        "JavaScript and rendering SEO": id_list(593, 608),
        "Mobile SEO and SXO": id_list(609, 624),
        "Image SEO": id_list(225, 240),
        "Video SEO": id_list(241, 256),
        "News and publisher SEO": ["SEO-142", "SEO-172", "SEO-257", "SEO-259", "SEO-263", "SEO-264", "SEO-271", "SEO-497", "SEO-500"],
        "Local SEO": id_list(433, 448),
        "Ecommerce SEO": id_list(417, 432),
        "International and multilingual SEO": id_list(449, 464),
        "Semantic, entity, topical, and content SEO": id_list(177, 224),
        "Search experience optimization": id_list(609, 624),
        "Google Search": id_list(129, 144),
        "Google snippets and rich results": ["SEO-033", "SEO-034", "SEO-088", "SEO-090", "SEO-136"] + id_list(161, 176),
        "Google Images": id_list(225, 240),
        "Google Videos": id_list(241, 256),
        "Google News": ["SEO-142", "SEO-172", "SEO-257", "SEO-271", "SEO-497", "SEO-500"],
        "Google Discover": id_list(257, 272),
        "Google Lens": ["SEO-228", "SEO-233", "SEO-234", "SEO-240"],
        "Google Shopping": id_list(417, 432),
        "Google Merchant Center": ["SEO-418", "SEO-419", "SEO-420", "SEO-421", "SEO-422", "SEO-424", "SEO-426", "SEO-427", "SEO-430", "SEO-431"],
        "Google Business Profile": ["SEO-433", "SEO-434", "SEO-439", "SEO-448"],
        "Google Search Console": id_list(129, 144),
        "Bing Search and Webmaster Tools": id_list(145, 160),
        "Bing Copilot": ["SEO-159", "SEO-273", "SEO-275", "SEO-280", "SEO-285"],
        "Bing AI Performance": ["SEO-159", "SEO-286", "SEO-540", "SEO-554"],
        "Yahoo, DuckDuckGo, and Brave": ["SEO-160"],
        "AEO": ["SEO-273", "SEO-277", "SEO-284", "SEO-287"],
        "GEO": ["SEO-274", "SEO-275", "SEO-284", "SEO-285"],
        "LEO": ["SEO-274", "SEO-276", "SEO-284", "SEO-285"],
        "LLMO": ["SEO-273", "SEO-276", "SEO-282", "SEO-283", "SEO-284"],
        "MEO": ["SEO-274", "SEO-283", "SEO-284"],
        "VEO": ["SEO-241", "SEO-244", "SEO-245", "SEO-284"],
        "AISEO": ["SEO-273", "SEO-276", "SEO-284", "SEO-285"],
        "GAIO": ["SEO-273", "SEO-275", "SEO-284", "SEO-285"],
        "AAIO": ["SEO-273", "SEO-277", "SEO-284", "SEO-287"],
        "AIO": ["SEO-273", "SEO-276", "SEO-283", "SEO-284"],
        "AXO": ["SEO-273", "SEO-277", "SEO-284", "SEO-287"],
        "SXO": ["SEO-284"] + id_list(609, 624),
        "XEO": ["SEO-273", "SEO-284"] + id_list(609, 624),
        "AI-readable and retrieval-friendly content": id_list(273, 288),
        "AI crawler policy": id_list(289, 304),
        "llms.txt and optional llms-full.txt": id_list(305, 320),
        "Modern robots and snippet controls": id_list(81, 96),
        "Indexing and crawling": id_list(65, 128),
        "IndexNow": ["SEO-147", "SEO-148", "SEO-149", "SEO-150", "SEO-151", "SEO-152", "SEO-155", "SEO-156", "SEO-157", "SEO-158"],
        "Schema.org versus search-engine eligibility": id_list(161, 176),
        "Entity @id graph architecture": id_list(177, 192),
        "Site-name optimization": ["SEO-177", "SEO-178", "SEO-179", "SEO-180", "SEO-181", "SEO-186"],
        "Image licensing": ["SEO-235", "SEO-237", "SEO-240"],
        "Deep video SEO": id_list(241, 256),
        "RSS and Atom": id_list(497, 512),
        "PDF and non-HTML SEO": id_list(513, 528),
        "Paywall and subscription SEO": id_list(481, 496),
        "UGC and community SEO": id_list(465, 480),
        "CDN, WAF, and bot protection": id_list(401, 416),
        "HTTP freshness, ETag, and cache validation": id_list(337, 352),
        "BFCache and navigation performance": id_list(353, 368),
        "WCAG 2.2 AA accessibility": id_list(369, 384),
        "Security and hacked-site SEO": id_list(385, 400),
        "International validation": id_list(449, 464),
        "Anti-overoptimization": ["SEO-131", "SEO-194", "SEO-200", "SEO-202", "SEO-205", "SEO-207", "SEO-208", "SEO-389", "SEO-395", "SEO-477"],
        "Search-friendly architecture": id_list(1, 16) + id_list(593, 608),
        "Next.js": ["SEO-014", "SEO-601", "SEO-602", "SEO-604", "SEO-606"],
        "React and SPA": ["SEO-015"] + id_list(593, 608),
        "Python, Django, FastAPI, and Flask": ["SEO-002", "SEO-005", "SEO-015", "SEO-601"],
        "Monorepos and Turborepo": ["SEO-001", "SEO-008", "SEO-012", "SEO-124", "SEO-188", "SEO-633"],
        "Monitoring and observability": id_list(545, 560),
        "External service and API monitoring": ["SEO-139", "SEO-144", "SEO-158", "SEO-431", "SEO-554", "SEO-558"],
        "Non-HTML resource discovery": ["SEO-013", "SEO-085", "SEO-121", "SEO-122", "SEO-236", "SEO-251"] + id_list(497, 528),
        "Technical performance and 3D/WebGL": id_list(321, 368),
        "Security and SEO intersection": id_list(385, 416) + id_list(625, 640),
        "Analytics and measurement": id_list(529, 544),
        "Legal, trust, and content integrity": ["SEO-178", "SEO-183", "SEO-194", "SEO-199", "SEO-201", "SEO-205", "SEO-235", "SEO-280", "SEO-301", "SEO-428", "SEO-466", "SEO-472"],
        "Applicability and Auto mode": ["SEO-004", "SEO-016"] + id_list(561, 576),
        "Status and evidence model": id_list(561, 576),
        "Search Surface Matrix": id_list(1, 640),
        "Lazy loading and subagent orchestration": ["SEO-001", "SEO-006", "SEO-008", "SEO-011", "SEO-012", "SEO-016"],
    }
    notes = {
        "AEO": "Industry term mapped to answer clarity and extraction practices; not represented as an official ranking factor.",
        "GEO": "Industry term mapped to factual, entity, provenance, and citation readiness; no citation guarantee.",
        "LEO": "Industry term retained and classified; tactics reduce to established machine-readable content practices.",
        "LLMO": "Industry term retained and classified; tactics reduce to retrieval, entity, provenance, and content clarity.",
        "MEO": "Ambiguous industry term retained for compatibility and explicitly denied official-factor status.",
        "VEO": "Industry term retained for voice/video-engine usage and tied only to applicable accessible media/content practices.",
        "AISEO": "Industry term retained and classified; no independent platform guarantee.",
        "GAIO": "Industry term retained and classified; no independent platform guarantee.",
        "AAIO": "Industry term retained and classified; no independent platform guarantee.",
        "AIO": "Industry term retained and classified; no independent platform guarantee.",
        "AXO": "Industry term retained and classified; no independent platform guarantee.",
        "SXO": "Established search-experience practice spanning intent, accessibility, usability, and performance.",
        "XEO": "Umbrella industry term mapped to user and answer experience practices.",
        "Search Surface Matrix": "Every registry record contains all matrix cells with RELEVANT, NOT_RELEVANT, or UNKNOWN.",
    }
    return [
        {
            "area": area,
            "status": "COMPLETE",
            "requirement_ids": requirement_ids,
            "notes": notes.get(area, "Concrete requirements exist and remain subject to project-level applicability and evidence."),
        }
        for area, requirement_ids in area_ids.items()
    ]


def cumulative_levels(minimum: str) -> list[str]:
    return LEVELS[LEVELS.index(minimum) :]


def framework_note(domain: str) -> str:
    return (
        f"Use the detected stack adapter for {domain}; prefer native framework and platform APIs, "
        "merge with existing architecture, and never force a Next.js, React, or Django pattern onto another stack."
    )


def build() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    sequence = 1
    manifest_domains = []
    counts = {level: 0 for level in LEVELS}

    for slug, config in DOMAINS.items():
        records = []
        for minimum in LEVELS:
            for title in config["topics"][minimum]:
                requirement_id = f"SEO-{sequence:03d}"
                title = TITLE_OVERRIDES.get(requirement_id, title)
                levels = cumulative_levels(minimum)
                surfaces = search_surface_matrix(slug)
                if requirement_id == "SEO-284":
                    ai_terms = AI_TERMS
                elif slug in {"ai-search", "ai-crawlers", "llms-txt"}:
                    ai_terms = ["AI_SEARCH", "LLM_RETRIEVAL"]
                else:
                    ai_terms = []
                schema_status = (
                    "SCHEMA_VALIDITY_AND_PLATFORM_ELIGIBILITY"
                    if slug in {"structured-data", "entity", "ecommerce", "local", "video", "images", "paywall", "ugc"}
                    else "NOT_SCHEMA_REQUIREMENT"
                )
                platforms = sorted({
                    "Google" if surface.startswith("GOOGLE_") else
                    "Bing/Microsoft" if surface.startswith("BING_") else
                    "AI systems" if surface in {"AI_SEARCH", "LLM_RETRIEVAL"} else
                    "Local platforms" if surface == "LOCAL_SEARCH" else
                    "Social platforms"
                    for surface, status in surfaces.items() if status == "RELEVANT"
                })
                official_sources = OFFICIAL_SOURCES.get(slug, [])
                record = {
                    "id": requirement_id,
                    "domain": slug,
                    "title": title,
                    "description": f"Verify the concrete, independently testable control: {title}.",
                    "why_it_matters": config["why"],
                    "applicability": config["applies"],
                    "activation": config["activation"],
                    "priority": "CORE" if minimum == "LITE" else minimum,
                    "level": minimum,
                    "minimum_level": minimum,
                    "levels": levels,
                    "implementation_guidance": (
                        f"Locate the authoritative {slug} owner, establish applicability from repository evidence, and implement "
                        f"'{title}' with the smallest architecture-aligned change. Preserve privacy, security, policy, and visible-content "
                        "integrity; record NOT_APPLICABLE or BLOCKED with evidence instead of guessing."
                    ),
                    "verification_method": verification_for(slug, title),
                    "evidence_requirement": "Record one or more exact evidence types from evidence_types, with file/line, route, response, validator, platform output, or explicit blocker details.",
                    "dependencies": config["dependencies"],
                    "conflicts": config["conflicts"],
                    "framework_notes": framework_note(slug),
                    "what": title,
                    "why": config["why"],
                    "who": config["who"],
                    "when": config["when"],
                    "where": config["where"],
                    "source_classification": source_classification(requirement_id, slug),
                    "requirement_type": requirement_type(requirement_id, slug),
                    "platform_status": platform_status(requirement_id, slug),
                    "official_sources": official_sources,
                    "official_source": official_sources[0] if official_sources else "REPOSITORY_EVIDENCE_OR_CURRENT_PRIMARY_DOCUMENTATION",
                    "platforms": platforms,
                    "platform": platforms,
                    "search_surfaces": surfaces,
                    "search_surface_matrix": surfaces,
                    "ai_terms": ai_terms,
                    "concept_classification": platform_status(requirement_id, slug),
                    "schema_org_status": schema_status,
                    "google_eligibility": "CHECK_CURRENT_GOOGLE_DOCUMENTATION" if any(k in slug for k in ("structured", "google", "discover", "ecommerce", "video", "images", "local", "paywall")) else "NOT_DIRECT_FEATURE_ELIGIBILITY",
                    "bing_eligibility": "CHECK_CURRENT_BING_DOCUMENTATION" if slug in {"bing-indexnow", "structured-data", "ecommerce", "video", "images", "local"} else "NOT_DIRECT_FEATURE_ELIGIBILITY",
                    "ai_discoverability_relevance": "HIGH" if slug in {"ai-search", "ai-crawlers", "llms-txt", "entity", "content", "structured-data", "metadata", "robots", "crawling"} else "MEDIUM" if slug in {"images", "video", "feeds", "security", "performance", "international", "ugc", "paywall"} else "LOW",
                    "risk": "HIGH" if slug in {"security", "privacy-auth", "robots", "cdn-waf", "paywall", "ecommerce"} else "MEDIUM" if minimum in {"EXTRA", "ULTRA"} else "LOW",
                    "evidence_types": EVIDENCE_TYPES,
                    "allowed_statuses": ALLOWED_STATUSES,
                }
                records.append(record)
                sequence += 1
                for level in levels:
                    counts[level] += 1

        path = OUT / f"{slug}.jsonl"
        path.write_text("".join(json.dumps(record, ensure_ascii=False) + "\n" for record in records), encoding="utf-8")
        manifest_domains.append(
            {
                "domain": slug,
                "title": config["title"],
                "file": path.name,
                "activation": config["activation"],
                "count": len(records),
                "dependencies": config["dependencies"],
            }
        )

    manifest = {
        "schema_version": 2,
        "requirement_count": sequence - 1,
        "id_range": ["SEO-001", f"SEO-{sequence - 1:03d}"],
        "levels": LEVELS,
        "search_surfaces": SEARCH_SURFACES,
        "surface_values": ["RELEVANT", "NOT_RELEVANT", "UNKNOWN"],
        "evidence_types": EVIDENCE_TYPES,
        "allowed_statuses": ALLOWED_STATUSES,
        "platform_statuses": [
            "OFFICIAL_PLATFORM_CONCEPT", "ESTABLISHED_PRACTICE", "INDUSTRY_TERM",
            "EMERGING_PRACTICE", "EXPERIMENTAL",
        ],
        "level_candidate_counts": counts,
        "domains": manifest_domains,
    }
    (OUT / "manifest.json").write_text(json.dumps(manifest, indent=2) + "\n", encoding="utf-8")
    coverage = {
        "schema_version": 1,
        "allowed_statuses": [
            "PRESENT_AND_COMPLETE", "PRESENT_BUT_INCOMPLETE", "PRESENT_BUT_TOO_GENERIC",
            "DUPLICATED", "MISCLASSIFIED", "MISSING",
        ],
        "final_status_values": ["COMPLETE", "PARTIAL", "MISSING"],
        "areas": coverage_areas(),
    }
    (OUT / "coverage-map.json").write_text(json.dumps(coverage, indent=2) + "\n", encoding="utf-8")

    rows = [
        "# Requirement registry index\n",
        "The JSONL files in this directory are the authoritative registry. Load only selected domain files or use `scripts/select_requirements.py`; do not paste the full registry into agent context.\n",
        f"Total requirements: **{manifest['requirement_count']}** (`{manifest['id_range'][0]}` through `{manifest['id_range'][1]}`).\n",
        "Every record contains an explicit search-surface relevance map, platform/concept classification, evidence model, and applicability/status contract.\n",
        "| Domain | Requirements | Activation | File |\n",
        "| --- | ---: | --- | --- |\n",
    ]
    for domain in manifest_domains:
        rows.append(
            f"| {domain['title']} | {domain['count']} | `{domain['activation']}` | `{domain['file']}` |\n"
        )
    rows.extend(
        [
            "\n## Level candidate counts\n",
            "Counts are cumulative candidates before project-specific applicability decisions.\n",
            "| Level | Candidate requirements |\n",
            "| --- | ---: |\n",
        ]
    )
    for level in LEVELS:
        rows.append(f"| {level.title()} | {counts[level]} |\n")
    rows.extend(
        [
            "\n## Coverage and matrices\n",
            "- `coverage-map.json` maps requested taxonomy areas to stable requirement IDs.\n",
            "- Each JSONL record contains a complete requirement-level search-surface relevance map.\n",
            "- Use `scripts/audit_coverage.py` for duplicate, gap, taxonomy, level, domain, and surface counts.\n",
        ]
    )
    (OUT / "registry.md").write_text("".join(rows), encoding="utf-8")


if __name__ == "__main__":
    build()
