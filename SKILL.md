---
name: web-discoverability-skill
description: Exhaustive, evidence-based web discoverability, AI discoverability (AEO/GEO/LLMO), technical search engineering, indexing, structured data, entity graphs, content quality, media, performance, accessibility, security, and search-platform auditing and implementation for modern web repositories. Use when Codex must audit, plan, implement, repair, or verify discoverability for JavaScript/TypeScript, Next.js, React, Remix, Astro, Vite, Node, Python/Django/Flask/FastAPI, SSR, SSG, SPA, hybrid, CMS, headless, monorepo, ecommerce, SaaS, marketplace, blog, documentation, news, media, local, international, UGC, subscription, or multi-layer applications. Supports Lite, Recommended, Extra, and Ultra levels; defaults to Recommended implementation plus audit.
---

# Universal web and AI discoverability engineering

Operate as the orchestrator for the stable-ID registry described by `requirements/manifest.json` (currently 640 records, with a hard floor of 530 genuinely distinct requirements). Never load the entire registry into context except in domain-sized Ultra batches. Detect the repository first, select only candidate domains, classify applicability, implement safely, and verify with evidence.

## Set execution controls

Resolve the user's request into:

- `level`: `LITE`, `RECOMMENDED`, `EXTRA`, or `ULTRA`.
- `mode`: `AUDIT_ONLY`, `IMPLEMENT`, or `IMPLEMENT_AND_AUDIT`.

Default to `RECOMMENDED + IMPLEMENT_AND_AUDIT` and tell the user which controls were selected. Respect repository instructions and explicit limits on tests, lint, builds, external services, or modifications.

Level behavior:

- `LITE`: Select only minimum-level Lite records from generally applicable domains and activated media/framework domains. Use for fast foundational work.
- `RECOMMENDED`: Include Lite plus production-standard records. This is the default.
- `EXTRA`: Include Recommended plus advanced records; apply specialized domains only when profile evidence activates them.
- `ULTRA`: Evaluate every registry record in domain batches, but still mark irrelevant records `NOT_APPLICABLE` rather than implementing them.

## Follow the orchestration workflow

1. Read [references/discovery-applicability.md](references/discovery-applicability.md). Inspect the repository without changing it and build one compact project profile.
2. Save the profile as compact JSON in temporary/shared state. Do not add audit artifacts to the repository unless requested.
3. Run `python3 scripts/select_requirements.py --level <level> --profile <profile.json> --format summary` to preview activated domains.
4. Load only the selected domain JSONL files listed in [requirements/registry.md](requirements/registry.md), or emit a task-local selection with `--domain <slug> --format jsonl`. Never paste all selected records into every agent prompt.
5. Read [references/search-surface-matrix.md](references/search-surface-matrix.md), [references/ai-taxonomy.md](references/ai-taxonomy.md), and [references/ai-crawler-policy-matrix.md](references/ai-crawler-policy-matrix.md) when those surfaces are in scope. Treat their classifications as guardrails, not ranking guarantees.
6. Read [references/subagents.md](references/subagents.md). When subagents are available, delegate independent domain audits in parallel. Give each agent only the project profile, owned domain file or selected records, dependencies, task, file ownership, and compact output contract.
7. Evaluate every selected record. Use `APPLICABLE`, `NOT_APPLICABLE`, `BLOCKED`, or `ALREADY_CORRECT` before implementation. Transition applicable work to `IMPLEMENTED`, `FIXED`, `FAILED`, or `NEEDS_MANUAL_ACTION` after action.
8. Merge compact results into shared state keyed by requirement ID. Resolve dependencies and conflicts before editing.
9. Read [references/framework-adapters.md](references/framework-adapters.md) for the detected stack. Inspect existing utilities and owners before modifying files.
10. Assign single-writer file ownership. Parallelize read-only audits freely; never allow uncontrolled concurrent edits to the same files.
11. Implement in dependency order with minimal changes: architecture and URLs; crawl/index infrastructure; metadata and canonicals; structured data and entity graph; content and linking; media and AI discovery; performance, accessibility, security; conditional verticals.
12. Read [references/verification.md](references/verification.md). Verify changed subsystems and run a second audit pass. Use the project's actual commands only when allowed and relevant.
13. Produce the final report from [assets/templates/final-report.md](assets/templates/final-report.md). Never claim an external verification, ranking, rich result, Discover inclusion, AI citation, or monitoring setup without evidence.

## Maintain compact shared state

Keep one terse state object rather than repeating findings:

```text
PROJECT_PROFILE
EXECUTION: level, mode
DOMAIN_SELECTION: active, inactive, reason
REQUIREMENT_STATUS: ID -> status, evidence, action, owner
FILE_OWNERSHIP: file -> agent
CHANGES: file -> requirement IDs
BLOCKERS: ID -> missing fact or authority
DEPENDENCIES: ID -> IDs/domains
VALIDATION_RESULTS: command/check -> result
```

Use requirement IDs in subsequent passes. Keep full descriptions in their domain JSONL files.

## Apply the applicability engine

Treat selection as candidate activation, not proof that every record applies. For each requirement, inspect profile facts and page/template evidence.

Allowed applicability decisions:

- `APPLICABLE`: The project needs evaluation or action.
- `NOT_APPLICABLE`: A required condition is absent; record the condition and evidence.
- `BLOCKED`: Evaluation or implementation lacks a necessary fact, environment, credential, production domain, or authority.
- `ALREADY_CORRECT`: Existing implementation satisfies the verification method.

Allowed terminal results:

- `IMPLEMENTED`: New applicable capability added and verified.
- `FIXED`: Defective existing behavior corrected and verified.
- `FAILED`: An attempted in-scope verification or implementation failed; retain evidence.
- `NEEDS_MANUAL_ACTION`: Requires Search Console, Bing Webmaster Tools, Merchant Center, DNS, credentials, deployment, external account ownership, or another user-controlled action.

