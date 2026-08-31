import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { ROOT } from './registry.ts';

/**
 * Version and freshness reporting.
 *
 * The skill must never claim to be current without checking, and never invent a
 * version or commit it cannot read. Everything here degrades to an explicit
 * `unable_to_verify` with a reason, so an audit report can state exactly what
 * was checked and what could not be.
 */

/** Freshness of the local copy relative to the upstream repository. */
export type UpstreamFreshness = 'verified' | 'update_available' | 'unable_to_verify';

export interface VersionInfo {
  /** package.json version. `unknown` when the file or field is absent. */
  skill_version: string;
  /** requirements/manifest.json schema_version. null when absent. */
  registry_version: number | null;
  /** Commit the local copy is at. null when there is no readable git history. */
  local_commit: string | null;
  /** Latest commit on upstream main. null when upstream could not be reached or parsed. */
  upstream_commit: string | null;
  upstream_freshness: UpstreamFreshness;
  /** Why a comparison could not be made, or what the comparison found. */
  detail: string;
  checked_at: string;
}

export interface VersionOptions {
  /** Injectable for offline tests; defaults to the global fetch. */
  fetchImpl?: typeof fetch;
  /** Abort the upstream request after this many milliseconds. Default 5000. */
  timeoutMs?: number;
  /** Injectable clock for deterministic tests. */
  now?: () => Date;
  /** Root to read package.json, the manifest, and .git from. Defaults to the skill root. */
  root?: string;
}

/**
 * The upstream feed. The atom form rather than the REST API on purpose: it
 * needs no authentication and is not subject to the API's 60-requests-per-hour
 * unauthenticated limit, which a skill invoked before every task would hit.
 */
export const UPSTREAM_ATOM_URL = 'https://github.com/ARafaykhalid/web-discoverability-skill/commits/main.atom';

const SHA_PATTERN = /([0-9a-f]{40})/i;

/**
 * The local, network-free version fields. Audit, select, and profile embed
 * these in their JSON output so every machine-readable report names the
 * registry that produced it without making those commands network-dependent.
 */
export function localVersionFields(root: string = ROOT): { skill_version: string; registry_version: number | null } {
  return { skill_version: readSkillVersion(root), registry_version: readRegistryVersion(root) };
}

function readSkillVersion(root: string): string {
  const path = join(root, 'package.json');
  if (!existsSync(path)) return 'unknown';
  try {
    const pkg = JSON.parse(readFileSync(path, 'utf8'));
    return typeof pkg.version === 'string' && pkg.version ? pkg.version : 'unknown';
  } catch {
    return 'unknown';
  }
}

function readRegistryVersion(root: string): number | null {
  const path = join(root, 'requirements', 'manifest.json');
  if (!existsSync(path)) return null;
  try {
    const manifest = JSON.parse(readFileSync(path, 'utf8'));
    return typeof manifest.schema_version === 'number' ? manifest.schema_version : null;
  } catch {
    return null;
  }
}

/**
 * Read the commit the working copy is at, without spawning git.
 *
 * Reads .git directly so the check works where the git binary is absent (an
 * installed skill bundle). Handles a detached HEAD, a loose ref, packed refs,
 * and the .git-as-file worktree form, which is reported as unknown rather than
 * guessed.
 */
export function readLocalCommit(root: string): string | null {
  const gitPath = join(root, '.git');
  if (!existsSync(gitPath) || !statSync(gitPath).isDirectory()) return null;

  const headPath = join(gitPath, 'HEAD');
  if (!existsSync(headPath)) return null;
  const head = readFileSync(headPath, 'utf8').trim();

  if (!head.startsWith('ref: ')) return SHA_PATTERN.test(head) ? head : null;
  const ref = head.slice(5).trim();

  const refPath = join(gitPath, ref);
  if (existsSync(refPath)) {
    const sha = readFileSync(refPath, 'utf8').trim();
    return SHA_PATTERN.test(sha) ? sha : null;
  }

  const packedPath = join(gitPath, 'packed-refs');
  if (existsSync(packedPath)) {
    for (const line of readFileSync(packedPath, 'utf8').split(/\r?\n/)) {
      const match = line.match(/^([0-9a-f]{40})\s+(.+)$/);
      if (match && match[2].trim() === ref) return match[1];
    }
  }
  return null;
}

/**
 * Parse the latest commit out of the upstream atom feed.
 *
 * The entry id and link formats are GitHub implementation details that have
 * changed before, so the parser deliberately does not depend on either: it
 * takes the first `<entry>` block and reads the first 40-hex string in it,
 * which in every observed feed form is the commit the entry describes.
 */
export function parseUpstreamCommit(body: string): string | null {
  const entry = body.match(/<entry>([\s\S]*?)<\/entry>/);
  const scope = entry ? entry[1] : body;
  const sha = scope.match(SHA_PATTERN);
  return sha ? sha[1].toLowerCase() : null;
}

interface UpstreamResult {
  commit: string | null;
  detail: string;
}

async function fetchUpstreamCommit(opts: VersionOptions): Promise<UpstreamResult> {
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 5000);
  try {
    const response = await doFetch(UPSTREAM_ATOM_URL, { redirect: 'follow', signal: controller.signal });
    if (!response.ok) return { commit: null, detail: `upstream responded HTTP ${response.status}` };
    const body = await response.text();
    const commit = parseUpstreamCommit(body);
    if (!commit) return { commit: null, detail: 'upstream feed contained no parsable commit id' };
    return { commit, detail: '' };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { commit: null, detail: `upstream unreachable: ${message}` };
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Assemble the version report.
 *
 * Never throws and never fabricates: every unreadable input becomes an explicit
 * null/unknown, and every failed comparison becomes `unable_to_verify` with the
 * reason in `detail`.
 */
export async function checkVersion(opts: VersionOptions = {}): Promise<VersionInfo> {
  const root = opts.root ?? ROOT;
  const now = (opts.now ?? (() => new Date()))();

  const skill_version = readSkillVersion(root);
  const registry_version = readRegistryVersion(root);
  const local_commit = readLocalCommit(root);
  const upstream = await fetchUpstreamCommit(opts);

  let upstream_freshness: UpstreamFreshness;
  let detail: string;
  if (!upstream.commit) {
    upstream_freshness = 'unable_to_verify';
    detail = upstream.detail;
  } else if (!local_commit) {
    upstream_freshness = 'unable_to_verify';
    detail = `upstream is reachable at ${upstream.commit.slice(0, 12)} but the local commit is unknown (no readable git history), so the copies cannot be compared`;
  } else if (upstream.commit === local_commit.toLowerCase()) {
    upstream_freshness = 'verified';
    detail = `local copy matches upstream main at ${local_commit.slice(0, 12)}`;
  } else {
    upstream_freshness = 'update_available';
    detail = `upstream main is at ${upstream.commit.slice(0, 12)}; this copy is at ${local_commit.slice(0, 12)}`;
  }

  return {
    skill_version,
    registry_version,
    local_commit,
    upstream_commit: upstream.commit,
    upstream_freshness,
    detail,
    checked_at: now.toISOString(),
  };
}
