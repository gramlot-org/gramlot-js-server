/** The README quick start: the page in test/fixtures/quickstart served by this adapter. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {fileURLToPath} from 'node:url';
import {toTytx} from '@genrojs/tytx';
const {startServer} = await import(globalThis.Bun ? '../src/bun.mjs' : '../src/node.mjs');

const pages = fileURLToPath(new URL('./fixtures/quickstart/', import.meta.url));

test('quick start: the Hello page opens, its Source binds the field and the formula, the page module is served', async () => {
    const app = await startServer({pages});
    try {
        const opened = await fetch(app.url + '/');
        assert.equal(opened.status, 200);
        const html = await opened.text();
        assert.match(html, /<title>Hello<\/title>/);
        const {config, resources} = JSON.parse(html.match(/new PageBootstrap\((.*)\)\.run\(\)/s)[1]);
        assert.deepEqual(resources, {css: ['/index.css'], js: [{url: '/index.js', group: null}]});
        const main = await fetch(app.url + config.rpcUrl, {method: 'POST', headers: {'content-type': 'application/json'},
            body: toTytx({id: 'r1', pageId: config.pageId, contentType: 'source', name: 'main', params: {}})});
        assert.equal(main.status, 200);
        const rows = JSON.parse(JSON.parse(await main.text()).value.replace(/::X$/, '')).rows;
        const byTag = Object.fromEntries(rows.map(([, , tag, value, attributes]) => [tag, {value, attributes}]));
        assert.equal(byTag.div.attributes.datapath, 'person');
        assert.equal(byTag.label.value, 'Name');
        assert.equal(byTag.input.attributes.value, '^.name');
        assert.equal(byTag.input.attributes.live, true);
        assert.equal(byTag.p.value, '^.greeting');
        assert.equal(byTag.dataFormula.attributes.func, 'greeting');
        assert.equal(byTag.dataFormula.attributes.name, '^.name');
        assert.equal(byTag.dataSetter.attributes.value, 'Ada');
        const logic = await fetch(app.url + '/index.js');
        assert.equal(logic.status, 200);
        assert.match(await logic.text(), /export class Logic/);
        assert.equal((await fetch(app.url + '/index.css')).status, 200);
    } finally { await app.close(); }
});
