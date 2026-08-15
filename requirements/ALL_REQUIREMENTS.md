# Complete Web Discoverability Requirement Registry (SEO-001 to SEO-640)

## Domain: architecture (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-001 | LITE | Detect package manager and workspace root | always |
| SEO-002 | LITE | Detect primary language and runtime | always |
| SEO-003 | LITE | Detect public application entry points | always |
| SEO-004 | LITE | Classify application type | always |
| SEO-005 | RECOMMENDED | Detect framework and major version | always |
| SEO-006 | RECOMMENDED | Map public routes and route ownership | always |
| SEO-007 | RECOMMENDED | Classify rendering modes by route | always |
| SEO-008 | RECOMMENDED | Detect monorepo apps and shared packages | always |
| SEO-009 | RECOMMENDED | Detect deployment platform and production origin | always |
| SEO-010 | RECOMMENDED | Detect CMS and content ownership | always |
| SEO-011 | EXTRA | Map frontend, backend, API, CMS, edge, CDN, and external-service ownership | always |
| SEO-012 | EXTRA | Map monorepo workspaces, public apps, shared SEO utilities, domains, and canonical boundaries | always |
| SEO-013 | EXTRA | Inventory public images, videos, feeds, PDFs, manifests, JSON endpoints, and generated social assets | always |
| SEO-014 | ULTRA | Detect Next.js App Router and Pages Router metadata, route, runtime, caching, and generated-resource ownership | always |
| SEO-015 | ULTRA | Detect React SPA, SSR, SSG, and Python Django, FastAPI, and Flask rendering and routing ownership | always |
| SEO-016 | ULTRA | Record architecture uncertainty and confidence | always |

## Domain: urls (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-017 | LITE | Use one production HTTPS origin | always |
| SEO-018 | LITE | Keep public URLs stable and deterministic | always |
| SEO-019 | LITE | Return accurate HTTP status codes | always |
| SEO-020 | LITE | Avoid crawlable duplicate query variants | always |
| SEO-021 | RECOMMENDED | Normalize host and protocol with redirects | always |
| SEO-022 | RECOMMENDED | Choose and enforce trailing-slash policy | always |
| SEO-023 | RECOMMENDED | Use descriptive human-readable slugs | always |
| SEO-024 | RECOMMENDED | Preserve valid inbound URLs during migrations | always |
| SEO-025 | RECOMMENDED | Prevent redirect chains and loops | always |
| SEO-026 | RECOMMENDED | Return 404 or 410 for removed resources | always |
| SEO-027 | EXTRA | Control faceted-navigation URL expansion | always |
| SEO-028 | EXTRA | Normalize case and percent encoding safely | always |
| SEO-029 | EXTRA | Audit pagination URL stability | always |
| SEO-030 | ULTRA | Validate soft-404 behavior at scale | always |
| SEO-031 | ULTRA | Separate public routes from action and API endpoints | always |
| SEO-032 | ULTRA | Document URL migration rollback and monitoring | always |

## Domain: metadata (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-033 | LITE | Render one descriptive title per indexable page | always |
| SEO-034 | LITE | Render one accurate meta description per indexable page | always |
| SEO-035 | LITE | Declare document language | always |
| SEO-036 | LITE | Set a valid mobile viewport | always |
| SEO-037 | RECOMMENDED | Use unique route-aware titles | always |
| SEO-038 | RECOMMENDED | Keep titles aligned with visible primary heading | always |
| SEO-039 | RECOMMENDED | Generate metadata on the server when required for crawling | always |
| SEO-040 | RECOMMENDED | Set Open Graph title description URL and type | always |
| SEO-041 | RECOMMENDED | Set social preview image with dimensions and alt text | always |
| SEO-042 | RECOMMENDED | Set Twitter card metadata when useful | always |
| SEO-043 | EXTRA | Audit title truncation and boilerplate balance | always |
| SEO-044 | EXTRA | Provide content-specific preview images | always |
| SEO-045 | EXTRA | Declare theme color and supported color schemes accurately | always |
| SEO-046 | ULTRA | Prevent stale metadata after cache revalidation | always |
| SEO-047 | ULTRA | Validate metadata for parameterized and fallback routes | always |
| SEO-048 | ULTRA | Test preview parsers against production-equivalent URLs | always |

## Domain: canonicals (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-049 | LITE | Emit an absolute self-canonical for unique indexable pages | always |
| SEO-050 | LITE | Use the production canonical origin | always |
| SEO-051 | LITE | Keep canonical targets indexable and successful | always |
| SEO-052 | LITE | Exclude tracking parameters from canonical URLs | always |
| SEO-053 | RECOMMENDED | Canonicalize duplicate route aliases | always |
| SEO-054 | RECOMMENDED | Align internal links with canonical URLs | always |
| SEO-055 | RECOMMENDED | Align sitemap URLs with canonical URLs | always |
| SEO-056 | RECOMMENDED | Canonicalize paginated pages intentionally | always |
| SEO-057 | RECOMMENDED | Use HTTP Link canonicals for eligible non-HTML resources | always |
| SEO-058 | RECOMMENDED | Prevent canonical tags from depending on untrusted host headers | always |
| SEO-059 | EXTRA | Resolve canonical and hreflang relationships | always |
| SEO-060 | EXTRA | Audit cross-domain canonical intent | always |
| SEO-061 | EXTRA | Handle syndicated content canonicals explicitly | always |
| SEO-062 | ULTRA | Detect canonical signal conflicts in rendered output | always |
| SEO-063 | ULTRA | Validate canonicals across ISR SSR SSG and fallback states | always |
| SEO-064 | ULTRA | Monitor search-selected canonical divergence | always |

## Domain: crawling (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-065 | LITE | Keep indexable pages reachable by crawlable links | always |
| SEO-066 | LITE | Allow required rendering resources | always |
| SEO-067 | LITE | Avoid infinite crawl spaces | always |
| SEO-068 | LITE | Keep public navigation available without user gestures | always |
| SEO-069 | RECOMMENDED | Control calendar and search-result crawl traps | always |
| SEO-070 | RECOMMENDED | Control session and tracking parameter crawling | always |
| SEO-071 | RECOMMENDED | Avoid crawler-dependent cloaking | always |
| SEO-072 | RECOMMENDED | Return consistent content to legitimate crawlers and users | always |
| SEO-073 | RECOMMENDED | Limit low-value filter and sort combinations | always |
| SEO-074 | RECOMMENDED | Expose finite pagination paths | always |
| SEO-075 | EXTRA | Manage crawl demand for very large sites | always |
| SEO-076 | EXTRA | Validate JavaScript-rendered link discovery | always |
| SEO-077 | EXTRA | Audit crawl behavior behind consent systems | always |
| SEO-078 | ULTRA | Analyze server logs for crawler waste | always |
| SEO-079 | ULTRA | Model crawl budgets per host and tenant | always |
| SEO-080 | ULTRA | Test crawler behavior through failover infrastructure | always |

## Domain: robots (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-081 | LITE | Serve a syntactically valid robots.txt at each public host root | always |
| SEO-082 | LITE | Reference canonical sitemap indexes from the correct robots.txt host | always |
| SEO-083 | LITE | Separate production, staging, crawler-specific, and wildcard robots policies without contradictory groups | always |
| SEO-084 | LITE | Apply meta robots noindex, index, nofollow, and follow directives intentionally | always |
| SEO-085 | RECOMMENDED | Apply X-Robots-Tag to HTML or non-HTML responses that require header-level control | always |
| SEO-086 | RECOMMENDED | Use rel nofollow, ugc, and sponsored on links according to trust and compensation policy | always |
| SEO-087 | RECOMMENDED | Set max-image-preview deliberately, including large previews required by the Discover image strategy | always |
| SEO-088 | RECOMMENDED | Set max-snippet deliberately and preserve useful search previews | always |
| SEO-089 | RECOMMENDED | Set max-video-preview deliberately for pages with indexable video | always |
| SEO-090 | RECOMMENDED | Implement nosnippet and data-nosnippet without hiding required visible or structured content | always |
| SEO-091 | EXTRA | Evaluate noarchive, notranslate, and unavailable_after only where supported and justified | always |
| SEO-092 | EXTRA | Use indexifembedded only for eligible embedded content with an intentional noindex policy | always |
| SEO-093 | EXTRA | Keep Googlebot, image, news, video, Bingbot, and approved AI crawler policies purpose-specific | always |
| SEO-094 | ULTRA | Resolve robots.txt, meta robots, X-Robots-Tag, canonical, and sitemap precedence conflicts | always |
| SEO-095 | ULTRA | Keep CSS, JavaScript, images, video, and other rendering resources crawlable when public pages depend on them | always |
| SEO-096 | ULTRA | Monitor, version, parse-test, and roll back crawler directive changes | always |

