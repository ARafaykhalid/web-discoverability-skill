<!-- GENERATED FILE. Run `npm run docs -- --write`. Edits are overwritten. -->

# Registry vocabulary

Every enum below is defined once in `tools/lib/model.mjs` and enforced by `npm run validate`.

## Domains

| Domain | Title | Activation fact | Runtime-sensitive |
| --- | --- | --- | --- |
| `urls` | URL design and HTTP routing | `always` | yes |
| `metadata` | Document metadata | `always` | yes |
| `canonicals` | Canonicalization | `always` | yes |
| `crawling` | Crawlability and crawl management | `always` | yes |
| `robots` | Robots directives | `always` | yes |
| `indexing` | Indexability and index lifecycle | `always` | yes |
| `sitemaps` | XML sitemaps | `always` | yes |
| `structured-data` | Structured data and rich-result eligibility | `public_site` | yes |
| `entity` | Entity graph and site identity | `public_site` | - |
| `content` | Content quality and answer readiness | `public_site` | - |
| `internal-linking` | Internal linking and navigation | `public_site` | - |
| `images` | Image discoverability and delivery | `has_images` | - |
| `video` | Video discoverability and accessibility | `has_video` | - |
| `social-preview` | Social and messaging previews | `public_site` | yes |
| `javascript-rendering` | JavaScript rendering and hydration | `public_site` | yes |
| `performance` | Performance and Core Web Vitals | `public_site` | - |
| `mobile` | Mobile-first indexing and small-screen delivery | `public_site` | - |
| `caching` | HTTP caching and freshness | `public_site` | yes |
| `bfcache` | Back-forward cache and page lifecycle | `public_site` | - |
| `accessibility` | Accessibility affecting discoverability | `public_site` | - |
| `security` | Public-surface integrity | `always` | - |
| `privacy-auth` | Privacy, authentication, and environment boundaries | `always` | - |
| `cdn-waf` | CDN, WAF, edge, and bot delivery | `has_cdn_or_waf` | yes |
| `ai-crawlers` | AI crawler policy | `public_site` | - |
| `ai-retrieval` | AI retrieval readiness | `public_site` | - |
| `llms-txt` | llms.txt machine-readable guidance | `public_site` | - |
| `submission` | Search platform submission and change notification | `public_site` | - |
| `feeds` | RSS and Atom feeds | `content_publication` | - |
| `discover` | Google Discover prerequisites | `editorial_content` | - |
| `ecommerce` | Ecommerce, products, and shopping surfaces | `ecommerce` | - |
| `local` | Local search and location entities | `local_business` | - |
| `international` | International and multilingual | `multilingual` | yes |
| `ugc` | User-generated content | `ugc` | - |
| `paywall` | Paywalled and subscription content | `paywall_or_subscription` | yes |
| `documents` | PDF and non-HTML document discovery | `public_documents` | - |
| `analytics` | Measurement integrity | `analytics_or_measurement` | - |
| `operations` | Discoverability operations and regression prevention | `always` | - |

A runtime-sensitive domain describes output that a framework head-merge, an edge rewrite, or hydration can change.
For those domains `verification.level: SOURCE` is a validation error: the check must inspect what is served.

## Evidence tiers

| Tier | Meaning | Citation required |
| --- | --- | --- |
| A | Official specification or first-party platform/framework documentation. | yes |
| B | Strong technical consensus across multiple authoritative technical sources, or well-established implementation behaviour. | yes |
| C | Empirical or observational: reproducible experiments, independent technical studies, observed crawler behaviour. | yes |
| D | Experimental or speculative: emerging AI-search behaviour, undocumented crawler behaviour, hypotheses about retrieval systems. | yes |
| INTERNAL | Internal consistency invariant of the project under audit; asserts no external platform behaviour. | no |

## Categories

| Category | Experimental |
| --- | --- |
| `TECHNICAL_SEO` | - |
| `SEARCH_DISCOVERABILITY` | - |
| `STRUCTURED_DATA_ELIGIBILITY` | - |
| `CONTENT_QUALITY` | - |
| `ACCESSIBILITY` | - |
| `AI_CRAWLER_ACCESS` | - |
| `AI_RETRIEVAL` | - |
| `EMERGING_GEO` | yes |
| `SECURITY_PRIVACY` | - |
| `OPERATIONS` | - |

## Change safety

| Value | Meaning |
| --- | --- |
| `SAFE_AUTOMATIC` | Deterministic, low-risk, reversible change with no effect on indexing directives, URLs, or business facts. |
| `REVIEW_REQUIRED` | Can affect content, URLs, indexing, redirects, canonicalization, structured data, or application behaviour. Propose a diff and require human approval. |
| `BLOCKED` | Needs credentials, external platform access, business/legal decisions, or facts the repository does not contain. Never implement; report as NEEDS_MANUAL_ACTION. |

## Verification levels

| Level | Proves |
| --- | --- |
| `SOURCE` | The repository contains the implementation. Not evidence of served output. |
| `RUNTIME` | The served response contains the expected result. |
| `SOURCE_AND_RUNTIME` | Both the implementation and the served result were inspected. |
| `MANUAL_EXTERNAL` | Requires an external platform a repository audit cannot reach. Always BLOCKED. |

