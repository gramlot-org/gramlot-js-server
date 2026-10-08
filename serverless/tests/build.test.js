import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {build} from '../src/build.js';

const root = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
    const folder = await mkdtemp(join(root, 'tests/.build-'));
    t.after(() => rm(folder, {recursive: true, force: true}));
    return {folder, output: join(folder, 'app.html')};
}

test('exports a self-contained shell through HtmlBuilder without running main', async t => {
    const {folder, output} = await fixture(t);
    const page = join(folder, 'page.js');
    // The build imports the module, as GramlotFileServer does, to read Page.css; main runs only in the Worker.
    await writeFile(page, `import {Page as BasePage} from '@gramlot/gramlot/page';
export class Page extends BasePage {
    main(root) { if (typeof WorkerGlobalScope === 'undefined') throw new Error('must run only in the Worker'); root.h1('Hello'); }
}`);
    const info = await build({page, output});
    const html = await readFile(output, 'utf8');
    assert.equal(info.bytes, Buffer.byteLength(html));
    assert.match(info.sha256, /^[a-f0-9]{64}$/);
    assert.match(html, /id="gramlot-root"/);
    assert.match(html, /worker-src blob:/);
    assert.match(html, /connect-src \*;/);
    assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src /);
    const scriptSrc = html.match(/script-src ([^;]+);/)[1];
    assert.doesNotMatch(scriptSrc, /unsafe-inline/);
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
    assert.equal(scripts.length, 1);
    assert.equal(scriptSrc, `'sha256-${createHash('sha256').update(scripts[0]).digest('base64')}' 'unsafe-eval' blob:`);
    assert.doesNotMatch(html, /<script[^>]+src=/);
    assert.doesNotMatch(html, /\(0,eval\)/);
    assert.doesNotMatch(html, /<style>|<link/);
});

test('invalid input and failed bundling preserve existing output', async t => {
    const {folder, output} = await fixture(t);
    await writeFile(output, 'previous');
    await assert.rejects(build({page: join(folder, 'page.py'), output}), /JavaScript/);
    const page = join(folder, 'broken.js');
    await writeFile(page, 'import fs from "node:fs"; export const Page = fs;');
    await assert.rejects(build({page, output}));
    assert.equal(await readFile(output, 'utf8'), 'previous');
});

test('installed command builds the JS Hello World and rejects legacy arguments', async t => {
    const {output} = await fixture(t);
    const cli = join(root, 'src/cli.js');
    const stdout = execFileSync(process.execPath, [cli, 'build', join(root, 'examples/hello-world/page.js'), '-o', output], {encoding: 'utf8'});
    assert.match(stdout, /Built .*sha256/);
    assert.throws(() => execFileSync(process.execPath, [cli, 'build', 'pages', '--language', 'python', '-o', output], {stdio: 'pipe'}));
});

test('the logic module and the stylesheets enter the file; the Worker returns no CSS link', async t => {
    const {output} = await fixture(t);
    await build({page: join(root, 'tests/fixtures/page-module/page.js'), output});
    const html = await readFile(output, 'utf8');
    assert.ok(html.includes('"/page.js":'));
    assert.match(html, /"inlineCss": true/);
    const styles = [...html.matchAll(/<style>([\s\S]*?)<\/style>/g)].map(match => match[1]);
    const theme = await readFile(createRequire(import.meta.url).resolve('@gramlot/gramlot/themes/gramlot-base/theme.css'), 'utf8');
    assert.deepEqual(styles, [theme, '#pronto { color: rgb(0, 0, 128); }\n', '#pronto { font-weight: 700; }\n']);
    assert.doesNotMatch(html, /<link/);
});

test('a style text cannot end its element; a remote stylesheet is refused', async t => {
    const {folder, output} = await fixture(t);
    const page = join(folder, 'page.js');
    await writeFile(page, `import {Page as BasePage} from '@gramlot/gramlot/page';
export class Page extends BasePage { main(root) { root.h1('Hello'); } }`);
    await writeFile(join(folder, 'page.css'), '/* </style><script>alert(1)</script> */');
    await build({page, output});
    assert.match(await readFile(output, 'utf8'), /<style>\/\* <\\\/style><script>alert\(1\)<\/script> \*\/<\/style>/);
    const remote = join(folder, 'remote.js');
    await writeFile(remote, `import {Page as BasePage} from '@gramlot/gramlot/page';
export class Page extends BasePage { static css = ['https://cdn.example/x.css']; main(root) { root.h1('Hello'); } }`);
    await assert.rejects(build({page: remote, output}), /only local files are inlined/);
});

test('the companion is embedded for the window and a *_aux page is refused', async t => {
    const {output} = await fixture(t);
    await build({page: join(root, 'tests/fixtures/companion/page.js'), output});
    const html = await readFile(output, 'utf8');
    assert.ok(html.includes('"/page_aux.js":'));
    await assert.rejects(build({page: join(root, 'tests/fixtures/companion/page_aux.js'), output}),
        /page companion, not a page/);
});
