# Integration guide

This guide covers installing the skill, running its CLI, integrating it into an
agent workflow, and adding repository checks to CI.

## Install with Vercel Agent Skills

Project installation:

```bash
npx skills add ARafaykhalid/web-discoverability-skill \
  --skill web-discoverability-skill
```

Global Codex installation:

```bash
npx skills add ARafaykhalid/web-discoverability-skill \
  --skill web-discoverability-skill --global --agent codex --yes
```

One-time use without installation:

```bash
npx skills use \
  ARafaykhalid/web-discoverability-skill@web-discoverability-skill \
  --agent codex
```

The bundled audit tools support Node.js 22.18+ (the first Node release that
runs `.ts` files by native type stripping, which is how the tools ship without
a compiler or any dependency). The current Vercel `skills` CLI declares
Node.js 22.20+.

## CLI quick start

From a checkout:

```bash
node tools/cli.ts version
node tools/cli.ts profile ./path/to/site
node tools/cli.ts select ./path/to/site --level RECOMMENDED
node tools/cli.ts audit ./path/to/site --level RECOMMENDED
```

From an installed skill, resolve the directory containing `SKILL.md` and use:

```bash
node "$SKILL_ROOT/tools/cli.ts" audit ./path/to/site --level RECOMMENDED
```

`version` reports the skill version, registry schema version, local commit, and
upstream freshness; run it before any substantive work. `profile` describes the
stack and evidence-backed facts. `select` returns candidate requirements.
`audit` runs deterministic checks and reports evidence; it does not modify the
target repository.

## Project profile overrides

Place an optional `project-profile.json` in the target root when detection cannot
infer a fact. Use only supported profile predicates and boolean or `"unknown"`
values. Overrides are recorded with provenance; contradictions with confident
detection appear as profile problems instead of being hidden.

See [references/discovery-applicability.md](references/discovery-applicability.md)
for predicates and activation behavior.

## Selecting requirement context

Use the selector instead of loading the whole registry:

```bash
node tools/cli.ts select ./path/to/site \
  --level RECOMMENDED

node tools/cli.ts select ./path/to/site \
  --level EXTRA --domains metadata,sitemaps --json
```

The selector accepts one comma-separated `--domains` value and emits JSON with
`--json`; unsupported flags are not a filtering or output mechanism.

The generated [requirement index](requirements/registry.md) links to a complete
Markdown page for every active requirement in `requirements/by-id/`.

## Agent implementation workflow

0. Run `node "$SKILL_ROOT/tools/cli.ts" version --json` and act on the result:
   proceed when `verified`, update or reload the skill when `update_available`
   and the environment permits, and record `unable_to_verify` with its reason
   when the upstream cannot be reached. Never claim the skill is current
   without a `verified` result.
1. Profile the repository and record unknowns.
2. Select the requested level and relevant domains.
3. Read the generated pages for the selected requirement IDs.
4. Classify applicability before editing.
5. Resolve dependencies, conflicts, and shared-file ownership.
6. Apply only changes allowed by `change_safety` and user authority.
7. Run the target project's actual tests and inspect served output.
8. Audit again and report evidence, blockers, and manual actions.

Use [AUDIT.md](AUDIT.md) for statuses and evidence and
[references/verification.md](references/verification.md) for verification gates.

## Framework integration

Use native framework ownership rather than forcing a universal file layout:

- Next.js: metadata APIs, `robots.ts`, `sitemap.ts`, route handlers, and
  server-rendered JSON-LD where supported by the installed version.
- React/Vite SPAs: verify initial served HTML; use SSR, SSG, or prerendering when
  search-critical content exists only after client execution.
- Remix/React Router: route metadata, loader data, response headers, and server
  rendering.
- Astro: layouts, content collections, integrations, and generated resources.
- Express/Fastify/Hono/Bun/Deno: server templates, explicit routes, headers, and
  static-public directories.
- Django/Flask/FastAPI: template ownership, sitemap/robots responses, middleware,
  static files, and framework-native routing.
- CMS/headless/monorepos: identify the source of truth and the layer that owns
  each public response before editing.

Detailed adapters are in
[references/framework-adapters.md](references/framework-adapters.md).

## CI integration

The repository itself has no install step:

```yaml
name: Discoverability skill checks

on:
  push:
  pull_request:

jobs:
  verify:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: 22.x
      - run: npm run validate
      - run: npm run quality
      - run: npm run bench:check
      - run: npm run docs:check
      - run: npm test
```

`npm run check-sources` performs live network requests and is better suited to a
scheduled maintenance job. `stale-requirements --strict` is calendar-driven and
should also run on a schedule rather than blocking unrelated pull requests.

## Common conflicts

| Conflict | Required resolution |
| --- | --- |
| `noindex` URL in a sitemap | Remove the URL from the sitemap or remove the intentional `noindex`. |
| Canonical points to a redirect | Point directly to the final successful canonical URL. |
| Canonical conflicts with hreflang | Keep each locale self-canonical and link the alternate cluster consistently. |
| Client-only metadata | Move search-critical metadata into the initial server response. |
| Public caching on personalized content | Separate public and authenticated cache behavior. |
| WAF blocks intended crawlers | Confirm business policy, then align robots and edge rules without weakening private routes. |
| Structured data differs from visible facts | Correct or remove the markup; never invent missing facts. |

External Search Console, Bing, Merchant Center, DNS, deployment, and account
actions remain `NEEDS_MANUAL_ACTION` unless their actual output was observed.
