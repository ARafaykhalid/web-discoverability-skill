# Contributing to `web-discoverability-skill`

Thank you for your interest in contributing to **`web-discoverability-skill`**! We welcome contributions from engineers, technical SEO specialists, search engine researchers, and AI developers.

This document outlines the architecture of the skill, schema requirements for registry records, validation workflows, and guidelines for submitting pull requests.

---

## 📋 Table of Contents

- [Code of Conduct](#code-of-conduct)
- [Design Philosophy](#design-philosophy)
- [Repository Setup](#repository-setup)
- [Requirement Registry Architecture](#requirement-registry-architecture)
- [Record Schema Specification](#record-schema-specification)
- [Adding or Modifying Requirements](#adding-or-modifying-requirements)
- [Validation & Testing Workflow](#validation--testing-workflow)
- [Modifying Core Skill Instructions (`SKILL.md`)](#modifying-core-skill-instructions-skillmd)
- [Pull Request Guidelines](#pull-request-guidelines)

---

## 🤝 Code of Conduct

All contributors are expected to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to the project maintainers.

---

## 💡 Design Philosophy

Every requirement and instruction in `web-discoverability-skill` must adhere to these core principles:

1. **Evidence over Assumptions**: Never claim indexation, rich result eligibility, or ranking guarantees without empirical code, HTTP, or surface proof.
2. **Stable IDs**: Requirement IDs (`SEO-001` through `SEO-640`) must remain contiguous and stable across releases.
3. **Context Efficiency**: Keep `SKILL.md` compact (< 500 lines) and push domain-specific data into JSONL files loaded lazily.
4. **Single-Writer Safety**: Ensure changes do not introduce file-writing race conditions when executed by parallel subagents.
5. **No Speculative or Manipulative Tactics**: No keyword stuffing, cloaking, fake schema markup, or paywall/WAF bypasses.

---

## 💻 Repository Setup

`web-discoverability-skill` uses Python 3.9+ standard library for all helper scripts. No external pip dependencies are required.

```bash
# Clone the repository
git clone https://github.com/your-org/web-discoverability-skill.git
cd web-discoverability-skill

# Run registry validation to confirm setup
python scripts/validate_registry.py
```

---

## 🏗️ Requirement Registry Architecture

The registry consists of three synchronized layers:

1. **`requirements/manifest.json`**: Global index defining domains, file paths, record counts, active activations, candidate level counts, and global schema version (v2).
2. **`requirements/coverage-map.json`**: Auditable mapping connecting taxonomy areas to requirement IDs.
3. **`requirements/*.jsonl`**: 42 domain files containing JSON Lines records (one JSON object per line).

---

## 📐 Record Schema Specification

Every JSON record in a domain `.jsonl` file must contain all 34 required keys listed below:

```json
{
  "id": "SEO-001",
  "domain": "architecture",
  "title": "Clean URL Architecture and Canonical Hierarchy",
  "description": "Enforce deterministic, lowercase, canonical URL paths without trailing slash ambiguity.",
  "why_it_matters": "Eliminates duplicate content penalties and consolidates link equity.",
  "applicability": "Applies to all public routing layers and page templates.",
  "activation": "always",
  "priority": "HIGH",
  "minimum_level": "LITE",
  "levels": ["LITE", "RECOMMENDED", "EXTRA", "ULTRA"],
  "implementation_guidance": "Configure web framework router or middleware to redirect non-canonical paths.",
  "verification_method": "Inspect router configuration, HTTP headers, and canonical tag output.",
  "evidence_requirement": "HTTP 301 redirect response or matching <link rel=\"canonical\"> URL.",
  "dependencies": [],
  "conflicts": ["urls"],
  "framework_notes": "Use next.config.js trailingSlash: false for Next.js.",
  "what": "Deterministic URL structure",
  "why": "Consolidates ranking signals",
  "who": "Backend / Frontend Engineers",
  "when": "Before initial indexing",
  "where": "Routing layer",
  "source_classification": "OFFICIAL_DOCUMENTATION",
  "requirement_type": "TECHNICAL",
  "platform_status": "OFFICIAL_PLATFORM_CONCEPT",
  "official_sources": ["https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls"],
  "platforms": ["Google Search", "Bing"],
  "search_surfaces": {
    "google_search": "RELEVANT",
    "google_discover": "RELEVANT",
    "bing_search": "RELEVANT",
    "bing_copilot": "RELEVANT",
    "ai_crawlers": "RELEVANT",
    "ai_engines": "RELEVANT"
  },
  "level": "LITE",
  "official_source": "https://developers.google.com/search/docs/crawling-indexing/consolidate-duplicate-urls",
  "platform": "Google Search",
  "search_surface_matrix": {
    "google_search": "RELEVANT",
    "google_discover": "RELEVANT",
    "bing_search": "RELEVANT",
    "bing_copilot": "RELEVANT",
    "ai_crawlers": "RELEVANT",
    "ai_engines": "RELEVANT"
  },
  "concept_classification": "CORE_INDEXING",
  "ai_terms": ["AEO", "GEO", "LLMO"],
  "schema_org_status": "NOT_APPLICABLE",
  "google_eligibility": "DIRECT_INDEXING_FACTOR",
  "bing_eligibility": "DIRECT_INDEXING_FACTOR",
  "ai_discoverability_relevance": "CRITICAL",
  "risk": "MEDIUM",
  "evidence_types": ["FILE_AND_LINE", "HTTP_RESPONSE", "RENDERED_HTML"],
  "allowed_statuses": ["APPLICABLE", "NOT_APPLICABLE", "BLOCKED", "ALREADY_CORRECT", "IMPLEMENTED", "FIXED", "FAILED", "NEEDS_MANUAL_ACTION"]
}
```

### Allowed Values & Restrictions

- **`activation`**: Must be one of `always`, `public_site`, `has_images`, `has_video`, `ecommerce`, `local_business`, `multilingual_or_multiregional`, `ugc`, `paywall_or_subscription`, `content_publication`, `public_documents`, `analytics_or_measurement`, `has_cdn_or_waf`, `javascript_app`, `interactive_app`, `editorial_content`.
- **`minimum_level`**: Must be `LITE`, `RECOMMENDED`, `EXTRA`, or `ULTRA`.
- **`platform_status`**: Must be `OFFICIAL_PLATFORM_CONCEPT`, `ESTABLISHED_PRACTICE`, `INDUSTRY_TERM`, `EMERGING_PRACTICE`, or `EXPERIMENTAL`.
- **`search_surfaces`**: Values must be `RELEVANT`, `NOT_RELEVANT`, or `UNKNOWN` for all required surfaces (`google_search`, `google_discover`, `bing_search`, `bing_copilot`, `ai_crawlers`, `ai_engines`).

---

## ➕ Adding or Modifying Requirements

1. Locate the appropriate domain `.jsonl` file in [`requirements/`](file:///c:/Users/rocky/OneDrive/Desktop/seo-skill/requirements/).
2. Add or update the JSON record ensuring all 34 required fields are populated.
3. Run the registry builder to automatically re-index contiguous IDs and update candidate counts in `manifest.json`:

```bash
python scripts/build_registry.py
```

4. Run strict validation:

```bash
python scripts/validate_registry.py
```

---

## 🧪 Validation & Testing Workflow

Always execute validation scripts before committing changes:

```bash
# 1. Validate registry schema integrity, stable IDs, and mandatory coverage terms
python scripts/validate_registry.py

# 2. Run taxonomy gap analysis
python scripts/audit_coverage.py --format report

# 3. Test profile selection logic across test suites
python scripts/test_profiles.py
```

The validation tool enforces:
- Contiguous `SEO-xxx` ID order.
- Hard floor of at least 530 unique requirements (currently 640).
- `SKILL.md` line limit (< 500 lines).
- Required vocabulary terms across markdown & JSONL files.
- Absence of orphan markdown relative links.

---

## 📝 Modifying Core Skill Instructions (`SKILL.md`)

[`SKILL.md`](file:///c:/Users/rocky/OneDrive/Desktop/seo-skill/SKILL.md) acts as the high-level orchestrator prompt for AI agents.

- **Line Limit Rule**: Must remain strictly under 500 lines to avoid consuming unnecessary context window space.
- **Role**: Focuses on workflow steps, profile discovery, level resolution, subagent contracts, and reporting rules.
- **Detailed Domain Rules**: Place detailed domain rules in [`references/`](file:///c:/Users/rocky/OneDrive/Desktop/seo-skill/references/) rather than cluttering `SKILL.md`.

---

## 🚀 Pull Request Guidelines

1. **Branch Naming**: Use descriptive branch names like `feature/add-ai-bot-policies` or `fix/canonical-schema-field`.
2. **Commit Messages**: Write clear, imperative commit messages (e.g., `Add SEO-641 for video transcript indexing`).
3. **PR Checklist**:
   - [ ] Run `python scripts/build_registry.py` if registry records were modified.
   - [ ] Run `python scripts/validate_registry.py` and confirm all tests pass cleanly.
   - [ ] Ensure all new documentation links use valid relative paths.
   - [ ] Confirm `SKILL.md` is under 500 lines.
