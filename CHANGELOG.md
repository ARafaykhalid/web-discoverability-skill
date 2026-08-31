# Changelog

All notable changes to **`web-discoverability-skill`** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
