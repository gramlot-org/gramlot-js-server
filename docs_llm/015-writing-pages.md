# 015 · Writing pages for this host

Document ID: **GN-115**. [Expanded version](../docs/015-writing-pages.md).

Binding and lifecycle: the core's [Data binding and controllers](https://gramlot.readthedocs.io/en/latest/docs/public/097-data-binding.html);
page structure: [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html); the adapter follows the
[server protocol](https://gramlot.readthedocs.io/en/latest/docs/public/101-server-protocol.html). Here: files, folders, the page logic,
what is served.

<a id="gn-115-005"></a>

## 005 · Files and folders

Block ID: **GN-115-005**.

`/` → `index.js` then `index/index.js`; `/shop/orders` → `shop/orders.js` then
`shop/orders/orders.js`; the file wins; `/orders/index.html` → `/orders`,
`/index.html` → `/`. Segments: letters, digits, `_`, `-`; else
404; a real path leaving the folder: 404. The module exports `Page` extending the
core's `Page`, and may export `Logic` (a page without named logic needs none); `static title`
defaults to `Gramlot`.
Beside the page: `orders.css` (stylesheet), `orders_aux.js` (logic module when
the page module exports no `Logic`),
`orders.md` (README, never served). `_aux` is reserved. Modules are trusted ESM,
cached: a change needs a restart.

<a id="gn-115-010"></a>

## 010 · Stylesheets

Block ID: **GN-115-010**.

`static css = ['/themes/gramlot-compact/theme.css', '/site.css', 'print.css', 'https://…']`:
root-relative gets the mount prefix once and is served when below the pages
folder or in `assets`; `/themes/…` comes from the installed core when it has the
file; relative
resolves in the browser; absolute stays. Order: the theme of the page (base theme
`gramlot-base`, no line needed), `Page.css`, then `orders.css`; a repeated URL loads once,
last position. `static css_theme = '<name>'` replaces the base theme, `false` loads none;
the option `cssTheme` of `startServer` sets the base theme of every page
([Themes and CSS](https://gramlot.readthedocs.io/en/latest/docs/public/096-themes-and-css.html)).

<a id="gn-115-015"></a>

## 015 · Named logic

Block ID: **GN-115-015**.

At most one logic module: `Logic` of `orders.js`, else `orders_aux.js`; both → error;
neither → no logic methods. Root group: `func: 'add'`. Public, imports resolve in the browser
(`@gramlot/gramlot/page` via the import map); server-only imports → `orders_aux.js`.
`js_requires`/`css_requires` raise `InvalidResourceName` on `GramlotFileServer`; the resource
system comes with genro-kajenn (Genro, the successor of GenroPy).

```js
export class Logic {
    add(kwargs) { return kwargs.a + kwargs.b; }          // formula
    reset(node, kwargs) { node.SET('.count', 0); }       // controller
}
```

Explicit constructor, a method `page`, a missing name: bootstrap errors; a misspelt
export (`logic`) shows only when a `func` looks for its method. Named
logic runs under the strict CSP; inline code needs the permissive profile
([Configuration](020-configuration.md)).

<a id="gn-115-020"></a>

## 020 · Remote Source

Block ID: **GN-115-020**.

Declare Source fragments with `Page.registerSource` and mount them with `remote`;
use `dataRpc` for endpoint values and `dataRemote` for lazy Data. See [Calling the server](https://github.com/gramlot-org/gramlot/blob/main/docs/public/098-server-calls.md#gc-095-100)
and [Remote content and lazy Data](https://github.com/gramlot-org/gramlot/blob/main/docs/public/099-remote-content.md#gc-095-105).
The adapter answers them on `POST /gramlot/rpc`, `contentType: 'source'` ([Reference](030-reference.md)).
A `dataRemote` with `sync` (default) reads synchronously over HTTP
([Remote content and lazy Data](https://gramlot.readthedocs.io/en/latest/docs/public/099-remote-content.html)).

<a id="gn-115-025"></a>

## 025 · What is served and what is not

Block ID: **GN-115-025**.

`GET`/`HEAD` serve `.css` and `.js` whose real path is below the pages folder
(`text/css`, `text/javascript`): page modules, `_aux.js`, stylesheets. READMEs,
other extensions, escaping symlinks, encoded `..`: 404. Another method on a companion:
405, `Allow: GET, HEAD`. Undecodable path: 400. Also: runtime `/assets/gramlot.js` and every file of
`/themes/` from the installed core, files of `assets`. Nothing else ([Deployment](025-deployment.md)).


<a id="gn-115-030"></a>

## 030 · Initial Data companion

Block ID: **GN-115-030**.

The optional `foo_data.tytx` beside the page supplies a typed initial Data Bag before browser defaults and rendering. No loader declaration is needed in main. Existing dataSetter, default and remote data mechanisms remain available. Invalid files fail loading; missing files leave behavior unchanged. Client edits do not write back to the file. The gallery copies the Data companion beside its staged JavaScript wrapper.
