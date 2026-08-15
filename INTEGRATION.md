# `web-discoverability-skill` Integration & Usage Guide

This guide provides step-by-step instructions for integrating, configuring, and executing **`web-discoverability-skill`** across software development workflows, web frameworks, multi-agent AI setups, and CI/CD pipelines.

---

## 📋 Table of Contents

- [Workflow Overview](#workflow-overview)
- [Step 1: Discover & Build Project Profile](#step-1-discover--build-project-profile)
- [Step 2: Set Execution Controls & Filter Requirements](#step-2-set-execution-controls--filter-requirements)
- [Step 3: Framework-Specific Integration Adapters](#step-3-framework-specific-integration-adapters)
  - [Next.js (App & Pages Router)](#nextjs-app--pages-router)
  - [React / Vite / Single-Page Apps (SPA)](#react--vite--single-page-apps-spa)
  - [Remix / React Router v7](#remix--react-router-v7)
  - [Astro](#astro)
  - [Python (Django, FastAPI, Flask)](#python-django-fastapi-flask)
- [Step 4: Multi-Agent Parallel Audit & Implementation](#step-4-multi-agent-parallel-audit--implementation)
- [Step 5: Verification & Final Report Generation](#step-5-verification--final-report-generation)
- [Step 6: CI/CD Pipeline Setup](#step-6-cicd-pipeline-setup)
- [Troubleshooting Technical Discoverability Conflicts](#troubleshooting-technical-discoverability-conflicts)

---

## 🔄 Workflow Overview

The complete `web-discoverability-skill` lifecycle operates in 4 distinct phases:

```text
┌───────────────────────────┐     ┌───────────────────────────┐
│ 1. Profile & Activation   │ ──► │ 2. Selection & Scoping    │
│    (Inspect repo & stack) │     │    (Filter level & domain)│
└───────────────────────────┘     └───────────────────────────┘
                                                │
                                                ▼
┌───────────────────────────┐     ┌───────────────────────────┐
│ 4. Verification & Report  │ ◄── │ 3. Multi-Agent Audit &    │
│    (4-tier evidence check)│     │    Implementation (Safe)  │
└───────────────────────────┘     └───────────────────────────┘
```

---

## 🔍 Step 1: Discover & Build Project Profile

Before selecting requirements, inspect the target repository without making file modifications and construct a `project-profile.json` file.

Refer to [`references/discovery-applicability.md`](file:///c:/Users/rocky/OneDrive/Desktop/seo-skill/references/discovery-applicability.md) for full details.

### Example `project-profile.json`

```json
{
  "framework": "nextjs",
  "deployment": "vercel",
  "application_types": ["saas", "blog"],
  "public_site": true,
  "javascript_app": true,
  "has_images": true,
  "has_video": false,
  "ecommerce": false,
  "local_business": false,
  "multilingual": true,
  "language_count": 2,
  "ugc": false,
  "paywall": false,
  "blog": true,
  "public_documents": false,
  "analytics": true,
  "cdn": true,
  "waf": true
}
```

---

## ⚙️ Step 2: Set Execution Controls & Filter Requirements

Resolve execution parameters before running audits or code edits:

- **`level`**: Select `LITE`, `RECOMMENDED` *(Default)*, `EXTRA`, or `ULTRA`.
- **`mode`**: Select `AUDIT_ONLY`, `IMPLEMENT`, or `IMPLEMENT_AND_AUDIT` *(Default)*.

### Using `scripts/select_requirements.py`

Use the CLI script to preview activated domains and generate compact requirement context without loading the entire registry into agent memory:

```bash
# Preview active domains & count for Recommended level
python scripts/select_requirements.py --level recommended --profile project-profile.json --format summary

# Output selected JSONL records for specific domains
python scripts/select_requirements.py --level recommended --domain metadata --domain sitemaps --format jsonl

# Output Markdown Surface Eligibility Matrix
python scripts/select_requirements.py --level extra --format surface-matrix
```

---

## 🧱 Step 3: Framework-Specific Integration Adapters

Refer to [`references/framework-adapters.md`](file:///c:/Users/rocky/OneDrive/Desktop/seo-skill/references/framework-adapters.md) for native implementation guidelines.

### Next.js (App & Pages Router)

- **Root Metadata**: Use `export const metadata: Metadata` in `app/layout.tsx` for core meta, OpenGraph, Twitter Cards, and canonical tags.
- **Dynamic Metadata**: Implement `generateMetadata()` for dynamic product or blog routes.
- **Sitemaps & Robots**: Implement `app/sitemap.ts` and `app/robots.ts` using Next.js native Route Handlers.
- **Structured Data**: Inject Schema.org JSON-LD via `<script type="application/ld+json">` dangerouslySetInnerHTML inside Server Components.

```tsx
// app/layout.tsx example
import type { Metadata } from 'next';

export const metadata: Metadata = {
  metadataBase: new URL('https://example.com'),
  title: { default: 'Acme SaaS', template: '%s | Acme SaaS' },
  description: 'Enterprise workflow automation platform.',
  alternates: { canonical: '/' },
  robots: { index: true, follow: true },
};
```

### React / Vite / Single-Page Apps (SPA)

- **Head Management**: Use `@unhead/react` or `react-helmet-async` for client metadata.
- **Server Rendering / Prerendering**: Combine SPAs with Static Prerendering (e.g. `vite-plugin-prerender` or SSR middleware) so crawlers receive fully rendered HTML meta tags.
- **Fallbacks**: Ensure server routing returns `200 OK` with static initial HTML metadata rather than empty root divs for non-JS bots.

### Remix / React Router v7

- **Route Metadata**: Export `meta` functions from route modules leveraging `loader` data.
- **Dynamic Headers**: Return `Cache-Control` and `Link` canonical headers from server `loader` functions.

```typescript
// app/routes/blog.$slug.tsx example
export const meta: MetaFunction<typeof loader> = ({ data }) => [
  { title: data?.post.title },
  { name: 'description', content: data?.post.excerpt },
  { tagName: 'link', rel: 'canonical', href: `https://example.com/blog/${data?.post.slug}` },
];
```

### Astro

- **Frontmatter SEO**: Create reusable `<BaseSEO />` components accepting OpenGraph, Twitter, canonical, and structured data props.
- **Automatic Sitemaps**: Integrate `@astrojs/sitemap` in `astro.config.mjs`.
- **Content Collections**: Auto-generate Schema.org `Article` or `TechArticle` structured data from markdown/MDX frontmatter schema.

### Python (Django, FastAPI, Flask)

- **Django**: Utilize `django.contrib.sitemaps`, custom template tags for OpenGraph/JSON-LD, and middleware for trailing slash enforcement.
- **FastAPI / Flask**: Render Jinja2 templates containing server-side metadata, return XML sitemaps via FastAPI `Response(content=xml, media_type="application/xml")`, and set `Cache-Control` / ETag headers.

---

## 🤖 Step 4: Multi-Agent Parallel Audit & Implementation

When delegating tasks across parallel subagents, follow the isolation rules in [`references/subagents.md`](file:///c:/Users/rocky/OneDrive/Desktop/seo-skill/references/subagents.md):

1. **Context Isolation**: Give each subagent *only* its assigned domain JSONL file or requirement IDs, the project profile, and target file boundaries.
2. **Single-Writer File Ownership**: Assign explicit file write ownership to one agent (e.g., `Agent-A` owns `app/sitemap.ts`, `Agent-B` owns `app/layout.tsx`).
3. **Status Reporting**: Return compact state updates using requirement IDs:

```text
SEO-001 | FIXED | Added canonical redirect middleware in src/middleware.ts | src/middleware.ts
SEO-014 | ALREADY_CORRECT | Existing sitemap.ts complies with schema | app/sitemap.ts
SEO-045 | NEEDS_MANUAL_ACTION | Requires Search Console domain property verification | N/A
```

---

## 🔬 Step 5: Verification & Final Report Generation

Verification must follow the 4-tier protocol described in [`references/verification.md`](file:///c:/Users/rocky/OneDrive/Desktop/seo-skill/references/verification.md):

- **Gate 1 (Static Inspection)**: File path, line number, syntax, and configuration validation.
- **Gate 2 (Rendered Output Inspection)**: Rendered HTML DOM inspection, `<head>` elements, headers (`Content-Type`, `Cache-Control`, `X-Robots-Tag`).
- **Gate 3 (Build & Command Tests)**: Run typecheckers (`tsc`), linters (`eslint`), test runners (`vitest`, `pytest`), or build scripts (`npm run build`).
- **Gate 4 (Surface & AI Discoverability Eligibility)**: Verify Schema.org validity against Schema.org specifications and AI bot accessibility matrix.

Generate the final output report using the template at [`assets/templates/final-report.md`](file:///c:/Users/rocky/OneDrive/Desktop/seo-skill/assets/templates/final-report.md).

---

## 🚢 Step 6: CI/CD Pipeline Setup

Automate discoverability registry validation in GitHub Actions to prevent regressions.

```yaml
# .github/workflows/discoverability-audit.yml
name: Technical Discoverability Registry Audit

on:
  push:
    branches: [main]
  pull_request:

jobs:
  validate-discoverability:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Set up Python
        uses: actions/setup-python@v5
        with:
          python-version: '3.11'

      - name: Validate Registry & Coverage
        run: |
          python scripts/validate_registry.py
          python scripts/audit_coverage.py --format report
```

---

## ⚡ Troubleshooting Technical Discoverability Conflicts

| Conflict Scenario | Cause | Resolution Strategy |
| :--- | :--- | :--- |
| **`noindex` vs. Sitemap Inclusion** | Page is listed in XML sitemap but contains `<meta name="robots" content="noindex">`. | Remove page from sitemap OR remove `noindex` tag. Sitemaps must only list `200 OK` indexable canonical URLs. |
| **Canonical Target vs. Redirect** | Canonical points to URL `A`, but URL `A` returns a `301` redirect to URL `B`. | Update canonical link element to point directly to final destination `URL B`. |
| **Canonical vs. Hreflang** | Page `en-US` sets canonical to `en-GB` while hreflang claims `en-US` is self-referential. | Each language/region variant must have a **self-referential canonical tag** while listing all cross-locale alternates in `hreflang`. |
| **Client Meta vs. Server Meta** | Meta tags created by client JS are missing in initial cURL / server HTML response. | Implement SSR, SSG, or static head prerendering so crawlers without JS render engines receive full meta tags. |
| **WAF / CDN Blocking Bots** | WAF rule blocks `GPTBot`, `ClaudeBot`, or `PerplexityBot` with HTTP `403` / `503`. | Verify business intent; update WAF firewall rules to explicitly allow non-destructive AI retrieval bots if AI discoverability is desired. |
