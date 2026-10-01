# Showcase export verification

Date: 2026-09-17. This is a development preview built from the shared PoC.

## Automated runtime checks

```sh
node test_runtime.mjs /tmp/showcase-directory /path/to/gramlot-poc/js/dom/node_modules
```

Passed: 12 page documents boot using file URLs in JSDOM; locally bundled
CodeMirror renders; bound input, dataFormula and dataController updates work;
checkbox changes false/true reach Data; Inspector opens/closes/reopens and is
released on disposal, with the actual data_root and source_root scopes; the
original RPC lesson displays its normal error callback's explicit offline message.
The frame channel rejects an unrelated Window and accepts the exact parent with
opaque file origin. The checks observed zero network requests.

JSDOM requires test-only TextEncoder/TextDecoder, ResizeObserver and Range/layout
shims. The shell test checks iframe creation without loading its child document,
because JSDOM does not apply beforeParse shims to child frames. All eleven lesson
documents are booted separately. This does not establish real-browser iframe
security-policy compatibility or visual layout. Open the extracted index.html in
the target browser for the remaining manual end-to-end check.

## Artifact checks

```sh
python3 check_archive.py ../../showcase.zip
```

Passed: ZIP CRC/integrity, 12 HTML documents, relative script references, runtime
hash against provenance, no external bundle imports, included dependency notices,
original Python/source hashes, and relative shell navigation. Mirrored GS-030
section IDs were checked. The shared lesson methods and showcase wrappers are
unchanged; only the shell catalog URL strategy and host label change.

No backend was bundled or simulated. No packages were published and no core port
acceptance is implied. Browser adaptations are owned by this explicit development
export; their source snapshots and input hashes accompany the build tooling.
