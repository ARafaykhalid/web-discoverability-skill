import { readdirSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type { Finding, Snapshot } from '../snapshot.ts';
import { needsRuntime } from '../snapshot.ts';

/**
 * The check registry.
 *
 * A check is a deterministic static analyzer bound to one or more requirement
 * IDs. Binding matters: it is what makes precision and recall measurable. A
 * requirement with no check is honestly reported as unchecked rather than
 * counted as covered.
 *
 * Check contract:
 *
 *   id           stable kebab-case identifier, referenced by
 *                `verification.automated_check` in the registry
 *   requirements requirement IDs this check provides evidence for
 *   level        SOURCE | RUNTIME | SOURCE_AND_RUNTIME - what the check inspects
 *   title        one line, used in reports
 *   run(snapshot) -> finding[] | { status, findings, detail }
 *
 * `run` returns findings, not verdicts. An empty result means "inspected and
 * found nothing wrong". To say "could not inspect", return a status of
 * NEEDS_RUNTIME or NOT_APPLICABLE explicitly - never an empty array, because an
 * empty array is indistinguishable from a pass and would inflate recall.
 */

export type CheckStatus = (typeof CHECK_STATUSES)[number];

export interface Check {
  id: string;
  title: string;
  level: 'SOURCE' | 'RUNTIME' | 'SOURCE_AND_RUNTIME';
  requirements: string[];
  run: (snapshot: Snapshot) => Finding[] | { status?: string; findings?: Finding[]; detail?: string };
  __file?: string;
}

export interface CheckResult {
  check_id: string;
  status: CheckStatus;
  findings: Finding[];
  detail: string;
}

/** The shape a check may return instead of a bare findings array. */
interface ShapedResult {
  status?: CheckStatus;
  findings?: Finding[];
  detail?: string;
}

const CHECKS_DIR = dirname(fileURLToPath(import.meta.url));

export const CHECK_STATUSES = ['PASS', 'FAIL', 'NEEDS_RUNTIME', 'NOT_APPLICABLE', 'ERROR'] as const;

let cache: CheckList | null = null;

// A directory listing alone cannot distinguish an intentionally removed module
// from an incomplete synced view. Keep the expected filenames explicit so
// validation reports the latter instead of quietly reducing check coverage.
export const EXPECTED_CHECK_MODULES = [
  'canonicals.ts',
  'content.ts',
  'feeds.ts',
  'headers.ts',
  'images.ts',
  'internal-linking.ts',
  'international.ts',
  'javascript-rendering.ts',
  'llms-txt.ts',
  'metadata.ts',
  'robots.ts',
  'sitemaps.ts',
  'social-preview.ts',
  'structured-data.ts',
  'urls.ts',
];

/**
 * Load every check module in this directory.
 *
 * Discovery is by directory listing rather than a hand-maintained import list,
 * so a check cannot be written and then silently forgotten.
 */
/** The loaded check list. `problems` carries load-time issues (missing modules, duplicate ids). */
export type CheckList = Check[] & { problems?: string[] };

export async function loadChecks({ dir = CHECKS_DIR, reload = false } = {}): Promise<CheckList> {
  if (cache && !reload) return cache;
  if (!existsSync(dir)) return [] as CheckList;

  const files = readdirSync(dir)
    .filter((name) => name.endsWith('.ts') && name !== 'index.ts')
    .sort();

  const checks: Check[] = [];
  const problems: string[] = [];
  if (dir === CHECKS_DIR) {
    for (const expected of EXPECTED_CHECK_MODULES) {
      if (!files.includes(expected)) problems.push(`missing expected check module: ${expected}`);
    }
    for (const unexpected of files.filter((file) => !EXPECTED_CHECK_MODULES.includes(file))) {
      problems.push(`unrecorded check module: ${unexpected}`);
    }
  }
  for (const file of files) {
    const module = await import(pathToFileURL(join(dir, file)).href);
    const exported = module.default ?? module.check;
    if (!exported) {
      problems.push(`${file}: no default export`);
      continue;
    }
    const list = Array.isArray(exported) ? exported : [exported];
    for (const check of list) {
      checks.push({ ...check, __file: file });
    }
  }

  const seen = new Set();
  for (const check of checks) {
    if (seen.has(check.id)) problems.push(`duplicate check id: ${check.id}`);
    seen.add(check.id);
  }

  checks.sort((a, b) => a.id.localeCompare(b.id));
  // Declared as `CheckList` so the `problems` property exists to be set; assigning it
  // onto the bare array is what the intersection type exists for.
  const list: CheckList = checks;
  list.problems = problems;
  cache = list;
  return list;
}

function normalizeResult(check: Check, raw: unknown): CheckResult {
  if (Array.isArray(raw)) {
    return {
      check_id: check.id,
      status: raw.length ? 'FAIL' : 'PASS',
      findings: raw,
      detail: '',
    };
  }
  if (raw && typeof raw === 'object' && !Array.isArray(raw)) {
    const shaped = raw as ShapedResult;
    const findings = shaped.findings || [];
    const status = shaped.status || (findings.length ? 'FAIL' : 'PASS');
    if (!CHECK_STATUSES.includes(status)) {
      return {
        check_id: check.id,
        status: 'ERROR',
        findings: [],
        detail: `check returned unknown status ${status}`,
      };
    }
    return { check_id: check.id, status, findings, detail: shaped.detail || '' };
  }
  return { check_id: check.id, status: 'ERROR', findings: [], detail: 'check returned no result' };
}

/**
 * Run checks against a snapshot.
 *
 * A RUNTIME-level check on a snapshot with no runtime capture reports
 * NEEDS_RUNTIME. It does not fall back to reading source files: source is not
 * evidence of served output, and pretending otherwise is the exact failure the
 * verification rules exist to prevent.
 */
export async function runChecks(
  snapshot: Snapshot,
  { checks = null, only = null, requirementIds = null } = {},
): Promise<{ results: CheckResult[]; findings: Finding[]; counts: Record<string, number>; ran: number; available: number }> {
  const registry = checks ?? (await loadChecks());
  const selected = registry.filter((check) => {
    if (only && !only.includes(check.id)) return false;
    if (requirementIds && !(check.requirements || []).some((id) => requirementIds.includes(id))) return false;
    return true;
  });

  const results: CheckResult[] = [];
  for (const check of selected) {
    if (check.level === 'RUNTIME' && !snapshot.hasRuntime) {
      results.push({ ...needsRuntime(check), findings: [] });
      continue;
    }
    try {
      results.push(normalizeResult(check, await check.run(snapshot)));
    } catch (error) {
      results.push({
        check_id: check.id,
        status: 'ERROR',
        findings: [],
        detail: `${error.name}: ${error.message}`,
      });
    }
  }

  const findings = results.flatMap((result) => result.findings);
  return {
    results,
    findings,
    counts: results.reduce((acc, r) => {
      acc[r.status] = (acc[r.status] || 0) + 1;
      return acc;
    }, {}),
    ran: selected.length,
    available: registry.length,
  };
}