## Evidence types

- `FILE`
- `ROUTE`
- `RENDERED_HTML`
- `RAW_HTML`
- `HTTP_STATUS`
- `HTTP_HEADER`
- `REDIRECT_CHAIN`
- `JSON_LD`
- `SITEMAP`
- `ROBOTS_TXT`
- `FEED`
- `BROWSER`
- `BUILD_OUTPUT`
- `VALIDATOR_OUTPUT`
- `PERFORMANCE_MEASUREMENT`
- `ACCESSIBILITY_SCAN`
- `LOG`
- `EXTERNAL_PLATFORM`
- `MANUAL_ACTION`

## Review stability and intervals

| Stability | Re-verify after |
| --- | --- |
| `STABLE` | 730 days |
| `SEMI_STABLE` | 365 days |
| `VOLATILE` | 180 days |

## Applicability and terminal statuses

Applicability is decided before any change:

- `APPLICABLE`
- `NOT_APPLICABLE`
- `UNCERTAIN`
- `BLOCKED`
- `ALREADY_CORRECT`

A terminal status is recorded after acting:

- `IMPLEMENTED`
- `FIXED`
- `PROPOSED`
- `FAILED`
- `NEEDS_MANUAL_ACTION`

`UNCERTAIN` exists so a missing fact never becomes a silent `NOT_APPLICABLE` or a blind change.

## Profile predicates

- `public_site`
- `javascript_app`
- `client_rendered`
- `server_rendered`
- `static_generated`
- `has_router`
- `has_images`
- `has_video`
- `has_feeds`
- `has_sitemap`
- `has_robots_txt`
- `has_llms_txt`
- `has_structured_data`
- `has_cdn_or_waf`
- `has_service_worker`
- `multilingual`
- `ecommerce`
- `local_business`
- `ugc`
- `paywall_or_subscription`
- `authentication`
- `content_publication`
- `editorial_content`
- `public_documents`
- `analytics_or_measurement`
- `api_driven_content`
- `monorepo`
- `cms`
- `pagination`
- `faceted_navigation`
- `has_production_origin`
- `runtime_available`
- `has_client_javascript`

Domain activation gates draw from the same set: `always`, `public_site`, `has_images`, `has_video`, `javascript_app`, `has_cdn_or_waf`, `content_publication`, `editorial_content`, `ecommerce`, `local_business`, `multilingual`, `ugc`, `paywall_or_subscription`, `public_documents`, `analytics_or_measurement`.

## Frameworks

| Framework | Adapter + fixture |
| --- | --- |
| `static-html` | yes |
| `next-app-router` | yes |
| `next-pages-router` | yes |
| `react-spa` | yes |
| `vite` | yes |
| `astro` | yes |
| `remix` | yes |
| `sveltekit` | generic guidance only |
| `nuxt` | generic guidance only |
| `node-server` | yes |
| `django` | yes |
| `flask-fastapi` | yes |

## Search surfaces

- `GOOGLE_SEARCH`
- `GOOGLE_DISCOVER`
- `GOOGLE_IMAGES`
- `GOOGLE_VIDEO`
- `GOOGLE_NEWS`
- `GOOGLE_SHOPPING`
- `BING_SEARCH`
- `AI_ASSISTANT_RETRIEVAL`
- `LOCAL_SEARCH`
- `SOCIAL_PREVIEW`

Listing a surface means "evaluate the requirement against this surface". It never means content will appear there.

## Source types

- `SPECIFICATION`
- `PLATFORM_DOCUMENTATION`
- `FRAMEWORK_DOCUMENTATION`
- `VOCABULARY`
- `STANDARDS_BODY`
- `PLATFORM_POLICY`
- `EMPIRICAL_STUDY`
- `COMMUNITY_CONVENTION`

## Ledger classifications

- `VALID`
- `NEEDS_SOURCE`
- `NEEDS_REWORDING`
- `NEEDS_TEST`
- `DUPLICATE`
- `SPECULATIVE`
- `OBSOLETE`
- `UNSAFE`
- `NOT_ACTIONABLE`
- `SPLIT`
- `MERGED`
- `OUT_OF_SCOPE`

## Record fields

| Field | Required |
| --- | --- |
| `id` | yes |
| `domain` | yes |
| `title` | yes |
| `statement` | yes |
| `rationale` | yes |
| `category` | yes |
| `minimum_level` | yes |
| `severity` | yes |
| `impact` | yes |
| `change_safety` | yes |
| `evidence_tier` | yes |
| `confidence` | yes |
| `applies_when` | yes |
| `implementation` | yes |
| `verification` | yes |
| `review` | yes |
| `surfaces` | optional |
| `frameworks` | optional |
| `framework_notes` | optional |
| `depends_on` | optional |
| `conflicts_with` | optional |
| `sources` | optional |
| `caution` | optional |
| `supersedes` | optional |

Any other key is a validation error, which is what stops the alias fields of earlier versions from growing back.