## Domain: indexing (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-097 | LITE | Index only public valuable canonical pages | always |
| SEO-098 | LITE | Exclude private authenticated and admin pages | always |
| SEO-099 | LITE | Exclude drafts previews and staging content | always |
| SEO-100 | LITE | Remove deleted content with accurate lifecycle responses | always |
| SEO-101 | RECOMMENDED | Prevent indexable internal search results | always |
| SEO-102 | RECOMMENDED | Prevent indexable error and empty-state pages | always |
| SEO-103 | RECOMMENDED | Keep pagination indexability intentional | always |
| SEO-104 | RECOMMENDED | Handle expired content with an explicit policy | always |
| SEO-105 | RECOMMENDED | Detect accidental noindex on production pages | always |
| SEO-106 | RECOMMENDED | Detect indexable duplicate content clusters | always |
| SEO-107 | EXTRA | Design reindexing after major migrations | always |
| SEO-108 | EXTRA | Manage indexability for user-specific pages | always |
| SEO-109 | EXTRA | Audit orphaned indexed URLs | always |
| SEO-110 | ULTRA | Reconcile indexed inventory with canonical inventory | always |
| SEO-111 | ULTRA | Model deletion propagation and legal removals | always |
| SEO-112 | ULTRA | Track index coverage anomalies by template | always |

## Domain: sitemaps (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-113 | LITE | Serve a valid XML sitemap or sitemap index | always |
| SEO-114 | LITE | List only absolute canonical indexable URLs | always |
| SEO-115 | LITE | Use accurate last modification dates | always |
| SEO-116 | LITE | Keep sitemap URLs on the intended verified site | always |
| SEO-117 | RECOMMENDED | Split sitemaps within protocol limits | always |
| SEO-118 | RECOMMENDED | Use sitemap indexes for multiple content groups | always |
| SEO-119 | RECOMMENDED | Regenerate sitemaps after content lifecycle changes | always |
| SEO-120 | RECOMMENDED | Exclude alternate parameter and tracking URLs | always |
| SEO-121 | RECOMMENDED | Expose image sitemap extensions when valuable | always |
| SEO-122 | RECOMMENDED | Expose video sitemap extensions when valuable | always |
| SEO-123 | EXTRA | Partition sitemaps by content type or freshness | always |
| SEO-124 | EXTRA | Support multi-app and multi-domain sitemap ownership | always |
| SEO-125 | EXTRA | Compress large sitemaps safely | always |
| SEO-126 | ULTRA | Validate every sitemap URL sample over HTTP | always |
| SEO-127 | ULTRA | Monitor sitemap generation failures and staleness | always |
| SEO-128 | ULTRA | Reconcile sitemap inventory with route and CMS inventories | always |

## Domain: google-search (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-129 | LITE | Prepare the correct Google Search Console property and DNS or file verification as a manual action | public_site |
| SEO-130 | LITE | Verify Google Search crawl, index, snippet, image, video, news, and Lens-related eligibility prerequisites | public_site |
| SEO-131 | LITE | Meet Google spam policy fundamentals | public_site |
| SEO-132 | LITE | Avoid intrusive interstitials that obstruct primary content | public_site |
| SEO-133 | RECOMMENDED | Submit canonical sitemaps through manual action | public_site |
| SEO-134 | RECOMMENDED | Use URL Inspection and production-equivalent rendering for representative canonical URLs | public_site |
| SEO-135 | RECOMMENDED | Review Page indexing classifications, crawl stats, soft 404s, and duplicate canonical decisions | public_site |
| SEO-136 | RECOMMENDED | Review enhancements and rich-result reports without equating Schema.org validity with Google eligibility | public_site |
| SEO-137 | RECOMMENDED | Review Google manual actions and security issues through authorized evidence | public_site |
| SEO-138 | RECOMMENDED | Review HTTPS and Core Web Vitals reports and preserve verification across deployments | public_site |
| SEO-139 | EXTRA | Use Search Console exports and APIs only with authorized credentials, rate limits, retries, and failure isolation | public_site |
| SEO-140 | EXTRA | Segment properties for protocols domains and subdomains intentionally | public_site |
| SEO-141 | EXTRA | Analyze Search Console clicks, impressions, CTR, position, and query trends by page and search type | public_site |
| SEO-142 | ULTRA | Analyze Discover, image, video, and news reporting only when those Search Console reports are available | public_site |
| SEO-143 | ULTRA | Create migration annotations and comparison windows | public_site |
| SEO-144 | ULTRA | Automate authorized Search Console monitoring without claiming external account setup or coverage | public_site |

## Domain: bing-indexnow (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-145 | LITE | Prepare Bing Webmaster Tools site verification and sitemap submission as evidenced manual actions | public_site |
| SEO-146 | LITE | Verify Bingbot access, crawl controls, URL inspection, indexing, and crawl-error diagnostics | public_site |
| SEO-147 | LITE | Host the IndexNow key correctly and use the documented endpoint and keyLocation rules | public_site |
| SEO-148 | LITE | Submit only canonical public URLs and exclude private, blocked, redirected, and noindex URLs from IndexNow | public_site |
| SEO-149 | RECOMMENDED | Submit IndexNow additions, material updates, and deletions from the authoritative publish lifecycle | public_site |
| SEO-150 | RECOMMENDED | Batch and rate-limit IndexNow submissions within current protocol and endpoint limits | public_site |
| SEO-151 | RECOMMENDED | Run IndexNow asynchronously with bounded retries, timeout handling, and per-URL failure isolation | public_site |
| SEO-152 | RECOMMENDED | Protect IndexNow submission credentials while exposing only the required public verification key | public_site |
| SEO-153 | RECOMMENDED | Preserve Bing verification during deployments | public_site |
| SEO-154 | RECOMMENDED | Review Bing URL Inspection, Site Scan, SEO reports, backlinks, search performance, and crawl diagnostics | public_site |
| SEO-155 | EXTRA | Deduplicate IndexNow events idempotently and log request, response, retry, and exclusion outcomes | public_site |
| SEO-156 | EXTRA | Integrate IndexNow with CMS, ecommerce, deployment, and deletion events without blocking page rendering | public_site |
| SEO-157 | EXTRA | Monitor IndexNow delivery without treating it as indexing proof or an XML sitemap replacement | public_site |
| SEO-158 | ULTRA | Use Bing Webmaster APIs only with authorized credentials, rate limits, retries, and failure isolation | public_site |
| SEO-159 | ULTRA | Review Bing Copilot, AI Performance, and AI visibility reporting only where the authorized product exposes it | public_site |
| SEO-160 | ULTRA | Assess Yahoo, DuckDuckGo, Brave, and other downstream search surfaces without unsupported submission claims | public_site |

## Domain: structured-data (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-161 | LITE | Emit valid JSON-LD syntax | public_site |
| SEO-162 | LITE | Match structured data to visible page content | public_site |
| SEO-163 | LITE | Use the most specific truthful Schema.org types | public_site |
| SEO-164 | LITE | Use canonical absolute URLs in structured data | public_site |
| SEO-165 | RECOMMENDED | Target only currently supported Google structured-data features and satisfy page-specific eligibility requirements | public_site |
| SEO-166 | RECOMMENDED | Record current Bing structured-data support separately from Schema.org and Google support | public_site |
| SEO-167 | RECOMMENDED | Avoid duplicate conflicting entity objects | public_site |
| SEO-168 | RECOMMENDED | Keep structured data server-rendered when crawler execution is uncertain | public_site |
| SEO-169 | RECOMMENDED | Represent breadcrumbs only when visible navigation supports them | public_site |
| SEO-170 | RECOMMENDED | Test Schema.org validity, Google rich-result eligibility, Bing support, visible-content parity, and rendered JSON-LD | public_site |
| SEO-171 | EXTRA | Classify every schema use as Schema.org validity, Google eligibility, Bing support, search usefulness, and AI relevance | public_site |
| SEO-172 | EXTRA | Model Article, NewsArticle, CreativeWork, SoftwareApplication, WebApplication, and other truthful page entities without markup spam | public_site |
| SEO-173 | EXTRA | Handle user-generated ratings and reviews truthfully | public_site |
| SEO-174 | ULTRA | Do not use unsupported rich-result schema merely because a type is valid in Schema.org | public_site |
| SEO-175 | ULTRA | Version structured-data generators and schemas | public_site |
| SEO-176 | ULTRA | Monitor rich-result eligibility regressions without guarantees | public_site |

