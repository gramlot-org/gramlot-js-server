import {test} from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {buildServer, runtimeDirectory} from '../src/start.mjs';
import {pathToFileURL} from 'node:url';
import {resolve} from 'node:path';

test('HTTP pages transport real Source and expose only declared runtime files', async () => {
  const server = await buildServer();
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const base = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(base);
    assert.equal(response.status, 200);
    const html = await response.text();
    const {source} = JSON.parse(html.match(/id="startup" type="application\/json">(.*?)<\/script>/s)[1]);
    const {Bag} = await import(pathToFileURL(resolve(runtimeDirectory, 'esm/genro-bag-js.js')));
    const bag = Bag.fromTytx(source);
    assert.ok(bag.getNodes().length > 3);
    assert.match(source, /dataFormula/);
    assert.equal((await fetch(base + '/about')).status, 200);
    assert.equal((await fetch(base + '/missing')).status, 404);
    assert.equal((await fetch(base, {method:'POST'})).status, 405);
    assert.equal(await (await fetch(base, {method:'HEAD'})).text(), '');
    const health = await (await fetch(base + '/health')).json();
    assert.equal(health.database, false);
    const prefix = '/runtime/' + health.runtimeBuild + '/';
    const module = await fetch(base + prefix + 'esm/gramlot-dom.js');
    assert.equal(module.status, 200);
    assert.match(module.headers.get('content-type'), /javascript/);
    for (const path of ['.git/config', '../manifest.json', '%2e%2e%2fmanifest.json']) {
      assert.equal((await fetch(base + prefix + path)).status, 404);
    }
    assert.equal((await fetch(base + prefix + '%ZZ')).status, 400);
  } finally {
    server.closeAllConnections();
    await new Promise(resolve => server.close(resolve));
  }
});
