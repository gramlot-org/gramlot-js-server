import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {inlineStylesheets, loadPage, logicBundle, logicModule, workerBundle} from '../src/bundles.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const page = join(root, 'tests/fixtures/companion/page.js');
const pageModule = join(root, 'tests/fixtures/page-module/page.js');
const options = {bundle: true, platform: 'browser', format: 'iife', write: false};

async function folder(t) {
    const path = await mkdtemp(join(root, 'tests/.bundles-'));
    t.after(() => rm(path, {recursive: true, force: true}));
    return path;
}

test('the Worker bundle names the companion but never contains it', async () => {
    const logic = await logicModule(page, await loadPage(page));
    assert.deepEqual(logic, {file: join(root, 'tests/fixtures/companion/page_aux.js'), url: '/page_aux.js'});
    const worker = await workerBundle(page, options, {logic: logic.url});
    assert.match(worker.text, /"logic": "\/page_aux\.js"/);
    assert.doesNotMatch(worker.text, /gramlotSentinel/);
    assert.ok(!Object.keys(worker.metafile.inputs).some(path => path.endsWith('page_aux.js')));
    const module = await logicBundle(logic, options);
    assert.match(module, /gramlotSentinel/);
    assert.match(module, /export \{\s*Logic\s*\}/);
    const hello = join(root, 'examples/hello-world/page.js');
    assert.equal(await logicModule(hello, await loadPage(hello)), null);
});

test('the Logic export of the page module is the logic; its bundle takes the core of the window', async () => {
    const logic = await logicModule(pageModule, await loadPage(pageModule));
    assert.deepEqual(logic, {file: pageModule, url: '/page.js'});
    const module = await logicBundle(logic, options);
    assert.match(module, /gramlotModuleSentinel/);
    assert.match(module, /globalThis\.GramlotStandalone/);
    assert.match(module, /export \{\s*Logic\s*\}/);
    // No second core: the Source builder of the core is not in the module.
    assert.doesNotMatch(module, /class GramlotBuilder/);
    assert.ok(module.length < 20000, `${module.length} bytes`);
});

test('a Logic export and a companion for one page are an error; a module without Page is refused', async t => {
    const path = await folder(t);
    const both = join(path, 'both.js');
    await writeFile(both, `import {Page as BasePage} from '@gramlot/gramlot/page';
export class Page extends BasePage { main(root) { root.h1('Both'); } }
export class Logic {}`);
    await writeFile(join(path, 'both_aux.js'), 'export class Logic {}');
    await assert.rejects(async () => logicModule(both, await loadPage(both)), /Two logic modules for one page/);
    const helper = join(path, 'helper.js');
    await writeFile(helper, 'export const value = 1;');
    await assert.rejects(loadPage(helper), /The module exports no class Page: .*helper\.js/);
});

test('one file inlines /themes/ from the core package, other URLs from the page folder, then foo.css', async t => {
    const files = await inlineStylesheets(pageModule, (await loadPage(pageModule)).Page);
    const theme = createRequire(import.meta.url).resolve('@gramlot/gramlot/themes/gramlot-base/theme.css');
    assert.deepEqual(files, [theme, join(root, 'tests/fixtures/page-module/local.css'),
        join(root, 'tests/fixtures/page-module/page.css')]);
    const path = await folder(t);
    const styled = css => class { static css = css; };
    for (const [css, message] of [[['https://cdn.example/x.css'], /only local files/], [['//cdn.example/x.css'], /only local files/],
        [['/../outside.css'], /segment/], [['/missing.css'], /not a file in the folder/], [['x.css', 1], /array of strings/]]) {
        await assert.rejects(inlineStylesheets(join(path, 'page.js'), styled(css)), message);
    }
    await writeFile(join(path, 'a.css'), 'a');
    assert.deepEqual(await inlineStylesheets(join(path, 'page.js'), styled(['/a.css', 'a.css'])), [join(path, 'a.css')]);
});

test('inline.js is not reachable from the GramlotWorkerServer bundle', async () => {
    const {metafile} = await workerBundle(page, options, {logic: '/page_aux.js'});
    const inputs = Object.keys(metafile.inputs);
    // The core GramlotServer entry proves the graph was read from the linked core.
    assert.ok(inputs.some(path => path.endsWith('src/server/gramlot-server.js')));
    assert.ok(inputs.some(path => path.endsWith('src/gramlot-worker-server.js')));
    assert.deepEqual(inputs.filter(path => /binding\/inline\.js$/.test(path)), []);
});
