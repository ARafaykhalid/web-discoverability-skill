# Changelog

All notable changes to **`web-discoverability-skill`** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

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
