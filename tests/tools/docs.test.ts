/**
 * Unit tests for the generated-block machinery in tools/lib/docs.ts.
 *
 * All work happens on strings and on temp-directory copies. The repository's own
 * README.md, EVIDENCE.md, and schema files are never read as fixtures and never
 * written, so running these tests cannot cause the drift they exist to detect.
 */

import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { applyBlock, generateArtifacts, hasBlock, metricsBlockMarkdown, requirementMarkdown } from '../../tools/lib/docs.ts';

const sandboxes = [];

function sandbox() {
  const root = mkdtempSync(join(tmpdir(), 'wds-docs-'));
  sandboxes.push(root);
  return root;
}

after(() => {
  for (const root of sandboxes) rmSync(root, { recursive: true, force: true });
});

const PREAMBLE = ['# Hand-written title', '', 'A paragraph a human wrote.', ''].join('\n');
const POSTAMBLE = ['', 'A closing paragraph a human wrote.', ''].join('\n');

function document(marker, body) {
  return [PREAMBLE, `<!-- GENERATED:${marker} -->`, body, `<!-- /GENERATED:${marker} -->`, POSTAMBLE].join('\n');
}

/** Minimal inputs for generateArtifacts. Fixed values, so output is stable. */
const METRICS = {
  requirements_total: 3,
  requirements_unique: 3,
  requirements_with_sources: 2,
  requirements_with_verification: 3,
  requirements_with_tests: 1,
  check_coverage_ratio: 1 / 3,
  requirements_with_confidence: 3,
  duplicate_count: 0,
  near_duplicate_count: 0,
  broken_dependency_count: 0,
  circular_dependency_count: 0,
  requirements_removed: 1,
  requirements_deferred: 2,
  checks_defined: 4,
};

const SOURCES = {
  total_citations: 5,
  unique_urls: 4,
  official_citations: 3,
  unofficial_citations: 2,
  requirements_missing_sources: [],
  by_organization: { Google: 3, W3C: 2 },
};

const BENCHMARKS = {
  case_count: 2,
  cases_passed: 2,
  precision: 1,
  recall: 0.9,
  false_positive_rate: 0,
  false_negative_rate: 0.1,
  verification_accuracy: 1,
};

describe('applyBlock replaces only the marked region', () => {
  it('swaps the block body and leaves the markers in place', () => {
    const before = document('metrics', 'STALE BODY');
    const after_ = applyBlock(before, 'metrics', 'FRESH BODY');
    assert.equal(after_, document('metrics', 'FRESH BODY'));
    assert.ok(after_.includes('<!-- GENERATED:metrics -->'));
    assert.ok(after_.includes('<!-- /GENERATED:metrics -->'));
    assert.ok(!after_.includes('STALE BODY'));
  });

  it('leaves every character outside the markers untouched', () => {
    const before = document('metrics', 'STALE BODY');
    const after_ = applyBlock(before, 'metrics', 'FRESH BODY');
    assert.ok(after_.startsWith(PREAMBLE), 'text before the start marker changed');
    assert.ok(after_.endsWith(POSTAMBLE), 'text after the end marker changed');
    assert.equal(after_.slice(0, after_.indexOf('<!-- GENERATED:')), before.slice(0, before.indexOf('<!-- GENERATED:')));
    assert.equal(
      after_.slice(after_.indexOf('<!-- /GENERATED:')),
      before.slice(before.indexOf('<!-- /GENERATED:')),
    );
  });

  it('trims the injected content and surrounds it with exactly one newline each side', () => {
    const after_ = applyBlock(document('metrics', 'old'), 'metrics', '\n\n  padded body  \n\n');
    assert.ok(after_.includes('<!-- GENERATED:metrics -->\npadded body\n<!-- /GENERATED:metrics -->'));
  });

  it('is idempotent, so a second write is a no-op', () => {
    const once = applyBlock(document('metrics', 'old'), 'metrics', 'body');
    assert.equal(applyBlock(once, 'metrics', 'body'), once);
  });

  it('touches only the named block when a document carries several', () => {
    const multi = [
      '<!-- GENERATED:one -->',
      'first',
      '<!-- /GENERATED:one -->',
      'between',
      '<!-- GENERATED:two -->',
      'second',
      '<!-- /GENERATED:two -->',
    ].join('\n');
    const updated = applyBlock(multi, 'two', 'SECOND UPDATED');
    assert.ok(updated.includes('<!-- GENERATED:one -->\nfirst\n<!-- /GENERATED:one -->'));
    assert.ok(updated.includes('between'));
    assert.ok(updated.includes('<!-- GENERATED:two -->\nSECOND UPDATED\n<!-- /GENERATED:two -->'));
  });

  it('round-trips content containing marker-like text without corrupting the block', () => {
    const body = 'A table row mentioning GENERATED:metrics in prose.';
    const updated = applyBlock(document('metrics', 'old'), 'metrics', body);
    assert.equal(applyBlock(updated, 'metrics', body), updated);
    assert.ok(updated.includes(body));
  });
});

