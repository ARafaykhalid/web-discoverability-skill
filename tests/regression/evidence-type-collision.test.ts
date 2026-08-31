/**
 * Regression: a detail key named `type` silently overwrote the evidence type.
 *
 * `ev(type, detail)` returns `{ type, ...detail }`, so `ev('JSON_LD', { type:
 * 'Organization' })` emitted `{ type: 'Organization' }`. Five call sites in
 * structured-data.ts passed the schema.org type under that key, which meant
 * jsonld-absolute-urls, jsonld-duplicate-entity and jsonld-review-without-source
 * attached evidence whose type no requirement declares. The benchmark scorer
 * caught it as `evidence type Organization not declared by SEO-164`, which reads
 * like a registry problem and was not one.
 *
 * Two guards, because either alone would let it back in:
 *
 *  1. `ev` now refuses the key. That fails fast at the call site.
 *  2. Every finding produced by every fixture is checked against the declared
 *     evidence list of its bound requirement. That catches the same class of
 *     defect arriving by any other route - a typo'd type, a copied evidence
 *     block, a record whose evidence list was narrowed after the check shipped.
 *
 * Guard 2 is the one that generalises, so it is written against all fixtures
 * rather than against the three checks that happened to be wrong.
 */
import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

import { ROOT, loadRegistry } from '../../tools/lib/registry.ts';
import { ev } from '../../tools/lib/check-support.ts';
import { loadSnapshot } from '../../tools/lib/snapshot.ts';
import { runChecks, loadChecks } from '../../tools/lib/checks/index.ts';
import { EVIDENCE_TYPES } from '../../tools/lib/model.ts';

const FIXTURES_DIR = join(ROOT, 'benchmarks', 'fixtures');

function fixtureNames() {
  if (!existsSync(FIXTURES_DIR)) return [];
  return readdirSync(FIXTURES_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();
}

describe('regression: ev() detail keys cannot overwrite the evidence type', () => {
  it('refuses a detail key named type instead of silently replacing the type', () => {
    assert.throws(
      () => ev('JSON_LD', { url: '/x', type: 'Organization' }),
      /detail key named "type"/,
      'a detail key named type must be rejected, because spreading it over the evidence type loses the only field that binds evidence to a requirement',
    );
  });

  it('still accepts details that merely mention a type in their name', () => {
    const item = ev('JSON_LD', { node_type: 'Organization', entity_type: 'Organization', declared_type: 'application/rss+xml' });
    assert.equal(item.type, 'JSON_LD');
    assert.equal(item.node_type, 'Organization');
    assert.equal(item.entity_type, 'Organization');
    assert.equal(item.declared_type, 'application/rss+xml');
  });

  it('keeps the detail payload intact', () => {
    const item = ev('SITEMAP', { path: 'sitemap.xml', count: 3 });
    assert.deepEqual(item, { type: 'SITEMAP', path: 'sitemap.xml', count: 3 });
  });
});

describe('regression: every emitted evidence type is declared by its requirement', () => {
  const fixtures = fixtureNames();
  const { records } = loadRegistry();
  const byId = new Map(records.map((record) => [record.id, record]));

  it('has fixtures to run against', () => {
    assert.ok(fixtures.length > 0, 'no fixtures found, so the assertions below would inspect nothing');
  });

  for (const name of fixtures) {
    it(`emits only declared evidence types on ${name}`, async () => {
      const snapshot = loadSnapshot(join(FIXTURES_DIR, name));
      const { findings } = await runChecks(snapshot, { checks: await loadChecks() });
      const problems = [];

      for (const finding of findings) {
        const record = byId.get(finding.requirement_id);
        assert.ok(record, `finding from ${finding.check_id} cites ${finding.requirement_id}, which is not in the registry`);
        const declared = record.verification?.evidence ?? [];
        const items = Array.isArray(finding.evidence) ? finding.evidence : [finding.evidence];

        for (const item of items) {
          if (!item) continue;
          // A type outside the vocabulary is a different bug from a type the
          // record does not declare, and the messages have to say which.
          if (!EVIDENCE_TYPES.includes(item.type)) {
            problems.push(`${finding.check_id} emitted evidence type "${item.type}", which is not in the evidence vocabulary`);
            continue;
          }
          if (!declared.includes(item.type)) {
            problems.push(`${finding.check_id} emitted evidence type "${item.type}", which ${record.id} does not declare (declares ${declared.join(', ') || 'nothing'})`);
          }
        }
      }

      assert.deepEqual(problems, [], problems.join('\n'));
    });
  }
});
