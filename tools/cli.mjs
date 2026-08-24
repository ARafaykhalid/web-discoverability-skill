#!/usr/bin/env node
import { writeFileSync, mkdirSync, existsSync, readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { ROOT, loadAll, sortRecords } from './lib/registry.mjs';
import { validate, summarizeByRule, findForbiddenClaims } from './lib/validate.mjs';
import { qualityReport, metricsReport, staleReport, sourceManifest, checkSources } from './lib/report.mjs';
import { detectProfile } from './lib/profile.mjs';
import { loadSnapshot } from './lib/snapshot.mjs';
import { selectRequirements } from './lib/select.mjs';
import { loadChecks, runChecks } from './lib/checks/index.mjs';
import { runBenchmarks } from './lib/bench.mjs';
import { generateArtifacts } from './lib/docs.mjs';

/**
 * `wds` - the one entry point.
 *
 * Every command is read-only unless it is explicitly given --write. Exit code 1
 * means a real failure; nothing here degrades a failure into a warning to keep
 * the output tidy.
 */

const REPORTS_DIR = join(ROOT, 'reports');

function parseArgs(argv) {
  const positional = [];
  const flags = {};
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg.startsWith('--')) {
      const [key, inline] = arg.slice(2).split('=');
      if (inline !== undefined) flags[key] = inline;
      else if (argv[i + 1] && !argv[i + 1].startsWith('--')) {
        flags[key] = argv[i + 1];
        i += 1;
      } else flags[key] = true;
    } else positional.push(arg);
  }
  return { positional, flags };
}

function writeReport(name, data) {
  mkdirSync(REPORTS_DIR, { recursive: true });
  const path = join(REPORTS_DIR, name);
  writeFileSync(path, `${JSON.stringify(data, null, 2)}\n`);
  return path;
}

function print(value) {
  process.stdout.write(typeof value === 'string' ? `${value}\n` : `${JSON.stringify(value, null, 2)}\n`);
}

function fail(message) {
  process.stderr.write(`${message}\n`);
  process.exitCode = 1;
}

function loadRegistryOrExit() {
  const data = loadAll();
  return data;
}

async function loadChecksSafe() {
  try {
    return await loadChecks();
  } catch (error) {
    fail(`failed to load checks: ${error.message}`);
    return [];
  }
}

/* -------------------------------------------------------------- validate */

async function cmdValidate(flags) {
  const { records, removed, deferred, problems } = loadRegistryOrExit();
  const checks = await loadChecksSafe();
  const result = validate({ records, removed, deferred, checks, problems: [...problems, ...(checks.problems || [])], today: flags.today });

  if (flags.json) {
    print({ ok: result.ok, counts: result.counts, errors: result.errors, warnings: result.warnings, by_rule: summarizeByRule(result.entries) });
  } else {
    for (const entry of result.errors) print(`ERROR  ${entry.rule}  ${entry.id ?? '-'}  ${entry.message}`);
    for (const entry of result.warnings) print(`WARN   ${entry.rule}  ${entry.id ?? '-'}  ${entry.message}`);
    print('');
    print(`records=${records.length} removed=${removed.length} deferred=${deferred.length} checks=${checks.length}`);
    print(`errors=${result.errors.length} warnings=${result.warnings.length}`);
  }

  if (!result.ok) fail('registry validation failed');
}

/* --------------------------------------------------------------- quality */

async function cmdQuality(flags) {
  const { records, removed, deferred } = loadRegistryOrExit();
  const checks = await loadChecksSafe();
  const report = qualityReport({ records, removed, deferred, checks, today: flags.today });

  if (flags.write) print(`wrote ${writeReport('registry-quality.json', report)}`);
  if (flags.json || !flags.write) print(report);

  const blocking =
    report.problems.duplicate_titles.length +
    report.problems.broken_dependencies.length +
    report.problems.circular_dependencies.length;
  if (blocking) fail(`registry quality report found ${blocking} blocking problems`);
}

/* --------------------------------------------------------------- metrics */

