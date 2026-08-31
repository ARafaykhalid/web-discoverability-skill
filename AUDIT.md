# The audit workflow

How a run proceeds, what each status means, and what an agent is permitted to do
with the result. [SKILL.md](SKILL.md) is the operational instruction an agent
follows; this document explains the model behind it.

## The pipeline

```text
project directory
  → snapshot        read source files and any captured responses
  → profile         derive structured facts about what kind of site this is
  → selection       evaluate every requirement's applies_when against the facts
  → checks          run the deterministic checks for the applicable requirements
  → findings        each with a location, evidence, tier, confidence, and safety
```

Each stage is a separate command, and each is inspectable on its own:

```bash
node tools/cli.ts profile ./site --json   # the facts, with the reason for each
node tools/cli.ts select ./site --json    # every verdict, with the reason
node tools/cli.ts audit ./site --json     # the findings
```

Running them in order is the fastest way to answer "why did you not tell me about
X?" — the answer is almost always a fact the profiler could not establish, and
`select` names it.

## The snapshot

The snapshot is what the checks are allowed to read. It contains source files
found in the project and, separately, any captured responses the project supplies
through a `snapshot.json`: a raw response body, a post-execution body, a status
code, and response headers per route.

The separation is the point. A check declares whether it needs source, runtime,
or both. A check that needs a served response and does not have one reports
`NEEDS_RUNTIME`; it does not fall back to reading the source and guessing. A
source file containing a `<meta name="robots">` tag is not evidence that the
served document contains it — templating, middleware, a CDN, or a build step can
all remove it, and fourteen requirement domains are marked runtime-sensitive for
that reason. In those domains a requirement may not declare
`verification.level: SOURCE` at all; the validator rejects it.

## The profile

A structured set of named facts, each with a value and the reason it was
concluded. Values are tri-state: true, false, or unknown.

Facts cover the framework and its renderer, the routing model, whether output is
server-rendered, statically generated, or client-rendered, whether a sitemap,
`robots.txt`, `llms.txt`, feeds, or structured data are present, whether the site
is multilingual, ecommerce, a local business, editorial, paywalled, or carries
user-generated content, whether there is authentication, faceted navigation, or
pagination, whether a CDN or WAF sits in front, whether the project is a monorepo,
and whether a production origin and a runtime capture are available.

Requirements are gated on these facts, not on a site category anyone declares.
Nothing asks the user "is this an ecommerce site?", because the answer to that
question is not checkable and the presence of a catalogue is.

## Selection and post-check states

Every requirement at or below the requested level is evaluated in two stages:
a coarse domain activation, then its own `applies_when` clause with `all`, `any`,
and `none` conditions. The selector and audit CLI emit these applicability
verdicts:

| Verdict | Meaning | What an agent may do |
| :--- | :--- | :--- |
| `APPLICABLE` | the profile satisfies the conditions | run the check; act within `change_safety` |
| `NOT_APPLICABLE` | the profile contradicts a condition | nothing; do not report it as a gap |
| `UNCERTAIN` | a required fact is unknown | ask for evidence; **do not modify anything** |

`BLOCKED` and `ALREADY_CORRECT` are agent/report states after selection: use
`BLOCKED` when the selected work needs unavailable authority or facts, and use
`ALREADY_CORRECT` when a check or documented verification proves the requirement
already holds. They are not selector verdicts.

`UNCERTAIN` is the load-bearing one. When the profiler cannot tell whether a fact
holds — a CMS holds the head tags, the sitemap is generated at deploy time, the
project is one package in a monorepo — the correct behaviour is to say so and
request evidence. Treating unknown as false would produce confident findings about
things nobody looked at; treating it as true would produce changes to files that
did not need them. Neither is acceptable, so `UNCERTAIN` is a first-class outcome
and appears in its own section of the audit output.

## The safety classification

`change_safety` is a property of the requirement, decided once when the record is
written, not a judgement made per project:

**`SAFE_AUTOMATIC`** — deterministic, reversible, and unable to affect indexing
directives, URLs, or business facts. An agent may make the change and report it.
Few requirements qualify, and a requirement whose `impact` is `HIGH` may never be
one; the validator enforces that.

**`REVIEW_REQUIRED`** — could affect content, URLs, indexing, redirects,
canonicalisation, structured data, or application behaviour. The agent proposes a
diff and stops. This is the majority.