describe('a missing marker pair is reported, never silently appended', () => {
  it('throws rather than appending when neither marker is present', () => {
    const doc = '# Title\n\nNo markers at all.\n';
    assert.throws(() => applyBlock(doc, 'metrics', 'body'), /missing GENERATED:metrics markers/);
  });

  it('throws when only the start marker is present', () => {
    assert.throws(
      () => applyBlock('<!-- GENERATED:metrics -->\nbody only\n', 'metrics', 'x'),
      /missing GENERATED:metrics markers/,
    );
  });

  it('throws when only the end marker is present', () => {
    assert.throws(
      () => applyBlock('body only\n<!-- /GENERATED:metrics -->\n', 'metrics', 'x'),
      /missing GENERATED:metrics markers/,
    );
  });

  it('throws when the markers are in the wrong order', () => {
    const inverted = ['<!-- /GENERATED:metrics -->', 'body', '<!-- GENERATED:metrics -->'].join('\n');
    assert.throws(() => applyBlock(inverted, 'metrics', 'x'), /missing GENERATED:metrics markers/);
  });

  it('throws for a marker name that is not the one in the document', () => {
    assert.throws(() => applyBlock(document('metrics', 'old'), 'coverage', 'x'), /missing GENERATED:coverage markers/);
  });

  it('hasBlock answers the same question without throwing', () => {
    const doc = document('metrics', 'old');
    assert.equal(hasBlock(doc, 'metrics'), true);
    assert.equal(hasBlock(doc, 'coverage'), false);
    assert.equal(hasBlock('<!-- GENERATED:metrics -->\n', 'metrics'), false);
    assert.equal(hasBlock('<!-- /GENERATED:metrics -->\n', 'metrics'), false);
  });
});

describe('generateArtifacts resolves in-place blocks against a project root', () => {
  const inputs = (root) => ({ records: [], metrics: METRICS, sources: SOURCES, benchmarks: BENCHMARKS, root });

  it('reports drift when the block on disk is stale, and no drift once written', () => {
    const root = sandbox();
    const readme = join(root, 'README.md');
    writeFileSync(readme, document('metrics', 'STALE NUMBERS'));

    const stale = generateArtifacts(inputs(root)).blocks[0];
    assert.equal(stale.path, 'README.md');
    assert.equal(stale.marker, 'metrics');
    assert.equal(stale.missing, undefined);
    // This inequality is exactly what `docs --check` reports as drift.
    assert.notEqual(stale.updated, stale.original);
    assert.ok(!stale.updated.includes('STALE NUMBERS'));

    writeFileSync(readme, stale.updated);
    const fresh = generateArtifacts(inputs(root)).blocks[0];
    assert.equal(fresh.updated, fresh.original);
    assert.equal(readFileSync(readme, 'utf8'), fresh.updated);
  });

  it('preserves the hand-written text around the block when it rewrites it', () => {
    const root = sandbox();
    writeFileSync(join(root, 'README.md'), document('metrics', 'STALE NUMBERS'));
    const block = generateArtifacts(inputs(root)).blocks[0];
    assert.ok(block.updated.startsWith(PREAMBLE));
    assert.ok(block.updated.endsWith(POSTAMBLE));
  });

  it('detects a single changed number as drift', () => {
    const root = sandbox();
    const readme = join(root, 'README.md');
    writeFileSync(readme, document('metrics', metricsBlockMarkdown({ metrics: METRICS, benchmarks: BENCHMARKS })));
    assert.equal(generateArtifacts(inputs(root)).blocks[0].updated, readFileSync(readme, 'utf8'));

    const tampered = readFileSync(readme, 'utf8').replace('| Active requirements | 3 |', '| Active requirements | 9 |');
    writeFileSync(readme, tampered);
    const block = generateArtifacts(inputs(root)).blocks[0];
    assert.notEqual(block.updated, block.original);
    assert.ok(block.original.includes('| Active requirements | 9 |'));
    assert.ok(block.updated.includes('| Active requirements | 3 |'));
  });

  it('reports a document with no markers as missing instead of appending a block', () => {
    const root = sandbox();
    const readme = join(root, 'README.md');
    const original = '# Title\n\nSomebody deleted the markers.\n';
    writeFileSync(readme, original);

    const block = generateArtifacts(inputs(root)).blocks[0];
    assert.equal(block.missing, 'README.md has no GENERATED:metrics markers');
    assert.equal(block.updated, undefined);
    assert.equal(block.original, original);
    assert.equal(readFileSync(readme, 'utf8'), original, 'generateArtifacts must not write');
  });

  it('reports a missing document as missing rather than throwing', () => {
    const block = generateArtifacts(inputs(sandbox())).blocks[0];
    assert.equal(block.missing, 'README.md does not exist');
    assert.equal(block.original, undefined);
    assert.equal(block.updated, undefined);
  });

  it('returns whole-file artifacts as path/content pairs without writing them', () => {
    const root = sandbox();
    const { files } = generateArtifacts(inputs(root));
    assert.deepEqual(
      files.map((f) => f.path),
      [
        'requirements/manifest.json',
        'requirements/registry.md',
        'references/vocabulary.md',
        'EVIDENCE.md',
        'schema/requirement.schema.json',
        'schema/ledger.schema.json',
        'schema/benchmark-case.schema.json',
      ],
    );
    for (const file of files) {
      assert.equal(typeof file.content, 'string');
      assert.ok(file.content.length > 0, `${file.path} generated empty content`);
    }
    // Generation is pure: nothing appeared on disk.
    assert.throws(() => readFileSync(join(root, 'EVIDENCE.md'), 'utf8'), { code: 'ENOENT' });
  });

  it('generates the same bytes twice for the same inputs', () => {
    const root = sandbox();
    const first = generateArtifacts(inputs(root)).files;
    const second = generateArtifacts(inputs(root)).files;
    assert.deepEqual(first, second);
  });
});

