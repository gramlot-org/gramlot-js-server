# 015 · Writing pages for this host

Document ID: **GN-115**. [Concise mirror](../docs_llm/015-writing-pages.md).

The binding, the data elements and the lifecycle are the core's and are described
in [Writing pages](https://gramlot.readthedocs.io/en/latest/docs/public/095-writing-pages.html).
This guide covers what depends on this host: files, folders, the page logic and
what is served.

<a id="gn-115-005"></a>

## 005 · Files and folders

Block ID: **GN-115-005**.

The adapter serves one pages folder through the core's `FileHost`. The page
path of a request maps to a file:

| Request path | Page file | Then |
| --- | --- | --- |
| `/` | `index.js` | `index/index.js` |
| `/orders` | `orders.js` | `orders/orders.js` |
| `/shop/orders` | `shop/orders.js` | `shop/orders/orders.js` |

The file page wins when both exist. As on a static host, `/orders/index.html`
opens the page `/orders` and `/index.html` the page `/`. Path segments contain
letters, digits, `_` and `-`; any other character answers 404. A path whose real location leaves the
pages folder answers 404. A page module exports a class `Page` that extends the
core's `Page`; `static title` is the document title (default `Gramlot`). The
module may also export a class `Logic`, the page logic (section 015).

Beside the page file, files that share its name:

- `orders.css`: the page stylesheet, loaded after the `Page.css` URLs;
- `orders_aux.js`: a separate logic module exporting `Logic`, for a page module
  that does not export it;
- `orders.md`: the README, never served.

The `_aux` suffix is reserved: `orders_aux.js` is never a page and no page is
called `*_aux`. Modules are trusted ESM application files, imported by the server
process; the runtime module cache applies, so a changed page needs a restart.

<a id="gn-115-010"></a>

## 010 · Stylesheets

Block ID: **GN-115-010**.

`static css` is a list of URLs written as in `<link href>`:

```js
static css = ['/themes/gramlot-base/theme.css', '/site.css', 'print.css', 'https://cdn.example/font.css'];
```

- A root-relative URL (`/site.css`) receives the mount prefix once. The adapter
  serves it when the file is below the pages folder or listed in `assets`;
  otherwise it is an application asset served by the front server.
- `/themes/<name>/<file>` is a file of the core themes: the adapter serves it
  from the installed core, as the runtime, with the media type of its extension.
  A `/themes/` path that the core does not have goes on to the assets and the
  pages folder.
- A relative URL (`print.css`) resolves against the page document in the browser.
- An absolute URL stays as written.

Load order: the `Page.css` URLs as written, then `orders.css`. A URL repeated
loads once, in its last position.

<a id="gn-115-015"></a>

## 015 · Named logic

Block ID: **GN-115-015**.

On this host a page has one logic module: the `Logic` export of the page module
`orders.js`, else `orders_aux.js`; both at once raise an error when the page
opens. Its methods form the root group: `func: 'add'`. `static js_requires` and
`static css_requires` need a Host with a resource system; on `FileHost` a name in
either field raises `InvalidResourceName` when the page opens.

```js
export class Logic {
    add(kwargs) { return kwargs.a + kwargs.b; }          // formula: returns the value
    reset(node, kwargs) { node.SET('.count', 0); }       // controller: writes the Data
}
```

The browser imports the logic module, so it is public and its imports resolve in
the browser: `@gramlot/gramlot/page` resolves to the runtime through the import map
of the bootstrap. A page module with server-only imports keeps its logic in
`orders_aux.js`.

A `Logic` class with an explicit constructor, a method named `page`, or a missing
method name is an error reported by the bootstrap. Named logic runs under the
strict Content Security Policy profile; inline code (`formula`, `script`, `==`,
`action`, `connect_on<event>`, `_if`/`_else`) needs the permissive profile
([Configuration](020-configuration.md)).

<a id="gn-115-020"></a>

## 020 · Remote Source

Block ID: **GN-115-020**.

A page method marked with `source` is a remote Source method. The browser asks for
it from named logic with `this.page.remoteSource(targetNode, 'details', params)`;
the adapter posts `{pageId, method, params}` to `/gramlot/source` and the Host runs
the method on a new Page instance.

```js
import {Page as BasePage, source} from '@gramlot/gramlot/page';

export class Page extends BasePage {
    main(root) { root.section({node_id: 'details'}); }
    details(root, {topic = 'binding'} = {}) { root.p(topic); }
}
source(Page.prototype.details);
```

`main` cannot be requested as a remote method; an unmarked or missing method
answers 404 `Unknown Source method`. The core example
`examples/controllers/08_remote_source` shows the complete pattern.

<a id="gn-115-025"></a>

## 025 · What is served and what is not

Block ID: **GN-115-025**.

The companion rule of the adapters: `GET` and `HEAD` serve a `.css` or `.js`
file whose real path is below the pages folder, with `Content-Type` `text/css`
or `text/javascript`: the page modules, whose `Logic` the browser imports, the
`_aux.js` modules and the stylesheets. Everything else answers 404: READMEs, any
other extension, a symlink that leaves the folder, an encoded `..`. `POST` on a
companion answers 405. A path that does not decode answers 400. Every `.js` file
of the pages folder is public, as the page logic is.

The adapter also serves, with `GET` and `HEAD`, the runtime at
`/assets/gramlot.js` and every file of the core themes under `/themes/`, both from
the installed core, and the files of the option `assets`
([Configuration](020-configuration.md)). Nothing else is served: other
application assets belong to a front server or to the application
([Deployment](025-deployment.md)).
