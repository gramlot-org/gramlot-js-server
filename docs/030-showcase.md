# 030 · Offline unified showcase

Document ID: **GS-030**.

<a id="gs-030-005"></a>
## 005 · Open the archive

Block ID: **GS-030-005**.

Extract the repository's `showcase.zip` completely, then open
`showcase/index.html`. Preserve the `pages/` and `assets/` directories beside it.
The archive contains the unified `gramlot-poc` showcase shell and eleven lesson
pages, with original Python sources and locally bundled browser dependencies.
A static HTTP server may also serve the extracted directory. It does not provide
RPC endpoints.

The original navigation tree, closable iframe tabs, Source viewer and scoped
Inspector remain. Only the shell catalog's URL strategy and host label change at
export time. Lesson bodies, their Source wrapper and their RPC declaration are
not rewritten. The browser packaging profile substitutes embedded resources for
network-loaded editor/Inspector resources and enables the existing frame channel
for related local file windows, with sender-window checks.

<a id="gs-030-010"></a>
## 010 · Offline boundary

Block ID: **GS-030-010**.

The `dataRpc` lesson remains in the catalog with its original Python source. Its
call fails through the normal error callback with a clear offline-backend message;
there is no fake server calculation. Other lessons use local Data and browser
logic. Data edits last for the lifetime of the open page. This directory export
does not add JSON download/import or saved-session persistence.

This is a development export from the shared PoC. It is separate from the pending
single-file core compiler integration and does not claim accepted core ports.
The optional static server cannot execute Python endpoints.

<a id="gs-030-015"></a>
## 015 · Rebuild and verification

Block ID: **GS-030-015**.

The reproducible exporter and runtime bundler live in `examples/showcase/`.
Use the Python environment and installed JavaScript dependencies of the trusted
`gramlot-poc` checkout. See that directory's README for commands. The archive
contains source hashes and browser dependency notices.

Automated artifact checks verify ZIP integrity, relative local references and
original source hashes. Runtime checks and their exact results are recorded in
`examples/showcase/VERIFICATION.md`. DOM-emulator tests are not real-browser
verification of filesystem security policy. Browser file-origin behavior still
requires testing in the target browser.