describe('requirement Markdown pages', () => {
  it('renders the canonical fields and links', () => {
    const record = {
      id: 'SEO-001',
      domain: 'urls',
      title: 'Use one production HTTPS origin',
      statement: 'Every public route uses one production HTTPS origin.',
      rationale: 'One origin prevents split identity across hosts.',
      minimum_level: 'LITE',
      severity: 'HIGH',
      impact: 'HIGH',
      change_safety: 'REVIEW_REQUIRED',
      evidence_tier: 'A',
      confidence: 'HIGH',
      applies_when: { all: ['public_site'] },
      implementation: 'Configure the deployment origin and redirect alternate hosts.',
      verification: { level: 'SOURCE_AND_RUNTIME', method: 'Fetch representative routes.', evidence: ['HTTP_STATUS'], automated_check: 'origin-https' },
      review: { stability: 'STABLE', interval_days: 730, last_verified: '2026-08-21', owner: 'urls' },
      surfaces: ['GOOGLE_SEARCH'],
      frameworks: ['any'],
      depends_on: [],
      conflicts_with: [],
      supersedes: [],
      sources: [{ organization: 'Google', title: 'HTTPS documentation', url: 'https://example.com/source', tier: 'A', date_checked: '2026-08-21' }],
    };
    const page = requirementMarkdown(record);
    assert.match(page, /# SEO-001: Use one production HTTPS origin/);
    assert.match(page, /## Canonical record/);
    assert.match(page, /\[HTTPS documentation\]\(https:\/\/example\.com\/source\)/);
  });
});

describe('the metrics block never invents a number it does not have', () => {
  it('injects the counts it was given', () => {
    const block = metricsBlockMarkdown({ metrics: METRICS, benchmarks: BENCHMARKS });
    assert.ok(block.includes('| Active requirements | 3 |'));
    assert.ok(block.includes('| With a deterministic check | 1 (33%) |'));
    assert.ok(block.includes('| Benchmark cases | 2/2 passing |'));
  });

  it('says "not measured" for a rate the benchmark run reported as null', () => {
    const block = metricsBlockMarkdown({ metrics: METRICS, benchmarks: { ...BENCHMARKS, precision: null } });
    assert.ok(block.includes('| Precision | not measured |'));
    assert.ok(!block.includes('| Precision | 0 |'));
  });

  it('states that benchmarks are absent rather than printing zeroes', () => {
    const block = metricsBlockMarkdown({ metrics: METRICS, benchmarks: null });
    assert.ok(block.includes('no benchmark run has been recorded'));
    assert.ok(!block.includes('Precision'));
  });
});
