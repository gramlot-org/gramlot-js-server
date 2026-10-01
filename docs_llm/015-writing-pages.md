# 015 · Writing pages for this host

Document ID: **GN-115**. [Expanded version](../docs/015-writing-pages.md).

Binding and lifecycle: the core's [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html).
Here: files, folders, companions, what is served.

<a id="gn-115-005"></a>

## 005 · Files and folders

Block ID: **GN-115-005**.

`/` → `index.js` then `index/index.js`; `/shop/orders` → `shop/orders.js` then
`shop/orders/orders.js`; the file wins. Segments: letters, digits, `_`, `-`; else
404; a real path leaving the folder: 404. The module exports `Page` extending the
core's `Page`; `static title` defaults to `Gramlot`. Beside the page:
`orders.css` (stylesheet), `orders_aux.js` (companion exporting `Logic`),
`orders.md` (README, never served). `_aux` is reserved. Modules are trusted ESM,
cached: a change needs a restart.

<a id="gn-115-010"></a>

## 010 · Stylesheets

Block ID: **GN-115-010**.

`static css = ['/themes/base.css', 'print.css', 'https://…']`: root-relative gets
the mount prefix once and is served only when below the pages folder; relative
resolves in the browser; absolute stays. Order: `Page.css`, then `orders.css`;
a repeated URL loads once, last position.

<a id="gn-115-015"></a>

## 015 · Named logic

Block ID: **GN-115-015**.

The companion is the root group: `func: 'add'`. `js_requires`/`css_requires`
raise `InvalidResourceName` on `FileHost`.

```js
export class Logic {
    add(kwargs) { return kwargs.a + kwargs.b; }          // formula
    reset(node, kwargs) { node.SET('.count', 0); }       // controller
}
```

Explicit constructor, a method `page`, a missing name: bootstrap errors. Named
logic runs under the strict CSP; inline code needs the permissive profile
([Configuration](020-configuration.md)).

<a id="gn-115-020"></a>

## 020 · Remote Source

Block ID: **GN-115-020**.

`source(Page.prototype.details)` marks a remote method; named logic calls
`this.page.remoteSource(targetNode, 'details', params)` → `POST /gramlot/source`
`{pageId, method, params}`. `main`, unmarked or missing: 404 `Unknown Source
method`. Example: core `examples/controllers/08_remote_source`.

<a id="gn-115-025"></a>

## 025 · What is served and what is not

Block ID: **GN-115-025**.

`GET`/`HEAD` serve `.css` and `_aux.js` whose real path is below the pages
folder (`text/css`, `text/javascript`). Page modules, READMEs, other extensions,
escaping symlinks, encoded `..`: 404. `POST` on a companion: 405. Undecodable
path: 400. The runtime at `/assets/gramlot.js` is served from the linked core.
Nothing else ([Deployment](025-deployment.md)).