## Domain: entity (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-177 | LITE | Define stable absolute @id values for WebSite and canonical site identity | public_site |
| SEO-178 | LITE | Define truthful Person or Organization publisher entities and connect brand ownership | public_site |
| SEO-179 | LITE | Connect WebPage to WebSite with isPartOf and to canonical URL and primary entities | public_site |
| SEO-180 | LITE | Implement WebSite name and alternateName with visible, title, favicon, canonical, and entity-name consistency | public_site |
| SEO-181 | RECOMMENDED | Use stable entity identifiers across pages | public_site |
| SEO-182 | RECOMMENDED | Connect author, creator, and publisher relationships to Article and CreativeWork entities | public_site |
| SEO-183 | RECOMMENDED | Use sameAs only for verified authoritative profiles | public_site |
| SEO-184 | RECOMMENDED | Distinguish person organization brand and product entities | public_site |
| SEO-185 | RECOMMENDED | Use mainEntity, mainEntityOfPage, about, and mentions to express truthful page relationships | public_site |
| SEO-186 | RECOMMENDED | Detect disconnected, duplicate, and conflicting JSON-LD entities and @id values | public_site |
| SEO-187 | EXTRA | Model parent subsidiary and brand relationships accurately | public_site |
| SEO-188 | EXTRA | Represent multi-tenant entity ownership explicitly | public_site |
| SEO-189 | EXTRA | Reconcile CMS entity IDs with public canonical IDs | public_site |
| SEO-190 | ULTRA | Audit entity facts against authoritative sources | public_site |
| SEO-191 | ULTRA | Track entity merges splits and rebrands | public_site |
| SEO-192 | ULTRA | Validate a coherent graph across WebSite, WebPage, Person, Organization, Article, BreadcrumbList, ImageObject, VideoObject, and eligible SearchAction | public_site |

## Domain: content (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-193 | LITE | Give each indexable page a clear primary purpose | public_site |
| SEO-194 | LITE | Provide original value, information gain, first-hand evidence, or useful synthesis without fabricated expertise | public_site |
| SEO-195 | LITE | Use one descriptive visible primary heading | public_site |
| SEO-196 | LITE | Keep critical information in crawlable text | public_site |
| SEO-197 | RECOMMENDED | Answer the page's primary intent directly | public_site |
| SEO-198 | RECOMMENDED | Use semantic headings, concise passages, definitions, tables, lists, and question-answer sections where natural | public_site |
| SEO-199 | RECOMMENDED | Identify truthful authors, publishers, experience, expertise, and responsibility where relevant | public_site |
| SEO-200 | RECOMMENDED | Publish accurate created and modified dates and prevent fake freshness | public_site |
| SEO-201 | RECOMMENDED | Cite primary sources for factual claims when useful | public_site |
| SEO-202 | RECOMMENDED | Prune or consolidate thin, duplicate, cannibalizing, and obsolete content with safe lifecycle handling | public_site |
| SEO-203 | EXTRA | Create retrieval-friendly answer passages with stable headings, entity context, dates, and source attribution | public_site |
| SEO-204 | EXTRA | Map search intent, queries, topics, entities, content clusters, and contextual internal links without doorway pages | public_site |
| SEO-205 | EXTRA | Implement only technically actionable off-page signals such as attribution, syndication canonicals, sponsored links, and link reclamation | public_site |
| SEO-206 | ULTRA | Audit content decay and factual staleness | public_site |
| SEO-207 | ULTRA | Apply programmatic and enterprise SEO quality gates to templates, inventories, variants, and large-scale publishing | public_site |
| SEO-208 | ULTRA | Detect keyword stuffing, unnatural headings or anchors, fake facts or reviews, schema spam, cloaking, scaled abuse, and reputation abuse | public_site |

## Domain: internal-linking (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-209 | LITE | Link every important page from crawlable site paths | public_site |
| SEO-210 | LITE | Use descriptive anchor text | public_site |
| SEO-211 | LITE | Keep navigation links as real URLs | public_site |
| SEO-212 | LITE | Avoid broken internal links | public_site |
| SEO-213 | RECOMMENDED | Provide breadcrumbs for deep hierarchies when useful | public_site |
| SEO-214 | RECOMMENDED | Link related content contextually | public_site |
| SEO-215 | RECOMMENDED | Prevent important pages from becoming orphaned | public_site |
| SEO-216 | RECOMMENDED | Prefer canonical destination URLs in links | public_site |
| SEO-217 | RECOMMENDED | Control links to noindex and private routes | public_site |
| SEO-218 | RECOMMENDED | Keep footer and boilerplate links purposeful | public_site |
| SEO-219 | EXTRA | Model hub and spoke relationships for large topics | public_site |
| SEO-220 | EXTRA | Audit link equity traps caused by filters and pagination | public_site |
| SEO-221 | EXTRA | Use faceted links selectively | public_site |
| SEO-222 | ULTRA | Analyze internal graph depth and centrality | public_site |
| SEO-223 | ULTRA | Monitor orphan creation in CMS publishing | public_site |
| SEO-224 | ULTRA | Test navigation under JavaScript failure and hydration delay | public_site |

## Domain: images (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-225 | LITE | Provide meaningful alt text for informative images | has_images |
| SEO-226 | LITE | Use empty alt text for decorative images | has_images |
| SEO-227 | LITE | Declare intrinsic image dimensions and appropriate aspect ratios to prevent layout shift and bad crops | has_images |
| SEO-228 | LITE | Serve responsive images with srcset and sizes or the framework-equivalent such as next/image | has_images |
| SEO-229 | RECOMMENDED | Choose WebP, AVIF, or another supported image format according to content and browser delivery needs | has_images |
| SEO-230 | RECOMMENDED | Compress and cache images through the origin or CDN without stripping required rights metadata | has_images |
| SEO-231 | RECOMMENDED | Lazy-load below-the-fold images while excluding likely LCP and explicitly prioritized images | has_images |
| SEO-232 | RECOMMENDED | Prioritize likely LCP images | has_images |
| SEO-233 | RECOMMENDED | Use stable descriptive filenames, captions, nearby context, and accessible image relationships | has_images |
| SEO-234 | RECOMMENDED | Keep important images crawlable for Google Images and Lens-related discovery without exposing private media | has_images |
| SEO-235 | EXTRA | Publish truthful image licensing metadata: ImageObject creditText, creator, copyrightNotice, license, and acquireLicensePage data when available | has_images |
| SEO-236 | EXTRA | Add image sitemap data for discovery-critical assets | has_images |
| SEO-237 | EXTRA | Preserve or intentionally manage EXIF, IPTC, XMP, creator, credit, copyright, and licensing metadata | has_images |
| SEO-238 | ULTRA | Validate CDN transformations for crawler user agents | has_images |
| SEO-239 | ULTRA | Audit duplicate image variants and canonical asset URLs | has_images |
| SEO-240 | ULTRA | Monitor Google Images, Discover image performance, preview controls, and licensing eligibility without guarantees | has_images |

## Domain: video (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-241 | LITE | Publish a truthful VideoObject name and description aligned with visible video content | has_video |
| SEO-242 | LITE | Publish crawlable representative thumbnails, poster images, and thumbnail metadata | has_video |
| SEO-243 | LITE | Publish accurate uploadDate, duration, contentUrl, embedUrl, and player URL values when applicable | has_video |
| SEO-244 | LITE | Provide synchronized captions, subtitles, and accessible controls for spoken or meaningful video | has_video |
| SEO-245 | RECOMMENDED | Provide a crawlable transcript and connect it to the primary video page | has_video |
| SEO-246 | RECOMMENDED | Provide chapters, clips, or key moments only when timestamps and labels are accurate | has_video |
| SEO-247 | RECOMMENDED | Keep the primary video visibly prominent on a dedicated indexable watch or content page | has_video |
| SEO-248 | RECOMMENDED | Keep VideoObject, visible page facts, player configuration, and video sitemap data consistent | has_video |
| SEO-249 | RECOMMENDED | Configure poster, preload, lazy loading, autoplay, and muted autoplay for usable mobile playback | has_video |
| SEO-250 | RECOMMENDED | Keep JavaScript players, iframe embeds, YouTube, Vimeo, and self-hosted resources crawlable as intended | has_video |
| SEO-251 | EXTRA | Generate valid video sitemap entries with canonical page, thumbnail, title, description, and player or content URLs | has_video |
| SEO-252 | EXTRA | Deliver self-hosted video through suitable CDN, codec, resolution, bandwidth, and aspect-ratio variants | has_video |
| SEO-253 | EXTRA | Protect Core Web Vitals and mobile behavior when loading video players and media | has_video |
| SEO-254 | ULTRA | Test Google video eligibility, rendered player visibility, thumbnail access, and video indexing prerequisites | has_video |
| SEO-255 | ULTRA | Handle live, expired, removed, replaced, and third-party video lifecycle states | has_video |
| SEO-256 | ULTRA | Monitor video Search, video pages in Discover where applicable, accessibility, privacy, and embed regressions | has_video |

