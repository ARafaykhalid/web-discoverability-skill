/**
 * Static generators commonly place the served tree under `_site/`. Treating the
 * repository root as the host root produced `/_site` URLs and left the framework
 * unknown, so checks evaluated the wrong routes. The loader now recognises that
 * output root and strips it from served addresses.
 */
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolve } from 'node:path';
import { loadSnapshot } from '../../tools/lib/snapshot.ts';

test('a static output subdirectory maps its index document to the host root', () => {
  const snapshot = loadSnapshot(resolve('tests/fixtures/static-subdir-site'));
  assert.deepEqual(snapshot.pages.map((page) => page.url).sort(), ['/', '/about', '/blog/hello']);
});
