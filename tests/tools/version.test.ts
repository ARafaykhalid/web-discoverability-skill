/**
 * Unit tests for tools/lib/version.ts.
 *
 * Nothing here touches the network or the machine clock: the upstream fetch is
 * injected, the clock is fixed, and every local read points at a throwaway
 * directory. The suite pins the update lifecycle the skill depends on - what
 * "verified", "update available", and "unable to verify" actually mean, and
 * that no path fabricates a version or commit.
 */

import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { checkVersion, parseUpstreamCommit, readLocalCommit } from '../../tools/lib/version.ts';

const sandboxes = [];

/** A fake upstream atom feed. Entries are given newest-first, as GitHub emits them. */
function feed(...shas) {
  const entries = shas
    .map((sha) => `<entry><id>tag:github.com,2008:GITHUB/${sha}</id><link href="https://github.com/o/r/commit/${sha}"/></entry>`)
    .join('');
  return `<?xml version="1.0" encoding="UTF-8"?><feed>${entries}</feed>`;
}

const OK = (body) => async () => ({ ok: true, status: 200, text: async () => body });
const REJECTING = async () => {
  throw new Error('dns lookup failed');
};
/** Mirrors real fetch: hangs until the caller's AbortController fires. */
const HANGING = async (_url, { signal } = {}) =>
  new Promise((_resolve, reject) => {
    if (signal) signal.addEventListener('abort', () => reject(new Error('This operation was aborted')));
  });

const FIXED_NOW = () => new Date('2026-08-31T12:00:00.000Z');
const LOCAL_SHA = '1111111111111111111111111111111111111111';
const NEWER_SHA = '2222222222222222222222222222222222222222';

/** A throwaway skill root with a readable git ref, package version, and manifest. */
function root(name, { sha = LOCAL_SHA, version = '4.0.0', schemaVersion = 3 } = {}) {
  const dir = mkdtempSync(join(tmpdir(), `wds-version-${name}-`));
  sandboxes.push(dir);
  if (sha !== null) {
    mkdirSync(join(dir, '.git', 'refs', 'heads'), { recursive: true });
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    writeFileSync(join(dir, '.git', 'refs', 'heads', 'main'), `${sha}\n`);
  }
  if (version !== null) writeFileSync(join(dir, 'package.json'), `${JSON.stringify({ version })}\n`);
  if (schemaVersion !== null) {
    mkdirSync(join(dir, 'requirements'), { recursive: true });
    writeFileSync(join(dir, 'requirements', 'manifest.json'), `${JSON.stringify({ schema_version: schemaVersion })}\n`);
  }
  return dir;
}

after(() => {
  for (const dir of sandboxes) rmSync(dir, { recursive: true, force: true });
});