## Domain: discover (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-257 | LITE | Confirm Discover eligibility prerequisites without implying inclusion can be forced | editorial_content |
| SEO-258 | LITE | Use accurate, compelling, non-clickbait headlines and preview text without withheld context | editorial_content |
| SEO-259 | LITE | Publish original, helpful, policy-compliant editorial content with clear topical relevance | editorial_content |
| SEO-260 | LITE | Avoid intrusive interstitials, deceptive ads, and layouts that obstruct primary content | editorial_content |
| SEO-261 | RECOMMENDED | Provide crawlable representative images at least 1200 pixels wide when the Discover strategy requires large previews | editorial_content |
| SEO-262 | RECOMMENDED | Allow max-image-preview:large when approved and keep image dimensions, aspect ratios, alt text, and crops suitable | editorial_content |
| SEO-263 | RECOMMENDED | Show consistent publisher, site, and truthful author identity on Discover-targeted content | editorial_content |
| SEO-264 | RECOMMENDED | Use accurate freshness, publication, and modification signals without cosmetic date changes | editorial_content |
| SEO-265 | RECOMMENDED | Avoid sensational or withheld-context preview text | editorial_content |
| SEO-266 | RECOMMENDED | Keep Discover-targeted pages fast, mobile-friendly, accessible, and strong on Core Web Vitals | editorial_content |
| SEO-267 | EXTRA | Maintain topical expertise and content credibility | editorial_content |
| SEO-268 | EXTRA | Refresh content only when materially updated | editorial_content |
| SEO-269 | EXTRA | Analyze Search Console Discover reporting, traffic, pages, countries, and dates only when the report exists | editorial_content |
| SEO-270 | ULTRA | Validate image crop safety across Discover surfaces | editorial_content |
| SEO-271 | ULTRA | Monitor Discover content policies, manual actions, ad experience, and sensitive-topic risks | editorial_content |
| SEO-272 | ULTRA | Build editorial incident rollback for misleading metadata | editorial_content |

## Domain: ai-search (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-273 | LITE | Provide concise direct answers and definitions while preserving complete user-oriented context | public_site |
| SEO-274 | LITE | Use consistent explicit entity names, relationships, identifiers, dates, and terminology | public_site |
| SEO-275 | LITE | Keep factual claims, statistics, citations, and source attribution accurate and current | public_site |
| SEO-276 | LITE | Expose canonical content in semantic, accessible, server-readable HTML with stable URLs | public_site |
| SEO-277 | RECOMMENDED | Structure retrieval-friendly sections, comparisons, steps, tables, lists, and FAQs only where natural | public_site |
| SEO-278 | RECOMMENDED | Cite authoritative primary sources where useful | public_site |
| SEO-279 | RECOMMENDED | Distinguish facts opinions and marketing claims | public_site |
| SEO-280 | RECOMMENDED | Publish truthful author, publisher, creator, correction, and provenance signals | public_site |
| SEO-281 | RECOMMENDED | Keep canonical pages accessible to permitted AI search crawlers | public_site |
| SEO-282 | RECOMMENDED | Use stable descriptive headings and fragments for passage-level discovery and citation | public_site |
| SEO-283 | EXTRA | Provide machine-readable summaries and metadata without robotic AI-only duplicate text | public_site |
| SEO-284 | EXTRA | Classify AEO, GEO, LEO, LLMO, MEO, VEO, AISEO, GAIO, AAIO, AIO, AXO, SXO, and XEO without presenting industry terms as ranking factors | public_site |
| SEO-285 | EXTRA | Audit citation readiness, evidence quality, knowledge-graph clarity, and source transparency | public_site |
| SEO-286 | ULTRA | Measure AI referral traffic without over-attribution | public_site |
| SEO-287 | ULTRA | Test AI answer extraction and passage interpretation while recording output as experimental evidence | public_site |
| SEO-288 | ULTRA | Maintain correction and retraction signals for AI consumers | public_site |

## Domain: ai-crawlers (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-289 | LITE | Maintain a crawler matrix that separates search indexing, AI retrieval, AI training, user-triggered fetching, and preview generation | public_site |
| SEO-290 | LITE | Define purpose-specific policies for Googlebot, Googlebot-Image, Googlebot-News, and Googlebot-Video | public_site |
| SEO-291 | LITE | Define Google-Extended policy separately from Google Search indexing controls | public_site |
| SEO-292 | LITE | Define Bingbot and other documented Microsoft crawler policies separately from Bing AI reporting | public_site |
| SEO-293 | RECOMMENDED | Define GPTBot policy for model-training access without conflating it with OpenAI search | public_site |
| SEO-294 | RECOMMENDED | Define OAI-SearchBot policy for search discovery according to current OpenAI documentation | public_site |
| SEO-295 | RECOMMENDED | Define ChatGPT-User policy for user-triggered fetching according to current OpenAI documentation | public_site |
| SEO-296 | RECOMMENDED | Define ClaudeBot and other documented Anthropic crawler policies by stated purpose | public_site |
| SEO-297 | RECOMMENDED | Define PerplexityBot policy according to current operator documentation and business goals | public_site |
| SEO-298 | RECOMMENDED | Define Amazonbot and Applebot policies according to their documented purposes | public_site |
| SEO-299 | EXTRA | Define Bytespider and documented Meta crawler policies with legal, training, search, and security review | public_site |
| SEO-300 | EXTRA | Keep private and authenticated content protected regardless of robots.txt or crawler identity | public_site |
| SEO-301 | EXTRA | Align crawler policy with licensing, terms, copyright, attribution, and business implications | public_site |
| SEO-302 | ULTRA | Align robots.txt, CDN, WAF, rate limits, challenge behavior, and recommended crawler policy | public_site |
| SEO-303 | ULTRA | Verify crawler access through CDN and origin without trusting spoofable user-agent strings alone | public_site |
| SEO-304 | ULTRA | Monitor crawler identities, logs, policy changes, security implications, and retired user-agent tokens | public_site |

## Domain: llms-txt (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-305 | LITE | Serve llms.txt publicly at the root when adopted | public_site |
| SEO-306 | LITE | Use absolute canonical HTTPS URLs | public_site |
| SEO-307 | LITE | Describe the site and important resources concisely | public_site |
| SEO-308 | LITE | Exclude private draft admin and secret URLs | public_site |
| SEO-309 | RECOMMENDED | Link only maintained high-value public pages | public_site |
| SEO-310 | RECOMMENDED | Keep descriptions factual and non-promotional | public_site |
| SEO-311 | RECOMMENDED | Consider llms-full.txt only when justified, maintainable, public, and supported by current ecosystem evidence | public_site |
| SEO-312 | RECOMMENDED | Update llms.txt after canonical URL changes | public_site |
| SEO-313 | RECOMMENDED | Return a successful plain-text response | public_site |
| SEO-314 | RECOMMENDED | Avoid treating llms.txt as an official search ranking factor | public_site |
| SEO-315 | EXTRA | Group resources by audience or content type | public_site |
| SEO-316 | EXTRA | Provide optional deeper documentation links without dumping the sitemap | public_site |
| SEO-317 | EXTRA | Validate referenced URLs automatically | public_site |
| SEO-318 | ULTRA | Track convention changes from primary project sources | public_site |
| SEO-319 | ULTRA | Version llms.txt content and rollback policy | public_site |
| SEO-320 | ULTRA | Measure consumer access without assuming downstream use | public_site |

