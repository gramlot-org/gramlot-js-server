# Contributing

## Setup

```sh
npm install --no-save ../gramlot/js    # core checkout beside this repository
python3 -m venv .venv && .venv/bin/pip install -r requirements-docs.txt   # documentation only
```

`@gramlot/native-html` is the core `js/` package and is not published on any
registry; the local link is the only install path.

## Checks before a commit

```sh
npm run test:native                                       # Node contract and quick-start tests
bun test test/native.test.mjs test/quickstart.test.mjs    # the same on Bun
npm run test:coverage                 # Node tests with lcov in coverage/
.venv/bin/python scripts/check_docs.py   # when documentation changes
```

`npm test` also runs the historical PoC tests, which need the sibling
`gramlot-poc` checkout.

## Commits and branches

- New work on `develop`; `main` holds verified, owner-accepted work.
- Messages: imperative subject in English, present tense.
- Use `git switch`, never `git checkout`. Never force-push a pushed branch:
  fixes land as new commits.
- No AI, LLM or assistant references in commits, pull requests, code, comments
  or documents; no assistant `Co-Authored-By` trailers; no `Generated with …`
  lines.
- Pair `docs/` and `docs_llm/` guides: namespace GN, shared Document and Block
  IDs, lowercase anchors. `scripts/check_docs.py` validates and builds both.
  User guides GN-105 to GN-140 are the published manual; internal notes
  (GN-005, GN-010) stay in `docs/internal/` and `docs_llm/internal/`.
- The README quick start is `test/fixtures/quickstart/`, run by
  `test/quickstart.test.mjs`: keep the README, the tutorial and the fixture equal.

## Releases

No registry publication or deployment without owner authorization.