async function cmdMetrics(flags) {
  const { records, removed, deferred } = loadRegistryOrExit();
  const checks = await loadChecksSafe();

  // Benchmark figures are read from the last recorded run rather than invented.
  // The case total lives in the aggregate as `case_count`; `cases` is the per-case
  // array, so it is only a fallback for a report written without the aggregate.
  let benchmarks = null;
  const benchPath = join(REPORTS_DIR, 'benchmarks.json');
  if (existsSync(benchPath)) {
    const raw = JSON.parse(readFileSync(benchPath, 'utf8'));
    benchmarks = {
      precision: raw.precision,
      recall: raw.recall,
      false_positive_rate: raw.false_positive_rate,
      false_negative_rate: raw.false_negative_rate,
      cases: raw.case_count ?? raw.cases?.length ?? null,
    };
  }

  const metrics = metricsReport({ records, removed, deferred, checks, benchmarks, today: flags.today });
  if (flags.write) print(`wrote ${writeReport('metrics.json', metrics)}`);
  if (flags.json || !flags.write) print(metrics);
}

/* ----------------------------------------------------------------- stale */

function cmdStale(flags) {
  const { records } = loadRegistryOrExit();
  const report = staleReport({ records, today: typeof flags.today === 'string' ? flags.today : undefined });
  if (flags.write) print(`wrote ${writeReport('stale-requirements.json', report)}`);
  if (flags.json) print(report);
  else {
    for (const row of report.rows.filter((r) => r.stale)) {
      print(`STALE  ${row.id}  ${row.stability}  last verified ${row.last_verified}  overdue ${row.overdue_days}d  ${row.title}`);
    }
    print('');
    print(`${report.stale_count} stale of ${report.total} reviewable requirements (as of ${report.today}); ${report.due_within_30_days} due within 30 days`);
  }
  if (flags.strict && report.stale_count) fail(`${report.stale_count} requirements are overdue for source re-verification`);
}

/* --------------------------------------------------------------- sources */

function cmdSources(flags) {
  const { records } = loadRegistryOrExit();
  const report = sourceManifest({ records });
  if (flags.write) print(`wrote ${writeReport('sources.json', report)}`);
  if (flags.json || !flags.write) print(report);
  if (report.requirements_missing_sources.length) {
    fail(`${report.requirements_missing_sources.length} requirements in tiers A-D have no citation`);
  }
}

async function cmdCheckSources(flags) {
  const { records } = loadRegistryOrExit();
  const result = await checkSources({ records, concurrency: Number(flags.concurrency ?? 6) });
  if (flags.write) print(`wrote ${writeReport('source-reachability.json', result)}`);
  for (const row of result.results.filter((r) => !r.ok)) {
    print(`UNREACHABLE  ${row.status ?? row.error}  ${row.url}  (${row.requirement_ids.join(', ')})`);
  }
  print('');
  print(`checked=${result.checked} reachable=${result.reachable} unreachable=${result.unreachable}`);
  if (result.unreachable) fail(`${result.unreachable} cited sources are unreachable`);
}

/* --------------------------------------------------------------- profile */

function cmdProfile(flags, positional) {
  const target = resolve(positional[0] ?? process.cwd());
  const snapshot = loadSnapshot(target);
  const profile = snapshot.profile;
  const output = {
    root: target,
    framework: profile.framework,
    framework_evidence: profile.framework_evidence,
    has_adapter: profile.has_adapter,
    runtime: { available: snapshot.hasRuntime, origin: snapshot.captureOrigin, captured_at: snapshot.capturedAt },
    files_scanned: profile.file_count,
    scan_truncated: Boolean(profile.scan_truncated),
    facts: Object.fromEntries(Object.entries(profile.facts).map(([key, fact]) => [key, { value: fact.value, evidence: fact.evidence }])),
    problems: profile.problems || [],
  };
  if (flags.json) print(output);
  else {
    // Adapter depth is stated in both directions. Printing nothing for the
    // adapter-backed case leaves a reader unable to tell "backed by an adapter"
    // from "the question was never asked".
    print(`framework: ${profile.framework} (${profile.has_adapter ? 'adapter-backed' : 'generic guidance only - no adapter or fixture'})`);
    print(`evidence: ${(profile.framework_evidence || []).join('; ') || 'none - no framework signal found in the repository'}`);
    print(`runtime: ${snapshot.hasRuntime ? `available (${snapshot.captureOrigin})` : 'not available - RUNTIME checks will report NEEDS_RUNTIME'}`);
    if (output.scan_truncated) {
      print(`scan: TRUNCATED at ${profile.scan_limit} files - absent signals below prove nothing, only present ones do`);
    }
    print('');
    for (const [key, fact] of Object.entries(profile.facts)) {
      const value = fact.value === 'unknown' ? 'unknown' : String(fact.value);
      print(`${value.padEnd(8)} ${key.padEnd(26)} ${(fact.evidence || []).join('; ')}`);
    }
    for (const problem of profile.problems || []) print(`PROBLEM  ${problem}`);
  }
  if (flags.write) print(`wrote ${writeReport('profile.json', output)}`);
}

