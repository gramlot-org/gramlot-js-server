/** Derive a file-origin bundle only from the verified original byte snapshot. */
import {relative, sep} from 'node:path';
import {build} from 'esbuild';
import {readCollectionArtifact} from './collection-artifact.js';

export async function collectionBundle(collection, entry) {
    const {root, content} = await readCollectionArtifact(collection, entry);
    const result=await build({entryPoints:[entry],bundle:true,format:'esm',platform:'browser',target:'es2022',write:false,
        logLevel:'silent',plugins:[{name:'verified-collection-window-runtime',setup(builder){
            builder.onResolve({filter:/^@gramlot\/gramlot\/markdown$/},()=>({path:'markdown',namespace:'shared-markdown'}));
            builder.onLoad({filter:/.*/,namespace:'shared-markdown'},()=>({contents:
                'export default (await globalThis.GramlotStandalone.loadMarkdown()).default;',loader:'js'}));
            builder.onResolve({filter:/^@gramlot\/gramlot(?:\/components|\/page)?$/},()=>({path:'runtime',namespace:'shared-runtime'}));
            builder.onLoad({filter:/.*/,namespace:'shared-runtime'},()=>({contents:
                'export const {Bag, Page, FramePage, Gramlot, GramlotBuilder, defineComponent, defineCollection, ComponentCollection, NativeControl, ChoiceGroup, Labelbox, FieldState, createDOMPurify, loadMarkdown} = globalThis.GramlotStandalone;',loader:'js'}));
            // All bytes come from the verified snapshot, including the wrapper.
            builder.onLoad({filter:/.*/},args=>{
                const key=relative(root,args.path).split(sep).join('/');
                if(!content.has(key))throw new Error(`Unverified collection dependency: ${key}`);
                return {contents:content.get(key),loader:'js'};
            });
        }}]});
    return result.outputFiles[0].text;
}
