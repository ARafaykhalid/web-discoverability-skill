/**
 * Unit tests for tools/lib/profile.ts.
 *
 * Every fixture is a throwaway directory under os.tmpdir(); nothing here reads
 * or writes the repository, and nothing depends on the clock or the network.
 */

import { after, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

import { detectProfile, FALSE, TRUE, UNKNOWN } from '../../tools/lib/profile.ts';
import { FRAMEWORKS, PROFILE_PREDICATES } from '../../tools/lib/model.ts';

const sandboxes = [];

/** Materialise `{ 'rel/path': contents }` into a fresh temp directory. */
function project(name, files) {
  const root = mkdtempSync(join(tmpdir(), `wds-profile-${name}-`));
  sandboxes.push(root);
  for (const [rel, body] of Object.entries(files)) {
    const full = join(root, rel);
    mkdirSync(dirname(full), { recursive: true });
    writeFileSync(full, body);
  }
  return root;
}

after(() => {
  for (const root of sandboxes) rmSync(root, { recursive: true, force: true });
});

const PLAIN_HTML = {
  'index.html':
    '<!doctype html><html lang="en"><head><title>Hello world page</title></head><body><h1>Hi</h1></body></html>\n',
};

const NEXT_APP_ROUTER = {
  'package.json': JSON.stringify({ name: 'nx', dependencies: { next: '14.2.0', react: '18.3.0' } }),
  'app/layout.tsx': 'export default function Layout({ children }) { return children; }\n',
  'app/page.tsx': 'export default function Page() { return null; }\n',
};

const VITE_SPA = {
  'package.json': JSON.stringify({ name: 'vt', dependencies: { react: '18.3.0' }, devDependencies: { vite: '5.2.0' } }),
  'index.html': '<!doctype html><html><body><div id="root"></div></body></html>\n',
  'src/main.jsx': 'const root = document.getElementById("root");\n',
};

const ASTRO_SITE = {
  'package.json': JSON.stringify({ name: 'as', dependencies: { astro: '4.10.0' } }),
  'astro.config.mjs': 'export default { output: "static" };\n',
  'src/pages/index.astro': '<h1>Home</h1>\n',
};

describe('detectProfile framework detection', () => {
  it('reports static-html for a plain HTML directory', () => {
    const profile = detectProfile(project('plain', PLAIN_HTML));
    assert.equal(profile.framework, 'static-html');
    assert.equal(profile.renderer, 'static');
    assert.deepEqual(profile.framework_evidence, ['index.html']);
  });

  it('reports next-app-router for a Next.js app-router project', () => {
    const profile = detectProfile(project('next', NEXT_APP_ROUTER));
    assert.equal(profile.framework, 'next-app-router');
    assert.equal(profile.renderer, 'hybrid');
    assert.deepEqual(profile.framework_evidence, ['package.json:next']);
  });

  it('reports vite for a Vite + React project', () => {
    const profile = detectProfile(project('vite', VITE_SPA));
    assert.equal(profile.framework, 'vite');
    assert.equal(profile.renderer, 'csr');
    assert.deepEqual(profile.framework_evidence, ['package.json:vite']);
  });

  it('reports astro for an Astro project', () => {
    const profile = detectProfile(project('astro', ASTRO_SITE));
    assert.equal(profile.framework, 'astro');
    assert.equal(profile.renderer, 'ssg');
    assert.deepEqual(profile.framework_evidence, ['package.json:astro']);
  });

  it('names a framework the vocabulary declares, and reports adapter depth', () => {
    for (const files of [PLAIN_HTML, NEXT_APP_ROUTER, VITE_SPA, ASTRO_SITE]) {
      const profile = detectProfile(project('vocab', files));
      assert.ok(FRAMEWORKS.includes(profile.framework), `${profile.framework} is not in model.ts FRAMEWORKS`);
      assert.equal(typeof profile.has_adapter, 'boolean');
    }
  });

  it('leaves framework unknown, not false, for a directory with no recognisable signal', () => {
    const profile = detectProfile(project('opaque', { 'notes.md': 'Just some prose.\n' }));
    assert.equal(profile.framework, 'unknown');
    assert.equal(profile.renderer, 'unknown');
    // Nothing was proven about the site, so the site-wide facts stay unknown.
    assert.equal(profile.facts.public_site.value, UNKNOWN);
    assert.equal(profile.facts.javascript_app.value, UNKNOWN);
    assert.equal(profile.facts.has_router.value, UNKNOWN);
  });
});

describe('detectProfile tri-state facts requiring corroboration', () => {
  const ECOMMERCE_HIT_A = { 'shop.js': 'export function addToCart(item) { return item; }\n' };
  const ECOMMERCE_HIT_B = { 'basket.js': 'export function addToCart(qty) { return qty + 1; }\n' };
  const UGC_HIT_A = { 'form.jsx': 'export const Form = () => <textarea name="body" />;\n' };
  const UGC_HIT_B = { 'reply.jsx': 'export const Reply = () => <textarea rows={4} />;\n' };

  it('needs two independent hits before ecommerce is true', () => {
    const profile = detectProfile(project('ecom-2', { ...ECOMMERCE_HIT_A, ...ECOMMERCE_HIT_B }));
    assert.equal(profile.facts.ecommerce.value, TRUE);
    assert.equal(profile.facts.ecommerce.evidence.length, 2);
    assert.deepEqual([...profile.facts.ecommerce.evidence].sort(), ['basket.js', 'shop.js']);
  });

  it('reports ecommerce as unknown on a single hit, never as true and never as false', () => {
    const profile = detectProfile(project('ecom-1', ECOMMERCE_HIT_A));
    assert.equal(profile.facts.ecommerce.value, UNKNOWN);
    assert.deepEqual(profile.facts.ecommerce.evidence, ['shop.js']);
    assert.ok(profile.unknowns.includes('ecommerce'));
  });

  it('reports ecommerce as false when nothing at all matched', () => {
    const profile = detectProfile(project('ecom-0', PLAIN_HTML));
    assert.equal(profile.facts.ecommerce.value, FALSE);
    assert.deepEqual(profile.facts.ecommerce.evidence, []);
  });

  it('needs two independent hits before ugc is true', () => {
    const profile = detectProfile(project('ugc-2', { ...UGC_HIT_A, ...UGC_HIT_B }));
    assert.equal(profile.facts.ugc.value, TRUE);
    assert.deepEqual([...profile.facts.ugc.evidence].sort(), ['form.jsx', 'reply.jsx']);
  });

  it('reports ugc as unknown on a single hit', () => {
    const profile = detectProfile(project('ugc-1', UGC_HIT_A));
    assert.equal(profile.facts.ugc.value, UNKNOWN);
    assert.deepEqual(profile.facts.ugc.evidence, ['form.jsx']);
    assert.ok(profile.unknowns.includes('ugc'));
  });

  it('reports ugc as false when nothing at all matched', () => {
    const profile = detectProfile(project('ugc-0', PLAIN_HTML));
    assert.equal(profile.facts.ugc.value, FALSE);
  });
});

describe('detectProfile facts that fall back to unknown rather than false', () => {
  // These four describe things that can exist entirely outside the repository,
  // so "we did not see it" is not evidence of absence.
  const FALLBACK_FACTS = ['multilingual', 'has_cdn_or_waf', 'local_business', 'has_production_origin'];

  it('reports unknown, not false, when there is no evidence either way', () => {
    const profile = detectProfile(project('fallback', PLAIN_HTML));
    for (const name of FALLBACK_FACTS) {
      assert.equal(profile.facts[name].value, UNKNOWN, `${name} should be unknown without evidence`);
      assert.notEqual(profile.facts[name].value, FALSE, `${name} must not read as a proven negative`);
      assert.deepEqual(profile.facts[name].evidence, [], `${name} claims evidence it does not have`);
      assert.ok(profile.unknowns.includes(name), `${name} missing from profile.unknowns`);
    }
  });

  it('flips each of those facts to true once the repository does show evidence', () => {
    const root = project('fallback-evidence', {
      'index.html':
        '<!doctype html><html><head><link rel="alternate" hreflang="fr" href="/fr/" /></head><body><p>Bonjour</p></body></html>\n',
      'vercel.json': '{ "headers": [] }\n',
      'contact.html': '<!doctype html><html><body><span itemprop="streetAddress">1 Main St</span></body></html>\n',
      CNAME: 'www.somewhere.test\n',
    });
    const profile = detectProfile(root);
    for (const name of FALLBACK_FACTS) {
      assert.equal(profile.facts[name].value, TRUE, `${name} should be true with evidence`);
      assert.ok(profile.facts[name].evidence.length > 0, `${name} is true but cites nothing`);
      assert.ok(!profile.unknowns.includes(name));
    }
  });

  it('reports runtime_available as unknown until a capture is supplied', () => {
    const root = project('runtime', PLAIN_HTML);
    assert.equal(detectProfile(root).facts.runtime_available.value, UNKNOWN);
    const withRuntime = detectProfile(root, { runtimeAvailable: true });
    assert.equal(withRuntime.facts.runtime_available.value, TRUE);
    assert.deepEqual(withRuntime.facts.runtime_available.evidence, ['runtime snapshot supplied']);
  });
});

describe('detectProfile fact model shape', () => {
  const roots = () => [
    detectProfile(project('shape-plain', PLAIN_HTML)),
    detectProfile(project('shape-next', NEXT_APP_ROUTER)),
    detectProfile(project('shape-vite', VITE_SPA)),
    detectProfile(project('shape-astro', ASTRO_SITE)),
  ];

  it('gives every fact a value of exactly true, false, or unknown', () => {
    const allowed = new Set([TRUE, FALSE, UNKNOWN]);
    for (const profile of roots()) {
      for (const [name, entry] of Object.entries(profile.facts)) {
        assert.ok(
          allowed.has(entry.value),
          `${profile.framework}.${name} has value ${JSON.stringify(entry.value)}, which is not true/false/'unknown'`,
        );
      }
    }
  });

  it('gives every fact the { value, evidence } shape the module documents', () => {
    for (const profile of roots()) {
      for (const [name, entry] of Object.entries(profile.facts)) {
        assert.deepEqual(Object.keys(entry), ['value', 'evidence'], `${name} has unexpected keys`);
        assert.ok(Array.isArray(entry.evidence), `${name} evidence is not an array`);
        assert.ok(entry.evidence.length <= 5, `${name} evidence exceeds the 5-item cap`);
        for (const item of entry.evidence) {
          assert.equal(typeof item, 'string', `${name} evidence entry is not a string`);
        }
      }
    }
  });

  it('lists exactly the unknown-valued facts in profile.unknowns', () => {
    for (const profile of roots()) {
      const expected = Object.entries(profile.facts)
        .filter(([, entry]) => entry.value === UNKNOWN)
        .map(([name]) => name);
      assert.deepEqual(profile.unknowns, expected);
    }
  });

  it('produces exactly the predicate set model.ts declares', () => {
    for (const profile of roots()) {
      assert.deepEqual(Object.keys(profile.facts), [...PROFILE_PREDICATES]);
    }
  });

  it('reports the scan envelope so a FALSE fact can be trusted', () => {
    const profile = detectProfile(project('envelope', PLAIN_HTML));
    assert.equal(profile.schema_version, 3);
    assert.equal(profile.scan_truncated, false);
    assert.equal(typeof profile.scan_limit, 'number');
    assert.equal(profile.file_count, 1);
  });
});
