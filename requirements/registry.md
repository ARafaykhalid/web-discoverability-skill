<!-- GENERATED FILE. Run `npm run docs -- --write`. Edits are overwritten. -->

# Requirement registry index

226 active requirements across 37 domains.
80 retired and 336 deferred IDs are recorded in the ledgers; retired IDs are never reused.

## Deferred IDs

The deferred ledger holds IDs reviewed out of the active registry and not yet specified well enough to promote.
They are not a roadmap: an ID is there because it was reviewed and the review found it wanting.

The v1 catalogue carried a title, a minimum level, and a category per ID. Its description field was one shared boilerplate sentence, its evidence-type list was all 17 legacy types verbatim, and its verification method was one of three domain-wide skeletons. None of that is a specification, so none of it was promoted.

Re-admission requires all of:

- A `statement` that asserts a testable condition, not the title restated.
- A `rationale` written in language the evidence tier supports.
- An `implementation` concrete enough to act on without guessing.
- A `verification.method` describing an observation, plus the `verification.evidence` types it produces.
- At least one entry in `sources`, with the record tier matched by at least one citation.

These criteria are stated once because they are the same for every entry classified `NEEDS_REWORDING`.
An entry deferred for any other reason carries its own `blocker` instead.

Columns: `Chk` marks a requirement with a deterministic check in `tools/lib/checks/`.
Requirements without one are verified by the documented manual method and are counted as unchecked in `reports/metrics.json`.

## URL design and HTTP routing (`urls`)

