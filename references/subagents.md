# Subagent orchestration

Use subagents when available. Do not send any agent the complete registry. The primary agent remains responsible for discovery, conflict resolution, shared state, integration, and final claims.

## Context contract

Every subagent receives only:

```text
PROJECT_PROFILE: compact facts and unknowns
EXECUTION: level and mode
OWNED_REQUIREMENT_IDS: stable IDs only
RELEVANT_REQUIREMENT_RECORDS: one domain JSONL file or task-local selected records
DEPENDENCIES: relevant IDs/domains and prior findings
TASK: audit, recommendations, implementation, or verification
FILE_OWNERSHIP: writable files or read-only
OUTPUT_SCHEMA: compact rows only
```

Required audit output:

```text
ID | STATUS | EVIDENCE | ACTION
```

Add a short `BLOCKERS` section only when necessary. Do not restate requirement descriptions. Implementation agents also return `CHANGED_FILES: file -> IDs`. Verification agents are read-only unless explicitly assigned fixes.

## Roles

| Role | Domains and responsibilities |
| --- | --- |
| Repository architect | architecture, framework, apps, routes, rendering, deployment, ownership |
| Technical SEO | URLs, metadata, canonicals, redirects, status, crawlability, JavaScript rendering |
| Search infrastructure | robots, indexing, sitemaps, Google readiness, verification-resource readiness |
| Bing and IndexNow | Bing Webmaster readiness, Bing crawl, IndexNow safety, Copilot-facing clarity |
| Structured data | Schema.org, rich-result eligibility, JSON-LD validity, visible-content parity |
| Entity graph | stable `@id`, WebSite/WebPage/publisher/author/product/place relationships, site-name signals |
| AI discoverability | AEO, GEO, LLMO, AISEO, GAIO, answer structure, provenance, `llms.txt` |
| AI crawler policy | crawler identity/purpose matrix, robots policy, WAF alignment, privacy boundaries |
| Google Discover | editorial quality, mobile usability, previews, large images, dates, credibility; never promise traffic |
| Performance | CWV, rendering, fonts, scripts, images, caching, BFCache, third parties |
| Accessibility | WCAG 2.2 AA readiness, semantics, keyboard, focus, forms, motion, media; no formal compliance claim |
| Content and linking | usefulness, originality, headings, duplication, internal graph, anti-overoptimization |
| Images | image SEO, licensing facts, alt text, responsive delivery, image sitemaps, Discover/Lens readiness |
| Video | VideoObject, captions, transcripts, players, video sitemaps, Video Search and Discover readiness |
| Ecommerce | products, variants, feeds, Merchant Center readiness, shopping eligibility; activate conditionally |
| Local SEO | genuine location/NAP/entities, Business Profile/Bing Places readiness, local page quality |
| International | hreflang, locales, localized metadata/schema/feeds, cluster validation |
| UGC/paywall | moderation, crawl scale, profiles, access model, subscription structured data, privacy |
| Security | hacked content, secrets, private routes, malicious redirects, search incident response |
| CDN/WAF | edge delivery, challenges, bot rules, status codes, conditional requests, cache safety |
| Analytics | GA4/GTM or equivalent, consent, organic/Discover/media/shopping/AI measurement, duplicate-event prevention |
| Verifier | read-only second pass across changed IDs, routes, rendered signals, HTTP behavior, and regressions |

## Parallelization and ownership

Run independent read-only audits concurrently. Before edits, create a file ownership map. Typical ownership:

```text
metadata/canonical owner -> root layout, metadata utilities, document templates
indexing owner -> robots, sitemap, IndexNow publisher, verification resources
schema/entity owner -> JSON-LD components and entity utilities
content owner -> content files/CMS schemas only when authorized
performance owner -> image/font/script/cache files
security/edge owner -> middleware, headers, CDN/WAF configuration
verifier -> read-only
```

If two agents need one file, appoint one writer. The other returns ID-scoped recommendations. Do not concurrently edit shared framework config, root layouts, middleware, package manifests, or generated files.

## Merge procedure

1. Reject results without requirement IDs or evidence.
2. Normalize statuses to the skill status system.
3. Deduplicate evidence and retain the strongest direct evidence.
4. Resolve dependency and conflict records before implementation.
5. Reassign shared-file recommendations to the file owner.
6. Preserve blockers and manual actions separately.
7. Give the verifier only changed IDs, relevant registry records, profile, changed files, and expected output.
