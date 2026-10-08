const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { getRootDirs } = require('@next/eslint-plugin-next/dist/utils/get-root-dirs');
const { ESLint } = require('eslint');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'next-lint-roots-'));
const normalise = values => values.map(v => path.resolve(v).replace(/\\/g, '/').replace(/\/$/, '')).sort();
(async () => {
  try {
    for (const name of ['apps/one', 'apps/two', 'packages/three']) fs.mkdirSync(path.join(root, name), { recursive: true });
    fs.writeFileSync(path.join(root, 'apps/not-a-directory'), 'synthetic fixture');
    const ctx = rootDir => ({ cwd: root, settings: { next: { rootDir } } });
    const expect = names => normalise(names.map(n => path.join(root, n)));
    assert.deepEqual(getRootDirs(ctx(undefined)), [root]);
    assert.deepEqual(normalise(getRootDirs(ctx(`${root}/apps/*`))), expect(['apps/one', 'apps/two']));
    assert.deepEqual(normalise(getRootDirs(ctx(`${root}/{apps,packages}/*`))), expect(['apps/one', 'apps/two', 'packages/three']));
    assert.deepEqual(normalise(getRootDirs(ctx([`${root}/apps/one`, `${root}/packages/*`, 42]))), expect(['apps/one', 'packages/three']));
    assert.deepEqual(normalise(getRootDirs(ctx(`${root}/apps/*`.replace(/\//g, '\\')))), expect(['apps/one', 'apps/two']));
    const eslint = new ESLint();
    const config = await eslint.calculateConfigForFile('app/page.tsx');
    assert.ok(config.plugins['@next/next'], 'Next plugin must remain enabled');
    assert.equal(config.rules['@next/next/no-html-link-for-pages'][0], 2);
    assert.equal(config.rules['@next/next/no-sync-scripts'][0], 2);
    const results = await eslint.lintText('export default function Page() { return <script src="/fixture.js" />; }', { filePath: 'app/page.tsx' });
    assert.ok(results[0].messages.some(m => m.ruleId === '@next/next/no-sync-scripts'), 'Actual Next lint rule must execute');
    console.log('PASS: Next lint root glob compatibility and enforced lint rules');
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
})().catch(error => { console.error(error); process.exitCode = 1; });
