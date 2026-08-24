# System architecture

`web-discoverability-skill` is a dependency-free Node.js skill package. Its
purpose is to turn documented discoverability requirements into scoped audits,
deterministic checks, evidence reports, and reproducible benchmark results.
It does not control search-engine ranking or indexing.

## Runtime pipeline

```text
target repository
      |
      v
profile.mjs -> project profile and evidence-backed facts
      |
      v
select.mjs -> level/domain candidate selection
      |
      v
snapshot.mjs -> source files, static output, captures, and runtime metadata
      |
      v
checks/*.mjs -> deterministic checks with evidence and statuses
      |
      v
report.mjs -> audit, quality, metrics, source, and stale reports
      |
      v
CLI output / generated reports / agent final report
```

The CLI entry point is [tools/cli.mjs](tools/cli.mjs). The package exposes it as
the `wds` binary but does not install dependencies.

## Source-of-truth boundaries

| Concern | Authority | Generated consumers |
| --- | --- | --- |
| Active requirements | `requirements/*.jsonl` | manifest, registry index, per-ID pages, reports |
| Retired IDs | `requirements/removed.jsonl` | validation and ledgers |
| Deferred IDs | `requirements/deferred.jsonl` | validation and ledgers |
| Enums and domain metadata | `tools/lib/model.mjs` | JSON schemas, vocabulary, validation |
| Deterministic checks | `tools/lib/checks/*.mjs` | audit, benchmarks, coverage metrics |
| Fixtures and expected defects | `benchmarks/fixtures/`, `benchmarks/cases/` | benchmark reports and coverage docs |
| Agent instructions | `SKILL.md` | Codex and other agent skill hosts |

Generated Markdown is downstream. A requirement page is a human view of its
JSONL record, not a second editable registry.

## Requirement records

The schema is generated into
[schema/requirement.schema.json](schema/requirement.schema.json). A record
contains identity, a testable statement and rationale, applicability gates,
implementation guidance, verification evidence, review metadata, relationships,
framework/surface scope, and citations. Unknown keys and malformed values fail
validation. Stable IDs are never reused; retired and deferred IDs remain in
their ledgers.

## Applicability

`profile.mjs` scans the target repository and records each fact as true, false,
or unknown with evidence. `select.mjs` evaluates `applies_when` clauses and
returns applicable, uncertain, or not-applicable candidates. A selection is not
an implementation instruction: the agent must inspect the project and the
requirement page before changing code.

## Checks and snapshots

Checks are loaded from the explicit manifest in
[tools/lib/checks/index.mjs](tools/lib/checks/index.mjs). A check declares its
requirement IDs, evidence types, runtime needs, and status contract. The snapshot
layer can read source files, static output, captured raw/rendered HTML, headers,
robots, sitemaps, and feeds. Runtime-sensitive checks return `NEEDS_RUNTIME`
when served output is unavailable instead of guessing from source.

## Generated documentation

`npm run docs -- --write` generates:

- `requirements/manifest.json`;
- `requirements/registry.md`;
- `requirements/by-id/SEO-xxx.md` for every active requirement;
- `references/vocabulary.md` and `EVIDENCE.md`;
- JSON schemas;
- generated metrics and benchmark blocks in `README.md` and
  `benchmarks/README.md`.

`npm run docs:check` fails when any generated file is missing, stale, or extra.

## Verification model

The project uses four complementary gates:

1. Static inspection of source and configuration.
2. Served-output inspection of HTML, headers, robots, sitemaps, and feeds.
3. Project-native tests, builds, type checks, lint, browser, and performance tools.
4. Surface and external-platform checks, reported as manual actions when the
   repository cannot observe them.

Benchmarks measure only the deterministic checked subset against fixture defects.
They are regression tests, not ranking or traffic evidence.

## Installation shape

The root `SKILL.md` is a Vercel Agent Skills-compatible entry point. The
`skills` CLI discovers it directly from GitHub and copies the repository as the
skill bundle. Installed agents must resolve `SKILL_ROOT` before invoking bundled
tools; the target application path remains a separate argument.