## Domain: performance (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-321 | LITE | Optimize likely Largest Contentful Paint elements | public_site |
| SEO-322 | LITE | Prevent avoidable Cumulative Layout Shift | public_site |
| SEO-323 | LITE | Keep interactions responsive for Interaction to Next Paint | public_site |
| SEO-324 | LITE | Reduce avoidable server response latency | public_site |
| SEO-325 | RECOMMENDED | Limit render-blocking CSS and scripts | public_site |
| SEO-326 | RECOMMENDED | Code-split noncritical JavaScript | public_site |
| SEO-327 | RECOMMENDED | Avoid unnecessary client rendering for static content | public_site |
| SEO-328 | RECOMMENDED | Load fonts with efficient subsets and fallbacks | public_site |
| SEO-329 | RECOMMENDED | Preconnect only to critical origins | public_site |
| SEO-330 | RECOMMENDED | Control third-party script cost | public_site |
| SEO-331 | EXTRA | Measure LCP, INP, CLS, TTFB, FCP, and Speed Index in appropriate field and lab contexts | public_site |
| SEO-332 | EXTRA | Set budgets for JavaScript bundles, hydration, long tasks, main-thread work, fonts, images, video, and third parties | public_site |
| SEO-333 | EXTRA | Audit preload, preconnect, DNS, TLS, HTTP/2, HTTP/3, Brotli, gzip, CDN, edge, streaming, and server-rendering tradeoffs | public_site |
| SEO-334 | ULTRA | Monitor Core Web Vitals by percentile and device class | public_site |
| SEO-335 | ULTRA | Profile WebGL, Three.js, React Three Fiber, GSAP, ScrollTrigger, Lenis, GLB, textures, animation, memory, and mobile cost when present | public_site |
| SEO-336 | ULTRA | Regression-test critical rendering paths under constrained networks | public_site |

## Domain: caching (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-337 | LITE | Set explicit Cache-Control for public static assets | public_site |
| SEO-338 | LITE | Use content-hashed immutable asset URLs | public_site |
| SEO-339 | LITE | Prevent shared caching of private responses | public_site |
| SEO-340 | LITE | Keep HTML freshness aligned with content update needs | public_site |
| SEO-341 | RECOMMENDED | Use ETag and If-None-Match validators where stable, correct, and beneficial | public_site |
| SEO-342 | RECOMMENDED | Use Last-Modified and If-Modified-Since only when timestamps are accurate | public_site |
| SEO-343 | RECOMMENDED | Return correct 304 responses without bodies or lost cache metadata | public_site |
| SEO-344 | RECOMMENDED | Configure stale-while-revalidate and stale-if-error intentionally across browser, CDN, and origin layers | public_site |
| SEO-345 | RECOMMENDED | Vary responses only on necessary request headers | public_site |
| SEO-346 | RECOMMENDED | Purge or revalidate changed canonical content | public_site |
| SEO-347 | EXTRA | Distinguish public, private, personalized, and authenticated cache behavior and prevent cache poisoning | public_site |
| SEO-348 | EXTRA | Prevent cache poisoning and unkeyed-input variance | public_site |
| SEO-349 | EXTRA | Model freshness for CMS webhooks and ISR | public_site |
| SEO-350 | ULTRA | Test cache behavior across authenticated state transitions | public_site |
| SEO-351 | ULTRA | Measure crawler cache validation efficiency | public_site |
| SEO-352 | ULTRA | Monitor stale content incidents and purge failures | public_site |

## Domain: bfcache (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-353 | LITE | Avoid unnecessary unload and beforeunload handlers that block BFCache | interactive_app |
| SEO-354 | LITE | Use pageshow and pagehide, including persisted state, for BFCache-safe lifecycle handling | interactive_app |
| SEO-355 | LITE | Restore scroll, form, SPA navigation, and browser-history state safely after BFCache navigation | interactive_app |
| SEO-356 | LITE | Preserve form and scroll state intentionally | interactive_app |
| SEO-357 | RECOMMENDED | Suspend or restore WebSocket, realtime, WebGL, and other incompatible resources safely | interactive_app |
| SEO-358 | RECOMMENDED | Handle persisted pageshow events | interactive_app |
| SEO-359 | RECOMMENDED | Avoid cache-control directives that unnecessarily block BFCache | interactive_app |
| SEO-360 | RECOMMENDED | Test history navigation on critical journeys | interactive_app |
| SEO-361 | RECOMMENDED | Revalidate sensitive data after restoration | interactive_app |
| SEO-362 | RECOMMENDED | Test BFCache on mobile and desktop and document actual blockers rather than adding claim-only code | interactive_app |
| SEO-363 | EXTRA | Audit third-party scripts that block BFCache | interactive_app |
| SEO-364 | EXTRA | Measure BFCache hit rate where browser tooling permits | interactive_app |
| SEO-365 | EXTRA | Test SPA and full-document navigation interactions | interactive_app |
| SEO-366 | ULTRA | Automate BFCache eligibility checks for critical templates | interactive_app |
| SEO-367 | ULTRA | Document unavoidable blockers with business rationale | interactive_app |
| SEO-368 | ULTRA | Monitor lifecycle regressions after browser upgrades | interactive_app |

## Domain: accessibility (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-369 | LITE | Use semantic HTML, landmarks, headings, accessible names, and robust ARIA only where needed | public_site |
| SEO-370 | LITE | Provide complete keyboard access and alternatives to dragging interactions | public_site |
| SEO-371 | LITE | Meet WCAG 2.2 AA focus appearance and focus-not-obscured requirements | public_site |
| SEO-372 | LITE | Maintain a logical heading hierarchy | public_site |
| SEO-373 | RECOMMENDED | Provide labels, accessible authentication, error identification, suggestions, and redundant-entry support | public_site |
| SEO-374 | RECOMMENDED | Meet applicable contrast, text spacing, reflow, zoom, and target-size requirements | public_site |
| SEO-375 | RECOMMENDED | Respect reduced motion and keep animation, video, and 3D experiences operable | public_site |
| SEO-376 | RECOMMENDED | Test screen readers, dialogs, modals, status messages, forms, and dynamic content on critical journeys | public_site |
| SEO-377 | RECOMMENDED | Provide skip navigation for repeated content | public_site |
| SEO-378 | RECOMMENDED | Expose dynamic status messages accessibly | public_site |
| SEO-379 | EXTRA | Meet applicable target-size requirements | public_site |
| SEO-380 | EXTRA | Keep focus unobscured and predictable | public_site |
| SEO-381 | EXTRA | Test reflow and zoom without loss of content | public_site |
| SEO-382 | ULTRA | Perform screen-reader testing on critical journeys | public_site |
| SEO-383 | ULTRA | Separate SEO, accessibility, and UX findings while documenting meaningful overlap | public_site |
| SEO-384 | ULTRA | Track accessibility regressions in design-system releases | public_site |

## Domain: security (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-385 | LITE | Keep secrets out of public code and responses | always |
| SEO-386 | LITE | Prevent indexing of authenticated and private content | always |
| SEO-387 | LITE | Protect admin preview and draft routes | always |
| SEO-388 | LITE | Detect malicious redirects and injected links | always |
| SEO-389 | RECOMMENDED | Detect hacked pages, pharmaceutical spam, Japanese keyword hacks, doorway injection, hidden links, and injected structured data | always |
| SEO-390 | RECOMMENDED | Apply HTTPS, HSTS, CSP, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, and secure cookies safely | always |
| SEO-391 | RECOMMENDED | Prevent open redirects on public routes | always |
| SEO-392 | RECOMMENDED | Keep dependency and CMS security posture reviewable | always |
| SEO-393 | RECOMMENDED | Avoid exposing source maps or debug output unintentionally | always |
| SEO-394 | RECOMMENDED | Prevent user-controlled content from injecting metadata, canonicals, hreflang, robots directives, sitemaps, or JSON-LD | always |
| SEO-395 | EXTRA | Detect cloaking, malicious redirects, malware, phishing, compromised sitemaps, robots, canonicals, and hreflang | always |
| SEO-396 | EXTRA | Protect against XSS, SSRF, host-header attacks, open redirects, cache poisoning, and exposed public admin or API surfaces | always |
| SEO-397 | EXTRA | Audit signed URL and media authorization leakage | always |
| SEO-398 | ULTRA | Maintain search-focused incident response and removal procedures | always |
| SEO-399 | ULTRA | Scan indexed inventories for unexpected paths | always |
| SEO-400 | ULTRA | Correlate security events with traffic and index anomalies | always |

