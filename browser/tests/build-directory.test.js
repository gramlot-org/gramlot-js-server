import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, readFile, rm, stat} from 'node:fs/promises';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildDirectory} from '../src/build-directory.js';

const root = fileURLToPath(new URL('../', import.meta.url));

async function fixture(t) {
    const folder = await mkdtemp(join(root, 'tests/.directory-'));
    t.after(() => rm(folder, {recursive: true, force: true}));
    const page = join(folder, 'page.js');
    await writeFile(page, `import {Page as BasePage} from '@gramlot/gramlot/page';
throw new Error('Page code must run only inside the Worker');
export class Page extends BasePage { main(root) { root.h1('Directory page'); } }`);
    return {folder, page, output: join(folder, 'dist')};
}

test('exports two static routes, one runtime, Worker bundles, and only listed assets', async t => {
    const {folder, page, output} = await fixture(t);
    const asset = join(folder, 'theme.css');
    await writeFile(asset, 'body { color: navy; }');
    await writeFile(join(folder, 'unlisted.css'), 'not copied');
    const result = await buildDirectory({
        pages: {index: page, e01: page}, output,
        assets: [{source: asset, target: 'themes/base/theme.css'}],
    });
    assert.equal(result.output, output);
    assert.deepEqual(result.routes, ['e01', 'index']);
    for (const [route, path, prefix] of [['index', join(output, 'index.html'), './'], ['e01', join(output, 'e01/index.html'), '../']]) {
        const html = await readFile(path, 'utf8');
        assert.match(html, /<!doctype html><html/);
        assert.match(html, /id="gramlot-root"/);
        assert.doesNotMatch(html, /http-equiv="Content-Security-Policy"/);
        assert.ok(html.includes(`src="${prefix}assets/standalone.js"`));
        assert.ok(html.includes(`src="${prefix}assets/workers/${route}.js"`));
        assert.doesNotMatch(html, /workerUrl:/);
        const worker = await readFile(join(output, 'assets/workers', `${route}.js`), 'utf8');
        assert.match(worker, /Directory page/);
        assert.match(worker, /URL.createObjectURL\(new Blob/);
        assert.match(worker, /URL.revokeObjectURL\(url\)/);
        assert.match(worker, /GramlotStandalone.mount\(\{workerUrl, modules, assetRoot: /);
        assert.ok(worker.includes(`assetRoot: new URL("${route === 'index' ? './' : '../'}", document.baseURI).href`));
    }
    assert.ok((await stat(join(output, 'assets/standalone.js'))).size > 0);
    assert.ok((await stat(join(output, 'assets/runtime-notices.json'))).size > 0);
    assert.equal(await readFile(join(output, 'themes/base/theme.css'), 'utf8'), 'body { color: navy; }');
    await assert.rejects(stat(join(output, 'unlisted.css')), {code: 'ENOENT'});
});

test('rejects invalid routes, asset traversal and collisions before creating output', async t => {
    const {folder, page, output} = await fixture(t);
    const asset = join(folder, 'file.css');
    await writeFile(asset, 'x');
    await assert.rejects(buildDirectory({pages: {index: page, '../escape': page}, output}), /Invalid route/);
    await assert.rejects(buildDirectory({pages: {e01: page}, output}), /index route/);
    await assert.rejects(buildDirectory({pages: {index: 'page.js'}, output}), /absolute/);
    for (const target of ['../outside.css', '/absolute.css', 'assets/standalone.js', 'assets/workers/e01.js']) {
        await assert.rejects(buildDirectory({pages: {index: page, e01: page}, output,
            assets: [{source: asset, target}]}), /Invalid asset target|conflicts/);
    }
    await assert.rejects(stat(output), {code: 'ENOENT'});
});

test('failed bundling leaves output absent and existing output is refused', async t => {
    const {folder, output} = await fixture(t);
    const bad = join(folder, 'bad.js');
    await writeFile(bad, 'import fs from "node:fs"; export const Page = fs;');
    await assert.rejects(buildDirectory({pages: {index: bad}, output}));
    await assert.rejects(stat(output), {code: 'ENOENT'});
    await writeFile(output, 'existing');
    await assert.rejects(buildDirectory({pages: {index: bad}, output}), /already exists/);
    assert.equal(await readFile(output, 'utf8'), 'existing');
});

test('a companion beside the page reaches the window bootstrap; a *_aux page is refused', async t => {
    const {folder, output} = await fixture(t);
    const page = join(root, 'tests/fixtures/companion/page.js');
    await buildDirectory({pages: {index: page}, output});
    const bootstrap = await readFile(join(output, 'assets/workers/index.js'), 'utf8');
    assert.ok(bootstrap.includes('"/page_aux.js":'));
    assert.match(bootstrap, /gramlotSentinel/);
    await assert.rejects(buildDirectory({pages: {index: join(root, 'tests/fixtures/companion/page_aux.js')},
        output: join(folder, 'aux')}), /page companion, not a page/);
});
