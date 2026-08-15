# Verification, research, and final audit

## Command discovery

Read repository instructions and actual manifests before choosing commands. Respect explicit instructions not to run lint, typecheck, build, browser tests, network tests, or external actions. Do not assume `pnpm`, `npm`, `yarn`, Python, or framework commands.

## Validation gates

Apply gates in proportion to scope and available authority:

1. Repository's relevant compile/build path succeeds, when requested or necessary and allowed.
2. Changed public routes return intended status, content type, and redirect behavior.
3. Titles, descriptions, canonicals, robots directives, language, previews, and structured data render in representative states.
4. `robots.txt`, sitemap files/indexes, feeds, `llms.txt`, and verification resources respond correctly.
5. Structured data parses, matches visible facts, and is assessed separately for Schema.org validity and platform feature eligibility.
6. IndexNow publishes only eligible canonical public URLs and never exposes secrets or private content.
7. Performance has no unacceptable regression on affected paths.
8. Accessibility has no major regression on affected components and journeys.
9. Authentication, privacy, caching, CDN/WAF, and application behavior remain intact.
10. Changed and dependent requirement IDs pass a second audit.

If a gate cannot run, record `BLOCKED` or `NEEDS_MANUAL_ACTION`; never silently treat it as passed.

## Evidence hierarchy

Prefer direct evidence in this order:

1. Rendered/HTTP/browser behavior on the target route.
2. Executed test or validator output.
3. Source/configuration tied to the route and runtime.
4. Authorized external platform observation.
5. Explicit inference with assumptions.

Use clickable file paths and precise lines in reports when supported. Avoid broad claims from configuration alone when runtime layers can override it.

## Research mode

When current search platform behavior matters and web access is available, prefer primary sources: Google Search Central/Developers and Merchant Center, Bing Webmaster and IndexNow documentation, Schema.org, W3C/WAI, WHATWG, and official framework/platform documentation. Mark findings as:

- `KNOWN_REQUIREMENT`: registry guidance that does not depend on a volatile platform detail.
- `PROJECT_SPECIFIC_FINDING`: observed repository or runtime fact.
- `EXTERNAL_RESEARCH`: current primary-source statement with source/date.
- `FRAMEWORK_SPECIFIC_GUIDANCE`: official framework mechanism.
- `INFERENCE`: reasoned conclusion that lacks direct proof.

Do not present community convention or inference as an official ranking requirement. In particular, `llms.txt` is optional, robots directives differ by crawler, and valid structured data does not guarantee a search feature.

For every material claim, distinguish repository evidence, official
documentation, other external research, and inference. Record the source and
access date for volatile platform behavior. If current documentation cannot be
checked, keep eligibility `UNKNOWN` or the record `BLOCKED` rather than relying
on SEO folklore.

## Second audit pass

After implementation:

1. Re-select applicable requirements using the unchanged project profile plus recorded architecture updates.
2. Give the verifier changed IDs, dependency IDs, relevant domain records, changed files, and expected outcomes.
3. Re-check raw HTML, rendered DOM, HTTP behavior, generated resources, and privacy boundaries.
4. Reconcile conflicts: noindex/sitemap, canonical/redirect, locale/hreflang, feed/site, product/feed, cache/auth, WAF/crawler.
5. Resolve failures where safely in scope; otherwise retain failed evidence.
6. Recount statuses from shared state rather than estimates.

## Search-surface matrix

Generate rows only from actual applicability. Use the complete surfaces in [search-surface-matrix.md](search-surface-matrix.md) and the per-record `search_surfaces` map. Cells must be `RELEVANT`, `NOT_RELEVANT`, or `UNKNOWN`; never use the matrix to imply guaranteed inclusion.

## Manual actions

Separate engineering completion from actions requiring Search Console, Bing Webmaster Tools, Merchant Center, analytics accounts, crawler dashboards, domain verification, DNS, deployment, CDN/WAF consoles, credentials, or legal/business policy decisions. State the exact prerequisite and how the user can verify completion.