describe('checkVersion', () => {
  it('reports verified when the local commit is the upstream head', async () => {
    const info = await checkVersion({ root: root('current'), fetchImpl: OK(feed(LOCAL_SHA)), now: FIXED_NOW });
    assert.equal(info.upstream_freshness, 'verified');
    assert.equal(info.upstream_commit, LOCAL_SHA);
    assert.equal(info.local_commit, LOCAL_SHA);
    assert.equal(info.skill_version, '4.0.0');
    assert.equal(info.registry_version, 3);
    assert.equal(info.checked_at, '2026-08-31T12:00:00.000Z');
    assert.match(info.detail, /matches upstream main/);
  });

  it('reports update_available when upstream is at a different commit', async () => {
    const info = await checkVersion({ root: root('behind'), fetchImpl: OK(feed(NEWER_SHA)), now: FIXED_NOW });
    assert.equal(info.upstream_freshness, 'update_available');
    assert.equal(info.upstream_commit, NEWER_SHA);
    assert.equal(info.local_commit, LOCAL_SHA);
    assert.match(info.detail, /upstream main is at 222222222222/);
    assert.match(info.detail, /this copy is at 111111111111/);
  });

  it('reports unable_to_verify with the reason when upstream fetch rejects', async () => {
    const info = await checkVersion({ root: root('offline'), fetchImpl: REJECTING, now: FIXED_NOW });
    assert.equal(info.upstream_freshness, 'unable_to_verify');
    assert.equal(info.upstream_commit, null);
    assert.match(info.detail, /upstream unreachable: dns lookup failed/);
  });

  it('reports unable_to_verify when the upstream response is not parseable', async () => {
    const info = await checkVersion({ root: root('malformed'), fetchImpl: OK('<html>login page</html>'), now: FIXED_NOW });
    assert.equal(info.upstream_freshness, 'unable_to_verify');
    assert.equal(info.upstream_commit, null);
    assert.match(info.detail, /no parsable commit id/);
  });

  it('reports unable_to_verify when the upstream request times out', async () => {
    const info = await checkVersion({ root: root('timeout'), fetchImpl: HANGING, timeoutMs: 20, now: FIXED_NOW });
    assert.equal(info.upstream_freshness, 'unable_to_verify');
    assert.equal(info.upstream_commit, null);
    assert.match(info.detail, /aborted/);
  });

  it('reports unable_to_verify, still naming the upstream commit, when the local copy has no git history', async () => {
    const info = await checkVersion({ root: root('installed', { sha: null }), fetchImpl: OK(feed(NEWER_SHA)), now: FIXED_NOW });
    assert.equal(info.upstream_freshness, 'unable_to_verify');
    assert.equal(info.local_commit, null);
    assert.equal(info.upstream_commit, NEWER_SHA);
    assert.match(info.detail, /local commit is unknown/);
  });

  it('never fabricates versions when package.json and the manifest are missing', async () => {
    const info = await checkVersion({ root: root('bare', { sha: null, version: null, schemaVersion: null }), fetchImpl: OK(feed(NEWER_SHA)), now: FIXED_NOW });
    assert.equal(info.skill_version, 'unknown');
    assert.equal(info.registry_version, null);
    assert.equal(info.local_commit, null);
    assert.equal(info.upstream_commit, NEWER_SHA);
  });

  it('is deterministic across repeated invocations', async () => {
    const first = await checkVersion({ root: root('repeat'), fetchImpl: OK(feed(LOCAL_SHA)), now: FIXED_NOW });
    const second = await checkVersion({ root: root('repeat'), fetchImpl: OK(feed(LOCAL_SHA)), now: FIXED_NOW });
    assert.deepEqual(second, first);
  });
});

describe('parseUpstreamCommit', () => {
  it('takes the commit from the first entry, which is the newest', () => {
    assert.equal(parseUpstreamCommit(feed(NEWER_SHA, LOCAL_SHA)), NEWER_SHA);
  });

  it('finds a commit when the feed carries no entry wrapper at all', () => {
    assert.equal(parseUpstreamCommit(`<feed>${feed(LOCAL_SHA).slice(feed(LOCAL_SHA).indexOf('<entry>') + 7, -10)}</feed>`), LOCAL_SHA);
  });

  it('returns null when no 40-hex string exists anywhere', () => {
    assert.equal(parseUpstreamCommit('<feed><entry><title>initial commit</title></entry></feed>'), null);
    assert.equal(parseUpstreamCommit(''), null);
  });
});

describe('readLocalCommit', () => {
  it('reads a detached HEAD that names a commit directly', () => {
    const dir = root('detached', { sha: null });
    mkdirSync(join(dir, '.git'), { recursive: true });
    writeFileSync(join(dir, '.git', 'HEAD'), `${LOCAL_SHA}\n`);
    assert.equal(readLocalCommit(dir), LOCAL_SHA);
  });

  it('resolves a ref through packed-refs when the loose ref file is absent', () => {
    const dir = root('packed', { sha: null });
    mkdirSync(join(dir, '.git'), { recursive: true });
    writeFileSync(join(dir, '.git', 'HEAD'), 'ref: refs/heads/main\n');
    writeFileSync(join(dir, '.git', 'packed-refs'), `${LOCAL_SHA} refs/heads/main\n`);
    assert.equal(readLocalCommit(dir), LOCAL_SHA);
  });

  it('returns null where .git is a file (a linked worktree) rather than guessing', () => {
    const dir = root('worktree', { sha: null });
    rmSync(join(dir, '.git'), { recursive: true, force: true });
    writeFileSync(join(dir, '.git'), 'gitdir: /elsewhere\n');
    assert.equal(readLocalCommit(dir), null);
  });

  it('returns null when there is no .git at all', () => {
    const dir = root('nogit', { sha: null });
    rmSync(join(dir, '.git'), { recursive: true, force: true });
    assert.equal(readLocalCommit(dir), null);
  });
});
