/** Derive a file-origin bundle only from the verified original byte snapshot. */
import {dirname, join, relative, sep} from 'node:path';
import {build} from 'esbuild';
import * as core from '@gramlot/gramlot';
import * as components from '@gramlot/gramlot/components';
import * as page from '@gramlot/gramlot/page';
import {readCollectionArtifact} from './collection-artifact.js';
import {embedCollectionAssets} from './collection-assets.js';

const runtimeEntries = {
    '@gramlot/gramlot': core,
    '@gramlot/gramlot/components': components,
    '@gramlot/gramlot/page': page,
};

/** The ES module of a file of the collection artifact whose entry is `entry`: the entry itself, or `file`, a
 * module of the artifact such as `assets/libraries/<name>.js`. Every byte comes from the verified artifact. */
export async function collectionBundle(collection, entry, file = entry) {
    const {root, content} = await readCollectionArtifact(collection, entry);
    const result=await build({entryPoints:[file],bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,
        logLevel:'silent',plugins:[{name:'verified-collection-window-runtime',setup(builder){
            builder.onResolve({filter:/^@gramlot\/collections\//}, args => {
                const name = decodeURIComponent(args.path.slice('@gramlot/collections/'.length));
                if (!collection.dependencies.includes(name)) throw new Error(`Undeclared collection dependency: ${name}`);
                return {path:args.path, external:true};
            });
            // A collection outside the runtime (typst) imports its library as the hosted page does.
            builder.onResolve({filter:/^@gramlot\/libraries\//}, args => {
                const name = args.path.slice('@gramlot/libraries/'.length);
                if (!Object.hasOwn(collection.libraries ?? {}, name)) throw new Error(`Undeclared collection library: ${name}`);
                return {path:args.path, external:true};
            });
            builder.onResolve({filter:/^@gramlot\/gramlot\/markdown$/},()=>({path:'markdown',namespace:'shared-markdown'}));
            builder.onLoad({filter:/.*/,namespace:'shared-markdown'},()=>({contents:
                'export default (await globalThis.GramlotStandalone.loadMarkdown()).default;',loader:'js'}));
            builder.onResolve({filter:/^@gramlot\/gramlot(?:\/components|\/page)?$/},args=>({path:args.path,namespace:'shared-runtime'}));
            builder.onLoad({filter:/.*/,namespace:'shared-runtime'},args=>({contents:
                `export const {${Object.keys(runtimeEntries[args.path]).join(', ')}} = globalThis.GramlotStandalone;`,loader:'js'}));
            // All bytes come from the verified snapshot, including the wrapper.
            builder.onLoad({filter:/.*/},args=>{
                const key=relative(root,args.path).split(sep).join('/');
                if(!content.has(key))throw new Error(`Unverified collection dependency: ${key}`);
                return {contents:embedCollectionAssets(content.get(key).toString('utf8'),key,content),loader:'js'};
            });
        }}]});
    return result.outputFiles[0].text;
}

/** The modules of the third-party libraries of a page graph, keyed by URL, as GramlotServer.libraryModules names
 * them (GC-325 §160): the module `assets/libraries/<name>.js` of the artifact of the first collection that ships
 * the library, bundled with its chunks. `entries` maps the module URL of each collection to the file of its entry.
 * The window imports each one as `@gramlot/libraries/<name>` through the import map of `mount`. */
export async function libraryBundles(server, collections, entries) {
    const modules = {};
    for (const [name, url] of Object.entries(server.libraryModules(collections))) {
        const collection = collections.find(item => item.libraries?.[name] === url);
        const entry = entries.get(collection.module);
        if (!entry) throw new Error(`Collection module asset not provided: ${collection.module}`);
        const hostRoot = collection.module.slice(0, -'assets/index.js'.length);
        if (!url.startsWith(hostRoot)) throw new Error(`Collection library escapes its artifact: ${url}`);
        modules[url] = await collectionBundle(collection, entry, join(dirname(dirname(entry)), ...url.slice(hostRoot.length).split('/')));
    }
    return modules;
}