/* ---------------------------------------------------------------- select */

function cmdSelect(flags, positional) {
  const { records } = loadRegistryOrExit();
  const target = resolve(positional[0] ?? process.cwd());
  const profile = detectProfile(target, { runtimeAvailable: existsSync(join(target, 'snapshot.json')) });
  const level = typeof flags.level === 'string' ? flags.level.toUpperCase() : 'RECOMMENDED';
  const domains = typeof flags.domains === 'string' ? flags.domains.split(',').map((d) => d.trim()) : null;
  const selection = selectRequirements({ records, profile, level, domains });

  const output = {
    level: selection.level,
    counts: selection.counts,
    active_domains: selection.activeDomains,
    inactive_domains: selection.inactiveDomains,
    uncertain_domains: selection.uncertainDomains,
    applicable: selection.applicable.map((entry) => ({
      id: entry.record.id,
      domain: entry.record.domain,
      title: entry.record.title,
      severity: entry.record.severity,
      change_safety: entry.record.change_safety,
      evidence_tier: entry.record.evidence_tier,
      confidence: entry.record.confidence,
      automated_check: entry.record.verification?.automated_check ?? null,
    })),
    uncertain: selection.uncertain.map((entry) => ({ id: entry.record.id, title: entry.record.title, reason: entry.reason })),
  };

  if (flags.json || flags.write) {
    if (flags.write) print(`wrote ${writeReport('selection.json', output)}`);
    if (flags.json) print(output);
    return;
  }

  print(`level ${selection.level} | applicable ${selection.counts.APPLICABLE} | uncertain ${selection.counts.UNCERTAIN} | not applicable ${selection.counts.NOT_APPLICABLE}`);
  print('');
  for (const entry of sortRecords(selection.applicable.map((e) => e.record))) {
    print(`${entry.id}  ${entry.severity.padEnd(8)} ${entry.change_safety.padEnd(16)} ${entry.title}`);
  }
  if (selection.uncertain.length) {
    print('');
    print('UNCERTAIN - resolve with evidence before changing anything:');
    for (const entry of selection.uncertain) print(`${entry.record.id}  ${entry.record.title}  (${entry.reason})`);
  }
}

/* ----------------------------------------------------------------- audit */

async function cmdAudit(flags, positional) {
  const { records } = loadRegistryOrExit();
  const target = resolve(positional[0] ?? process.cwd());
  const snapshot = loadSnapshot(target);
  const level = typeof flags.level === 'string' ? flags.level.toUpperCase() : 'RECOMMENDED';
  const selection = selectRequirements({ records, profile: snapshot.profile, level });
  const applicableIds = selection.applicable.map((entry) => entry.record.id);
  const checks = await loadChecksSafe();
  const { results, findings, counts } = await runChecks(snapshot, { checks, requirementIds: applicableIds });
  const byId = new Map(records.map((r) => [r.id, r]));

  const output = {
    root: target,
    generated_at: new Date().toISOString(),
    framework: snapshot.profile.framework,
    has_adapter: snapshot.profile.has_adapter,
    runtime_available: snapshot.hasRuntime,
    level,
    selection: selection.counts,
    check_counts: counts,
    findings: findings.map((finding) => {
      const record = byId.get(finding.requirement_id);
      return {
        ...finding,
        title: record?.title ?? null,
        severity: finding.severity ?? record?.severity ?? null,
        change_safety: record?.change_safety ?? null,
        impact: record?.impact ?? null,
        evidence_tier: record?.evidence_tier ?? null,
        confidence: record?.confidence ?? null,
        sources: record?.sources?.map((s) => s.url) ?? [],
      };
    }),
    needs_runtime: results.filter((r) => r.status === 'NEEDS_RUNTIME').map((r) => r.check_id),
    errors: results.filter((r) => r.status === 'ERROR').map((r) => ({ check_id: r.check_id, detail: r.detail })),
    uncertain: selection.uncertain.map((entry) => ({ id: entry.record.id, title: entry.record.title, reason: entry.reason })),
    unchecked_applicable: applicableIds.filter((id) => !checks.some((c) => (c.requirements || []).includes(id))),
    profile_problems: snapshot.profile.problems || [],
  };

  if (flags.write) print(`wrote ${writeReport('audit.json', output)}`);
  if (flags.json) {
    print(output);
    return;
  }

  print(`${target}`);
  print(`framework=${output.framework} (${output.has_adapter ? 'adapter-backed' : 'generic guidance only'}) runtime=${output.runtime_available ? 'yes' : 'no'} level=${level}`);
  print(`applicable=${selection.counts.APPLICABLE} uncertain=${selection.counts.UNCERTAIN} not_applicable=${selection.counts.NOT_APPLICABLE}`);
  print('');
  for (const finding of output.findings) {
    print(`${finding.severity ?? 'MEDIUM'}  ${finding.requirement_id}  ${finding.check_id}  ${finding.location}`);
    print(`    ${finding.detail}`);
  }
  print('');
  print(`findings=${output.findings.length} needs_runtime=${output.needs_runtime.length} check_errors=${output.errors.length}`);
  print(`applicable requirements with no deterministic check: ${output.unchecked_applicable.length} (verify by the documented method)`);
  for (const problem of output.profile_problems) print(`profile problem: ${problem}`);
}

