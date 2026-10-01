import {test} from 'node:test';
import assert from 'node:assert/strict';
import {resolve} from 'node:path';
import {pathToFileURL} from 'node:url';
import {createPages} from '../src/pages.mjs';
import {runtimeDirectory} from '../src/start.mjs';

test('server Source round-trips into the Gramlot runtime with reactive inputs and actions', async () => {
  // Reuse the laboratory's test-only DOM dependency; production has no dependencies.
  const poc = resolve(runtimeDirectory, '../../../..');
  const {JSDOM} = await import(pathToFileURL(resolve(poc, 'js/dom/node_modules/jsdom/lib/api.js')));
  const dom = new JSDOM('<div id="root"></div>', {url:'http://localhost'});
  for (const name of ['window','document','HTMLElement','customElements','Event','CustomEvent']) {
    globalThis[name] = name === 'window' ? dom.window : dom.window[name];
  }
  globalThis.CSS = {escape: value => String(value)};
  const gramlot = await import(pathToFileURL(resolve(runtimeDirectory, 'esm/gramlot-dom.js')));
  const pages = createPages(gramlot, 'const example = 1;');
  const builder = new gramlot.HtmlBuilder('main');
  builder.loadSource(pages['/']().source);
  const host = document.getElementById('root');
  const app = new gramlot.Application(host, builder, {inspector:false});
  try {
    assert.equal(host.querySelector('#greeting').textContent, 'Hello, World!');
    const input = host.querySelector('input');
    input.value = 'Ada';
    input.dispatchEvent(new Event('input', {bubbles:true}));
    assert.equal(host.querySelector('#greeting').textContent, 'Hello, Ada!');
    host.querySelector('#increment').click();
    await new Promise(resolve => setTimeout(resolve, 220));
    host.querySelector('#increment').click();
    assert.equal(host.querySelector('#count').textContent, '2');
    assert.equal(app.data.getItem('main.count'), 2);
    host.querySelector('#show-source').click();
    assert.equal(host.querySelector('.source-panel').hidden, false);
    assert.equal(host.querySelector('pre').textContent, 'const example = 1;');
    host.querySelector('#close-source').click();
    assert.equal(host.querySelector('.source-panel').hidden, true);
    host.querySelector('#nav-about').click();
    assert.equal(host.querySelector('#playground-view').hidden, true);
    assert.equal(host.querySelector('#about-view').hidden, false);
    host.querySelector('#nav-playground').click();
    assert.equal(host.querySelector('#playground-view').hidden, false);
    assert.equal(host.querySelector('#count').textContent, '2');
    assert.equal(host.querySelector('input').value, 'Ada');
    assert.notEqual(pages['/']().source, pages['/about']().source);
  } finally {app.dispose(); dom.window.close();}
});
