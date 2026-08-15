# Requirement registry index
The JSONL files in this directory are the authoritative registry. Load only selected domain files or use `scripts/select_requirements.py`; do not paste the full registry into agent context.
Total requirements: **640** (`SEO-001` through `SEO-640`). For a complete list of all 640 requirements with titles and levels, see [ALL_REQUIREMENTS.md](ALL_REQUIREMENTS.md).
Every record contains an explicit search-surface relevance map, platform/concept classification, evidence model, and applicability/status contract.
| Domain | Requirements | Activation | File |
| --- | ---: | --- | --- |
| Repository and application architecture | 16 | `always` | `architecture.jsonl` |
| URL design and HTTP routing | 16 | `always` | `urls.jsonl` |
| Document metadata and previews | 16 | `always` | `metadata.jsonl` |
| Canonicalization | 16 | `always` | `canonicals.jsonl` |
| Crawlability and crawl management | 16 | `always` | `crawling.jsonl` |
| Robots directives | 16 | `always` | `robots.jsonl` |
| Indexability and index lifecycle | 16 | `always` | `indexing.jsonl` |
| XML sitemap infrastructure | 16 | `always` | `sitemaps.jsonl` |
| Google Search readiness | 16 | `public_site` | `google-search.jsonl` |
| Bing, Copilot, and IndexNow readiness | 16 | `public_site` | `bing-indexnow.jsonl` |
| Structured data and rich-result eligibility | 16 | `public_site` | `structured-data.jsonl` |
| Entity graph and site identity | 16 | `public_site` | `entity.jsonl` |
| Content quality and answer readiness | 16 | `public_site` | `content.jsonl` |
| Internal linking and navigation | 16 | `public_site` | `internal-linking.jsonl` |
| Image SEO and delivery | 16 | `has_images` | `images.jsonl` |
| Video SEO and accessibility | 16 | `has_video` | `video.jsonl` |
| Google Discover readiness | 16 | `editorial_content` | `discover.jsonl` |
| AI search, AEO, GEO, LLMO, and answer discoverability | 16 | `public_site` | `ai-search.jsonl` |
| AI crawler policy | 16 | `public_site` | `ai-crawlers.jsonl` |
| llms.txt machine-readable guidance | 16 | `public_site` | `llms-txt.jsonl` |
| Performance and Core Web Vitals | 16 | `public_site` | `performance.jsonl` |
| HTTP caching and freshness | 16 | `public_site` | `caching.jsonl` |
| Back-forward cache and page lifecycle | 16 | `interactive_app` | `bfcache.jsonl` |
| Accessibility and WCAG 2.2 AA readiness | 16 | `public_site` | `accessibility.jsonl` |
| SEO security and public-surface integrity | 16 | `always` | `security.jsonl` |
| CDN, WAF, edge, and bot delivery | 16 | `has_cdn_or_waf` | `cdn-waf.jsonl` |
| Ecommerce, products, and shopping surfaces | 16 | `ecommerce` | `ecommerce.jsonl` |
| Local search and location entities | 16 | `local_business` | `local.jsonl` |
| International and multilingual SEO | 16 | `multilingual_or_multiregional` | `international.jsonl` |
| UGC, community, profiles, and moderation | 16 | `ugc` | `ugc.jsonl` |
| Paywall, subscription, and membership content | 16 | `paywall_or_subscription` | `paywall.jsonl` |
| RSS, Atom, and content feeds | 16 | `content_publication` | `feeds.jsonl` |
| PDF and non-HTML document discovery | 16 | `public_documents` | `pdf.jsonl` |
| Analytics and measurement integrity | 16 | `analytics_or_measurement` | `analytics.jsonl` |
| Search and discoverability monitoring | 16 | `public_site` | `monitoring.jsonl` |
| Verification and regression prevention | 16 | `always` | `testing.jsonl` |
| Social and messaging previews | 16 | `public_site` | `social-preview.jsonl` |
| JavaScript rendering and hydration | 16 | `javascript_app` | `javascript-rendering.jsonl` |
| Mobile search experience and SXO | 16 | `public_site` | `mobile-ux.jsonl` |
| Privacy, authentication, and environment boundaries | 16 | `always` | `privacy-auth.jsonl` |

## Level candidate counts
Counts are cumulative candidates before project-specific applicability decisions.
| Level | Candidate requirements |
| --- | ---: |
| Lite | 124 |
| Recommended | 400 |
| Extra | 520 |
| Ultra | 640 |

## Coverage and matrices
- `coverage-map.json` maps requested taxonomy areas to stable requirement IDs.
- Each JSONL record contains a complete requirement-level search-surface relevance map.
- Use `scripts/audit_coverage.py` for duplicate, gap, taxonomy, level, domain, and surface counts.
