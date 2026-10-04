# 110 · Tutorial

Document ID: **GS-110**.

[Paired view](../docs_llm/110-tutorial.md).

Every step below is run by `serverless/tests/quickstart.test.js` and by
`serverless/scripts/verify_quickstart_browser.mjs` in headless Chromium; the files are in
`serverless/examples/quickstart/`. For a new project of your own, start from
[No server: a tutorial](135-serverless-tutorial.md) and `npm create @gramlot`.

<a id="gs-110-005"></a>

## 005 · Folder layout

Block ID: **GS-110-005**.

Clone the repository and install the released core from the registry:

```sh
git clone https://github.com/gramlot-org/gramlot-js-server.git
cd gramlot-js-server
npm install
cd serverless
```

A page is one JavaScript module that exports `Page` and `Logic`. The tutorial uses
`serverless/examples/quickstart/`:

```text
examples/quickstart/
├── page.js          the Page and its Logic
├── styled.js        the same page with a stylesheet
├── theme.css        the stylesheet
└── export.mjs       the directory export script
```

<a id="gs-110-010"></a>

## 010 · The page

Block ID: **GS-110-010**.

`page.js` is the example of [The Gramlot family](https://gramlot.readthedocs.io/en/latest/docs/public/055-family.html)
in JavaScript. Data-elements take one object; the greeting is a method of the
class `Logic` exported by the same module:

```javascript
import {Page as BasePage} from '@gramlot/gramlot/page';

export class Page extends BasePage {
    static title = 'Hello';

    main(root) {
        const pane = root.div({datapath: 'person'});
        pane.html_label('Name', {for: 'name'});
        pane.input({id: 'name', value: '^.name', live: true});
        pane.p('^.greeting', {id: 'greeting'});
        pane.dataFormula({result_path: '.greeting', func: 'greeting', name: '^.name', _init: true});
        pane.dataSetter({destination_path: '.name', value: 'Ada'});
    }
}

export class Logic {
    greeting(kwargs) { return `Hello, ${kwargs.name}`; }
}
```

`value: '^.name'` binds the field to `person.name`; `live: true` writes at every
keystroke. The paragraph follows `person.greeting`, which the formula computes
from `name`. The setter gives `Ada` as the initial value.

<a id="gs-110-015"></a>

## 015 · The Logic

Block ID: **GS-110-015**.

`func: 'greeting'` in the page names the method `greeting` of `Logic`; a formula
method receives the resolved parameters and returns the value. `main` runs in the
Worker; `Logic` runs in the window. The exporter takes the `Logic` export of the
page module; a module `page_aux.js` beside `page.js` that exports `Logic` is still
admitted, and both at once are an error. For a short computation, inline code in
the page (`formula: 'a * 2'`) runs as well ([Configuration](120-configuration.md)).

<a id="gs-110-020"></a>

## 020 · Build one file and open it

Block ID: **GS-110-020**.

```sh
node src/cli.js build examples/quickstart/page.js -o build/hello.html
```

Output of the run on 2026-10-04:

```text
Built /…/gramlot-js-server/serverless/build/hello.html: 1810845 bytes, sha256 60ed0801…
```

Open `build/hello.html` in the browser (double-click, or `file://…/build/hello.html`).
The page shows a field with `Ada` and the text `Hello, Ada`. Typing `Grace` in the
field changes the text to `Hello, Grace` at every keystroke. The browser makes no
network request: the file is complete. In a project that installs the package,
the command is `npx gramlot-serverless build page.js -o hello.html`.

<a id="gs-110-025"></a>

## 025 · Add a stylesheet

Block ID: **GS-110-025**.

`styled.js` reuses the page and declares `Page.css` with a root-relative URL; it
exports the `Logic` of `page.js` again, because the logic is the export of the
page module:

```javascript
// styled.js
import {Page as Hello} from './page.js';
export {Logic} from './page.js';
export class Page extends Hello {
    static css = ['/theme.css'];
}
```

**One file.** `node src/cli.js build examples/quickstart/styled.js -o build/styled.html`
reads `theme.css` from the folder of the page and writes it into the file as a
`<style>` element.

**A directory.** `export.mjs` calls `buildDirectory` with the page and the asset
to copy:

```javascript
import {resolve} from 'node:path';
import {buildDirectory} from '../../src/build-directory.js';

const output = resolve(process.argv[2] ?? 'build/site');
const here = import.meta.dirname;
const result = await buildDirectory({
    pages: {index: resolve(here, 'styled.js')},
    output,
    assets: [{source: resolve(here, 'theme.css'), target: 'theme.css'}],
});
console.log(`Exported ${result.routes.join(', ')} to ${result.output}`);
```

```sh
node examples/quickstart/export.mjs build/site
```

Output of the run, and the directory it writes:

```text
Exported index to /…/gramlot-js-server/serverless/build/site
build/site/
├── index.html
├── theme.css
└── assets/
    ├── standalone.js
    ├── runtime-notices.json
    └── workers/index.js
```

Open `build/site/index.html`. The greeting is now navy and larger: `/theme.css`
was resolved inside the exported directory. A second run replaces the directory
it wrote; any other existing path is refused. For a folder of pages, the command
`gramlot-serverless build pages -o dist` does the same without a script
([Writing pages for this host](115-writing-pages.md)).

<a id="gs-110-030"></a>

## 030 · What to read next

Block ID: **GS-110-030**.

- [No server: a tutorial](135-serverless-tutorial.md): a project of your own with
  `npm create @gramlot`, a form, a site, and how the data leave the browser.
- [Writing pages for this host](115-writing-pages.md): layout, logic,
  `Page.css`, Source methods, what the bundle accepts.
- [Configuration](120-configuration.md): every option of `build`, `buildDirectory`
  and `mount`, and the Content Security Policy of the export.
- The core guide [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html)
  for pointers, setters, formulas, controllers and events.
