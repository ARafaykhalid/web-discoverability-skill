# Contributing

Contributions are welcome from engineers, technical SEO practitioners, search
researchers, accessibility specialists, and AI developers. Changes should keep
the registry evidence-backed, the tooling deterministic, and the agent workflow
safe to apply.

## Repository setup

Requirements:

- Node.js 20.6 or newer for the bundled tooling.
- Node.js 22.20 or newer when using the current Vercel `skills` CLI.
- No package dependencies and no build step.

```bash
git clone https://github.com/ARafaykhalid/web-discoverability-skill.git
cd web-discoverability-skill
npm test
```

## Registry rules

Canonical records live in `requirements/*.jsonl`. Generated files are not
editing surfaces. Stable IDs are never reused, even after removal or deferral.
Every active record must satisfy
[schema/requirement.schema.json](schema/requirement.schema.json) and the
validation rules in `tools/lib/validate.ts`.

Current record shape:

```json
{
  "id": "SEO-033",
  "domain": "metadata",
  "title": "Emit exactly one non-empty title element per page",
  "statement": "A testable assertion about the target site's behavior.",
  "rationale": "Why the control matters without promising an outcome.",
  "category": "SEARCH_DISCOVERABILITY",
  "minimum_level": "LITE",
  "severity": "HIGH",
  "impact": "LOW",
  "change_safety": "SAFE_AUTOMATIC",
  "evidence_tier": "A",
  "confidence": "HIGH",
  "applies_when": { "all": ["public_site"] },
  "implementation": "Concrete, framework-aware guidance.",
  "verification": {
    "level": "SOURCE_AND_RUNTIME",
    "method": "How to verify the served behavior.",
    "evidence": ["RENDERED_HTML"],
    "automated_check": "title-element-single"
  },
  "review": {
    "stability": "STABLE",
    "interval_days": 730,
    "last_verified": "2026-08-21",
    "owner": "metadata"
  },
  "surfaces": ["GOOGLE_SEARCH"],
  "frameworks": ["any"],
  "sources": []
}
```

Use `depends_on`, `conflicts_with`, and `supersedes` only with existing stable
IDs. Use `caution` for experimental or limited claims. Never fabricate entity,
review, author, licensing, or business facts.

## Editing workflow

1. Edit the appropriate canonical JSONL file.
2. Add or update citations and review metadata.
3. Add or update a deterministic check only when it can produce direct evidence.
4. Regenerate all derived Markdown, schemas, indexes, and reports:

```bash
npm run metrics
npm run docs -- --write
```

5. Run the complete local gates:

```bash
npm run validate
npm run quality
npm run bench
npm run docs:check
npm test
```

The generated page for each active requirement is
`requirements/by-id/SEO-xxx.md`. It contains the statement, rationale,
applicability, implementation, verification, sources, relationships, and the
canonical JSON record. Do not edit it directly.

## Checks and benchmarks

Checks belong in `tools/lib/checks/` and must be listed in the explicit check
manifest. Keep check IDs stable, declare runtime requirements, and return the
standard statuses: `PASS`, `FAIL`, `NEEDS_RUNTIME`, `NOT_APPLICABLE`, or `ERROR`.

Benchmarks belong in `benchmarks/cases/` and fixtures in
`benchmarks/fixtures/`. A benchmark declares planted defects and expected
non-findings. A perfect score proves only that checked fixture cases match their
declarations.

## Documentation changes

Keep human-maintained docs repository-relative and current. Generated files are
updated by the docs command. Do not add duplicated registries, hand-written
record counts, stale local filesystem links, or claims that the project will
rank, be indexed, receive traffic, qualify for a rich result, or be cited by an
AI system.

## Pull requests

- Keep one behavior or documentation concern per change.
- Explain the evidence and any user-visible or schema-level impact.
- Include the commands run and their results.
- Do not commit secrets, credentials, private URLs, or generated audit output
  that is not part of the repository's committed reports.