Activation: `always` · 7 requirements · runtime-sensitive

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-017 | [Serve the site from one production HTTPS origin](by-id/SEO-017.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-019 | [Return an accurate HTTP status code for every public route state](by-id/SEO-019.md) | LITE | CRITICAL | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-020 | [Prevent query-parameter variants from creating crawlable duplicates](by-id/SEO-020.md) | LITE | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-022 | [Enforce a single trailing-slash form per path](by-id/SEO-022.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-024 | [Preserve inbound URLs across migrations with a permanent redirect map](by-id/SEO-024.md) | RECOMMENDED | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-025 | [Resolve every redirect in one hop without loops](by-id/SEO-025.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-026 | [Return 404 or 410 for removed resources instead of an empty 200 page](by-id/SEO-026.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | yes |

## Document metadata (`metadata`)

Activation: `always` · 6 requirements · runtime-sensitive

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-033 | [Emit exactly one non-empty title element per page](by-id/SEO-033.md) | LITE | HIGH | A | HIGH | SAFE_AUTOMATIC | yes |
| SEO-034 | [Provide a single meta description per indexable page](by-id/SEO-034.md) | LITE | MEDIUM | A | MEDIUM | SAFE_AUTOMATIC | yes |
| SEO-035 | [Declare the document primary language on the root html element](by-id/SEO-035.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-036 | [Declare a mobile viewport in the document head](by-id/SEO-036.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-037 | [Give every indexable route a distinct title](by-id/SEO-037.md) | RECOMMENDED | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | yes |
| SEO-039 | [Serve search-critical metadata in the initial server response](by-id/SEO-039.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |

## Canonicalization (`canonicals`)

Activation: `always` · 9 requirements · runtime-sensitive

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-049 | [Emit one absolute self-referencing canonical per indexable page](by-id/SEO-049.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-051 | [Point every canonical at a URL that returns 200 and stays indexable](by-id/SEO-051.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-052 | [Strip tracking and session parameters from canonical values](by-id/SEO-052.md) | LITE | MEDIUM | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-053 | [Consolidate duplicate route aliases onto one canonical URL](by-id/SEO-053.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-054 | [Link internally to the canonical form of each destination](by-id/SEO-054.md) | RECOMMENDED | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-055 | [List only canonical URLs in the sitemap](by-id/SEO-055.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-056 | [Self-canonicalize each paginated page rather than the series entry point](by-id/SEO-056.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-057 | [Declare canonicals for non-HTML documents with an HTTP Link header](by-id/SEO-057.md) | EXTRA | LOW | A | HIGH | REVIEW_REQUIRED | - |
| SEO-058 | [Build canonical URLs from configuration rather than the request Host header](by-id/SEO-058.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |

## Crawlability and crawl management (`crawling`)

Activation: `always` · 7 requirements · runtime-sensitive

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-065 | [Reach every indexable page through a crawlable anchor href](by-id/SEO-065.md) | LITE | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-066 | [Allow crawlers to fetch the CSS and JavaScript the page needs to render](by-id/SEO-066.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-067 | [Bound the URL space that generated routes can produce](by-id/SEO-067.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-068 | [Expose primary navigation links in the document without a user gesture](by-id/SEO-068.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-071 | [Serve the same primary content to crawlers and to readers](by-id/SEO-071.md) | LITE | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-073 | [Declare which filter and sort combinations are crawlable](by-id/SEO-073.md) | RECOMMENDED | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-074 | [Expose a finite pagination path to the last page of every sequence](by-id/SEO-074.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |

## Robots directives (`robots`)

Activation: `always` · 7 requirements · runtime-sensitive

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-081 | [Serve a valid robots.txt at the root of every public host](by-id/SEO-081.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-082 | [Reference the sitemap index from the robots.txt of the host it covers](by-id/SEO-082.md) | LITE | MEDIUM | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-083 | [Keep robots.txt groups free of rules that contradict each other](by-id/SEO-083.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-084 | [Apply a noindex directive only where exclusion from the index is intended](by-id/SEO-084.md) | LITE | CRITICAL | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-085 | [Control indexing of non-HTML responses with an X-Robots-Tag header](by-id/SEO-085.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-086 | [Mark sponsored and user-generated links with the documented rel values](by-id/SEO-086.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-094 | [Resolve disagreement between crawl directives and index directives](by-id/SEO-094.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | yes |

## Indexability and index lifecycle (`indexing`)

Activation: `always` · 6 requirements · runtime-sensitive

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-097 | [Maintain a declared inventory of the routes intended to be indexable](by-id/SEO-097.md) | RECOMMENDED | MEDIUM | INTERNAL | HIGH | SAFE_AUTOMATIC | - |
| SEO-098 | [Keep authenticated and administrative routes out of the index](by-id/SEO-098.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-099 | [Block indexing of non-production hosts](by-id/SEO-099.md) | LITE | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-101 | [Exclude internal search result pages from the index](by-id/SEO-101.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-102 | [Suppress indexing of pages that render no substantive content](by-id/SEO-102.md) | RECOMMENDED | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-103 | [State the indexability of paginated pages explicitly](by-id/SEO-103.md) | RECOMMENDED | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | - |

## XML sitemaps (`sitemaps`)

Activation: `always` · 6 requirements · runtime-sensitive

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-113 | [Serve a sitemap that conforms to the sitemap protocol schema](by-id/SEO-113.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-114 | [Omit sitemap entries whose target suppresses indexing](by-id/SEO-114.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-115 | [Set lastmod from a real content modification timestamp](by-id/SEO-115.md) | RECOMMENDED | LOW | A | HIGH | REVIEW_REQUIRED | - |
| SEO-116 | [List sitemap URLs on the same host that serves the sitemap](by-id/SEO-116.md) | LITE | MEDIUM | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-117 | [Split sitemaps before the protocol size limits](by-id/SEO-117.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-119 | [Regenerate the sitemap whenever the published URL set changes](by-id/SEO-119.md) | RECOMMENDED | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | - |

## Structured data and rich-result eligibility (`structured-data`)

Activation: `public_site` · 8 requirements · runtime-sensitive

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-161 | [Emit structured data as JSON-LD that parses without error](by-id/SEO-161.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-162 | [Keep structured data consistent with the content visible on the page](by-id/SEO-162.md) | LITE | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-163 | [Use the most specific schema type that truthfully describes the page](by-id/SEO-163.md) | LITE | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-164 | [Use absolute canonical URLs inside structured data](by-id/SEO-164.md) | LITE | MEDIUM | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-165 | [Claim only the rich result features the platform currently documents](by-id/SEO-165.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-167 | [Avoid emitting conflicting objects for the same entity](by-id/SEO-167.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-168 | [Render structured data in the server response](by-id/SEO-168.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-173 | [Derive review and rating markup only from real collected reviews](by-id/SEO-173.md) | RECOMMENDED | CRITICAL | A | HIGH | BLOCKED | yes |

## Entity graph and site identity (`entity`)

Activation: `public_site` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-177 | [Assign a stable absolute @id to the site-level node](by-id/SEO-177.md) | RECOMMENDED | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-178 | [Describe the publisher as a truthful Person or Organization](by-id/SEO-178.md) | RECOMMENDED | HIGH | A | HIGH | BLOCKED | - |
| SEO-179 | [Connect each page node to the site node and its primary entity](by-id/SEO-179.md) | RECOMMENDED | LOW | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-180 | [Keep the declared site name consistent with the visible brand name](by-id/SEO-180.md) | RECOMMENDED | LOW | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-183 | [Use sameAs only for profiles the site can verify](by-id/SEO-183.md) | RECOMMENDED | MEDIUM | A | HIGH | BLOCKED | - |
| SEO-186 | [Detect entity references that resolve to no node in the graph](by-id/SEO-186.md) | RECOMMENDED | LOW | INTERNAL | HIGH | SAFE_AUTOMATIC | - |

## Content quality and answer readiness (`content`)

Activation: `public_site` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-194 | [Never fabricate credentials or first-hand experience](by-id/SEO-194.md) | LITE | CRITICAL | A | HIGH | BLOCKED | - |
| SEO-195 | [Give each page one visible primary heading](by-id/SEO-195.md) | LITE | MEDIUM | B | MEDIUM | REVIEW_REQUIRED | yes |
| SEO-196 | [Keep critical information in crawlable text](by-id/SEO-196.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-198 | [Structure body content with a nested heading outline](by-id/SEO-198.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-200 | [Publish dates that reflect real creation or revision](by-id/SEO-200.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-208 | [Never generate keyword-stuffed or deceptive page text](by-id/SEO-208.md) | LITE | CRITICAL | A | HIGH | BLOCKED | - |

## Internal linking and navigation (`internal-linking`)

Activation: `public_site` · 5 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-210 | [Write anchor text that describes the destination](by-id/SEO-210.md) | LITE | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-212 | [Keep internal links pointing at URLs that resolve](by-id/SEO-212.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-213 | [Expose a breadcrumb trail on deeply nested pages](by-id/SEO-213.md) | RECOMMENDED | LOW | B | MEDIUM | REVIEW_REQUIRED | - |
| SEO-217 | [Avoid linking prominently to routes excluded from the index](by-id/SEO-217.md) | RECOMMENDED | MEDIUM | B | MEDIUM | REVIEW_REQUIRED | - |
| SEO-222 | [Keep every indexable page within a bounded click depth](by-id/SEO-222.md) | RECOMMENDED | LOW | B | LOW | REVIEW_REQUIRED | yes |

## Image discoverability and delivery (`images`)

Activation: `has_images` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-225 | [Provide alt text for images that carry information](by-id/SEO-225.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-226 | [Mark decorative images with an empty alt attribute](by-id/SEO-226.md) | LITE | MEDIUM | A | HIGH | SAFE_AUTOMATIC | - |
| SEO-227 | [Declare intrinsic dimensions on rendered images](by-id/SEO-227.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-228 | [Serve responsive image candidates sized for the layout](by-id/SEO-228.md) | RECOMMENDED | LOW | A | HIGH | REVIEW_REQUIRED | - |
| SEO-231 | [Exclude the largest visible image from lazy loading](by-id/SEO-231.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-234 | [Keep discoverable images fetchable by image crawlers](by-id/SEO-234.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |

## Video discoverability and accessibility (`video`)

Activation: `has_video` · 5 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-241 | [Describe the video truthfully in its title and summary](by-id/SEO-241.md) | RECOMMENDED | MEDIUM | A | HIGH | BLOCKED | - |
| SEO-242 | [Publish a fetchable thumbnail for every indexable video](by-id/SEO-242.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-243 | [Populate VideoObject with accurate playback metadata](by-id/SEO-243.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-244 | [Provide synchronized captions for meaningful spoken video](by-id/SEO-244.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-247 | [Give each video its own indexable watch page](by-id/SEO-247.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |

## Social and messaging previews (`social-preview`)

Activation: `public_site` · 7 requirements · runtime-sensitive

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-577 | [Declare the canonical URL in the preview URL property](by-id/SEO-577.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-578 | [Keep preview titles and descriptions truthful to the page](by-id/SEO-578.md) | RECOMMENDED | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-579 | [Supply alternative text for the preview image](by-id/SEO-579.md) | RECOMMENDED | LOW | A | MEDIUM | REVIEW_REQUIRED | yes |
| SEO-580 | [Keep preview images fetchable without authentication](by-id/SEO-580.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-581 | [Declare a preview type that matches the page content](by-id/SEO-581.md) | RECOMMENDED | LOW | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-584 | [Avoid emitting duplicate or conflicting preview properties](by-id/SEO-584.md) | RECOMMENDED | MEDIUM | A | HIGH | SAFE_AUTOMATIC | yes |
| SEO-592 | [Escape user-supplied text before it reaches preview metadata](by-id/SEO-592.md) | RECOMMENDED | HIGH | B | HIGH | REVIEW_REQUIRED | - |

## JavaScript rendering and hydration (`javascript-rendering`)

Activation: `public_site` · 5 requirements · runtime-sensitive

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-593 | [Include the primary content in the initial HTML response](by-id/SEO-593.md) | LITE | CRITICAL | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-596 | [Keep primary content readable before hydration completes](by-id/SEO-596.md) | RECOMMENDED | MEDIUM | B | MEDIUM | REVIEW_REQUIRED | - |
| SEO-597 | [Do not mutate canonical or robots directives from client script](by-id/SEO-597.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-598 | [Map client-side route failures onto accurate status codes](by-id/SEO-598.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-605 | [Back infinite scroll with crawlable paginated URLs](by-id/SEO-605.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |

## Performance and Core Web Vitals (`performance`)

Activation: `public_site` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-321 | [Deliver the largest visible element within the documented threshold](by-id/SEO-321.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-322 | [Prevent avoidable layout shift after first paint](by-id/SEO-322.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-323 | [Keep the page responsive to input during load](by-id/SEO-323.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-324 | [Reduce time to the first byte of the document](by-id/SEO-324.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-325 | [Limit resources that block the first render](by-id/SEO-325.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-330 | [Bound the cost of third-party scripts](by-id/SEO-330.md) | RECOMMENDED | MEDIUM | B | MEDIUM | REVIEW_REQUIRED | - |

## Mobile-first indexing and small-screen delivery (`mobile`)

Activation: `public_site` · 5 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-609 | [Serve equivalent primary content on mobile and desktop](by-id/SEO-609.md) | LITE | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-610 | [Fit primary content within the viewport width](by-id/SEO-610.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-612 | [Keep interstitials from obscuring the primary content](by-id/SEO-612.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-613 | [Size interactive controls for touch input](by-id/SEO-613.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-614 | [Render body text at a readable size without zoom](by-id/SEO-614.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | - |

## HTTP caching and freshness (`caching`)

Activation: `public_site` · 5 requirements · runtime-sensitive

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-337 | [Declare an explicit cache policy on every response](by-id/SEO-337.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-338 | [Serve versioned static assets under immutable directives](by-id/SEO-338.md) | RECOMMENDED | LOW | A | HIGH | REVIEW_REQUIRED | - |
| SEO-339 | [Keep private responses out of shared caches](by-id/SEO-339.md) | LITE | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-340 | [Match document freshness to how often content changes](by-id/SEO-340.md) | RECOMMENDED | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-345 | [Vary responses only on headers that change the body](by-id/SEO-345.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | yes |

## Back-forward cache and page lifecycle (`bfcache`)

Activation: `public_site` · 4 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-353 | [Keep documents eligible for back-forward restoration](by-id/SEO-353.md) | RECOMMENDED | LOW | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-354 | [Restore page state from the persisted event](by-id/SEO-354.md) | RECOMMENDED | LOW | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-359 | [Avoid no-store on documents that should be restorable](by-id/SEO-359.md) | RECOMMENDED | LOW | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-361 | [Revalidate sensitive data after a restored navigation](by-id/SEO-361.md) | RECOMMENDED | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | - |

## Accessibility affecting discoverability (`accessibility`)

Activation: `public_site` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-369 | [Prefer native interactive elements over ARIA substitutes](by-id/SEO-369.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-370 | [Make every interactive control reachable by keyboard](by-id/SEO-370.md) | LITE | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-371 | [Keep the focused element visible and unobscured](by-id/SEO-371.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-373 | [Associate every form control with a persistent label](by-id/SEO-373.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-374 | [Meet the contrast minimum for text and interface components](by-id/SEO-374.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-377 | [Provide a skip link past repeated navigation](by-id/SEO-377.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |

## Public-surface integrity (`security`)

Activation: `always` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-385 | [Keep credentials out of public code and responses](by-id/SEO-385.md) | LITE | CRITICAL | B | HIGH | REVIEW_REQUIRED | - |
| SEO-388 | [Detect injected links and unauthorized redirects](by-id/SEO-388.md) | RECOMMENDED | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-390 | [Declare a transport security policy on the production origin](by-id/SEO-390.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-391 | [Reject redirect targets the application does not own](by-id/SEO-391.md) | RECOMMENDED | HIGH | B | HIGH | REVIEW_REQUIRED | - |
| SEO-393 | [Keep source maps and debug output off production responses](by-id/SEO-393.md) | RECOMMENDED | MEDIUM | B | HIGH | REVIEW_REQUIRED | - |
| SEO-394 | [Prevent user input from reaching indexing directives](by-id/SEO-394.md) | RECOMMENDED | HIGH | B | HIGH | REVIEW_REQUIRED | - |

## Privacy, authentication, and environment boundaries (`privacy-auth`)

Activation: `always` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-625 | [Protect nonproduction environments with real access control](by-id/SEO-625.md) | LITE | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-628 | [Keep preview URLs unguessable and excluded from indexing](by-id/SEO-628.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-630 | [Keep consent state out of crawler access decisions](by-id/SEO-630.md) | RECOMMENDED | HIGH | B | HIGH | REVIEW_REQUIRED | - |
| SEO-632 | [Return neutral metadata on unauthorized responses](by-id/SEO-632.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-633 | [Isolate tenant content by host and cache key](by-id/SEO-633.md) | RECOMMENDED | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-636 | [Remove erased content from every surface the site controls](by-id/SEO-636.md) | RECOMMENDED | HIGH | INTERNAL | HIGH | REVIEW_REQUIRED | - |

## CDN, WAF, edge, and bot delivery (`cdn-waf`)

Activation: `has_cdn_or_waf` · 6 requirements · runtime-sensitive

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-401 | [Return intended status codes through the edge](by-id/SEO-401.md) | LITE | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-402 | [Allow verified search crawlers to reach public pages](by-id/SEO-402.md) | LITE | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-403 | [Serve public pages without an interactive challenge](by-id/SEO-403.md) | LITE | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-405 | [Keep protocol files reachable through the edge](by-id/SEO-405.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-406 | [Resolve redirects consistently at the edge and the origin](by-id/SEO-406.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-410 | [Preserve indexing headers through the edge](by-id/SEO-410.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |

## AI crawler policy (`ai-crawlers`)

Activation: `public_site` · 7 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-289 | [Record the declared purpose of each automated client before setting policy](by-id/SEO-289.md) | LITE | HIGH | B | HIGH | REVIEW_REQUIRED | - |
| SEO-291 | [Set training access policy separately from search indexing policy](by-id/SEO-291.md) | LITE | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-293 | [Distinguish retrieval tokens from training tokens for one operator](by-id/SEO-293.md) | RECOMMENDED | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-295 | [Allow user-triggered fetching of pages the reader can already open](by-id/SEO-295.md) | RECOMMENDED | MEDIUM | B | MEDIUM | REVIEW_REQUIRED | - |
| SEO-302 | [Enforce one crawler policy across robots.txt and the edge](by-id/SEO-302.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-303 | [Confirm client identity by reverse DNS rather than the user-agent string](by-id/SEO-303.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-642 | [Give a robots.txt group only to a token a request actually sends](by-id/SEO-642.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | yes |

## AI retrieval readiness (`ai-retrieval`)

Activation: `public_site` · 7 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-273 | [State the page subject in its opening passage](by-id/SEO-273.md) | RECOMMENDED | MEDIUM | B | MEDIUM | REVIEW_REQUIRED | - |
| SEO-275 | [Attribute statistics and factual claims to their source](by-id/SEO-275.md) | RECOMMENDED | MEDIUM | B | HIGH | REVIEW_REQUIRED | - |
| SEO-277 | [Do not restructure published prose to suit a retrieval hypothesis](by-id/SEO-277.md) | RECOMMENDED | HIGH | INTERNAL | HIGH | BLOCKED | - |
| SEO-282 | [Give each section a stable fragment identifier](by-id/SEO-282.md) | RECOMMENDED | LOW | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-287 | [Record AI surface observations as experimental evidence](by-id/SEO-287.md) | RECOMMENDED | MEDIUM | INTERNAL | HIGH | BLOCKED | - |
| SEO-288 | [Publish corrections in the page body rather than only a changelog](by-id/SEO-288.md) | RECOMMENDED | MEDIUM | INTERNAL | HIGH | REVIEW_REQUIRED | - |
| SEO-641 | [Satisfy search eligibility rather than a separate set of AI requirements](by-id/SEO-641.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |

## llms.txt machine-readable guidance (`llms-txt`)

Activation: `public_site` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-305 | [Serve llms.txt at the site root as plain text](by-id/SEO-305.md) | RECOMMENDED | LOW | D | MEDIUM | REVIEW_REQUIRED | yes |
| SEO-306 | [List only absolute HTTPS locations in llms.txt](by-id/SEO-306.md) | RECOMMENDED | LOW | D | MEDIUM | SAFE_AUTOMATIC | yes |
| SEO-307 | [Describe the site and each listed resource factually](by-id/SEO-307.md) | RECOMMENDED | LOW | D | MEDIUM | REVIEW_REQUIRED | - |
| SEO-308 | [Exclude private and unpublished locations from llms.txt](by-id/SEO-308.md) | RECOMMENDED | HIGH | INTERNAL | HIGH | SAFE_AUTOMATIC | - |
| SEO-312 | [Revalidate llms.txt entries when canonical URLs change](by-id/SEO-312.md) | RECOMMENDED | LOW | D | MEDIUM | REVIEW_REQUIRED | - |
| SEO-314 | [Do not present llms.txt as a search or ranking mechanism](by-id/SEO-314.md) | RECOMMENDED | MEDIUM | INTERNAL | HIGH | BLOCKED | - |

## Search platform submission and change notification (`submission`)

Activation: `public_site` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-129 | [Record property verification as work only an operator can complete](by-id/SEO-129.md) | RECOMMENDED | MEDIUM | A | HIGH | BLOCKED | - |
| SEO-133 | [Announce a new sitemap through the platform's own submission route](by-id/SEO-133.md) | RECOMMENDED | LOW | A | MEDIUM | BLOCKED | - |
| SEO-147 | [Host the IndexNow key file where the protocol requires](by-id/SEO-147.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-148 | [Submit only addresses that are public and canonical](by-id/SEO-148.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-151 | [Isolate submission failures from page rendering](by-id/SEO-151.md) | RECOMMENDED | HIGH | INTERNAL | HIGH | REVIEW_REQUIRED | - |
| SEO-157 | [Read a submission acknowledgement as receipt rather than indexing](by-id/SEO-157.md) | RECOMMENDED | MEDIUM | A | HIGH | BLOCKED | - |

## RSS and Atom feeds (`feeds`)

Activation: `content_publication` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-497 | [Serve a feed that parses as valid Atom or RSS](by-id/SEO-497.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-498 | [Declare the feed with an alternate link and its media type](by-id/SEO-498.md) | RECOMMENDED | MEDIUM | A | HIGH | SAFE_AUTOMATIC | yes |
| SEO-499 | [Point each feed entry at its canonical page address](by-id/SEO-499.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-501 | [Exclude drafts and removed items from the feed](by-id/SEO-501.md) | RECOMMENDED | HIGH | INTERNAL | HIGH | REVIEW_REQUIRED | - |
| SEO-502 | [Keep entry identifiers stable across rebuilds](by-id/SEO-502.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-503 | [Escape entry content so the feed remains well-formed](by-id/SEO-503.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |

## Google Discover prerequisites (`discover`)

Activation: `editorial_content` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-257 | [Confirm Discover prerequisites without promising inclusion](by-id/SEO-257.md) | RECOMMENDED | MEDIUM | A | HIGH | BLOCKED | - |
| SEO-258 | [Write headlines that match what the page delivers](by-id/SEO-258.md) | RECOMMENDED | HIGH | A | HIGH | BLOCKED | - |
| SEO-261 | [Publish a wide representative image for each article](by-id/SEO-261.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-262 | [Permit large image previews where the site wants them](by-id/SEO-262.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-263 | [Show a visible byline and publisher on editorial pages](by-id/SEO-263.md) | RECOMMENDED | MEDIUM | B | HIGH | BLOCKED | - |
| SEO-269 | [Read Discover performance only from the platform report](by-id/SEO-269.md) | RECOMMENDED | MEDIUM | A | HIGH | BLOCKED | - |

## Ecommerce, products, and shopping surfaces (`ecommerce`)

Activation: `ecommerce` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-418 | [Keep visible price and availability accurate](by-id/SEO-418.md) | RECOMMENDED | CRITICAL | A | HIGH | BLOCKED | - |
| SEO-420 | [Declare product identifiers only where they genuinely exist](by-id/SEO-420.md) | RECOMMENDED | HIGH | A | HIGH | BLOCKED | - |
| SEO-422 | [Give each purchasable variant its own canonical address](by-id/SEO-422.md) | RECOMMENDED | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-423 | [Keep discontinued products at a resolvable address](by-id/SEO-423.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-424 | [State shipping and return terms where the offer appears](by-id/SEO-424.md) | RECOMMENDED | MEDIUM | A | HIGH | BLOCKED | - |
| SEO-426 | [Treat merchant surface verification as a manual action](by-id/SEO-426.md) | RECOMMENDED | MEDIUM | INTERNAL | HIGH | BLOCKED | - |

## Local search and location entities (`local`)

Activation: `local_business` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-433 | [Keep the business name and contact details identical across pages](by-id/SEO-433.md) | RECOMMENDED | MEDIUM | B | HIGH | REVIEW_REQUIRED | - |
| SEO-434 | [Publish a distinct page per staffed location](by-id/SEO-434.md) | RECOMMENDED | MEDIUM | B | MEDIUM | REVIEW_REQUIRED | - |
| SEO-436 | [Publish opening hours the business actually keeps](by-id/SEO-436.md) | RECOMMENDED | HIGH | A | HIGH | BLOCKED | - |
| SEO-437 | [Describe the service area only where the business operates](by-id/SEO-437.md) | RECOMMENDED | MEDIUM | A | HIGH | BLOCKED | - |
| SEO-441 | [Relate each location node to its parent organization](by-id/SEO-441.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-448 | [Detect thin location pages generated from a template](by-id/SEO-448.md) | RECOMMENDED | HIGH | A | HIGH | BLOCKED | - |

## International and multilingual (`international`)

Activation: `multilingual` · 6 requirements · runtime-sensitive

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-451 | [Make every hreflang cluster reciprocal and self-referential](by-id/SEO-451.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-452 | [Express locale codes as valid language tags](by-id/SEO-452.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | yes |
| SEO-453 | [Keep each locale page canonical to itself rather than to another locale](by-id/SEO-453.md) | RECOMMENDED | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-455 | [Let every locale URL be reachable without an automatic redirect](by-id/SEO-455.md) | RECOMMENDED | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-457 | [Declare x-default only for a genuine fallback page](by-id/SEO-457.md) | RECOMMENDED | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | yes |
| SEO-460 | [Exclude untranslated pages from the locale cluster](by-id/SEO-460.md) | RECOMMENDED | MEDIUM | INTERNAL | HIGH | REVIEW_REQUIRED | - |

## User-generated content (`ugc`)

Activation: `ugc` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-466 | [Remove contributed spam before it becomes indexable](by-id/SEO-466.md) | RECOMMENDED | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-468 | [Withhold indexing from profiles with no contributed content](by-id/SEO-468.md) | RECOMMENDED | MEDIUM | B | HIGH | REVIEW_REQUIRED | - |
| SEO-470 | [Keep contribution addresses resolvable after an account is removed](by-id/SEO-470.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-473 | [Distinguish contributed material from editorial material on the page](by-id/SEO-473.md) | RECOMMENDED | MEDIUM | B | MEDIUM | REVIEW_REQUIRED | - |
| SEO-475 | [Mark up a discussion only where a real discussion exists](by-id/SEO-475.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-476 | [Report contributed posts republished at several addresses](by-id/SEO-476.md) | RECOMMENDED | MEDIUM | INTERNAL | HIGH | REVIEW_REQUIRED | - |

## Paywalled and subscription content (`paywall`)

Activation: `paywall_or_subscription` · 6 requirements · runtime-sensitive

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-482 | [Show a preview that stops where the entitlement begins](by-id/SEO-482.md) | RECOMMENDED | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-484 | [Declare paywalled sections with the documented access markup](by-id/SEO-484.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-486 | [Serve one canonical address whether or not the reader is entitled](by-id/SEO-486.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-487 | [Serve crawlers the preview rather than the entitled body](by-id/SEO-487.md) | RECOMMENDED | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-491 | [Keep the metering counter out of the address](by-id/SEO-491.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-492 | [Mark every withheld section where an item is split](by-id/SEO-492.md) | RECOMMENDED | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | - |

## PDF and non-HTML document discovery (`documents`)

Activation: `public_documents` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-513 | [Decide the publication status of every downloadable file](by-id/SEO-513.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-515 | [Give each published document an accurate internal title](by-id/SEO-515.md) | RECOMMENDED | MEDIUM | B | MEDIUM | REVIEW_REQUIRED | - |
| SEO-518 | [Nominate one address when a document duplicates a page](by-id/SEO-518.md) | RECOMMENDED | MEDIUM | A | HIGH | REVIEW_REQUIRED | - |
| SEO-520 | [Serve each document with its correct media type](by-id/SEO-520.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-521 | [Strip authoring metadata before a document is published](by-id/SEO-521.md) | RECOMMENDED | CRITICAL | INTERNAL | HIGH | REVIEW_REQUIRED | - |
| SEO-523 | [Publish documents whose text can be extracted](by-id/SEO-523.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |

## Measurement integrity (`analytics`)

Activation: `analytics_or_measurement` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-529 | [Load one measurement library per page](by-id/SEO-529.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-530 | [Preserve the referrer across internal redirects](by-id/SEO-530.md) | RECOMMENDED | MEDIUM | A | MEDIUM | REVIEW_REQUIRED | - |
| SEO-531 | [State the limits of assistant referral attribution](by-id/SEO-531.md) | RECOMMENDED | MEDIUM | INTERNAL | HIGH | BLOCKED | - |
| SEO-532 | [Exclude personal data from addresses and measurement payloads](by-id/SEO-532.md) | RECOMMENDED | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-534 | [Record one pageview per navigation in a client-routed app](by-id/SEO-534.md) | RECOMMENDED | HIGH | A | HIGH | REVIEW_REQUIRED | - |
| SEO-536 | [Report measurement against the canonical address](by-id/SEO-536.md) | RECOMMENDED | MEDIUM | INTERNAL | HIGH | REVIEW_REQUIRED | - |

## Discoverability operations and regression prevention (`operations`)

Activation: `always` · 6 requirements

| ID | Title | Level | Sev | Tier | Conf | Safety | Chk |
| --- | --- | --- | --- | --- | --- | --- | --- |
| SEO-546 | [Alert when a protocol file stops being served](by-id/SEO-546.md) | RECOMMENDED | CRITICAL | A | HIGH | REVIEW_REQUIRED | - |
| SEO-547 | [Alert on an unplanned change to an indexing directive](by-id/SEO-547.md) | RECOMMENDED | CRITICAL | B | HIGH | REVIEW_REQUIRED | - |
| SEO-559 | [Define the rollback condition before a discoverability change ships](by-id/SEO-559.md) | RECOMMENDED | HIGH | INTERNAL | HIGH | REVIEW_REQUIRED | - |
| SEO-570 | [Record the command and output behind every verification claim](by-id/SEO-570.md) | LITE | CRITICAL | INTERNAL | HIGH | REVIEW_REQUIRED | - |
| SEO-572 | [Capture the prior state before changing a search-critical output](by-id/SEO-572.md) | RECOMMENDED | HIGH | INTERNAL | HIGH | REVIEW_REQUIRED | - |
| SEO-575 | [Close each applicable requirement with evidence or a stated blocker](by-id/SEO-575.md) | LITE | CRITICAL | INTERNAL | HIGH | REVIEW_REQUIRED | - |
