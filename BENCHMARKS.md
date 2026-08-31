# Benchmark methodology

`npm run bench` scores the deterministic checks against fixture projects with
declared defects and declared clean regions. This document defines every number
it prints, so a reader can tell what a score does and does not establish.

The current figures are in the metrics table in [README.md](README.md) and in
`reports/benchmarks.json`. They are not repeated here, because a number typed
into prose is a number that will eventually be wrong.

## What a benchmark case is

One JSON file in `benchmarks/cases/`, validated against the generated
`schema/benchmark-case.schema.json`. It names a fixture and declares, in advance,
what the checks are supposed to conclude about it:

| Field | Declares |
| :--- | :--- |
| `fixture` | the project directory, relative to the repository root |
| `level` | which requirement levels are in scope for this case |
| `declared_defects` | the problems deliberately planted, in prose, for a human reader |
| `expected_findings` | checks that must report, optionally pinned to a location |
| `expected_non_findings` | checks that must run and stay silent |
| `expected_applicable` | requirements the selector must offer on this profile |
| `expected_not_applicable` | requirements the selector must not offer |
| `expected_safe_fixes` | requirements whose `change_safety` must be `SAFE_AUTOMATIC` |
| `expected_blocked` | requirements that must not be `SAFE_AUTOMATIC` |
| `profile_expectations` | facts the profiler must detect, including `framework` |
| `notes` | why this fixture exists and what it is meant to discriminate |

A case is written before the run, from the fixture, by reading the fixture.

## Scoring

**True positive.** A `expected_findings` entry whose check ran and produced a
finding matching on check id, requirement id if given, and location if given.
Each finding can satisfy at most one expectation, so two expectations cannot both
claim the same report.

**False negative.** An `expected_findings` entry that did not get a match. The
score records which of three reasons applies: the check never ran, the check
reported `NEEDS_RUNTIME`, `NOT_APPLICABLE`, or `ERROR`, or the check ran and found
nothing matching. The distinction matters — the first is usually a case-authoring
mistake, the second sends you to the applicability gate or the capture, and only
the third is a real miss in the check body.

**False positive.** Any finding not matched by an expectation. Findings that land
in a region a case explicitly declares clean are additionally counted as
`unnecessary_findings`, because those are the ones that would lead an agent to
modify working code.

**True negative.** An `expected_non_findings` entry whose check ran, inspected the
fixture, and reported nothing.

**Not measured.** An `expected_non_findings` entry whose check did not run, or
reported `NEEDS_RUNTIME`, `NOT_APPLICABLE`, or `ERROR`. It is counted as neither a
true negative nor a miss, and it is printed.

That exclusion is enforced in code rather than by authoring convention, because
the incentive runs the wrong way. `false_positive_rate = fp / (fp + tn)`, so a
`NOT_APPLICABLE` admitted as a true negative would enlarge the denominator with a
check that could not have produced a false positive — and every fixture has
several, since the hreflang checks decline a monolingual site and the
review-markup checks decline a site with no reviews. Listing more irrelevant
checks would then improve the published rate. Counting them as failures instead
would penalise a fixture for lacking a runtime capture it never claimed to have.
Neither is honest, so they are excluded and named individually in the output.

**Location matching is suffix-based.** An expectation of `index.html` matches a
finding at `pages/index.html:12`, but never a different file. A case can pin a
line by writing `index.html:12`.

## Rates

Pooled over raw counts across all cases, never averaged over cases — a case with
twenty findings and a case with one contribute in proportion to what they
measured.

```text
precision            = tp / (tp + fp)
recall               = tp / (tp + fn)
false_positive_rate  = fp / (fp + tn)
false_negative_rate  = fn / (fn + tp)
verification_accuracy = 1 - evidence_problems / max(1, tp + fp)
```

Each is `null`, and reported as `not measured`, when its denominator is zero.
A clean control fixture legitimately has no precision figure: with no expected
findings and no false positives, there is nothing to be precise about. `null` is
the honest answer there, and it is not rendered as `1.0`.

## Additional pass conditions

A case fails if any of these is non-empty, independently of the rates:

- **`evidence_problems`** — a finding with no evidence attached, or carrying an
  evidence type its requirement does not declare. A finding without evidence
  proves nothing, so it is treated as a defect in the check rather than a hit.
  The declared evidence list is a permission, not an obligation: a check may cite
  fewer types than the record allows when an artefact is genuinely unavailable,
  but never a type the record does not list.
- **`safety_problems`** — a requirement in `expected_safe_fixes` that the registry
  does not classify `SAFE_AUTOMATIC`, or one in `expected_blocked` that it does.
  This is what stops "we found it" from silently becoming "so we changed it".
- **`selection_problems`** — a requirement in `expected_applicable` that the
  selector rejected, or one in `expected_not_applicable` that it offered.

`expected_applicable` exists because `expected_not_applicable` is satisfiable by
a selector that rejects everything. Asserting both directions is what makes a
findings report falsifiable: a rule that is never offered can never be wrong, so
proving the offer is a precondition for trusting the report. A verdict of
`UNCERTAIN` does not satisfy `expected_applicable` — "ask for evidence" is the
right answer only when the project does not supply the evidence, and a case
asserting applicability is asserting that it does.

## Authoring rules

These are constraints on the humans and agents writing cases, and they are the
reason the numbers are worth anything.

1. **Never derive an expectation from tool output.** Read the fixture, decide
   what a correct implementation would conclude, write that down, then run. When
   the run disagrees, one of the two is wrong and the point of the exercise is to
   find out which. Copying the output makes the case unfalsifiable.
2. **`expected_non_findings` may list only checks that genuinely inspected the
   fixture and returned a pass.** Padding it raises the true-negative count
   without measuring anything. That is falsification, not optimism.
3. **Plant defects that a real project would plausibly have.** A defect nobody
   would ship tests the check against a straw man.
4. **Pair every positive fixture with a negative one where possible.** The
   `react-spa` and `vite-static` pair declare identical React and Vite
   dependencies; one ships an empty shell, the other pre-renders each route. Every
   JavaScript-rendering finding on the first and none on the second is the
   evidence that the checks read captured output rather than `package.json`.
5. **Say in `notes` what the fixture discriminates.** A fixture whose purpose is
   not stated cannot be maintained, and a check that passes for an unrecorded
   reason will keep passing after it breaks.

## Fixture coverage

The site types the applicability model distinguishes and whether each has a
scored fixture is recorded in [benchmarks/README.md](benchmarks/README.md),
including — by name — the ones that do not. Requirements gated on an uncovered
site type still exist and still carry sources and verification methods; they have
no benchmark evidence that their applicability logic behaves on a realistic
project.

## What a score establishes

That the checks agree with their cases. Nothing more.

The fixtures contain defects this project planted; the cases were written by this
project; the checks were written by this project. A perfect score is evidence of
stability under change — a regression harness doing its job — and it is not
evidence of accuracy on real websites, of coverage of the registry, or of any
outcome in a search engine or an AI answer. `reports/benchmarks.json` carries a
`scope` field saying so, and it is deliberately hard to remove.

For the outcomes these numbers cannot speak to, see
[LIMITATIONS.md](LIMITATIONS.md).

## Running them

```bash
npm run bench                                          # every case; records the report
npm run bench:check                                    # every case; writes nothing
node tools/cli.ts bench --case react-spa,vite-static  # one or more by id
```

Every command in this repository is read-only unless given `--write`. `npm run
bench` passes it, because `docs --check` compares the generated metrics block
against `reports/benchmarks.json` and needs a current one on disk.
