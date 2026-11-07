import test from 'node:test';
import assert from 'node:assert/strict';
import {embedCollectionAssets} from '../src/collection-assets.js';

const bytes = Buffer.from('License: café\n');
const content = new Map([['assets/files/license.txt', bytes]]);
test('verified module-relative assets survive opaque module URLs with their bytes and MIME type', async () => {
    const source = "export const license = new URL('../files/license.txt', import.meta.url);";
    const code = embedCollectionAssets(source, 'assets/modules/library.js', content);
    const {license} = await import('data:text/javascript;base64,' + Buffer.from(code).toString('base64'));
    assert.ok(license instanceof URL);
    const response = await fetch(license);
    assert.equal(response.headers.get('content-type'), 'text/plain');
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
});
test('strings and comments are not resource declarations', () => {
    const source = `// new URL('../files/missing.txt', import.meta.url)\nexport const text = "new URL('../files/missing.txt', import.meta.url)";`;
    assert.equal(embedCollectionAssets(source, 'assets/index.js', content), source);
});
test('undeclared, escaping and dynamic resource paths are rejected', () => {
    for (const value of ["'./missing.txt'", "'../../outside.txt'"]) {
        assert.throws(() => embedCollectionAssets(`new URL(${value}, import.meta.url)`, 'assets/index.js', content), /Unverified collection asset/);
    }
    assert.throws(() => embedCollectionAssets('new URL(path, import.meta.url)', 'assets/index.js', content), /literal path/);
});
