# Gramlot Serverless

Serverless is the integration repository for trying Gramlot without a web framework.
It provides the Browser/Worker profile using the shared Gramlot core:

| Profile | Page | Runtime |
| --- | --- | --- |
| Browser / Worker (standalone) | JavaScript `Page` | One HTML file opened from disk |

For standalone Browser/Worker, install `@gramlot/serverless` alongside the Gramlot
JavaScript runtime and build an HTML file:

```sh
npx --no-install gramlot-serverless build node_modules/gramlot-example-app/js/pages/index.js -o build/hello-world.html
```

Open the generated file in the browser. Node is needed to build it, not to open it.
The exporter does not execute the Page at build time. It packages the real Gramlot
Host and runtime with a classic Worker and uses HtmlBuilder for the shell.
For this single-file build, the JS page must use browser-compatible imports and
`Page.css` must be empty.

For several pages and shared assets, the programmatic
[`buildDirectory`](docs/010-usage.md#gs-010-030) export writes a directory that
opens directly from disk. It embeds each bundled Worker in a local bootstrap
script, copies one Gramlot runtime, and copies only assets explicitly listed by
the caller. Its output does not replace an existing directory.

The 0.1.0 core is available as [GitHub release archives](https://github.com/gramlot-org/gramlot/releases/tag/v0.1.0).
These new Serverless package names are development work and are not part of that immutable release.
The repository is named `gramlot-serverless`, locally and on GitHub. Standalone is
the Browser/Worker profile within Serverless. No registry publication is implied.

[Architecture](docs/005-architecture.md) · [Usage](docs/010-usage.md) ·
[Verification](docs/020-verification.md).

`examples/showcase` and `showcase.zip` are historical PoC artifacts, not output from
the current exporter and not evidence for its supported features.


## Shared examples and documentation

Gramlot is the primary source of framework documentation, teaching examples,
runner and theme. This integration is a downstream consumer: it owns hosting
and setup, and must use the shared examples through its Gramlot dependency
without maintaining a copied suite. Serverless packages JavaScript pages for a browser Worker without a server.

Read the Gramlot manual first, then this integration's guide. Update the Gramlot
dependency and restart or regenerate exports to receive example changes.
Uniform packaging and launch commands across all integrations are still pending;
this describes the agreed model, not a completed rollout. See
[shared example ownership](docs/010-usage.md#gs-010-035) for details.


Development ownership: Serverless owns the standalone WorkerHost, WorkerTransport
and startup (export paths, the companion `page_aux.js` and the core `PageBootstrap`).
Shared Host/Page execution and rendering remain in core. This development package
requires core 0.2.0 (`@jsr/genro__gramlot >=0.2.0`), not yet published; unchanged
0.1.x archives are not compatible with this boundary. No release or publication is
implied.
