# {{name}}

A Gramlot site: each file of `pages/` is a page. `pages/index.js` is the first
page, with a menu; `pages/registration.js` is the page `registration/`, with
`Page` and `Logic` in one module. `pages/site.css` is linked by `Page.css`;
modules shared by the pages go in subfolders of `pages/`.

```sh
npm install
npm run build        # dist/: one folder per page, opens without a server
npm start            # the same pages on http://127.0.0.1:8080/ (Node)
npm run start:bun    # the same with Bun
```

The menu links `registration/index.html`: the same link works from `dist/`
opened from disk, on a static web site and with `npm start`.