/* ------------------------------------------------------------------ bench */

async function cmdBench(flags) {
  const { records } = loadRegistryOrExit();
  const only = typeof flags.case === 'string' ? flags.case.split(',').map((c) => c.trim()) : null;
  const result = await runBenchmarks({ records, only });

  // Read-only unless asked, like every other command. `--no-write` is still
  // accepted so older invocations keep working, and it can only ever suppress a
  // write, never cause one.
  const write = Boolean(flags.write) && !flags['no-write'];
  if (write) print(`wrote ${writeReport('benchmarks.json', result)}`);
  if (flags.json) print(result);
  else {
    for (const score of result.cases) {
      const status = score.passed ? 'PASS' : 'FAIL';
      print(`${status}  ${score.case_id}  tp=${score.counts.true_positives} fp=${score.counts.false_positives} fn=${score.counts.false_negatives} tn=${score.counts.true_negatives}`);
      if (score.error) print(`      ${score.error}`);
      for (const miss of score.false_negatives) print(`      missed: ${miss.check_id ?? miss.requirement_id} (${miss.why})`);
      for (const extra of score.false_positives) print(`      unexpected: ${extra.check_id} at ${extra.location}${extra.declared_clean ? ' [declared clean]' : ''}`);
      for (const problem of score.safety_problems) print(`      safety: ${problem.id} ${problem.problem}`);
      for (const problem of score.evidence_problems) print(`      evidence: ${problem.finding} ${problem.problem}`);
      for (const problem of score.selection_problems || []) print(`      selection: ${problem.id} ${problem.problem}`);
      for (const gap of score.not_measured) print(`      not measured: ${gap.check_id ?? gap.requirement_id} (${gap.why})`);
    }
    print('');
    print(`cases ${result.cases_passed}/${result.case_count} passing`);
    print(`precision=${result.precision} recall=${result.recall} fp_rate=${result.false_positive_rate} fn_rate=${result.false_negative_rate}`);
    print(`scope: ${result.scope}`);
  }

  if (result.case_count === 0) fail('no benchmark cases found');
  else if (result.cases_passed !== result.case_count) fail(`${result.case_count - result.cases_passed} benchmark cases failed`);
}

/* ------------------------------------------------------------------- docs */

