# Unified showcase directory export

Extract the repository-root `showcase.zip` and open `showcase/index.html`.
The folder includes the real PoC shell and lesson classes, local browser assets,
Python source and provenance. No server installation is needed for local lessons.
The RPC lesson deliberately reports that an offline backend is unavailable.

## Rebuild

Use a trusted `gramlot-poc` checkout with its Python and JavaScript dependencies
installed. Run from this directory, replacing `/path/to/gramlot-poc`:

```sh
node build_runtime.mjs /path/to/gramlot-poc /tmp/showcase-assets/runtime.js
PYTHONPATH=/path/to/gramlot-poc/src /path/to/gramlot-poc/.venv/bin/python build_showcase.py \
  --poc /path/to/gramlot-poc --assets /tmp/showcase-assets \
  --directory /tmp/showcase-directory --zip ../../showcase.zip
python3 check_archive.py ../../showcase.zip
node test_runtime.mjs /tmp/showcase-directory /path/to/gramlot-poc/js/dom/node_modules
```

The export directory should be new or empty to avoid including stale files.
The exporter does not alter shared lesson bodies. It changes the shell catalog's
URL strategy to relative `pages/{id}.html` and its host label. Browser adaptations
are reusable resource-loading/frame-channel internals, kept with this development
export and recorded by the bundler, not application-local UI implementations.
They are not accepted core APIs or a general-purpose static export contract.

See `VERIFICATION.md` for checks and limitations. The generic single-file CLI is a
separate workstream; this explicit showcase exporter uses the living PoC package.
