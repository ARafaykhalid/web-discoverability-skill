<!-- GENERATED FILE. Run `npm run docs -- --write`. Edits are overwritten. -->

# Evidence model

Each requirement declares how strong the evidence behind it is, and separately how confident we are that
implementing it produces the stated effect. The two are different questions: a first-party citation can still
support only a low-confidence effect claim, because eligibility is not inclusion.

## Tier definitions

| Tier | Definition | Active requirements |
| --- | --- | --- |
| A | Official specification or first-party platform/framework documentation. | 179 |
| B | Strong technical consensus across multiple authoritative technical sources, or well-established implementation behaviour. | 23 |
| C | Empirical or observational: reproducible experiments, independent technical studies, observed crawler behaviour. | 0 |
| D | Experimental or speculative: emerging AI-search behaviour, undocumented crawler behaviour, hypotheses about retrieval systems. | 4 |
| INTERNAL | Internal consistency invariant of the project under audit; asserts no external platform behaviour. | 20 |

## Confidence distribution

| Confidence | Requirements |
| --- | --- |
| HIGH | 184 |
| MEDIUM | 41 |
| LOW | 1 |

## Category distribution

Categories keep established technical SEO separate from experimental GEO/LLMO in every report.

| Category | Requirements | Experimental |
| --- | --- | --- |
| `TECHNICAL_SEO` | 79 | - |
| `SEARCH_DISCOVERABILITY` | 29 | - |
| `STRUCTURED_DATA_ELIGIBILITY` | 22 | - |
| `CONTENT_QUALITY` | 20 | - |
| `ACCESSIBILITY` | 18 | - |
| `AI_CRAWLER_ACCESS` | 5 | - |
| `AI_RETRIEVAL` | 3 | - |
| `EMERGING_GEO` | 4 | yes |
| `SECURITY_PRIVACY` | 24 | - |
| `OPERATIONS` | 22 | - |

## Language rules

Requirement text and documentation may say: `may improve`, `supports`, `provides machine-readable context`,
`is documented by X`, `is experimentally observed`, `is not a confirmed ranking factor`.

They may not promise search position, index inclusion, AI citation, or outcomes validated only by an unobserved deployment.
`npm run validate` scans registry text and `npm run docs:check` scans Markdown for those patterns.

## Source manifest summary

| Metric | Value |
| --- | --- |
| Citations | 272 |
| Unique URLs | 138 |
| First-party (official) | 264 |
| Third-party | 8 |
| Requirements in tiers A-D missing a citation | 0 |

### Citations by organization

| Organization | Citations |
| --- | --- |
| Google | 170 |
| IETF | 27 |
| W3C | 20 |
| schema.org | 9 |
| WHATWG | 8 |
| Open Graph protocol | 6 |
| sitemaps.org | 6 |
| llms.txt project | 4 |
| OpenAI | 4 |
| OWASP | 4 |
| Anthropic | 3 |
| IndexNow | 3 |
| Microsoft | 2 |
| Apple | 1 |
| Common Crawl | 1 |
| IANA | 1 |
| Meta | 1 |
| Perplexity | 1 |
| RSS Advisory Board | 1 |

The full manifest, with the date each URL was last checked, is `reports/sources.json`
(`npm run sources`). `npm run check-sources` performs live reachability checks and reports failures as failures.
