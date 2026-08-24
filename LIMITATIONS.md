# Known limitations

This document exists because the repository makes checkable claims, and a
checkable claim is only trustworthy next to an honest account of what it does not
cover. Nothing here is boilerplate. Each item is something a user could
reasonably expect and will not get.

## Outcomes this repository cannot produce

**Rankings.** No requirement in the registry has been shown to move a page's
position in any search result, and this repository contains no data that could
show it. Ranking systems are unpublished, change continuously, and respond to
factors — links, competition, query intent, user behaviour, site history — that
are outside anything a static audit can read. A record whose `rationale`
describes a documented crawler or indexing behaviour is making a claim about
*that behaviour*, not about position.

**Indexing.** Making a page crawlable and canonical removes reasons for a search
engine to exclude it. It does not oblige any engine to include it. Google's own
documentation states that indexing is not guaranteed for any page; this
repository takes that statement at face value rather than working around it.

**AI answer inclusion or citation.** Whether ChatGPT, Claude, Perplexity, Gemini,
Copilot, or any other system retrieves a page, uses it, or names it is decided by
retrieval pipelines and answer-generation policies that none of these vendors
publish in enough detail to verify against. Serving `llms.txt`, allowing
`GPTBot`, emitting clean structured data, and writing well-segmented prose are
all things you can *do*; none of them is a mechanism that produces a citation.
Requirements in `EMERGING_GEO` are labelled experimental for exactly this reason,
carry tier D citations, and carry a `caution` field.

**Traffic or revenue.** Out of scope entirely. Not measured, not modelled, not
claimed.

## Things the tooling genuinely cannot see

**Anything that requires a running origin, when no origin is supplied.** Checks
declare whether they need runtime output. Without a captured response they report
`NEEDS_RUNTIME` and are excluded from both the numerator and the denominator of
every benchmark rate. That is honest but it means a project audited without a
snapshot gets a smaller audit than the summary line might suggest — read the
`not measured` list, not just the score.

**Server behaviour that is not in the capture.** Status codes, redirect chains,
response headers, `X-Robots-Tag`, `Vary`, caching, CDN and WAF rules, geographic
or user-agent variation, and rate limiting are all observable only through
captured responses. A source tree does not contain them, and the profiler does
not infer them.

**Rendering that depends on a real browser.** The snapshot loader compares an
initial response against a post-execution capture when the fixture or project
supplies both. It does not run a browser itself, does not execute JavaScript, and
therefore cannot see hydration errors, layout shift, lazy-loaded content, or
anything that only appears after user interaction.

**Server-side templating in languages this repository does not parse.** Django,
Rails, Laravel, Flask, and FastAPI projects are detected as frameworks, but their
templates are not analysed. Findings on such projects come from captured output
or from files that happen to be plain HTML, XML, or JSON.

**CMS-managed content.** Where head tags, canonicals, or structured data are
configured in a database or an admin UI rather than in the repository, an audit of
the repository will not find them and must not conclude they are absent. This is
one of the situations the `UNCERTAIN` verdict exists for.

**Whether a change actually shipped.** The tooling can verify that served output
now contains what a requirement asks for. It cannot verify that the deployment
that served it is the deployment users receive.

## Limits of the registry itself

**Coverage of the registry by automated checks is partial, and the exact ratio is
published rather than described.** See `check_coverage_ratio` in the metrics table
in [README.md](README.md) and in `reports/metrics.json`. Every requirement without
a check is still a requirement — it carries a `verification.method` a person or an
agent can follow — but it is not scored by any benchmark, and its correctness
rests on its sources rather than on a test.

**A large part of the original requirement set is not in the active registry.**
Records reviewed and retired are in `requirements/removed.jsonl` with a reason.
Records that survived review but were not fully specified are in
`requirements/deferred.jsonl` with the blocker that stopped them and their ID
reserved. Both files are validated on every run. The active count, the removed
count, and the deferred count are all in the metrics table; the registry
deliberately publishes the number of records it actually specified rather than
the number it started with.

**Sources are checked on a schedule, not continuously.** Every externally
dependent record carries `review.last_verified`, `review.interval_days`, and a
stability rating. `npm run stale` lists what is overdue. `npm run check-sources`
tests reachability over the network — reachability only. A page that still
resolves but has been rewritten to say something different will pass that check
and be wrong until a human re-reads it.

**Evidence tiers are editorial judgements.** The tier on a citation records how
strongly *that document* supports *that record's claim*. Two reviewers could
disagree about A versus B on the same pairing. The validator enforces internal
consistency — a record cannot claim a tier no citation supports — but it cannot
enforce that the judgement was right.

**The dependency and conflict graphs are declared, not derived.** They are
validated for existence, reciprocity, and acyclicity. Nothing detects a
*missing* dependency or an *unnoticed* conflict between two rules that have never
been considered together.

**A synced filesystem can still present an incomplete tree.** The check loader
compares the directory listing with an explicit module manifest and validation
fails when one is missing, but it cannot repair a partially downloaded file or
prove that unrelated project files were fully available during an audit.

## Limits of the benchmarks

**The fixtures contain defects we planted.** Precision and recall measure whether
the checks find what their cases declare and stay quiet where their cases say
they should. That is a regression harness. It is not a sample of real websites,
it is not adversarial, and it cannot surface a failure mode nobody thought to
plant.

**Fixture coverage of the site types the model distinguishes is incomplete, and
the gaps are listed by name** in [benchmarks/README.md](benchmarks/README.md).
Site types without a fixture have applicability logic and requirements but no
scored evidence that the logic behaves on a realistic project.

**A perfect score is a weak signal.** It says the checks agree with the cases.
Cases are written by the same project that writes the checks, which is why
`benchmarks/README.md` sets rules against reverse-engineering expectations from
tool output — but the structural conflict of interest remains, and a reader
should treat the benchmark as evidence of stability rather than of accuracy.

**Rates use honest denominators, which makes them look worse than inflated ones.**
A check that reported `NOT_APPLICABLE` or `NEEDS_RUNTIME` is counted as neither a
true negative nor a miss. Padding `expected_non_findings` with checks that never
inspected the fixture would raise the reported true-negative count without
improving anything.

## Limits of autonomous use

**False positives cost more than false negatives.** An agent that changes a
canonical URL, a robots directive, or a redirect on a live site can remove pages
from an index. A missed optimisation costs nothing comparable. The safety
classification, the `HIGH` impact rules, and the `UNCERTAIN` verdict all exist to
make the tooling reluctant, and that reluctance is deliberate rather than
incidental.

**Structured data describing real-world entities cannot be authored by an agent.**
Reviews, ratings, prices, availability, authorship, organisation identity, and
dates must come from the site's real data. The relevant requirements are
`BLOCKED`: reportable, not actionable. There is no automated way to tell a
plausible invented value from a true one, which is why the prohibition is
categorical.

**Some findings need a person.** Content quality, editorial accuracy, entity
identity, intent match, and anything requiring knowledge of the business are
reported with `verification.level: MANUAL_EXTERNAL`, which forces
`change_safety: BLOCKED`. The tooling's contribution there is to ask a precise
question, not to answer it.

## Limits of this document

It lists what the project knows it cannot do. The category it cannot enumerate is
the requirements that are simply wrong — a misread specification, a
platform behaviour that changed after the citation was checked, a rule that was
true for a different kind of site. `npm run validate` cannot detect any of those.
If you find one, the review classification vocabulary in
[CONTRIBUTING.md](CONTRIBUTING.md) exists to record it.
