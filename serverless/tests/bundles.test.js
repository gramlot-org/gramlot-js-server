import test from 'node:test';
import assert from 'node:assert/strict';
import {join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {companion, companionBundle, workerBundle} from '../src/bundles.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const page = join(root, 'tests/fixtures/companion/page.js');
const options = {bundle: true, platform: 'browser', format: 'iife', write: false};

test('the Worker bundle names the companion but never contains it', async () => {
    const aux = await companion(page);
    assert.deepEqual(aux, {file: join(root, 'tests/fixtures/companion/page_aux.js'), url: '/page_aux.js'});
    const worker = await workerBundle(page, aux, options);
    assert.match(worker.text, /aux: "\/page_aux\.js"/);
    assert.doesNotMatch(worker.text, /gramlotSentinel/);
    assert.ok(!Object.keys(worker.metafile.inputs).some(path => path.endsWith('page_aux.js')));
    const module = await companionBundle(aux, options);
    assert.match(module, /gramlotSentinel/);
    assert.match(module, /export \{\s*Logic\s*\}/);
    assert.equal(await companion(join(root, 'examples/hello-world/page.js')), null);
});

test('inline.js is not reachable from the WorkerHost bundle', async () => {
    const {metafile} = await workerBundle(page, await companion(page), options);
    const inputs = Object.keys(metafile.inputs);
    // The core Host entry proves the graph was read from the linked core.
    assert.ok(inputs.some(path => path.endsWith('src/adapters/host.js')));
    assert.ok(inputs.some(path => path.endsWith('src/worker-host.js')));
    assert.deepEqual(inputs.filter(path => /binding\/inline\.js$/.test(path)), []);
});
