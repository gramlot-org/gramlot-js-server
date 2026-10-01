import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, readFile, rm} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
import {build} from '../src/build.js';

const root = fileURLToPath(new URL('../', import.meta.url));
async function fixture(t) {
    const folder = await mkdtemp(join(root, 'tests/.build-'));
    t.after(() => rm(folder, {recursive: true, force: true}));
    return {folder, output: join(folder, 'app.html')};
}

test('exports a self-contained shell through HtmlBuilder without running the Page', async t => {
    const {folder, output} = await fixture(t);
    const page = join(folder, 'page.js');
    await writeFile(page, `import {Page as BasePage} from '@gramlot/gramlot/page';
throw new Error('must run only in the Worker');
export class Page extends BasePage { main(root) { root.h1('Hello'); } }`);
    const info = await build({page, output});
    const html = await readFile(output, 'utf8');
    assert.equal(info.bytes, Buffer.byteLength(html));
    assert.match(info.sha256, /^[a-f0-9]{64}$/);
    assert.match(html, /id="gramlot-root"/);
    assert.match(html, /worker-src blob:/);
    assert.match(html, /connect-src 'none'/);
    assert.match(html, /<meta http-equiv="Content-Security-Policy" content="default-src 'none'; script-src /);
    const scriptSrc = html.match(/script-src ([^;]+);/)[1];
    assert.doesNotMatch(scriptSrc, /unsafe-inline|unsafe-eval/);
    const scripts = [...html.matchAll(/<script>([\s\S]*?)<\/script>/g)].map(match => match[1]);
    assert.equal(scripts.length, 1);
    assert.equal(scriptSrc, `'sha256-${createHash('sha256').update(scripts[0]).digest('base64')}' blob:`);
    assert.doesNotMatch(html, /<script[^>]+src=/);
    assert.doesNotMatch(html, /\(0,eval\)/);
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

test('the companion is embedded for the window and a *_aux page is refused', async t => {
    const {output} = await fixture(t);
    await build({page: join(root, 'tests/fixtures/companion/page.js'), output});
    const html = await readFile(output, 'utf8');
    assert.ok(html.includes('"/page_aux.js":'));
    await assert.rejects(build({page: join(root, 'tests/fixtures/companion/page_aux.js'), output}),
        /page companion, not a page/);
});
