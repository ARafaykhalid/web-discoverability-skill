/**
 * An empty alt attribute intentionally removes a decorative image from the
 * accessibility tree. Conflating `alt=""` with an absent attribute reported a
 * correct document as defective. The check now distinguishes attribute presence
 * from value and stays silent for the explicit decorative form.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadSnapshot } from '../../tools/lib/snapshot.ts';
import { loadChecks, runChecks } from '../../tools/lib/checks/index.ts';

test('a decorative image with empty alt is not reported as missing text', async () => {
  const snapshot = loadSnapshot(process.cwd(), {
    capture: { pages: [{ url: '/', raw_html: '<main><img src="rule.svg" alt=""></main>' }] },
  });
  const result = await runChecks(snapshot, { checks: await loadChecks(), only: ['img-alt-attribute-present'] });
  assert.equal(result.results[0].status, 'PASS');
  assert.deepEqual(result.findings, []);
});