## Domain: cdn-waf (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-401 | LITE | Return intended status codes through the edge | has_cdn_or_waf |
| SEO-402 | LITE | Allow verified legitimate search crawlers to public pages | has_cdn_or_waf |
| SEO-403 | LITE | Avoid CAPTCHA or JavaScript challenges on crawl-critical pages | has_cdn_or_waf |
| SEO-404 | LITE | Preserve canonical host and protocol redirects | has_cdn_or_waf |
| SEO-405 | RECOMMENDED | Keep robots sitemap and verification files reachable | has_cdn_or_waf |
| SEO-406 | RECOMMENDED | Align edge and origin redirect logic | has_cdn_or_waf |
| SEO-407 | RECOMMENDED | Align CDN cache keys with application variance | has_cdn_or_waf |
| SEO-408 | RECOMMENDED | Prevent WAF false positives on crawlable URLs | has_cdn_or_waf |
| SEO-409 | RECOMMENDED | Rate-limit abusive bots without harming legitimate crawling | has_cdn_or_waf |
| SEO-410 | RECOMMENDED | Preserve response headers required for indexing and caching | has_cdn_or_waf |
| SEO-411 | EXTRA | Test conditional requests through CDN and origin | has_cdn_or_waf |
| SEO-412 | EXTRA | Audit geographic and IPv6 delivery differences | has_cdn_or_waf |
| SEO-413 | EXTRA | Validate stale-if-error behavior for public pages | has_cdn_or_waf |
| SEO-414 | ULTRA | Continuously test major crawler access paths | has_cdn_or_waf |
| SEO-415 | ULTRA | Monitor edge rule deployments for SEO regressions | has_cdn_or_waf |
| SEO-416 | ULTRA | Document emergency bypass with narrow scope and expiry | has_cdn_or_waf |

## Domain: ecommerce (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-417 | RECOMMENDED | Keep category, product, variant, filter, sort, faceted, and pagination URLs crawlable only according to catalog policy | ecommerce |
| SEO-418 | RECOMMENDED | Keep visible price, currency, availability, condition, shipping, and returns accurate | ecommerce |
| SEO-419 | RECOMMENDED | Publish eligible Product and Offer structured data with genuine Review or AggregateRating only when visible and authentic | ecommerce |
| SEO-420 | RECOMMENDED | Publish valid GTIN, MPN, brand, SKU, and variant identifiers when they genuinely exist | ecommerce |
| SEO-421 | RECOMMENDED | Provide compliant product images, image metadata, videos, and canonical product URLs | ecommerce |
| SEO-422 | RECOMMENDED | Keep product variants consistent across canonical URLs, structured data, feeds, and landing pages | ecommerce |
| SEO-423 | RECOMMENDED | Handle out-of-stock, discontinued, temporary, replaced, and removed products intentionally | ecommerce |
| SEO-424 | RECOMMENDED | Publish accurate shipping and return policies in pages, structured data, and feeds where supported | ecommerce |
| SEO-425 | RECOMMENDED | Separate product pages from cart checkout and account pages | ecommerce |
| SEO-426 | RECOMMENDED | Prepare Google Merchant Center verification, diagnostics, free listings, and shopping-surface ownership as manual actions | ecommerce |
| SEO-427 | EXTRA | Generate primary and supplemental product feeds with canonical URLs and current catalog facts | ecommerce |
| SEO-428 | EXTRA | Model aggregate ratings only from genuine visible reviews | ecommerce |
| SEO-429 | EXTRA | Handle regional price and availability variants | ecommerce |
| SEO-430 | ULTRA | Validate structured-data, primary-feed, supplemental-feed, page, price, and inventory parity at scale | ecommerce |
| SEO-431 | ULTRA | Monitor Merchant Center diagnostics, disapprovals, feed freshness, image issues, and stale inventory | ecommerce |
| SEO-432 | ULTRA | Design product deletion replacement and redirect lifecycle | ecommerce |

## Domain: local (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-433 | RECOMMENDED | Publish consistent business name address and phone data | local_business |
| SEO-434 | RECOMMENDED | Create useful unique pages for real locations | local_business |
| SEO-435 | RECOMMENDED | Use the most specific truthful LocalBusiness type | local_business |
| SEO-436 | RECOMMENDED | Publish accurate opening hours and exceptions | local_business |
| SEO-437 | RECOMMENDED | Represent service areas accurately | local_business |
| SEO-438 | RECOMMENDED | Provide accessible contact and directions information | local_business |
| SEO-439 | RECOMMENDED | Prepare Google Business Profile and Bing Places ownership and verification as evidenced manual actions | local_business |
| SEO-440 | RECOMMENDED | Prepare Google Business Profile ownership as a manual action | local_business |
| SEO-441 | RECOMMENDED | Link location entities to the parent organization | local_business |
| SEO-442 | RECOMMENDED | Handle moved and closed locations with explicit lifecycle rules | local_business |
| SEO-443 | EXTRA | Manage practitioner and department entities without duplication | local_business |
| SEO-444 | EXTRA | Localize location-page content for actual services | local_business |
| SEO-445 | EXTRA | Audit major citation consistency | local_business |
| SEO-446 | ULTRA | Monitor local profile and site fact divergence | local_business |
| SEO-447 | ULTRA | Model multi-brand shared-location relationships | local_business |
| SEO-448 | ULTRA | Detect doorway-like thin location page generation | local_business |

## Domain: international (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-449 | RECOMMENDED | Declare the correct page language | multilingual_or_multiregional |
| SEO-450 | RECOMMENDED | Choose stable language or country URLs using subdirectories, subdomains, or ccTLDs with documented tradeoffs | multilingual_or_multiregional |
| SEO-451 | RECOMMENDED | Provide self-referential and reciprocal hreflang | multilingual_or_multiregional |
| SEO-452 | RECOMMENDED | Use valid language and region codes | multilingual_or_multiregional |
| SEO-453 | RECOMMENDED | Keep locale canonicals within the intended equivalent page | multilingual_or_multiregional |
| SEO-454 | RECOMMENDED | Translate visible content, titles, descriptions, Open Graph, structured data, feeds, and sitemap alternates | multilingual_or_multiregional |
| SEO-455 | RECOMMENDED | Avoid IP, browser-language, or cookie redirects that prevent crawlers or users reaching locale URLs | multilingual_or_multiregional |
| SEO-456 | RECOMMENDED | Provide a usable language selector with real links | multilingual_or_multiregional |
| SEO-457 | RECOMMENDED | Include x-default only when it represents a genuine fallback | multilingual_or_multiregional |
| SEO-458 | RECOMMENDED | Keep structured data localized and factually consistent | multilingual_or_multiregional |
| SEO-459 | EXTRA | Generate hreflang through sitemaps when operationally safer | multilingual_or_multiregional |
| SEO-460 | EXTRA | Handle partially translated content explicitly | multilingual_or_multiregional |
| SEO-461 | EXTRA | Localize currency, dates, phone formats, addresses, legal facts, and business data consistently | multilingual_or_multiregional |
| SEO-462 | ULTRA | Validate full hreflang clusters at scale | multilingual_or_multiregional |
| SEO-463 | ULTRA | Monitor missing reciprocal and broken locale URLs | multilingual_or_multiregional |
| SEO-464 | ULTRA | Plan locale retirement migrations without cluster collapse | multilingual_or_multiregional |

## Domain: ugc (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-465 | RECOMMENDED | Define indexability thresholds for comments, forums, profiles, reviews, ratings, and other UGC pages | ugc |
| SEO-466 | RECOMMENDED | Moderate spam, fake reviews, automated spam, AI-generated spam, malware, and reputation abuse | ugc |
| SEO-467 | RECOMMENDED | Mark untrusted, ugc, nofollow, and sponsored outbound links according to policy | ugc |
| SEO-468 | RECOMMENDED | Prevent empty and near-empty profile indexing | ugc |
| SEO-469 | RECOMMENDED | Use stable canonical URLs for discussions and posts | ugc |
| SEO-470 | RECOMMENDED | Handle deleted banned and anonymized users safely | ugc |
| SEO-471 | RECOMMENDED | Control pagination and infinite-scroll crawl paths | ugc |
| SEO-472 | RECOMMENDED | Expose author identity only within privacy policy | ugc |
| SEO-473 | RECOMMENDED | Separate staff editorial and user-generated content | ugc |
| SEO-474 | RECOMMENDED | Prevent UGC from injecting metadata, canonicals, robots directives, links, or structured data | ugc |
| SEO-475 | EXTRA | Use DiscussionForumPosting, QAPage, ProfilePage, Review, and rating schema only when eligible and truthful | ugc |
| SEO-476 | EXTRA | Detect duplicate cross-posted and templated UGC | ugc |
| SEO-477 | EXTRA | Set reputation and quality thresholds for indexing | ugc |
| SEO-478 | ULTRA | Audit crawl demand by UGC quality cohort | ugc |
| SEO-479 | ULTRA | Monitor abuse-driven index spikes | ugc |
| SEO-480 | ULTRA | Design legal takedown propagation and evidence retention | ugc |

