# 140 · Troubleshooting

Document ID: **GS-140**.

[Paired view](../docs_llm/140-troubleshooting.md).

Start errors appear in the browser console: the exported document logs the
rejection of `mount`, then disposes the Worker. Build errors are printed by the
command as `gramlot-serverless: <message>`.

<a id="gs-140-005"></a>

## 005 · The page does not start

Block ID: **GS-140-005**.

| Message | Cause | Fix |
| --- | --- | --- |
| `Page modules must export a subclass of Page` | The module exports no `Page`, or its `Page` extends a second copy of the core: the page imports the core under another name (`@genro/gramlot`, or the former core name `@gramlot/native-html`) than the exporter (`@gramlot/gramlot`), or two installations are linked | Import `@gramlot/gramlot/page` in the page; keep one core installation in `node_modules` |
| `Standalone module not provided: /<name>_aux.js` | A custom shell called `mount` without the companion in `modules` | Pass `modules: {'/<name>_aux.js': url}`; the exported documents do this themselves |
| `/<name>_aux.js: import failed: <reason>` | The companion throws at import, or has no valid `Logic` class | Fix the companion; it must `export class Logic` with plain methods |
| `Standalone Page.css must be an array of strings` | `static css` is not an array of strings | Declare `static css = ['/theme.css']` or leave it out |
| `Standalone CSS with assetRoot must be root-relative without traversal`, `Standalone CSS must remain under assetRoot` | A directory export with a relative, protocol-relative or `..` stylesheet URL | Use `/path/inside/export.css` and list the file in `assets` |
| Nothing happens, the console shows a `script-src` violation | The file was edited after the build: the hash in the policy no longer matches the script | Rebuild; never edit the exported script |

<a id="gs-140-010"></a>

## 010 · Inline code refused

Block ID: **GS-140-010**.

The single file runs the inline code (`formula`, `script`, `==`, `action`,
`connect_on<event>`, `_if`/`_else`) of the Source its Worker builds. The core
refuses these cases, naming the node and the attribute:

| Message | Cause | Fix |
| --- | --- | --- |
| `inline code runs only as received with the Source (main or a remote Source); a text written later is not run: use named logic` | Page code changed a code attribute after the start, or inserted a node with inline code in the live Source | Write the code in `main` or in a Source method, or move it to a method of `<name>_aux.js` named with `func` |
| `'<attribute>' is inline code and cannot be the pointer '<pointer>'; inline code is never read from Data` | A code attribute holds `^path` or `=path` | Pass the data as a parameter (`a='^.a'`) and write the code as text |
| `'<attribute>' has the form of a native event handler, run by the browser outside Gramlot; write connect_<attribute> for an event, or rename the attribute` | An attribute such as `onclick` | Use `connect_onclick` |
| `'<attribute>' holds a javascript: URL, run by the browser as code; write connect_onclick or the action of a button instead` | `href`, `src`, `formaction` or `xlink:href` starts with `javascript:` | Use `connect_onclick` or a button `action` |

A file built with gramlot-js-server 0.2.2 has no `'unsafe-eval'`: its inline code
fails with `EvalError: … inline code blocked by the Content Security Policy of the
page (no 'unsafe-eval') …`. Rebuild it with 0.2.3. The directory export carries no
policy of its own.

<a id="gs-140-015"></a>

## 015 · Source methods

Block ID: **GS-140-015**.

| Message | Cause | Fix |
| --- | --- | --- |
| `Unknown Source method` | `remoteSource` called with `main`, with a non-string, or with a method not marked by `source(...)` | Mark the method: `source(Page.prototype.details)` |
| `Unknown, expired or unowned page` | The page registered in the Worker expired (core default 1800 s), or the page ID is wrong | Reload the file; the exporter uses the core defaults |
| `DataCloneError` | `params` contains a value that structured cloning refuses (a function, a DOM node) | Pass plain data |
| `Worker transport is disposed` | The instance was disposed, or the Worker crashed (`Worker communication failed`) | Reload; look for the earlier error in the console |

<a id="gs-140-020"></a>

## 020 · Build errors

Block ID: **GS-140-020**.

| Message | Cause | Fix |
| --- | --- | --- |
| `Standalone pages must be JavaScript (.js or .mjs)` | A `.py` or other file was passed | Python pages belong to `gramlot-uvicorn` |
| `A *_aux file is a page companion, not a page: <path>` | The companion was passed as the page | Pass `<name>.js` |
| `Output must be an HTML file` | `-o` without `.html`/`.htm` | Name the output `.html` |
| esbuild `Could not resolve "node:fs"` (or another Node module) | The page or an import needs Node | Keep page imports browser-compatible; the previous output is untouched |
| `Output directory already exists: <path>` | `buildDirectory` never replaces a directory | Remove or rename it first |
| `All Pages must resolve the same Gramlot core installation`, `Pages and @gramlot/gramlot-serverless must resolve the same Gramlot core installation` | Pages in different folders resolve different `node_modules`, or the core is linked twice | One `node_modules` with one `@gramlot/gramlot` for the pages and the exporter |
| `Invalid asset target`, `Asset target conflicts with generated output` | A target with `/` first, `.`/`..`, forbidden characters, or under `assets/workers/` or over a generated file | Use a relative target such as `themes/base/theme.css` |