**`BLOCKED`** — needs credentials, external platform access, a business or legal
decision, or facts the repository does not contain. The agent reports it as
`NEEDS_MANUAL_ACTION` and never implements it. Everything that would require
inventing a real-world fact lives here.

A requirement whose `verification.level` is `MANUAL_EXTERNAL` must be `BLOCKED`,
because a change nobody can verify from inside the repository is a change nobody
should make from inside the repository.

## High-impact changes

These are classified `HIGH` impact, which forecloses `SAFE_AUTOMATIC` and demands
both stronger evidence on the record and runtime verification of the result:

canonical URLs · redirects · `robots.txt` directives · `noindex` and
`X-Robots-Tag` · sitemap contents and generation · URL structure ·
structured data describing real-world entities · pagination · localisation and
hreflang · authentication and entitlement boundaries · generated content

The common property is that getting one wrong can remove pages from an index, and
that the damage is not visible in the diff. A wrong canonical looks like a
correct canonical. This is why the tooling reports rather than acts, and why
`npm run bench` scores `expected_blocked` as a hard pass condition: a case can
assert that a requirement is *not* automatable, and the registry has to agree.

## Evidence attached to a finding

Every finding carries evidence of a type its requirement declares — a file and
line, a route, a raw or post-execution response body, a status code, a header, a
redirect chain, a parsed JSON-LD block, a sitemap entry, a robots.txt line, a feed
document, or an explicit record that a manual action is needed.

The declared list is a permission, not an obligation. A check may cite fewer
types than its requirement allows when an artefact is honestly unavailable, and it
may never cite a type the requirement does not list. `npm run bench` fails a case
on either an unevidenced finding or an undeclared evidence type, which is what
keeps this from decaying into a convention.

## What the audit reports

`node tools/cli.ts audit` prints, and with `--json` returns:

- **findings** — with requirement id, check id, location, detail, severity,
  `change_safety`, `impact`, `evidence_tier`, `confidence`, and source URLs
- **needs_runtime** — checks that could not run for lack of a captured response
- **errors** — checks that threw, named individually
- **skill_version / registry_version** — the versions this audit ran against,
  read from `package.json` and `requirements/manifest.json` without touching
  the network; freshness against upstream is the `version` command's job, and
  `SKILL.md` requires it before any audit
- **uncertain** — requirements whose applicability could not be decided, each
  with the fact that was missing
- **unchecked_applicable** — applicable requirements with no deterministic check,
  which must be verified by their documented method

The last two exist so the summary line cannot be mistaken for coverage. A run
reporting three findings on a project with sixty unchecked applicable requirements
has not concluded that the other fifty-seven are satisfied, and the output says
so in as many words.

## Per-requirement outcomes

An agent implementing findings records one terminal status per requirement it
acted on: `IMPLEMENTED`, `FIXED`, `PROPOSED`, `FAILED`, or `NEEDS_MANUAL_ACTION`.
These are defined in `tools/lib/model.ts` and used by the report templates in
`assets/templates/`. They are the agent's vocabulary, not the CLI's — the CLI
audits and verifies, and does not implement.

## Order of operations for an agent

1. Profile the project. If the framework is `unknown`, say so before proceeding;
   generic guidance is weaker guidance.
2. Select at the requested level. Read the `uncertain` list first, and ask for
   what is missing before touching anything.
3. Audit. Treat `needs_runtime` as a gap in the audit, not as a pass.
4. Sort findings by severity and impact, and handle `SAFE_AUTOMATIC` separately
   from everything else.
5. Propose diffs for `REVIEW_REQUIRED`. Do not apply them without approval.
6. Report `BLOCKED` findings as questions with the evidence needed to answer them.
7. Re-audit after any change, and confirm the finding is gone from the served
   output rather than from the source file.

## What this workflow does not establish

Nothing here establishes that the site will rank better, be indexed, or be cited.
What it can establish is narrower and checkable: that a route returns the status
it should, resolves to one canonical URL, is not excluded by a directive nobody
meant to ship, and carries the structured data it claims to carry. Whether a
search engine or an assistant then acts on any of that happens on infrastructure
this repository cannot observe. [LIMITATIONS.md](LIMITATIONS.md) is specific about
which of those is unknowable and why.