## Domain: paywall (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-481 | RECOMMENDED | Define crawl, index, canonical, sitemap, and snippet policy for paywalled, metered, login-walled, and subscription content | paywall_or_subscription |
| SEO-482 | RECOMMENDED | Expose a truthful lead-in or public preview without leaking entitled content | paywall_or_subscription |
| SEO-483 | RECOMMENDED | Keep full content and user entitlements protected by server-side authentication and authorization | paywall_or_subscription |
| SEO-484 | RECOMMENDED | Implement supported paywall markup with isAccessibleForFree and accurate CSS selectors when applicable | paywall_or_subscription |
| SEO-485 | RECOMMENDED | Prevent public caches from storing entitled content | paywall_or_subscription |
| SEO-486 | RECOMMENDED | Keep canonical URLs stable across access states | paywall_or_subscription |
| SEO-487 | RECOMMENDED | Set crawler access policy without cloaking or weakening authentication | paywall_or_subscription |
| SEO-488 | RECOMMENDED | Separate registration walls from paid subscription walls | paywall_or_subscription |
| SEO-489 | RECOMMENDED | Provide clear subscription and login user journeys | paywall_or_subscription |
| SEO-490 | RECOMMENDED | Exclude account billing and entitlement routes from indexing | paywall_or_subscription |
| SEO-491 | EXTRA | Handle metered-access counters without crawler traps | paywall_or_subscription |
| SEO-492 | EXTRA | Model multi-part paywalled content accurately | paywall_or_subscription |
| SEO-493 | EXTRA | Audit noindex, nosnippet, max-snippet, canonical, and structured-data consistency against subscription strategy | paywall_or_subscription |
| SEO-494 | ULTRA | Test cache and authorization boundaries under crawler-like requests | paywall_or_subscription |
| SEO-495 | ULTRA | Monitor accidental entitlement leakage | paywall_or_subscription |
| SEO-496 | ULTRA | Document platform-policy changes affecting subscription indexing | paywall_or_subscription |

## Domain: feeds (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-497 | RECOMMENDED | Serve valid RSS, Atom, article, blog, author, or category feeds only when meaningful content justifies them | content_publication |
| SEO-498 | RECOMMENDED | Add link rel=alternate feed discovery with correct MIME type and canonical feed URL | content_publication |
| SEO-499 | RECOMMENDED | Use canonical absolute entry URLs | content_publication |
| SEO-500 | RECOMMENDED | Publish accurate item titles, descriptions, publication dates, modified dates, and canonical URLs | content_publication |
| SEO-501 | RECOMMENDED | Exclude drafts private and deleted content | content_publication |
| SEO-502 | RECOMMENDED | Keep stable unique entry identifiers | content_publication |
| SEO-503 | RECOMMENDED | Escape and encode feed content correctly | content_publication |
| SEO-504 | RECOMMENDED | Use correct feed MIME types | content_publication |
| SEO-505 | RECOMMENDED | Limit feed size and pagination intentionally | content_publication |
| SEO-506 | RECOMMENDED | Choose full or excerpt content with duplicate-content, licensing, and distribution policy in mind | content_publication |
| SEO-507 | EXTRA | Offer category or topic feeds only when useful | content_publication |
| SEO-508 | EXTRA | Include images, media enclosures, and accessible media metadata when applicable | content_publication |
| SEO-509 | EXTRA | Validate WebSub or hub integrations when used | content_publication |
| SEO-510 | ULTRA | Set safe feed caching, validation, availability monitoring, and failure handling | content_publication |
| SEO-511 | ULTRA | Reconcile feeds with canonical publication inventory | content_publication |
| SEO-512 | ULTRA | Test consumer compatibility across representative readers | content_publication |

## Domain: pdf (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-513 | RECOMMENDED | Classify PDFs, DOC or DOCX, spreadsheets, downloads, and public assets as indexable, noindex, or private | public_documents |
| SEO-514 | RECOMMENDED | Use descriptive document filenames | public_documents |
| SEO-515 | RECOMMENDED | Set filename, document title, author, language, dates, copyright, and other public document metadata accurately | public_documents |
| SEO-516 | RECOMMENDED | Provide accessible tagged PDFs when required | public_documents |
| SEO-517 | RECOMMENDED | Use X-Robots-Tag and HTTP Link canonical headers for non-HTML indexing and canonical control | public_documents |
| SEO-518 | RECOMMENDED | Resolve duplicate HTML and PDF or document versions with intentional canonical and linking policy | public_documents |
| SEO-519 | RECOMMENDED | Link documents from contextual HTML pages | public_documents |
| SEO-520 | RECOMMENDED | Return correct status, Content-Type, Content-Disposition, caching, and security headers for documents | public_documents |
| SEO-521 | RECOMMENDED | Remove private metadata and hidden data before publication | public_documents |
| SEO-522 | RECOMMENDED | Handle replaced and removed documents with explicit lifecycle rules | public_documents |
| SEO-523 | EXTRA | Provide accessible reading order, headings, tags, language, links, and text extraction for public documents | public_documents |
| SEO-524 | EXTRA | Optimize document file size without damaging quality | public_documents |
| SEO-525 | EXTRA | Extract searchable text from scanned documents when lawful | public_documents |
| SEO-526 | ULTRA | Inventory orphaned, outdated, accidentally indexed, and private documents and apply safe lifecycle handling | public_documents |
| SEO-527 | ULTRA | Validate generated-document privacy boundaries | public_documents |
| SEO-528 | ULTRA | Monitor document duplication across revisions | public_documents |

## Domain: analytics (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-529 | RECOMMENDED | Configure GA4, Google Tag Manager, PostHog, Vercel Analytics, or equivalent measurement without duplicate analytics | analytics_or_measurement |
| SEO-530 | RECOMMENDED | Preserve referrer data through internal redirects | analytics_or_measurement |
| SEO-531 | RECOMMENDED | Classify identifiable AI referral traffic transparently without overstating attribution | analytics_or_measurement |
| SEO-532 | RECOMMENDED | Avoid sending personal data in page URLs or analytics payloads | analytics_or_measurement |
| SEO-533 | RECOMMENDED | Implement consent, Consent Mode where applicable, privacy, and regional measurement choices | analytics_or_measurement |
| SEO-534 | RECOMMENDED | Prevent duplicate pageviews and conversions during SPA, SSR, and restored BFCache navigation | analytics_or_measurement |
| SEO-535 | RECOMMENDED | Exclude internal and automated traffic where justified | analytics_or_measurement |
| SEO-536 | RECOMMENDED | Track canonical page identity rather than unstable variants | analytics_or_measurement |
| SEO-537 | RECOMMENDED | Measure search conversions with documented attribution limits | analytics_or_measurement |
| SEO-538 | RECOMMENDED | Control analytics script performance cost | analytics_or_measurement |
| SEO-539 | EXTRA | Annotate migrations releases and major content changes | analytics_or_measurement |
| SEO-540 | EXTRA | Segment clicks, impressions, CTR, position, Discover, image, video, shopping, country, device, and template reporting | analytics_or_measurement |
| SEO-541 | EXTRA | Reconcile client and server measurement gaps | analytics_or_measurement |
| SEO-542 | ULTRA | Monitor analytics schema and tag regressions | analytics_or_measurement |
| SEO-543 | ULTRA | Audit dark traffic and AI attribution uncertainty | analytics_or_measurement |
| SEO-544 | ULTRA | Maintain data retention and access governance | analytics_or_measurement |

## Domain: monitoring (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-545 | RECOMMENDED | Monitor uptime, HTTP status, redirects, canonical hosts, and representative public routes | public_site |
| SEO-546 | RECOMMENDED | Monitor robots.txt, XML sitemaps, RSS or Atom feeds, llms.txt, and verification resources | public_site |
| SEO-547 | RECOMMENDED | Monitor accidental noindex and canonical changes | public_site |
| SEO-548 | RECOMMENDED | Monitor metadata, structured data, entity graphs, rich-result eligibility, and feed-to-page consistency | public_site |
| SEO-549 | RECOMMENDED | Monitor Core Web Vitals trends | public_site |
| SEO-550 | RECOMMENDED | Monitor crawl errors, CDN or WAF 403, 429, 503, challenge HTML, and legitimate crawler access | public_site |
| SEO-551 | RECOMMENDED | Monitor unexpected indexed or public paths | public_site |
| SEO-552 | RECOMMENDED | Monitor certificate and canonical-host failures | public_site |
| SEO-553 | RECOMMENDED | Assign owners and severity for discoverability alerts | public_site |
| SEO-554 | RECOMMENDED | Monitor authorized Search Console, Bing Webmaster, IndexNow, Merchant Center, analytics, CMS, image CDN, and video-provider integrations | public_site |
| SEO-555 | EXTRA | Monitor sitemap inventory drift | public_site |
| SEO-556 | EXTRA | Correlate deploys with search and crawl anomalies | public_site |
| SEO-557 | EXTRA | Monitor content publication, freshness, sitemap, feed, IndexNow, image, video, and Merchant Center failures | public_site |
| SEO-558 | ULTRA | Test external APIs for authentication, rate limits, retries, timeouts, logging, and failure isolation without blocking public rendering | public_site |
| SEO-559 | ULTRA | Maintain search incident runbooks and rollback criteria | public_site |
| SEO-560 | ULTRA | Review alert precision and missed incidents periodically | public_site |

