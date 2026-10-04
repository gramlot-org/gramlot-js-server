import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdir, mkdtemp, writeFile, readFile, rm, stat} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {createRequire} from 'node:module';
import {join, dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildDirectory, folderPages} from '../src/build-directory.js';

const root = fileURLToPath(new URL('../', import.meta.url));

async function fixture(t) {
    const folder = await mkdtemp(join(root, 'tests/.directory-'));
    t.after(() => rm(folder, {recursive: true, force: true}));
    const page = join(folder, 'page.js');
    await writeFile(page, `import {Page as BasePage} from '@gramlot/gramlot/page';
export class Page extends BasePage {
    main(root) { if (typeof WorkerGlobalScope === 'undefined') throw new Error('main runs only in the Worker'); root.h1('Directory page'); }
}`);
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
    for (const target of ['../outside.css', '/absolute.css', 'assets/standalone.js', 'assets/workers/e01.js',
        'assets/styles/index.css']) {
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

test('a previous export is replaced; any other directory at the output is refused', async t => {
    const {folder, page, output} = await fixture(t);
    await buildDirectory({pages: {index: page, e01: page}, output});
    await buildDirectory({pages: {index: page}, output});
    await assert.rejects(stat(join(output, 'e01')), {code: 'ENOENT'});
    assert.ok((await stat(join(output, 'index.html'))).isFile());
    const other = join(folder, 'other');
    await mkdir(other);
    await writeFile(join(other, 'keep.txt'), 'keep');
    await assert.rejects(buildDirectory({pages: {index: page}, output: other}), /not a previous export/);
    assert.equal(await readFile(join(other, 'keep.txt'), 'utf8'), 'keep');
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

test('the page module logic, foo.css and a core theme reach the directory', async t => {
    const {output} = await fixture(t);
    await buildDirectory({pages: {index: join(root, 'tests/fixtures/page-module/page.js')}, output});
    const bootstrap = await readFile(join(output, 'assets/workers/index.js'), 'utf8');
    assert.ok(bootstrap.includes('"/page.js":'));
    assert.match(bootstrap, /gramlotModuleSentinel/);
    assert.ok(bootstrap.includes('\\"stylesheet\\": \\"/assets/styles/index.css\\"'));
    assert.equal(await readFile(join(output, 'assets/styles/index.css'), 'utf8'), '#pronto { font-weight: 700; }\n');
    const theme = createRequire(import.meta.url).resolve('@gramlot/gramlot/themes/gramlot-base/theme.css');
    assert.equal(await readFile(join(output, 'themes/gramlot-base/theme.css'), 'utf8'), await readFile(theme, 'utf8'));
    // local.css is not an asset of this call: buildDirectory copies only the listed assets.
    await assert.rejects(stat(join(output, 'local.css')), {code: 'ENOENT'});
});

test('a folder: first-level modules are pages, other files are assets, a bad name or a module without Page fails', async t => {
    const {folder} = await fixture(t);
    const site = join(folder, 'site');
    await mkdir(join(site, 'lib'), {recursive: true});
    await mkdir(join(site, 'img'), {recursive: true});
    const page = text => `import {Page as BasePage} from '@gramlot/gramlot/page';
import {label} from './lib/label.js';
export class Page extends BasePage { main(root) { root.h1(label(${JSON.stringify(text)})); } }`;
    await writeFile(join(site, 'index.js'), page('Home'));
    await writeFile(join(site, 'about.js'), page('About'));
    await writeFile(join(site, 'about.css'), 'h1 { color: navy; }');
    await writeFile(join(site, 'lib', 'label.js'), 'export const label = text => text.toUpperCase();');
    await writeFile(join(site, 'img', 'logo.svg'), '<svg/>');
    await writeFile(join(site, '.DS_Store'), 'x');
    const {pages, assets} = await folderPages(site);
    assert.deepEqual(pages, {about: join(site, 'about.js'), index: join(site, 'index.js')});
    assert.deepEqual(assets.map(({target}) => target).sort(), ['about.css', 'img/logo.svg']);
    const output = join(folder, 'dist');
    const stdout = execFileSync(process.execPath, [join(root, 'src/cli.js'), 'build', site, '-o', output], {encoding: 'utf8'});
    assert.match(stdout, /Built .*dist: 2 pages \(about, index\)/);
    assert.match(await readFile(join(output, 'assets/workers/about.js'), 'utf8'), /toUpperCase/);
    assert.equal(await readFile(join(output, 'assets/styles/about.css'), 'utf8'), 'h1 { color: navy; }');
    assert.equal(await readFile(join(output, 'img/logo.svg'), 'utf8'), '<svg/>');
    await assert.rejects(stat(join(output, '.DS_Store')), {code: 'ENOENT'});
    await assert.rejects(stat(join(output, 'lib/label.js')), {code: 'ENOENT'});

    await writeFile(join(site, 'helper.js'), 'export const value = 1;');
    assert.throws(() => execFileSync(process.execPath, [join(root, 'src/cli.js'), 'build', site, '-o', join(folder, 'dist2')],
        {stdio: 'pipe'}), error => /The module exports no class Page: .*helper\.js/.test(error.stderr));
    await rm(join(site, 'helper.js'));
    await writeFile(join(site, 'Chi siamo.js'), page('x'));
    await assert.rejects(folderPages(site), /Page file Chi siamo\.js: a page name starts with a lowercase letter/);
});
