# 015 · Writing pages for this host

Document ID: **GN-115**. [Expanded version](../docs/015-writing-pages.md).

Binding and lifecycle: the core's [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html).
Here: files, folders, the page logic, what is served.

<a id="gn-115-005"></a>

## 005 · Files and folders

Block ID: **GN-115-005**.

`/` → `index.js` then `index/index.js`; `/shop/orders` → `shop/orders.js` then
`shop/orders/orders.js`; the file wins; `/orders/index.html` → `/orders`,
`/index.html` → `/`. Segments: letters, digits, `_`, `-`; else
404; a real path leaving the folder: 404. The module exports `Page` extending the
core's `Page`, and may export `Logic`; `static title` defaults to `Gramlot`.
Beside the page: `orders.css` (stylesheet), `orders_aux.js` (logic module when
the page module exports no `Logic`),
`orders.md` (README, never served). `_aux` is reserved. Modules are trusted ESM,
cached: a change needs a restart.

<a id="gn-115-010"></a>

## 010 · Stylesheets

Block ID: **GN-115-010**.

`static css = ['/themes/gramlot-base/theme.css', '/site.css', 'print.css', 'https://…']`:
root-relative gets the mount prefix once and is served when below the pages
folder or in `assets`; `/themes/…` comes from the installed core when it has the
file; relative
resolves in the browser; absolute stays. Order: `Page.css`, then `orders.css`;
a repeated URL loads once, last position.

<a id="gn-115-015"></a>

## 015 · Named logic

Block ID: **GN-115-015**.

One logic module: `Logic` of `orders.js`, else `orders_aux.js`; both → error.
Root group: `func: 'add'`. Public, imports resolve in the browser
(`@gramlot/gramlot/page` via the import map); server-only imports → `orders_aux.js`.
`js_requires`/`css_requires` raise `InvalidResourceName` on `GramlotFileServer`; the resource
system comes with genro-kajenn (Genro, the successor of GenroPy).

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

Declare Source fragments with `Page.registerSource` and mount them with `remote`;
use `dataRpc` for endpoint values and `dataRemote` for lazy Data. See the
[shared authoring guide](https://github.com/gramlot-org/gramlot/blob/main/docs/public/095-writing-pages.md#gc-095-100).
The adapter answers them on `POST /gramlot/rpc`, `contentType: 'source'` ([Reference](030-reference.md)).

<a id="gn-115-025"></a>

## 025 · What is served and what is not

Block ID: **GN-115-025**.

`GET`/`HEAD` serve `.css` and `.js` whose real path is below the pages folder
(`text/css`, `text/javascript`): page modules, `_aux.js`, stylesheets. READMEs,
other extensions, escaping symlinks, encoded `..`: 404. `POST` on a companion:
405. Undecodable path: 400. Also: runtime `/assets/gramlot.js` and every file of
`/themes/` from the installed core, files of `assets`. Nothing else ([Deployment](025-deployment.md)).

**Learning path.** Follow the [shared release-by-release example sequence](https://github.com/gramlot-org/gramlot/blob/main/docs/public/025-try.md#gc-025-015) after this
environment's setup. Revisit examples when a later release simplifies the code;
prerequisite links support that chronology. The gallery is a source viewer, not a file editor. Edit a
separate project; Page runs on the host and Logic in the browser (the standalone
host is a JavaScript Worker). Reload/reopen after saving; development reload is
not automatic hot reload. The sequence explains inline and named Logic in their
release context; use named Logic for reusable behavior. Inline examples require the
documented CSP profile. Common examples do not cover every advanced case.