## Domain: testing (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-561 | LITE | Inspect project manifests before selecting validation commands | always |
| SEO-562 | LITE | Verify changed routes return intended status codes | always |
| SEO-563 | LITE | Verify rendered titles descriptions canonicals and robots | always |
| SEO-564 | LITE | Verify robots.txt and sitemap responses | always |
| SEO-565 | RECOMMENDED | Validate structured data syntax and page alignment | always |
| SEO-566 | RECOMMENDED | Check representative internal links for failures | always |
| SEO-567 | RECOMMENDED | Verify no private route became public or indexable | always |
| SEO-568 | RECOMMENDED | Check changed pages for major accessibility regressions | always |
| SEO-569 | RECOMMENDED | Check changed pages for unacceptable performance regressions | always |
| SEO-570 | RECOMMENDED | Record actual commands outputs and limitations | always |
| SEO-571 | EXTRA | Test representative SSR SSG ISR and client-rendered states | always |
| SEO-572 | EXTRA | Compare pre-change and post-change search-critical output | always |
| SEO-573 | EXTRA | Validate CDN and origin behavior separately when applicable | always |
| SEO-574 | ULTRA | Run a second independent requirement audit pass | always |
| SEO-575 | ULTRA | Reconcile every applicable requirement with evidence | always |
| SEO-576 | ULTRA | Maintain regression fixtures for critical templates and resources | always |

## Domain: social-preview (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-577 | LITE | Provide a canonical Open Graph URL | public_site |
| SEO-578 | LITE | Use truthful Open Graph titles and descriptions | public_site |
| SEO-579 | LITE | Provide accessible preview-image alt text | public_site |
| SEO-580 | LITE | Keep preview images publicly fetchable | public_site |
| SEO-581 | RECOMMENDED | Set accurate Open Graph content types | public_site |
| SEO-582 | RECOMMENDED | Provide image width height and MIME hints | public_site |
| SEO-583 | RECOMMENDED | Use summary-large-image cards only with suitable imagery | public_site |
| SEO-584 | RECOMMENDED | Avoid duplicate conflicting preview tags | public_site |
| SEO-585 | RECOMMENDED | Generate previews for dynamic content server-side | public_site |
| SEO-586 | RECOMMENDED | Use fallback preview assets intentionally | public_site |
| SEO-587 | EXTRA | Validate preview crops and safe areas | public_site |
| SEO-588 | EXTRA | Version preview images when caches must refresh | public_site |
| SEO-589 | EXTRA | Audit platform-specific parser differences | public_site |
| SEO-590 | ULTRA | Test previews through production-equivalent bot paths | public_site |
| SEO-591 | ULTRA | Monitor stale preview cache incidents | public_site |
| SEO-592 | ULTRA | Prevent user content from injecting unsafe preview metadata | public_site |

## Domain: javascript-rendering (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-593 | LITE | Render primary content in initial HTML when practical | javascript_app |
| SEO-594 | LITE | Render search-critical metadata on the server | javascript_app |
| SEO-595 | LITE | Use crawlable anchor elements for navigation | javascript_app |
| SEO-596 | LITE | Keep content usable when hydration is delayed | javascript_app |
| SEO-597 | RECOMMENDED | Avoid client-only canonical and robots mutations | javascript_app |
| SEO-598 | RECOMMENDED | Handle route loading error and not-found states accurately | javascript_app |
| SEO-599 | RECOMMENDED | Prevent hydration mismatches in structured data | javascript_app |
| SEO-600 | RECOMMENDED | Expose dynamic-route content without requiring user interaction | javascript_app |
| SEO-601 | RECOMMENDED | Use Next.js metadata, generateMetadata, metadataBase, metadata files, opengraph-image, twitter-image, sitemap.ts, and robots.ts correctly | javascript_app |
| SEO-602 | RECOMMENDED | Test Next.js layouts, route groups, dynamic segments, generateStaticParams, loading, error, not-found, streaming, and fallback output | javascript_app |
| SEO-603 | EXTRA | Validate rendered DOM and raw HTML separately | javascript_app |
| SEO-604 | EXTRA | Audit Server Components, Client Components, use client boundaries, Server Actions, next/image, next/font, and search-critical content | javascript_app |
| SEO-605 | EXTRA | Control infinite scroll with crawlable pagination | javascript_app |
| SEO-606 | ULTRA | Test Next.js redirects, rewrites, headers, middleware, Route Handlers, Node or Edge runtime, static export, caching, revalidation, and ISR | javascript_app |
| SEO-607 | ULTRA | Monitor client exception impact on content discovery | javascript_app |
| SEO-608 | ULTRA | Compare SSR, SSG, SPA, hydration, client routing, virtualized content, and edge or browser rendering outputs | javascript_app |

## Domain: mobile-ux (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-609 | LITE | Keep primary content equivalent across mobile and desktop | public_site |
| SEO-610 | LITE | Avoid horizontal scrolling for normal content | public_site |
| SEO-611 | LITE | Provide clear information scent, breadcrumbs, navigation, related content, filtering, and internal search on small screens | public_site |
| SEO-612 | LITE | Avoid interstitials that obscure primary content | public_site |
| SEO-613 | RECOMMENDED | Size touch targets for reliable interaction | public_site |
| SEO-614 | RECOMMENDED | Keep text readable without forced zoom | public_site |
| SEO-615 | RECOMMENDED | Keep above-the-fold purpose, content hierarchy, visual hierarchy, and CTA clarity user-oriented | public_site |
| SEO-616 | RECOMMENDED | Ensure sticky elements do not obscure content or focus | public_site |
| SEO-617 | RECOMMENDED | Support task completion, form recovery, accessible errors, and mobile authentication flows | public_site |
| SEO-618 | RECOMMENDED | Use responsive media without overflow | public_site |
| SEO-619 | EXTRA | Audit fold behavior without treating above-the-fold as a ranking formula | public_site |
| SEO-620 | EXTRA | Test orientation changes and dynamic viewport units | public_site |
| SEO-621 | EXTRA | Measure search intent satisfaction, interaction quality, conversions, and internal-search outcomes | public_site |
| SEO-622 | ULTRA | Test low-memory and low-bandwidth mobile behavior | public_site |
| SEO-623 | ULTRA | Monitor mobile-only rendering and indexing divergence | public_site |
| SEO-624 | ULTRA | Regression-test mobile usability, accessibility, 404 recovery, intrusive UI, and critical journeys on representative devices | public_site |

## Domain: privacy-auth (16 requirements)
| ID | Minimum Level | Title | Activation |
| --- | --- | --- | --- |
| SEO-625 | LITE | Protect nonproduction environments with real access control | always |
| SEO-626 | LITE | Keep authenticated pages out of public sitemaps | always |
| SEO-627 | LITE | Prevent personalized content from leaking into shared caches | always |
| SEO-628 | LITE | Keep preview URLs unguessable and nonindexable | always |
| SEO-629 | RECOMMENDED | Avoid exposing secrets through metadata feeds or source maps | always |
| SEO-630 | RECOMMENDED | Separate consent state from crawler access decisions | always |
| SEO-631 | RECOMMENDED | Prevent login logout and callback routes from indexing | always |
| SEO-632 | RECOMMENDED | Use generic safe metadata on unauthorized responses | always |
| SEO-633 | RECOMMENDED | Keep tenant data isolated across hosts and cache keys | always |
| SEO-634 | RECOMMENDED | Audit public APIs for private content enumeration | always |
| SEO-635 | EXTRA | Define retention for crawl and analytics logs | always |
| SEO-636 | EXTRA | Handle right-to-erasure effects on public URLs | always |
| SEO-637 | EXTRA | Audit consent-manager effects on primary content rendering | always |
| SEO-638 | ULTRA | Test authorization boundaries using alternate hosts and headers | always |
| SEO-639 | ULTRA | Monitor staging-domain discovery and certificate transparency exposure | always |
| SEO-640 | ULTRA | Maintain emergency deindexing plans without treating them as access control | always |

