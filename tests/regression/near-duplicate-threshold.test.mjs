/**
 * The former sequence threshold was so strict that no pair in a 640-record
 * corpus could trigger it. That made duplicate detection present in code but
 * ineffective in practice. The Jaccard threshold is pinned with a reordered,
 * lightly reworded pair that must still be recognised as the same control.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DUPLICATE_THRESHOLD } from '../../tools/lib/validate.mjs';
import { tokenSimilarity } from '../../tools/lib/registry.mjs';

test('the duplicate threshold catches a realistic reordered title', () => {
  const score = tokenSimilarity('Give every indexable route a distinct title', 'Give each route a distinct indexable title');
  assert.ok(score >= DUPLICATE_THRESHOLD, `${score} did not reach ${DUPLICATE_THRESHOLD}`);
});
