# Changelog

All notable changes to **`web-discoverability-skill`** will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-08-14

### Added
- **Renamed to `web-discoverability-skill`**: Updated skill name to reflect complete technical discoverability scope across traditional search engines, AI answer engines, web vitals, structured data, accessibility, and security.
- **640 Stable-ID Requirement Registry**: Expanded the requirement database to 640 contiguous, stable-ID records (`SEO-001` through `SEO-640`) across 42 technical domains.
- **AI Discoverability & Search Surface Matrix**: Comprehensive coverage for AEO (Answer Engine Optimization), GEO (Generative Engine Optimization), LLMO (LLM Optimization), Google AI Overviews, Bing Copilot, and `llms.txt` / `llms-full.txt` protocols.
- **AI Crawler Policy Matrix**: Added explicit rules for 9 major AI bots (`GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Applebot`, `Bytespider`, `Amazonbot`).
- **4-Level Execution Framework**: Introduced `LITE` (~150 requirements), `RECOMMENDED` (~350 requirements), `EXTRA` (~500 requirements), and `ULTRA` (640 requirements) execution levels.
- **Python CLI Tooling Suite**:
  - `scripts/select_requirements.py`: Profile-activated context pre-filtering.
  - `scripts/validate_registry.py`: Schema, ID contiguity, and documentation link validator.
  - `scripts/audit_coverage.py`: Taxonomy mapping gap auditor.
  - `scripts/build_registry.py`: Registry manifest compiler and ID re-indexer.
- **Framework Adapters**: Added native implementation guides for Next.js (App & Pages Router), React SPAs, Remix / React Router v7, Astro, Vite, Django, FastAPI, and Flask.
- **Multi-Tier Verification Engine**: Implemented 4-tier verification gates (Static Code, Rendered HTML/Headers, Command Execution, Surface Eligibility).

### Changed
- **Compacted `SKILL.md`**: Reduced main orchestrator prompt size to under 500 lines for maximum context efficiency in AI agent windows.
- **Updated Manifest Schema**: Upgraded `requirements/manifest.json` to schema version 2.

---

## [1.0.0] - 2026-01-15

### Added
- Initial release of `seo-skill` (now `web-discoverability-skill`).
- 530 baseline SEO requirements covering crawling, sitemaps, canonicals, metadata, and structured data.
- Basic framework adapters for React and Next.js.
- Initial `SKILL.md` orchestrator file.
