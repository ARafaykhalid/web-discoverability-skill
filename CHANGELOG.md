# Changelog

All notable changes to **`web-discoverability-skill`** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [4.2.0] - 2026-10-03

### Added
- **`npm run typecheck`, and a `tsconfig.json`**: the package ships TypeScript annotations across `tools/` and nothing had ever checked them. Node erases types without validating, which was demonstrated rather than assumed - a function declared `: string` that returns a number runs without complaint. The first run found 67 real type errors, including seven exported functions whose destructured options interfaces omitted the very properties they destructured (`validate`, `metricsReport`, `selectRequirements` and four more), so their published signatures misdescribed their own API. All fixed; `noUnusedLocals` then found a dead import in `cli.ts` and three more across the package. `strict` is deliberately off and the config says why: the gate's job is non-erasable annotations, unresolvable modules, and interfaces that lie, not annotating 8,700 lines written in JavaScript shape. `tests/` is excluded for the same reason and that is documented too.
- **Four header checks, from data the snapshot already held**: `cache-policy-declared` (SEO-337), `vary-restricted-to-body` (SEO-345), `transport-security-declared` (SEO-390), and `private-routes-excluded` (SEO-098). `caching`, `security`, and `indexing` had no check at all while every response header the capture recorded went unused. All four are gated on the page having come from an actual request: a snapshot built from `.html` files synthesises a page per file with no headers, and reporting those as missing a cache policy is a statement about the absence of a server, not about the site.
- **`--domains` on `audit`**, matching `select`. A scoped run records the scope in its JSON output, so a report covering three domains is self-describing instead of looking like a whole-site audit that found three things.
- **`.github/dependabot.yml`**: the actions are pinned by SHA, which means nothing bumps the pin. This opens a weekly PR for `actions/*` only - there is no `npm` ecosystem entry, because the package declares no dependencies and adding one would imply the zero-dependency property is negotiable.
- **`timeout-minutes` on all three CI jobs.** Without it a hung job occupies a runner for six hours.
- **`tests/checks/headers.test.ts`** and **`tests/tools/capture.test.ts`**: 24 tests over the two newest and least-covered modules, all offline.

- **`wds capture <origin>`**: records what a served origin actually returns - status, headers, redirect chain, and response body - into the `snapshot.json` that `audit` already reads. Thirty of the checks are `RUNTIME`-level and nothing in the package produced their input, so the suite could only ever run against its own fixtures. Same-origin walk, bounded by `--max-pages`, seedable from `--sitemap`, `fetch` only: no browser, no dependency, no lockfile. Redirects are followed by hand so the chain is observed rather than inferred from `response.redirected`.
- **Six deterministic checks**, taking registry coverage from 36 to 42 checks and 16% to 19%: `status-code-accurate` (SEO-019, SEO-026), `redirect-single-hop` (SEO-025), `canonical-target-resolves` (SEO-051), `orphaned-pages` (SEO-222), `primary-heading-present` (SEO-195), and `ai-crawler-policy-purpose-separated` (SEO-291, SEO-642). Every one was verified to fire on a planted defect and to stay silent on a correct site.
- **`ai-crawler-policy-purpose-separated`**: classifies each named robots.txt token by the purpose its operator documents for it, and reports the commonest 2026 misconfiguration - retrieval blocked while training crawlers are allowed. Also reports a group written for a product-level control token such as `Google-Extended`, which is not an HTTP user-agent and can never match a request. The token table is limited to operators with first-party documentation, and every one of them is cited on SEO-291.
- **Two registry records** citing Google's own generative-AI documentation, previously uncited anywhere in the registry: **SEO-641** (satisfaction of search eligibility is the whole of the requirement for an AI surface - no additional technical requirement, markup, or file format) and **SEO-642** (a robots.txt group belongs only to a token a request actually sends).
- **`tests/tools/capture.test.ts`**: eleven offline tests over `capture`, including one that asserts the runtime checks stop reporting `NEEDS_RUNTIME` once a capture exists.

