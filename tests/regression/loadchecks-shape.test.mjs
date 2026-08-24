/**
 * Dynamic discovery once trusted whatever a directory listing happened to
 * return, so an incomplete synced tree silently reduced coverage. The loader now
 * checks an explicit module manifest while preserving the array-with-problems
 * return shape used by validators and runners.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { EXPECTED_CHECK_MODULES, loadChecks } from '../../tools/lib/checks/index.mjs';

test('the check registry is complete and preserves its augmented-array contract', async () => {
  const checks = await loadChecks({ reload: true });
  assert.ok(Array.isArray(checks));
  assert.ok(Object.prototype.hasOwnProperty.call(checks, 'problems'));
  assert.deepEqual(checks.problems, []);
  assert.deepEqual([...new Set(checks.map((check) => check.__file))].sort(), EXPECTED_CHECK_MODULES);
});