Never implement a specialized record merely because it exists. Examples: ecommerce requires products/catalog evidence; international requires multiple languages or regions; video requires meaningful video content; paywall requires restricted subscription content; local requires genuine location intent.

## Use the requirement registry safely

- Treat `requirements/manifest.json` as the machine-readable index and each `requirements/*.jsonl` domain file as authoritative requirement content.
- Treat `requirements/coverage-map.json` as the auditable taxonomy-to-ID map. Run `python3 scripts/audit_coverage.py --format report` to produce the current gap metrics; do not infer coverage from folder names or record counts.
- Preserve stable IDs. Do not renumber records casually; regenerate only through `scripts/build_registry.py` after deliberate registry edits.
- Use `scripts/validate_registry.py` after registry changes.
- Use `scripts/select_requirements.py` to reduce context. The selector uses project profile activation; the executing agent still makes the final applicability decision.
- Generate a level matrix with `scripts/select_requirements.py --level ultra --format matrix` or a requirement-by-search-surface matrix with `--format surface-matrix`; do not load either 640-row matrix unless needed.
- In Ultra, process domains in batches and store only `ID | STATUS | EVIDENCE | ACTION` in shared state.
- Distinguish `KNOWN_REQUIREMENT`, `PROJECT_SPECIFIC_FINDING`, `EXTERNAL_RESEARCH`, `FRAMEWORK_SPECIFIC_GUIDANCE`, and `INFERENCE` in notes.
- For each record, preserve `requirement_type`, `platform_status`, `official_sources`, `schema_org_status`, `google_eligibility`, `bing_eligibility`, `ai_discoverability_relevance`, `search_surfaces`, `evidence_types`, and `allowed_statuses`. Industry terms such as AEO, GEO, LEO, LLMO, MEO, VEO, AISEO, GAIO, AAIO, AIO, AXO, SXO, and XEO are vocabulary classifications, never ranking guarantees.

Each registry record includes ID, domain, title, description, why, applicability, activation, priority, levels, implementation guidance, verification method, evidence requirement, dependencies, conflicts, framework notes, and explicit What/Why/Who/When/Where fields.

## Enforce implementation safety

- Inspect before editing; merge into existing metadata, robots, sitemap, middleware, routing, analytics, caching, and schema systems.
- Preserve application behavior, visual design, authentication, privacy, 3D/WebGL, CMS workflows, and deployment architecture.
- Prefer native framework and platform APIs; do not add dependencies without proving necessity.
- Never expose private data, weaken security for crawlers, bypass authentication or paywalls, fabricate business/entity/review/license facts, or publish draft URLs.
- Prevent keyword stuffing, doorway pages, fake freshness, hidden text, manipulative redirects, excessive schema, excessive links, and scaled thin AI content.
- Separate Schema.org validity, Google rich-result eligibility, Bing eligibility, general search usefulness, and AI answer readiness.
- Use the Search Surface Matrix and AI crawler policy matrix to distinguish indexing, retrieval, training, user-triggered fetching, and preview generation.
- Treat `llms.txt` as optional machine guidance, not an official ranking factor.
- Do not guarantee rankings, traffic, indexing, rich results, Discover inclusion, featured snippets, shopping visibility, or AI citations.

## Resolve common conflicts

Stop and reconcile these before implementation:

- `noindex` versus sitemap inclusion.
- Canonical target versus redirect, failure, block, or private access.
- Canonical language versus hreflang alternate.
- Public caching versus authenticated or personalized content.
- WAF challenge versus intended crawler access.
- Paywall protection versus public previews and crawler policy.
- UGC indexing versus moderation and spam controls.
- Product/feed facts versus visible page facts.
- Client-rendered metadata versus server-visible output.

When two domains need the same file, appoint one owner; other agents return recommendations only.

## Report evidence, not confidence

For every non-`NOT_APPLICABLE` result, cite one or more of:

- File and line, route, configuration, or generated resource.
- Rendered HTML or browser behavior.
- HTTP status, headers, body, redirect chain, or conditional response.
- Validator, test, build, typecheck, lint, performance, or accessibility output actually run.
- External platform evidence actually observed.
- Explicit blocker and required manual action.

End with the project profile, selected level and mode, requirement counts by status, search-surface matrix, changed files mapped to IDs, validation results, blockers, and manual actions. Use cautious eligibility/readiness language.

## Resources

- [requirements/registry.md](requirements/registry.md): domain index and level counts.
- [requirements/coverage-map.json](requirements/coverage-map.json): taxonomy coverage map and completeness status.
- [references/search-surface-matrix.md](references/search-surface-matrix.md): reusable surface eligibility, feed, crawler, and evidence matrix.
- [references/ai-taxonomy.md](references/ai-taxonomy.md): classification of AI-search terminology and evidence boundaries.
- [references/ai-crawler-policy-matrix.md](references/ai-crawler-policy-matrix.md): crawler-purpose and policy matrix.
- [references/discovery-applicability.md](references/discovery-applicability.md): discovery profile and activation rules.
- [references/subagents.md](references/subagents.md): roles, context contract, ownership, and output format.
- [references/framework-adapters.md](references/framework-adapters.md): implementation ownership for supported stacks.
- [references/verification.md](references/verification.md): gates, audit loop, research policy, and reporting rules.
- [assets/templates/requirement-record.md](assets/templates/requirement-record.md): compact state record.
- [assets/templates/audit-report.md](assets/templates/audit-report.md): audit-only output.
- [assets/templates/final-report.md](assets/templates/final-report.md): implementation and audit output.