### Fixed
- **A pinned `actions/setup-node` SHA that did not exist.** The first attempt at SHA-pinning used a made-up hash, which would have failed every job with an unresolvable action rather than anything resembling a real error. Both pins are now verified against the GitHub API and resolve over HTTP.
- **A captured live site ran zero checks**: with only a capture and no source tree, every profile fact resolved `unknown`, every domain activation was `uncertain`, and `select` applied nothing. A capture is direct evidence the origin is public, so `public_site` is now `true` with the origin as its evidence. `select` also stopped calling `detectProfile` itself and now reads the snapshot's profile, so it can no longer disagree with `audit` about what a project is.
- **`status-code-accurate` could not fire**: it ran through `pageCheck`, which skips any page without markup - and the pages whose status is wrong are exactly the ones that never delivered a document.
- **`check-sources` reported transient failures as broken citations**: two of 136 URLs failed on a healthy host. It now retries once before declaring a citation unreachable, so a network blip no longer fails the command.
- **A generated metrics block could not go stale**: `docs --check` compared the committed README block against the committed `reports/benchmarks.json`, so a benchmark that had started failing still produced a clean check and a green table of last month's numbers.
- **`CONTRIBUTING.md` stated a Node floor of 20.6** that the tooling cannot run on. It now defers to `engines.node`, which is the single statement of the floor.
- **`ledger.schema.json` required `reason` on entries that carry `blocker`**, so `deferred.jsonl` did not validate against its own schema.

### Changed
- **`reports/` is generated on demand and gitignored.** The metrics and benchmark figures quoted in `README.md` are computed in memory by `wds docs`, so a committed copy could only ever be a copy that had gone stale. `npm run ci` no longer writes anything, so it leaves the tree clean.
- **`deferred.jsonl`: 171KB to 44KB.** All 336 entries carried the same 462-character paragraph. It is one fact about the v1 catalogue, so it now lives in `DEFERRED_READMISSION_CRITERIA` in `model.ts` and is generated into `requirements/registry.md`; an entry deferred for any reason other than rewording still carries its own blocker, and the validator enforces that.
- **`npm run ci` is now the whole pull-request gate** - `validate`, `quality`, `sources`, `bench:check`, `docs:check`, `test` - and matches what the workflow runs. It previously omitted `sources` and `bench:check`, so a repository could pass locally and fail in CI.
- **Registry: 224 to 226 active requirements**, 642 allocated IDs. Deterministic check coverage is 21%, up from 16%: 18 of 37 domains now have at least one check, up from 12. Google's AI optimization guide and AI-features page are now cited across `ai-retrieval`, `ai-crawlers`, and `llms-txt`; INTERNAL records were left uncited, since a citation there asserts external behaviour the record explicitly disclaims.

## [4.0.0] - 2026-08-31

### Fixed
- **CI audit-fixture assertion**: the "Audit every fixture" step validated a `profile` key that `audit --json` never emitted; it now checks the `framework` key the report actually carries. The step failed on every fixture while the command itself was correct.
- **Line-ending tolerance in the skill-package test**: the SKILL.md frontmatter assertion now accepts CRLF checkouts of the same commit, which Windows working copies produce.

### Added
- **Version and freshness reporting (`wds version`)**: reports the skill version, registry schema version, local commit, and the latest upstream `main` commit from the GitHub atom feed. `verified`, `update_available`, and `unable_to_verify` are distinct outcomes; an unreachable upstream is recorded with its reason, never silently treated as current. The command always exits 0, because "could not check" is a recorded outcome rather than a failure.
- **Version metadata in machine-readable output**: `audit`, `select`, and `profile` JSON now embed `skill_version` and `registry_version` without touching the network.
- **Mandatory freshness step in the skill workflow**: [SKILL.md](SKILL.md) and [INTEGRATION.md](INTEGRATION.md) require the version check before any profile, select, audit, implementation, or verification work, and forbid claiming the skill is current without a `verified` result.
- **Version lifecycle tests**: offline suites covering verified, update-available, unreachable, malformed, timed-out, no-git-history, missing-metadata, and repeated-invocation paths, plus `readLocalCommit` against detached HEAD, packed refs, and worktree `.git` files.

