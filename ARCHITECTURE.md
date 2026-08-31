# System architecture

`web-discoverability-skill` is a dependency-free Node.js skill package. Its
purpose is to turn documented discoverability requirements into scoped audits,
deterministic checks, evidence reports, and reproducible benchmark results.
It does not control search-engine ranking or indexing.

The tools are TypeScript executed directly by Node's native type stripping
(Node 22.18+): there is no compiler, no build step, and no emitted artifact,
which is how the package keeps zero dependencies. Annotations are erasable
syntax only.

## Runtime pipeline

```text
target repository
      |
      v
version.ts -> skill version, registry version, upstream freshness
      |
      v
profile.ts -> project profile and evidence-backed facts
      |
      v
select.ts -> level/domain candidate selection
      |
      v
snapshot.ts -> source files, static output, captures, and runtime metadata
      |
      v
checks/*.ts -> deterministic checks with evidence and statuses
      |
      v
report.ts -> audit, quality, metrics, source, and stale reports
      |
      v
CLI output / generated reports / agent final report
```

The CLI entry point is [tools/cli.ts](tools/cli.ts). The package exposes it as
the `wds` binary but does not install dependencies.

## Source-of-truth boundaries

| Concern | Authority | Generated consumers |
| --- | --- | --- |
| Active requirements | `requirements/*.jsonl` | manifest, registry index, per-ID pages, reports |
| Retired IDs | `requirements/removed.jsonl` | validation and ledgers |
| Deferred IDs | `requirements/deferred.jsonl` | validation and ledgers |
| Enums and domain metadata | `tools/lib/model.ts` | JSON schemas, vocabulary, validation |
| Deterministic checks | `tools/lib/checks/*.ts` | audit, benchmarks, coverage metrics |
| Skill and registry version | `package.json`, `requirements/manifest.json` | `version` command, audit/select/profile output |
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

`profile.ts` scans the target repository and records each fact as true, false,
or unknown with evidence. `select.ts` evaluates `applies_when` clauses and
returns applicable, uncertain, or not-applicable candidates. A selection is not
an implementation instruction: the agent must inspect the project and the
requirement page before changing code.

## Checks and snapshots

Checks are loaded from the explicit manifest in
[tools/lib/checks/index.ts](tools/lib/checks/index.ts). A check declares its
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

## Version and freshness model

`tools/lib/version.ts` is the single source of the version facts every report
can state: the skill version from `package.json`, the registry schema version
from `requirements/manifest.json`, and the local commit read directly from
`.git` (no subprocess, so it works where the `git` binary is absent). The
upstream comparison fetches the GitHub commits atom feed with a timeout and
compares commits, yielding `verified`, `update_available`, or
`unable_to_verify` with the reason. Every unreadable input becomes an explicit
`unknown`/`null` rather than a guess, and the check never throws.

The comparison lives only in the `version` command. `audit`, `select`, and
`profile` embed the local version fields but never touch the network, so their
output stays deterministic and testable; `SKILL.md` makes the agent run
`version` first and carry the outcome into its report.

## Installation shape

The root `SKILL.md` is a Vercel Agent Skills-compatible entry point. The
`skills` CLI discovers it directly from GitHub and copies the repository as the
skill bundle. Installed agents must resolve `SKILL_ROOT` before invoking bundled
tools; the target application path remains a separate argument. An installed
bundle has no `.git`, so its version check reports the upstream commit but
`unable_to_verify` for the comparison - that is recorded, not hidden.
