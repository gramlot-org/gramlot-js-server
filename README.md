# Gramlot Node.js native HTML host

The native 0.1.0 profile exports `startNativeServer` from
`gramlot-js-server/native` for Node and `gramlot-js-server/bun` for Bun. It hosts
trusted JavaScript Gramlot Page modules through the clean core's Host. The
reusable working launchers are in the [Hello World application](https://github.com/gramlot-org/gramlot-examples/tree/main/apps/hello-world):

```sh
cd ../gramlot-examples/apps/hello-world
npm run start:node
# Or, with Bun installed:
bun run start:bun
```

Install the local core, adapter and example npm artifacts with their current
first-party dependency graph before launching; these package names do not yet
imply registry availability. The page imports `Page` from `@gramlot/native-html/page`
and the Node/Bun servers require no Python process or database. See the
[native host guide](docs/010-native-html.md) for API and verification.

## Historical PoC server

The following `npm start` instructions run the older sibling-PoC server. They
are preserved as experimental history and are outside native 0.1.0 compatibility.

Public experimental repository: Node.js builds Gramlot Source and serves the existing
browser runtime. No Express, Python process, database, or npm install is required
to run it. This is not a released or accepted Gramlot server adapter.

Keep this checkout beside `gramlot-poc`, whose prepared browser distribution is
required. From this repository:

```sh
npm start
```

Open http://127.0.0.1:8070. `/` demonstrates a live input, data formula and counter;
`/about` explains the boundary. Both pages include Show source and a fixed
bottom-right Inspector icon; `/health` reports the runtime build.
`PORT` overrides the port. `GRAMLOT_BROWSER_DIR` overrides the absolute path to
`gramlot-poc/src/gramlot/resources/browser`.

```sh
npm test
```

The runtime test additionally requires the laboratory's existing
`js/dom/node_modules/jsdom` installation. No test dependency is needed by the host.

See [architecture and verification](docs/005-node-host.md).


## Shared examples and documentation

Gramlot is the primary source of framework documentation, teaching examples,
runner and theme. This integration is a downstream consumer: it owns hosting
and setup, and must use the shared examples through its Gramlot dependency
without maintaining a copied suite. Node.js and Bun execute the shared JavaScript pages using their respective host adapters.

Read the Gramlot manual first, then this integration's guide. Update the Gramlot
dependency and restart or regenerate exports to receive example changes.
Uniform packaging and launch commands across all integrations are still pending;
this describes the agreed model, not a completed rollout. See
[shared example ownership](docs/010-native-html.md#gn-010-015) for details.
