import {build as bundle} from 'esbuild';
import {stat} from 'node:fs/promises';
import {basename, dirname, extname, join} from 'node:path';
import {fileURLToPath} from 'node:url';

const workerHost = fileURLToPath(new URL('./worker-host.js', import.meta.url));

/** The _aux suffix is reserved for companions: a *_aux file is never a page. */
export function checkPage(page) {
    if (basename(page, extname(page)).endsWith('_aux')) {
        throw new TypeError(`A *_aux file is a page companion, not a page: ${page}`);
    }
}

/** The companion foo_aux.js beside the page file foo.js with the URL that names it, or null. */
export async function companion(page) {
    const file = join(dirname(page), `${basename(page, extname(page))}_aux.js`);
    try {
        if (!(await stat(file)).isFile()) return null;
    } catch (error) {
        if (error.code === 'ENOENT') return null;
        throw error;
    }
    return {file, url: `/${basename(file)}`};
}

/** The Worker script: WorkerHost and the Page, never the companion. */
export async function workerBundle(page, aux, options) {
    const result = await bundle({...options, metafile: true, stdin: {
        resolveDir: dirname(page),
        contents: `import {WorkerHost} from ${JSON.stringify(workerHost)};
import {Page} from ${JSON.stringify(page)};
new WorkerHost(Page, {aux: ${JSON.stringify(aux?.url ?? null)}});`,
    }});
    return {text: result.outputFiles[0].text, metafile: result.metafile};
}

/** The companion as one ES module, imported by the window only. */
export async function companionBundle(aux, options) {
    return (await bundle({...options, format: 'esm', entryPoints: [aux.file]})).outputFiles[0].text;
}
