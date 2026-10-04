/** The gallery of @gramlot/gramlot-examples as a static directory (GE-010 §025). */
import {copyFile, mkdtemp, readFile, rm, symlink, writeFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {buildDirectory} from './build-directory.js';

const require = createRequire(import.meta.url);

/** buildGallery and the gallery folder of @gramlot/gramlot-examples, an optional peer dependency. */
async function examplesPackage() {
    try {
        return {buildGallery: (await import('@gramlot/gramlot-examples')).buildGallery,
            gallery: dirname(fileURLToPath(import.meta.resolve('@gramlot/gramlot-examples/gallery/gallery-page.js')))};
    } catch (error) {
        if (error.code === 'ERR_MODULE_NOT_FOUND' && error.message.includes('@gramlot/gramlot-examples')) {
            throw new Error('The gallery needs @gramlot/gramlot-examples: npm install @gramlot/gramlot-examples');
        }
        throw error;
    }
}

/** The catalogue of this package, as a [catalog.json, pages folder] pair, when it exists. */
function packageCatalog() {
    const folder = fileURLToPath(new URL('../gallery/', import.meta.url));
    const catalog = join(folder, 'catalog.json');
    return existsSync(catalog) ? [[catalog, join(folder, 'pages')]] : [];
}

/** The node_modules folder that holds the @gramlot/gramlot of this package. A staged page links
 * it, so the page resolves the same core installation as the exporter. */
function coreModules() {
    const folder = require.resolve.paths('@gramlot/gramlot').find(path => existsSync(join(path, '@gramlot/gramlot')));
    if (!folder) throw new Error('@gramlot/gramlot is not installed');
    return folder;
}

/** Export the gallery to output: the common families, the catalogue of this package and catalogs
 * ([catalog.json, pages folder] pairs). Each example is the route <key>/; index is the gallery. */
export async function buildStaticGallery({output, catalogs = []}) {
    const {buildGallery, gallery} = await examplesPackage();
    const all = [...packageCatalog(), ...catalogs];
    const {families, routes, assets} = buildGallery({catalogs: all});
    const stage = await mkdtemp(join(tmpdir(), 'gramlot-static-gallery-'));
    try {
        await symlink(coreModules(), join(stage, 'node_modules'), 'dir');
        const read = file => readFile(file, 'utf8');
        const content = [];
        for (const {key, title, path, examples} of families) {
            content.push({key, title, readme: await read(join(path, 'README.md')), examples: await Promise.all(
                examples.map(async ({key, title, folder}) => {
                    const {page, logic} = routes[key];
                    // The page module shows its own Logic; only a companion NN_name_aux.js is shown apart.
                    return {key, title, folder, frameUrl: `${key}/index.html`, readme: await read(join(path, `${folder}.md`)),
                        source: await read(page), logic: logic && logic !== page ? await read(logic) : null};
                }))});
        }
        await writeFile(join(stage, 'index.js'), `import {GalleryPage} from ${JSON.stringify(join(gallery, 'gallery-page.js'))};
export class Page extends GalleryPage {
    static logoUrl = 'assets/branding/gramlot-logo-dark.svg';
    static galleryScript = 'gallery/dist/gallery.js';
    static families = ${JSON.stringify(content)};
}
`);
        const pages = {index: join(stage, 'index.js')};
        for (const [key, {page, stylesheet, logic}] of Object.entries(routes)) {
            if (key === 'index') continue;
            await writeFile(join(stage, `${key}.js`), `import {Page as Example} from ${JSON.stringify(page)};
export class Page extends Example {
    async main(root, ...args) {
        await super.main(root, ...args);
        root.script({src: '../gallery/dist/frame.js'});
    }
}
`);
            if (stylesheet) await copyFile(stylesheet, join(stage, `${key}.css`));
            if (logic) await writeFile(join(stage, `${key}_aux.js`), `export {Logic} from ${JSON.stringify(logic)};\n`);
            pages[key] = join(stage, `${key}.js`);
        }
        // The theme comes from the core through Page.css; the example sources stay in the gallery page.
        const copied = Object.entries(assets)
            .filter(([url]) => url === '/gallery/gallery.css' || url.startsWith('/gallery/dist/') || url.startsWith('/assets/branding/'))
            .map(([url, {file}]) => ({source: file, target: url.slice(1)}));
        return await buildDirectory({pages, output, assets: copied});
    } finally {
        await rm(stage, {recursive: true, force: true});
    }
}
