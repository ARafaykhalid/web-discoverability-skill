/**
 * Facts that cannot be inferred used to remain unknown forever, leaving no way
 * for an operator to supply evidence. The optional project profile now resolves
 * them while recording provenance, validation errors, and contradictions.
 */
import { after, test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { detectProfile } from '../../tools/lib/profile.ts';

const roots = [];
after(() => roots.forEach((root) => rmSync(root, { recursive: true, force: true })));

function rootWith(profile) {
  const root = mkdtempSync(join(tmpdir(), 'wds-profile-override-'));
  roots.push(root);
  writeFileSync(join(root, 'index.html'), '<!doctype html><title>Home</title>');
  writeFileSync(join(root, 'project-profile.json'), profile);
  return root;
}

test('a valid override resolves a fact and records the detector conclusion', () => {
  const profile = detectProfile(rootWith(JSON.stringify({ facts: { multilingual: true } })));
  assert.equal(profile.facts.multilingual.value, true);
  assert.match(profile.facts.multilingual.evidence[0], /override.*detected unknown/);
  assert.deepEqual(profile.problems, []);
});

test('invalid values and confident contradictions are visible problems', () => {
  const profile = detectProfile(rootWith(JSON.stringify({ facts: { public_site: false, multilingual: 'yes', invented: true } })));
  assert.equal(profile.facts.public_site.value, false);
  assert.ok(profile.problems.some((problem) => /contradicts detected value true/.test(problem)));
  assert.ok(profile.problems.some((problem) => /multilingual must be boolean/.test(problem)));
  assert.ok(profile.problems.some((problem) => /unknown fact invented/.test(problem)));
});
