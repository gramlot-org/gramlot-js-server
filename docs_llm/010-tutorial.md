# 010 · Tutorial

Document ID: **GN-110**. [Expanded version](../docs/010-tutorial.md).

The README quick start step by step; run with Node.js, verified in Chromium,
executed by `server/test/quickstart.test.mjs` in CI. `npm create @gramlot site
my-site` writes the same layout with `npm start` and `npm run start:bun`.

<a id="gn-110-005"></a>

## 005 · Folder layout

Block ID: **GN-110-005**.

Install the core and the adapter from npm.

```sh
mkdir hello && cd hello
printf '{"name":"hello","private":true,"type":"module"}\n' > package.json
npm install @gramlot/gramlot @gramlot/gramlot-js-server
mkdir pages
```

`pages/index.js` (Page and Logic), `pages/index.css`, `serve.mjs`.

<a id="gn-110-010"></a>

## 010 · The page file

Block ID: **GN-110-010**.

```js
import {Page as BasePage} from '@gramlot/gramlot/page';

export class Page extends BasePage {
    static title = 'Hello';

    main(root) {
        const pane = root.div({datapath: 'person'});
        pane.html_label('Name', {for: 'name'});
        pane.input({id: 'name', value: '^.name', live: true});
        pane.p('^.greeting');
        pane.dataFormula({result_path: '.greeting', func: 'greeting', name: '^.name', _init: true});
        pane.dataSetter({destination_path: '.name', value: 'Ada'});
    }
}

export class Logic {
    greeting(kwargs) { return 'Hello, ' + kwargs.name; }
}
```

`^.name` binds both ways under `person`; `live: true` writes per keystroke;
`dataFormula` calls the named method `greeting`, `_init` once before the DOM;
`dataSetter` sets `Ada`. Details: [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html).

<a id="gn-110-015"></a>

## 015 · The Logic of the page

Block ID: **GN-110-015**.

`Logic` runs in the browser, `main` on the server. The browser imports the page
module for its `Logic`: public, imports must resolve in the browser
(`@gramlot/gramlot/page` through the import map). `index_aux.js` still admitted;
both → error.

<a id="gn-110-020"></a>

## 020 · The page stylesheet

Block ID: **GN-110-020**.

`pages/index.css` is served with the page by name:

```css
body { font-family: sans-serif; margin: 2rem; }
```

Shared: `static css = ['/site.css']` below `pages/`; core theme
`/themes/gramlot-base/theme.css`, served from the installed core.

<a id="gn-110-025"></a>

## 025 · Running it

Block ID: **GN-110-025**.

```js
import {fileURLToPath} from 'node:url';
import {startServer} from '@gramlot/gramlot-js-server/node';

const app = await startServer({pages: fileURLToPath(new URL('./pages/', import.meta.url)), port: 8080});
console.log(app.url);
```

`node serve.mjs` prints `http://127.0.0.1:8080`; Bun: import from
`@gramlot/gramlot-js-server/bun`, `bun serve.mjs`. `curl -s http://127.0.0.1:8080/` shows
`"resources":{"css":["/index.css"],"js":[{"url":"/index.js","group":null}]}`.

<a id="gn-110-030"></a>

## 030 · What changes when typing

Block ID: **GN-110-030**.

The page shows `Name`, a field with `Ada` and `Hello, Ada` in sans-serif. Typing
`Grace` gives `Hello, Grace` at every keystroke: field → `person.name` → formula
→ `person.greeting` → paragraph. Verified 2026-10-04, Playwright Chromium 153,
Node and Bun, no console errors.

**Learning path.** Follow the [shared release-by-release example sequence](https://github.com/gramlot-org/gramlot/blob/main/docs/public/025-try.md#gc-025-015) after this
environment's setup. Revisit examples when a later release simplifies the code;
prerequisite links support that chronology. The gallery is a source viewer, not a file editor. Edit a
separate project; Page runs on the host and Logic in the browser (the standalone
host is a JavaScript Worker). Reload/reopen after saving; development reload is
not automatic hot reload. The sequence explains inline and named Logic in their
release context; use named Logic for reusable behavior. Inline examples require the
documented CSP profile. Common examples do not cover every advanced case.

<a id="gn-110-035"></a>

## 035 · Update packaged galleries and exports

Block ID: **GN-110-035**.

Stop the gallery. In the consumer project containing the `package.json` and
`node_modules` used to run it, update core, examples and host together:

```sh
npm install --package-lock=false --save-prefix='>=' @gramlot/gramlot@latest @gramlot/gramlot-examples@latest @gramlot/gramlot-js-server@latest
npm ls @gramlot/gramlot @gramlot/gramlot-examples @gramlot/gramlot-js-server --all
node --input-type=module -e "console.log(import.meta.resolve('@gramlot/gramlot/page')); console.log(import.meta.resolve('@gramlot/gramlot-examples'));"
npx gramlot node gallery --port 8080
```

Use `bun` instead of `node` for the Bun host and retain your previous port/mount
options. `npm ls` should report no invalid dependencies. `deduped` is normal;
local links pointing at different core copies need the checkout procedure below.

For a **serverless gallery**, use this package set in its build project:

```sh
npm install --package-lock=false --save-prefix='>=' @gramlot/gramlot@latest @gramlot/gramlot-examples@latest @gramlot/gramlot-serverless@latest
npm ls @gramlot/gramlot @gramlot/gramlot-examples @gramlot/gramlot-serverless --all
npx gramlot-serverless gallery gallery-updated
```

Choose a new output directory and open `gallery-updated/index.html`. Updating npm
packages does not modify an old exported folder or ZIP. Distribute the complete
new folder. For an installed app pointing at a hosted export, replace the served
export through the site's normal deployment procedure, then reopen the app.

These commands explicitly request the registry's latest packages and save minimum
requirements without upper bounds. `--package-lock=false` ignores an existing
package lock for this installation and does not write one; do not later replay a
stale lock with `npm ci`. Review any application lock/constraint policy that would
freeze first-party packages. See [npm install](https://docs.npmjs.com/cli/v11/commands/npm-install/).
A plain `npm install` or rerunning `npx gramlot` is not proof of an update.

Published packages already contain their browser bundles. **Do not run a source
build in a registry consumer.** If you use local links or repository checkouts,
follow the [source update procedure](https://github.com/gramlot-org/gramlot-examples/blob/main/docs/010-gallery.md#ge-010-050),
which rebuilds the inspector/gallery and keeps the server and examples on the
same physical core package. Then run the
[browser checklist](https://github.com/gramlot-org/gramlot/blob/main/docs/public/018-quickstart.md#gc-018-025).


<a id="gn-110-040"></a>
## 040 · Hosted gallery download

Block ID: **GN-110-040**.

Hosted Python and Node galleries can display a footer link to a serverless ZIP.
Pass `--serverless-download /downloads/gramlot-gallery-serverless.zip` to
`gramlot uvicorn gallery` or `gramlot node gallery`. The deployment serves that
static file; the gallery does not generate an archive per request. Omit the option
when no archive is available. Custom gallery subclasses use
`serverless_download_url` (Python) or `serverlessDownloadUrl` (JavaScript).

Build the archive with `gramlot-serverless gallery OUTPUT`, include the complete
output directory, and tell users to unzip it and open `index.html`. Both hosted
galleries may serve the same artifact: Python server execution is not embedded in
the download; the serverless gallery uses the JavaScript equivalents and browser
Workers. Its named endpoints execute locally, without a Python or Node server.
