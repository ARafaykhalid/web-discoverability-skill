---
name: web-discoverability-skill
description: Evidence-based web and AI discoverability auditing and implementation for modern web repositories. Use for technical SEO, crawlability, indexing, canonicals, metadata, structured data, performance, accessibility, security, AI crawler policy, AEO/GEO/LLMO readiness, and search-platform workflows across JavaScript, TypeScript, Next.js, React, Remix, Astro, Vite, Node, Python, CMS, ecommerce, editorial, multilingual, UGC, subscription, and hybrid applications. Defaults to Recommended implementation plus audit and never promises rankings, indexing, traffic, rich results, or AI citations.
---

# Web and AI discoverability engineering

Use the canonical registry in `requirements/*.jsonl` as the source of truth.
Use generated Markdown in `requirements/by-id/` for human-readable requirement
pages; never edit generated pages directly.

## Resolve the skill root

This skill may run from a repository checkout or from a Vercel `skills` install.
Set `SKILL_ROOT` to the directory containing this file. In a checkout it is the
repository root; after installation it is commonly
`.agents/skills/web-discoverability-skill`.

Run bundled commands with `node "$SKILL_ROOT/tools/cli.ts"`. Pass the target
application path explicitly. Resolve references, requirements, and templates
from `"$SKILL_ROOT"`; do not assume the target application contains the skill.

## Check skill freshness (before every task)

Run the version check before any profile, select, audit, implementation, or
verification work:

```bash
node "$SKILL_ROOT/tools/cli.ts" version --json
```

- `verified`: proceed with the local copy.
- `update_available`: update or reload the skill when the execution environment
  permits it (`git pull` in a checkout, or reinstall via the `skills` CLI),
  re-run the check, and record which commit is in use. When updating mid-task
  is impossible or unsafe, continue with the local copy and say so.
- `unable_to_verify`: proceed with the local copy and explicitly record that
  freshness could not be verified and why.

Never state that the skill is up to date without a `verified` result. Record
the skill version, registry version, and freshness outcome in the final report;
the `audit`, `select`, and `profile` JSON outputs carry `skill_version` and
`registry_version` for that purpose, and `version` supplies the freshness half
(upstream comparison needs the network, which those commands never touch).

## Set controls

Resolve:

- `level`: `LITE`, `RECOMMENDED`, `EXTRA`, or `ULTRA`.
- `mode`: `AUDIT_ONLY`, `IMPLEMENT`, or `IMPLEMENT_AND_AUDIT`.

Default to `RECOMMENDED + IMPLEMENT_AND_AUDIT`. Respect repository instructions
and explicit limits on tests, builds, network access, external services, and
file changes.

## Workflow

0. Run the freshness check above and record its outcome before doing anything else.
1. Read [references/discovery-applicability.md](references/discovery-applicability.md), inspect the target repository, and build one compact profile.
2. Run `node "$SKILL_ROOT/tools/cli.ts" profile <project>` and review the detected facts and unknowns.
3. Run `node "$SKILL_ROOT/tools/cli.ts" select <project> --level <level>` to preview candidate requirements.
4. Load only the selected records from `requirements/*.jsonl` or the linked pages in `requirements/by-id/`.
5. Read [references/framework-adapters.md](references/framework-adapters.md) and the relevant search-surface references.
6. Treat selector output as `APPLICABLE`, `NOT_APPLICABLE`, or `UNCERTAIN`; then record `BLOCKED` when authority or facts are missing and `ALREADY_CORRECT` only after a check or documented verification proves the requirement already holds.
7. Resolve dependencies and conflicts, assign one writer per shared file, and implement in dependency order. Apply `SAFE_AUTOMATIC` changes only when the evidence is direct; propose `REVIEW_REQUIRED` changes and wait for approval; never implement `BLOCKED` requirements.
8. Run `node "$SKILL_ROOT/tools/cli.ts" audit <project> --level <level>` and inspect every finding, `needs_runtime` result, `unchecked_applicable` ID, and profile problem. An empty findings list is not a clean audit while any of those unresolved lists are non-empty.
9. Verify changed behavior using the target project's own build, test, browser, HTTP, and accessibility commands when available.
10. Report statuses, evidence, changed files, blockers, manual actions, and residual uncertainty.

## Levels

- `LITE`: foundational records and generally applicable activated domains.
- `RECOMMENDED`: Lite plus production-standard records; the default.
- `EXTRA`: Recommended plus advanced records when profile evidence activates them.
- `ULTRA`: every registry record in batches, with irrelevant records marked `NOT_APPLICABLE`.

Selection is only candidate activation. The executing agent still checks the
profile and the actual routes, templates, responses, and business facts.

## Applicability and status

Use `UNCERTAIN` when a required fact is unknown. Unknown is not permission to
edit and is not a silent `NOT_APPLICABLE` result.

After implementation, use only these terminal statuses: `IMPLEMENTED`, `FIXED`,
`PROPOSED`, `FAILED`, or `NEEDS_MANUAL_ACTION`.

Never activate specialized work merely because its domain exists. Ecommerce,
international, video, local, UGC, paywall, and subscription records require
evidence from the target project.

## Evidence and safety

Every non-`NOT_APPLICABLE` result needs direct evidence: a file and line, route,
served HTML, HTTP response, browser behavior, validator output, test/build
output, external platform result, or explicit blocker.

Do not expose private data, weaken authentication, bypass paywalls, fabricate
business facts or structured data, publish draft URLs, cloak content, stuff
keywords, create doorway pages, or add schema unsupported by visible content.

Separate:

- Schema.org validity from Google or Bing feature eligibility.
- Eligibility from indexing, ranking, traffic, or citation.
- AI crawler access from training, retrieval, user-triggered fetching, and previews.
- Repository evidence from manual Search Console, Bing, DNS, Merchant Center, and deployment actions.

Do not promise rankings, traffic, indexing, rich results, Discover inclusion,
shopping visibility, featured snippets, or AI citations.

## Registry and generated files

- `requirements/manifest.json` is generated from the canonical JSONL files.
- `requirements/registry.md` is the generated domain index.
- `requirements/by-id/SEO-xxx.md` is one generated page per active requirement.
- `requirements/removed.jsonl` and `requirements/deferred.jsonl` preserve inactive IDs.
- Reports, schemas, evidence, and vocabulary documentation are generated.

In a writable checkout, regenerate with:

```bash
npm run metrics
npm run docs -- --write
```

Validate with `npm run validate`, `npm run quality`, `npm run docs:check`,
`npm run bench`, and `npm test`.

## Resources

- [AUDIT.md](AUDIT.md): audit states, evidence, and safety.
- [INTEGRATION.md](INTEGRATION.md): installation, CLI usage, frameworks, and CI.
- [LIMITATIONS.md](LIMITATIONS.md): what the tooling cannot establish.
- [requirements/registry.md](requirements/registry.md): generated domain index.
- [requirements/by-id/SEO-033.md](requirements/by-id/SEO-033.md): example requirement page.
- [references/search-surface-matrix.md](references/search-surface-matrix.md): surface guardrails.
- [references/ai-taxonomy.md](references/ai-taxonomy.md): AI terminology and evidence boundaries.
- [references/ai-crawler-policy-matrix.md](references/ai-crawler-policy-matrix.md): crawler purposes and policy.
- [references/verification.md](references/verification.md): verification gates and research policy.
