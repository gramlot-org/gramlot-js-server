import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp, readFile, rm, stat} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildStaticGallery} from '../src/gallery.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = createRequire(import.meta.url).resolve('@gramlot/gramlot-examples/catalog.json');

test('the static gallery: index, one route per example, stylesheets, logic modules and gallery files', async t => {
    const folder = await mkdtemp(join(root, 'tests/.build-'));
    t.after(() => rm(folder, {recursive: true, force: true}));
    const output = join(folder, 'gallery');
    const result = await buildStaticGallery({output});
    const keys = JSON.parse(await readFile(catalog, 'utf8')).families.flatMap(family => family.examples.map(({key}) => key));
    assert.deepEqual(result.routes, ['index', ...keys, 'serverless-01', 'serverless-02'].sort());
    assert.ok((await stat(join(output, 'assets/styles/serverless-02.css'))).isFile());
    const index = await readFile(join(output, 'assets/workers/index.js'), 'utf8');
    for (const text of ['c03/index.html', 'assets/branding/gramlot-logo-dark.svg', 'gallery/dist/gallery.js']) {
        assert.ok(index.includes(text), text);
    }
    const c03 = await readFile(join(output, 'assets/workers/c03.js'), 'utf8');
    assert.ok(c03.includes('"/c03_aux.js":'));
    assert.ok(c03.includes('../gallery/dist/frame.js'));
    assert.match(c03, /countChange/);
    for (const path of ['index.html', 'c03/index.html', 'assets/styles/b08.css', 'themes/gramlot-base/theme.css',
        'gallery/gallery.css', 'gallery/dist/gallery.js', 'gallery/dist/frame.js', 'assets/branding/gramlot-logo-dark.svg']) {
        assert.ok((await stat(join(output, path))).isFile(), path);
    }
    await assert.rejects(stat(join(output, 'gallery/page.js')), {code: 'ENOENT'});
});

test('the command: gallery needs one output; --catalog needs two values', () => {
    const cli = join(root, 'src/cli.js');
    for (const [args, message] of [[['gallery'], /Usage/], [['gallery', 'out', '-o', 'x'], /Usage/],
        [['gallery', 'out', '--catalog', 'catalog.json'], /--catalog needs a catalog\.json and a pages folder/],
        [['build', 'page.js', '-o', 'x.html', '--catalog', 'a', 'b'], /Usage/]]) {
        const run = spawnSync(process.execPath, [cli, ...args], {encoding: 'utf8'});
        assert.equal(run.status, 1, args.join(' '));
        assert.match(run.stderr, message);
    }
});

test('the pages of the serverless catalogue are the README quick start and the page template', async () => {
    const pages = join(root, 'gallery/pages/serverless_pages');
    for (const [page, source] of [['01_quick_start.js', 'examples/quickstart/page.js'],
        ['02_registration.js', '../create/templates/page/index.js'], ['02_registration.css', '../create/templates/page/index.css']]) {
        assert.equal(await readFile(join(pages, page), 'utf8'), await readFile(join(root, source), 'utf8'), page);
    }
});
