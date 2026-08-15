# Universal Web Discoverability Engineering Skill (`web-discoverability-skill`)

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Requirements: 640 Records](https://img.shields.io/badge/Requirements-640%20Stable%20IDs-green.svg)](requirements/registry.md)
[![Domains: 42 Specialized](https://img.shields.io/badge/Domains-42%20Domains-orange.svg)](requirements/manifest.json)
[![Antigravity Compatible](https://img.shields.io/badge/Antigravity-2.0%20Ready-purple.svg)](SKILL.md)

**`web-discoverability-skill`** is an exhaustive, evidence-based web discoverability, traditional search discoverability, AI search discoverability (AEO/GEO/LLMO), technical SEO, structured data, entity graph, media, performance, accessibility, security, and search-platform auditing and implementation engine for modern web repositories.

It is engineered for autonomous AI agents—including **Google Antigravity**, **Claude Code**, **Cursor**, **Windsurf**, **Copilot Workspace**, and **OpenAI Agent Frameworks**—as well as human software engineers and technical web specialists.

---

## 📚 Documentation Index

- 🚀 **[Quick Start & User Guide](INTEGRATION.md)** – Step-by-step instructions on integrating `web-discoverability-skill` into your repository, web framework, or AI workflow.
- 🏗️ **[System Architecture](ARCHITECTURE.md)** – In-depth breakdown of the 4-stage pipeline, applicability engine, data model, and multi-tier verification gates.
- 🤝 **[Contributing Guide](CONTRIBUTING.md)** – How to add or update registry requirements, modify helper scripts, and submit pull requests.
- 🔒 **[Security & Ethics Policy](SECURITY.md)** – Security guardrails, crawler policy safety, and ethical AI/SEO compliance standards.
- 📋 **[Requirement Registry Index](requirements/registry.md)** – Complete domain inventory, record counts, and level candidate breakdown.
- 📜 **[Changelog](CHANGELOG.md)** – Version history, milestone updates, and schema migrations.

---

## ✨ Key Capabilities

### 1. Stable-ID Requirement Registry
Operates against a machine-readable registry of **640 stable-ID requirements** (`SEO-001` to `SEO-640`) spanning **42 specialized technical domains**. Each record defines explicit triggers, implementation guidance, verification methods, evidence requirements, dependencies, and search surface eligibility.

### 2. Multi-Level Execution Matrix
Configurable execution levels allow balancing speed vs. exhaustive coverage:

| Level | Purpose & Scope | Candidate Requirement Count |
| :--- | :--- | :--- |
| **`LITE`** | Minimum foundational requirements for fast audits and core fixes. | **150+** |
| **`RECOMMENDED`** *(Default)* | Production-grade requirements for modern web applications. | **350+** |
| **`EXTRA`** | Advanced requirements including conditional profile-activated domains. | **500+** |
| **`ULTRA`** | Exhaustive evaluation of all 640 registry records in domain batches. | **640** |

### 3. Flexible Execution Modes
- **`AUDIT_ONLY`**: Evaluates codebase against active requirements and generates an evidence-backed audit report without modifying any files.
- **`IMPLEMENT`**: Implements required fixes and enhancements in dependency order.
- **`IMPLEMENT_AND_AUDIT`** *(Default)*: Executes non-destructive code changes followed by empirical verification and final report generation.

### 4. Comprehensive Framework & Stack Support
Native implementation strategies and adapters for:
- **Frameworks**: Next.js (App Router & Pages Router), React, Remix, Astro, Vite, Nuxt, SvelteKit, Gatsby, Express, Node.js.
- **Backend / APIs**: Python (Django, FastAPI, Flask), Ruby on Rails, Go, PHP, GraphQL, REST.
- **Architectures**: SSR, SSG, SPA, Hybrid, Headless CMS, Monorepos, Edge/Serverless Functions.
- **Application Types**: Ecommerce, SaaS, Marketplaces, Blogs, Documentation, News/Media, Local Business, International, UGC, Paywall/Subscription, Interactive/3D WebGL.

### 5. Traditional & AI Search Discoverability Matrix
Covers traditional search engines alongside emerging AI answer engines and crawlers:
- **Search Engines**: Google Search, Bing, Yahoo, Yandex, DuckDuckGo, Baidu.
- **AI Engines & Answer Systems**: ChatGPT / OpenAI Search, Claude, Perplexity AI, Bing Copilot, Google Gemini / AI Overviews, Apple Intelligence.
- **AI Crawlers & Bot Policy**: Explicit policy management for `GPTBot`, `OAI-SearchBot`, `ChatGPT-User`, `ClaudeBot`, `PerplexityBot`, `Google-Extended`, `Applebot`, `Bytespider`, `Amazonbot`.
- **AI Protocols**: Machine-readable guidance (`llms.txt`, `llms-full.txt`), `data-nosnippet`, `indexifembedded`.

---

## ⚡ Quick Start

### 1. Antigravity IDE & `agy` CLI
`web-discoverability-skill` is automatically detected by Google Antigravity. To invoke it during pair programming:

```text
/skill load web-discoverability-skill
Audit and implement RECOMMENDED discoverability for this Next.js project.
```

Or specify custom execution controls directly in your prompt:

```text
Run web-discoverability-skill at level=ULTRA mode=AUDIT_ONLY for the ecommerce domain.
```

### 2. Claude Code & Cursor / Windsurf
Copy or reference `SKILL.md` in your project's agent skills directory (`.claude/skills/web-discoverability-skill` or `.cursor/rules/web-discoverability-skill`). 

### 3. OpenAI Agent Frameworks
Use the pre-configured Agent Definition in [`agents/openai.yaml`](file:///c:/Users/rocky/OneDrive/Desktop/seo-skill/agents/openai.yaml):

```yaml
name: web-discoverability-skill-agent
description: Universal web discoverability, AI discoverability, and technical audit agent.
instructions_file: SKILL.md
```

---

## 🛠️ Python Helper Scripts

`web-discoverability-skill` includes a suite of command-line tools in [`scripts/`](file:///c:/Users/rocky/OneDrive/Desktop/seo-skill/scripts/):

- **`select_requirements.py`**: Pre-filters applicable requirements based on execution level and project profile to keep agent prompt contexts compact.
  ```bash
  python scripts/select_requirements.py --level recommended --format summary
  ```
- **`validate_registry.py`**: Validates registry JSONL integrity, schema completeness, contiguous stable IDs, and documentation cross-links.
  ```bash
  python scripts/validate_registry.py
  ```
- **`audit_coverage.py`**: Audits taxonomy mapping against `requirements/coverage-map.json` and flags potential gaps.
  ```bash
  python scripts/audit_coverage.py --format report
  ```
- **`build_registry.py`**: Re-indexes stable requirement IDs and compiles the manifest index.
  ```bash
  python scripts/build_registry.py
  ```

---

## 📂 Repository Structure

```text
web-discoverability-skill/
├── SKILL.md                         # Main Agent Orchestrator Instructions
├── README.md                        # Project Overview & Quick Start
├── CONTRIBUTING.md                  # Development & Contribution Guide
├── INTEGRATION.md                   # Detailed Usage & Framework Integration Manual
├── ARCHITECTURE.md                  # System Architecture & Technical Specifications
├── SECURITY.md                      # Security, Privacy & Ethical Guardrails
├── CHANGELOG.md                     # Versioning & Release History
├── CODE_OF_CONDUCT.md               # Community Standards
├── agents/
│   └── openai.yaml                  # OpenAI Agent Specification
├── assets/
│   └── templates/                   # Report & Record Templates
│       ├── audit-report.md          # Output template for AUDIT_ONLY mode
│       ├── final-report.md          # Output template for IMPLEMENT_AND_AUDIT mode
│       └── requirement-record.md    # Compact requirement state template
├── references/                      # Deep Reference Documentation
│   ├── ai-crawler-policy-matrix.md # AI bot user-agent & policy reference
│   ├── ai-taxonomy.md               # AI search vocabulary & evidence boundaries
│   ├── discovery-applicability.md  # Profile discovery & domain activation rules
│   ├── framework-adapters.md        # Stack-specific implementation patterns
│   ├── search-surface-matrix.md     # Surface eligibility & crawler guidelines
│   ├── subagents.md                 # Multi-agent role contracts & isolation rules
│   └── verification.md              # 4-tier verification protocol & gates
├── requirements/                    # Machine-Readable Requirement Registry
│   ├── manifest.json                # Global index, domain counts, & levels
│   ├── coverage-map.json            # Taxonomy completeness map
│   ├── registry.md                  # Human-readable domain index
│   └── *.jsonl                      # 42 domain JSONL files (640 total records)
└── scripts/                         # Python Helper & Validation Tools
    ├── audit_coverage.py            # Coverage gap audit script
    ├── build_registry.py            # Registry builder & ID re-indexer
    ├── select_requirements.py       # Context-filtering selector
    ├── test_profiles.py             # Profile test runner
    └── validate_registry.py         # Integrity & schema validator
```

---

## 🛡️ Guardrails & Safety Policy

1. **Evidence-Based Verification**: `web-discoverability-skill` never claims an external indexation, rich result, or AI citation without empirical code/HTTP evidence.
2. **Non-Destructive Implementation**: Preserves application design, business logic, authentication boundaries, and existing infrastructure.
3. **Single-Writer Safety**: Appoints single-agent ownership for modified files to eliminate merge conflicts during parallel audits.
4. **Ethical SEO & Discoverability**: Explicitly forbids cloaking, doorway pages, fake Schema.org markup, keyword stuffing, or security/paywall bypasses.

---

## 📄 License

This repository is licensed under the [MIT License](LICENSE).