### Changed
- **Converted to TypeScript run by native type stripping**: every tool, test, and CI helper is now a `.ts` file executed directly by `node` — no compiler, no build step, no emitted artifacts, and still zero dependencies and zero devDependencies. Type annotations are erasable syntax only (no enums or namespaces). Relative imports carry explicit `.ts` extensions.
- **Node.js floor raised from 20.6 to 22.18**: the first release where Node runs `.ts` files unflagged. The CI matrix drops 20.x accordingly; `engines` is a tested claim.
- **Package version 4.0.0**: the Node floor and the `wds` entry-point path (`tools/cli.ts`) are breaking changes. Migration: upgrade Node to 22.18+ and update any direct invocation or `bin` reference from `tools/cli.mjs` to `tools/cli.ts`.

---

## [3.0.0] - 2026-08-23

### Added
- **Generated requirement pages**: Every active registry record now has a linked Markdown page under `requirements/by-id/`.
- **Documentation drift checks**: `npm run docs:check` detects missing, stale, or unexpected generated requirement pages and derived artifacts.

### Changed
- **Node/schema-v3 architecture**: Registry loading, validation, selection, checks, benchmarks, and documentation use the dependency-free Node.js CLI and canonical JSONL records.
- **Vercel Agent Skills packaging**: The repository root is installable with the Vercel `skills` CLI, with `SKILL.md` as the canonical entry point and `SKILL_ROOT`-relative tooling.

## [2.0.0] - 2026-08-14

### Added
- **Renamed to `web-discoverability-skill`**: Updated skill name to reflect complete technical discoverability scope across traditional search engines, AI answer engines, web vitals, structured data, accessibility, and security.
- **Canonical Node registry**: Registry loading, selection, validation, checks, benchmarks, and documentation now run through `tools/*.mjs`; generated counts come from canonical JSONL files.
- **AI Discoverability & Search Surface Matrix**: Comprehensive coverage for AEO (Answer Engine Optimization), GEO (Generative Engine Optimization), LLMO (LLM Optimization), Google AI Overviews, Bing Copilot, and `llms.txt` / `llms-full.txt` protocols.
- **AI Crawler Policy Matrix**: Added explicit rules for 9 major AI bots (`GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Applebot`, `Bytespider`, `Amazonbot`).
- **4-Level Execution Framework**: Introduced `LITE`, `RECOMMENDED`, `EXTRA`, and `ULTRA` execution levels. Current candidate counts are generated from the registry rather than embedded in prose.
- **Node CLI Tooling Suite**:
  - `tools/cli.mjs`: profile, select, audit, validate, benchmark, metrics, and docs commands.
- **Framework Adapters**: Added native implementation guides for Next.js (App & Pages Router), React SPAs, Remix / React Router v7, Astro, Vite, Django, FastAPI, and Flask.
- **Multi-Tier Verification Engine**: Implemented 4-tier verification gates (Static Code, Rendered HTML/Headers, Command Execution, Surface Eligibility).

### Changed
- **Compacted `SKILL.md`**: Reduced main orchestrator prompt size to under 500 lines for maximum context efficiency in AI agent windows.
- **Updated Manifest Schema**: Upgraded `requirements/manifest.json` to schema version 2.

---

## [1.0.0] - 2026-01-15

### Added
- Initial release of `seo-skill` (now `web-discoverability-skill`).
- Initial baseline registry covering crawling, sitemaps, canonicals, metadata, and structured data.
- Basic framework adapters for React and Next.js.
- Initial `SKILL.md` orchestrator file.