async function cmdDocs(flags) {
  const { records, removed, deferred } = loadRegistryOrExit();
  const checks = await loadChecksSafe();
  const benchPath = join(REPORTS_DIR, 'benchmarks.json');
  const benchmarks = existsSync(benchPath) ? JSON.parse(readFileSync(benchPath, 'utf8')) : null;
  const metrics = metricsReport({
    records,
    removed,
    deferred,
    checks,
    benchmarks: benchmarks && {
      precision: benchmarks.precision,
      recall: benchmarks.recall,
      false_positive_rate: benchmarks.false_positive_rate,
      false_negative_rate: benchmarks.false_negative_rate,
      cases: benchmarks.case_count ?? benchmarks.cases?.length ?? null,
    },
  });
  const sources = sourceManifest({ records });
  const { files, blocks } = generateArtifacts({ records, removed, deferred, checks, metrics, sources, benchmarks });

  const drift = [];
  for (const file of files) {
    const path = join(ROOT, file.path);
    const current = existsSync(path) ? readFileSync(path, 'utf8') : null;
    if (current !== file.content) drift.push(file.path);
    if (flags.write) {
      mkdirSync(dirname(path), { recursive: true });
      writeFileSync(path, file.content);
    }
  }

  const requirementPagesDir = join(ROOT, 'requirements', 'by-id');
  if (existsSync(requirementPagesDir)) {
    const expectedPages = new Set(files.filter((file) => file.path.startsWith('requirements/by-id/')).map((file) => file.path.split('/').pop()));
    for (const entry of readdirSync(requirementPagesDir)) {
      if (entry.endsWith('.md') && !expectedPages.has(entry)) drift.push(`requirements/by-id/${entry}`);
    }
  } else if (files.some((file) => file.path.startsWith('requirements/by-id/'))) {
    drift.push('requirements/by-id is missing');
  }
  for (const block of blocks) {
    if (block.missing) {
      drift.push(block.missing);
      continue;
    }
    if (block.original !== block.updated) drift.push(`${block.path} (GENERATED:${block.marker})`);
    if (flags.write) writeFileSync(join(ROOT, block.path), block.updated);
  }

  // Documentation must not make claims the evidence model forbids, so the same
  // detector the registry validator uses is applied to the prose. It allows
  // prohibitions and disclaimers, which is how a limitations section can discuss
  // the very language it rules out.
  const claimProblems = [];
  const markdownFiles = [
    'README.md', 'SKILL.md', 'ARCHITECTURE.md', 'CONTRIBUTING.md', 'INTEGRATION.md',
    'CHANGELOG.md', 'EVIDENCE.md', 'LIMITATIONS.md', 'BENCHMARKS.md', 'AUDIT.md', 'SECURITY.md',
    'references/vocabulary.md', 'benchmarks/README.md',
  ];
  for (const relative of markdownFiles) {
    const path = join(ROOT, relative);
    if (!existsSync(path)) continue;
    const text = readFileSync(path, 'utf8');
    text.split(/\r?\n/).forEach((line, index) => {
      for (const hit of findForbiddenClaims(line)) {
        claimProblems.push({ file: relative, line: index + 1, why: hit.why, text: hit.clause });
      }
    });
  }

  if (flags.write) {
    print(`generated ${files.length} files and ${blocks.length} in-place blocks`);
  }
  for (const problem of claimProblems) {
    print(`CLAIM  ${problem.file}:${problem.line}  ${problem.why}`);
    print(`       ${problem.text}`);
  }

  if (flags.check) {
    for (const path of drift) print(`DRIFT  ${path}`);
    if (drift.length) fail(`${drift.length} generated artifacts are out of date; run: npm run docs -- --write`);
  }
  if (claimProblems.length) fail(`${claimProblems.length} unsupported claims in documentation`);
}

/* -------------------------------------------------------------- dispatch */

const USAGE = `wds <command> [options]

  validate                      registry integrity (exit 1 on any error)
  quality        [--write]      registry-quality report -> reports/registry-quality.json
  metrics        [--write]      machine-readable metrics -> reports/metrics.json
  stale-requirements [--strict] requirements overdue for source re-verification
  sources        [--write]      source manifest -> reports/sources.json
  check-sources  [--write]      live reachability of every cited URL
  profile        <dir>          detected site profile with per-fact evidence
  select         <dir> [--level LITE|RECOMMENDED|EXTRA|ULTRA] [--domains a,b]
  audit          <dir> [--level LITE|RECOMMENDED|EXTRA|ULTRA] [--write]
  bench          [--case id[,id]] [--write]  score fixture cases
  docs           [--write|--check]

<dir> is a positional path, not an option: 'wds audit ./apps/web'. There is no
--root flag; omitting <dir> uses the current working directory.

Every command is read-only unless it is given --write. bench also accepts
--no-write, which is now redundant and kept only so older invocations of it
cannot start writing.

Common flags: --json  machine-readable output
              --write persist the report under reports/
`;

async function main() {
  const { positional, flags } = parseArgs(process.argv.slice(2));
  const command = positional.shift();

  switch (command) {
    case 'validate': return cmdValidate(flags);
    case 'quality': return cmdQuality(flags);
    case 'metrics': return cmdMetrics(flags);
    case 'stale-requirements':
    case 'stale': return cmdStale(flags);
    case 'sources': return cmdSources(flags);
    case 'check-sources': return cmdCheckSources(flags);
    case 'profile': return cmdProfile(flags, positional);
    case 'select': return cmdSelect(flags, positional);
    case 'audit': return cmdAudit(flags, positional);
    case 'bench': return cmdBench(flags);
    case 'docs': return cmdDocs(flags);
    case undefined:
    case 'help':
    case '--help':
      print(USAGE);
      return undefined;
    default:
      fail(`unknown command: ${command}\n\n${USAGE}`);
      return undefined;
  }
}

main().catch((error) => {
  process.stderr.write(`${error.stack}\n`);
  process.exitCode = 1;
});
