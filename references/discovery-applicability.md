# Discovery and applicability

## Discovery sequence

Inspect without modifying. Prefer one broad repository inventory over repeated searches.

1. Read repository instructions and manifests: `AGENTS.md`, package manifests, lockfiles, workspace files, Python manifests, Makefiles, framework and deployment configuration.
2. Map public apps, packages, services, routes, layouts, loaders, server actions, APIs, middleware, CMS, database, authentication, edge, CDN, WAF, and deployment.
3. Inventory search resources: metadata, canonicals, redirects, robots, sitemaps, feeds, structured data, analytics, verification files, IndexNow, `llms.txt`, images, videos, PDFs, and public documents.
4. Infer application types from code and content. Allow multiple types, such as `saas + documentation + blog` or `marketplace + ecommerce + ugc`.
5. Record unknown production-only facts as unknown. Do not infer a canonical domain, account verification, CDN behavior, or external configuration without evidence.

## Compact project profile

Use short JSON keys so the selector can consume the profile:

```json
{
  "framework": "Next.js 16 App Router",
  "language": "TypeScript",
  "runtime": "Node.js",
  "architecture": "monorepo",
  "application_types": ["saas", "documentation", "blog"],
  "public_site": true,
  "rendering": ["SSR", "SSG", "ISR"],
  "public_apps": ["apps/web"],
  "domains": ["example.com"],
  "cms": "Sanity",
  "database": "PostgreSQL",
  "deployment": "Vercel",
  "cdn": true,
  "waf": false,
  "analytics": true,
  "has_images": true,
  "has_video": false,
  "content_publication": true,
  "ecommerce": false,
  "local_business": false,
  "multilingual": false,
  "language_count": 1,
  "ugc": false,
  "paywall": false,
  "public_documents": true,
  "authentication": "admin only",
  "unknowns": ["production WAF rules", "Search Console ownership"]
}
```

Add selector-friendly aliases when applicable: `javascript_app`, `interactive_app`, `product_catalog`, `location_based_intent`, `international`, `community`, `subscription`, `membership`, `blog`, `news`, `media`, `podcast`, `editorial_content`, `pdf`, and `measurement`.

## Application classification clues

| Type | Evidence examples | Likely conditional domains |
| --- | --- | --- |
| Portfolio/agency | projects, case studies, services, contact | entity, images, AI search, social previews |
| SaaS/product | marketing pages, app routes, pricing, docs | performance, security, privacy/auth, documentation content |
| Ecommerce | catalog, product detail, cart, checkout | ecommerce, images, product schema, feeds |
| Marketplace | listings, sellers, transactions | ecommerce, UGC, entity, security |
| Blog/news/media | posts, authors, publication dates, editorial CMS | Discover, feeds, article schema, images/video |
| Documentation/knowledge base | versioned docs, search, API references | content, internal linking, AI search, feeds when useful |
| Local business | genuine address/service area/location pages | local, entity, structured data |
| Community/UGC | profiles, comments, forums, submissions | UGC, moderation, crawl management, security |
| Subscription/paywall | entitlements, meters, paid content | paywall, caching, privacy/auth |
| International | locale routes, translations, regional markets | international, localized metadata and sitemaps |
| Video/media | watch routes, players, transcripts, thumbnails, media CDN | video, images, performance, feeds |
| API-backed app | public frontend plus API/content service ownership | architecture, rendering, caching, privacy/auth |
| Monorepo/Turborepo | workspace manifests, multiple apps/packages/domains | per-app profiling, shared utilities, sitemap ownership |
| 3D/WebGL | canvas, Three.js/R3F, GLB/textures, animation libraries | performance, BFCache, accessibility, image fallbacks |

## Domain activation

The selector performs coarse activation. The audit performs final per-record applicability.

- Always: architecture, URLs, robots, indexing, security, testing, privacy boundaries.
- Public site: metadata, canonicals, crawling, sitemaps, search platforms, schema/entity, content, linking, AI, performance, accessibility, monitoring, mobile UX.
- Evidence-gated: images, video, Discover/editorial, JavaScript rendering, BFCache, CDN/WAF, ecommerce, local, international, UGC, paywall, feeds, PDFs, analytics.

In Ultra, inspect inactive domain files too and record their records `NOT_APPLICABLE` with one concise domain-level evidence statement expanded to IDs in state. Do not implement inactive features.

Auto mode must classify portfolio, SaaS, ecommerce, blog, news, CMS/content
platform, marketplace, UGC/community, local business, international, video,
subscription/paywall, documentation, API-backed, monorepo, and 3D/WebGL clues.
Populate `application_types` plus explicit boolean facts; never activate a
specialized vertical from a name alone when repository evidence contradicts it.

## Applicability tests

Ask these in order:

1. Does the project contain the entity, content, route, integration, or behavior named by the record?
2. Is the surface public and intended for discovery?
3. Does the selected execution level include the record?
4. Are dependencies satisfied or independently actionable?
5. Does implementation conflict with privacy, security, architecture, policy, or user intent?
6. Can the result be verified locally, over HTTP, in a browser, or through an authorized platform?

Use `BLOCKED` for missing facts that prevent a defensible decision. Use `NEEDS_MANUAL_ACTION` only after the engineering side is ready and an external owner action remains.
