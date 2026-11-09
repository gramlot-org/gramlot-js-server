/** Exports carry the collections of the page graph only (gramlot-org/gramlot#84). */
import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, writeFile, readFile, readdir, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import typst from '@gramlot/gramlot/collections/typst';
import {build} from '../src/build.js';
import {buildDirectory} from '../src/build-directory.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const typstRoot = typst.module.slice(0, -'assets/index.js'.length);

async function pages(t) {
    const folder = await mkdtemp(join(root, 'tests/.declared-'));
    t.after(() => rm(folder, {recursive: true, force: true}));
    const plain = join(folder, 'plain.js'), declared = join(folder, 'typst.js');
    await writeFile(plain, `import {Page as BasePage} from '@gramlot/gramlot/page';
export class Page extends BasePage { main(root) { root.h1('Plain'); } }`);
    await writeFile(declared, `import {Page as BasePage} from '@gramlot/gramlot/page';
import typst from '@gramlot/gramlot/collections/typst';
export class Page extends BasePage {
    static gramlots = [typst];
    main(root) { root.typstPreview({value: '^source'}); }
}`);
    return {folder, plain, declared};
}

test('a single-file export carries typst only when the page declares it', async t => {
    const {folder, plain, declared} = await pages(t);
    await build({page: plain, output: join(folder, 'plain.html')});
    await build({page: declared, output: join(folder, 'typst.html')});
    // The exported collection bundles are keyed by module URL; the descriptor itself may appear in the Worker.
    const key = JSON.stringify(typst.module) + ':';
    assert.ok(!(await readFile(join(folder, 'plain.html'), 'utf8')).includes(key));
    assert.ok((await readFile(join(folder, 'typst.html'), 'utf8')).includes(key));
});

test('a directory export copies typst only when a page declares it; the window runtime has no xmldom', async t => {
    const {folder, plain, declared} = await pages(t);
    const ordinary = join(folder, 'ordinary'), withTypst = join(folder, 'with-typst');
    await buildDirectory({pages: {index: plain}, output: ordinary});
    await buildDirectory({pages: {index: plain, typst: declared}, output: withTypst});
    assert.ok(!(await readdir(join(ordinary, 'gramlot/collections'))).includes('typst'));
    assert.ok((await readdir(join(withTypst, typstRoot.slice(1)))).includes('assets'));
    // @xmldom/xmldom: the window parses XML with its DOMParser, the Worker keeps the package.
    const marker = 'INUSE_ATTRIBUTE_ERR';
    assert.ok(!(await readFile(join(ordinary, 'assets/standalone.js'), 'utf8')).includes(marker));
    assert.ok((await readFile(join(ordinary, 'assets/workers/index.js'), 'utf8')).includes(marker));
});
