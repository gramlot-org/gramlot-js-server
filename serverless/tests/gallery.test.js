import test from 'node:test';
import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {mkdtemp, readFile, rm, stat} from 'node:fs/promises';
import {createRequire} from 'node:module';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildGallery} from '@gramlot/gramlot-examples';
import {buildStaticGallery} from '../src/gallery.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const catalog = createRequire(import.meta.url).resolve('@gramlot/gramlot-examples/catalog.json');

test('the static gallery: index, one route per example, stylesheets, logic modules and gallery files', async t => {
    const folder = await mkdtemp(join(root, 'tests/.build-'));
    t.after(() => rm(folder, {recursive: true, force: true}));
    const output = join(folder, 'gallery');
    const result = await buildStaticGallery({output});
    const families = JSON.parse(await readFile(catalog, 'utf8')).families;
    const common = buildGallery().routes;
    const url = key => common[key].url;
    assert.deepEqual(result.routes, ['index', ...Object.entries(common).filter(([key]) => key !== 'index').map(([, route]) => route.url), 'pages/serverless_pages/02_registration'].sort());
    await assert.rejects(stat(join(output, 'serverless-01/index.html')), {code: 'ENOENT'});
    assert.ok((await stat(join(output, 'assets/styles/pages/serverless_pages/02_registration.css'))).isFile());
    const manifest = JSON.parse(await readFile(join(output, 'app.webmanifest'), 'utf8'));
    assert.equal(manifest.start_url, './');
    assert.equal(manifest.icons[0].src, './assets/branding/app-icon.png');
    assert.match(await readFile(join(output, 'index.html'), 'utf8'), /rel="manifest"/);
    assert.doesNotMatch(await readFile(join(output, 'pages/08-html_svg/01-html_basics/01-hello_world/index.html'), 'utf8'), /rel="manifest"/);
    assert.ok((await stat(join(output, 'assets/branding/app-icon.png'))).isFile());
    const index = await readFile(join(output, 'assets/workers/index.js'), 'utf8');
    for (const text of ['pages/03-controllers/01-logic/03-named_logic/index.html', 'assets/branding/gramlot-logo-dark.svg', '/index_aux.js']) {
        assert.ok(index.includes(text), text);
    }
    const carousel = await readFile(join(output, 'assets/workers/pages/05-containers/03-stack.js'), 'utf8');
    assert.ok(carousel.includes('../../../pages/05-containers/02-tabs/index.html'), 'nested gallery frames use file routes');
    assert.ok(index.includes('galleryGuidePanel'), 'the guided lesson is bundled');
    const c03 = await readFile(join(output, 'assets/workers/pages/03-controllers/01-logic/03-named_logic.js'), 'utf8');
    assert.ok(c03.includes('"/03-named_logic_aux.js":'));
    assert.ok(c03.includes('../../../../gallery/dist/frame.js'));
    assert.match(c03, /countChange/);
    for (const path of ['index.html', 'pages/03-controllers/01-logic/03-named_logic/index.html', 'assets/styles/pages/02-binding/01-paths_and_updates/04-freeze.css', 'themes/gramlot-base/theme.css',
        'pages/08-html_svg/06-nested/01-child/index.html', 'assets/workers/pages/08-html_svg/06-nested/01-child.js',
        'gallery/gallery.css', 'gallery/dist/gallery.js', 'gallery/dist/frame.js', 'assets/branding/gramlot-logo-dark.svg']) {
        assert.ok((await stat(join(output, path))).isFile(), path);
    }
    assert.match(await readFile(join(output, 'pages/08-html_svg/06-nested/01-child/index.html'), 'utf8'), /src="\.\.\/\.\.\/\.\.\/\.\.\/assets\/standalone.js"/);
    await assert.rejects(stat(join(output, 'gallery/page.js')), {code: 'ENOENT'});
});

test('an example with Logic gets its companion; one without Logic gets none and stays out of the window', async t => {
    const folder = await mkdtemp(join(root, 'tests/.build-'));
    t.after(() => rm(folder, {recursive: true, force: true}));
    const output = join(folder, 'gallery');
    const fixtures = join(root, 'tests/fixtures/gallery');
    const {routes} = await buildStaticGallery({output, catalogs: [[join(fixtures, 'catalog.json'), join(fixtures, 'pages')]]});
    assert.ok(routes.includes('pages/modules/01_without_logic') && routes.includes('pages/modules/02_with_logic'));
    const plain = await readFile(join(output, 'assets/workers/pages/modules/01_without_logic.js'), 'utf8');
    const logic = await readFile(join(output, 'assets/workers/pages/modules/02_with_logic.js'), 'utf8');
    // The page without Logic imports createDecimal, which the core of the window does not export: it is never bundled for the window.
    assert.doesNotMatch(plain, /_aux\.js/);
    assert.match(logic, /"\/02_with_logic_aux\.js":/);
    assert.match(logic, /twice/);
    for (const route of ['pages/modules/01_without_logic', 'pages/modules/02_with_logic']) assert.ok((await stat(join(output, route, 'index.html'))).isFile(), route);
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

test('the registration example remains the page template', async () => {
    const pages = join(root, 'gallery/pages/serverless_pages');
    for (const [page, source] of [['02_registration.js', '../create/templates/page/index.js'], ['02_registration.css', '../create/templates/page/index.css']]) {
        assert.equal(await readFile(join(pages, page), 'utf8'), await readFile(join(root, source), 'utf8'), page);
    }
});
