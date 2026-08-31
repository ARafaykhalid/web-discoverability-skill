import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';
import test from 'node:test';

const ROOT = new URL('../', import.meta.url);

test('repository root is a Vercel skills-compatible package', async () => {
  const skill = await readFile(new URL('SKILL.md', ROOT), 'utf8');
  // CRLF-tolerant on purpose: a Windows checkout of the same commit is still a
  // valid skill package, and the frontmatter itself is what is being asserted,
  // not the repository's line-ending configuration.
  const frontmatter = skill.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);

  assert.ok(frontmatter, 'SKILL.md must start with YAML frontmatter');
  assert.match(frontmatter[1], /^name: web-discoverability-skill$/m);
  assert.match(frontmatter[1], /^description: \S.+$/m);

  await Promise.all([
    access(new URL('agents/openai.yaml', ROOT)),
    access(new URL('tools/cli.ts', ROOT)),
    access(new URL('requirements/manifest.json', ROOT)),
    access(new URL('references/discovery-applicability.md', ROOT)),
    access(new URL('assets/templates/final-report.md', ROOT)),
  ]);

  const metadata = await readFile(new URL('agents/openai.yaml', ROOT), 'utf8');
  assert.match(metadata, /display_name:/);
  assert.match(metadata, /default_prompt:.*\$web-discoverability-skill/);

  const pkg = JSON.parse(await readFile(new URL('package.json', ROOT), 'utf8'));
  assert.equal(
    pkg.repository?.url,
    'https://github.com/ARafaykhalid/web-discoverability-skill.git',
  );
  assert.equal(pkg.scripts?.docs, 'node tools/cli.ts docs', 'npm run docs must remain read-only unless --write is passed');
  assert.equal(pkg.scripts?.['docs:check'], 'node tools/cli.ts docs --check');

  const readme = await readFile(new URL('README.md', ROOT), 'utf8');
  assert.match(
    readme,
    /npx skills add ARafaykhalid\/web-discoverability-skill/,
  );
});
