/** Verify the prepared source artifact before the approved file-origin transformation. */
import {readFile, readdir, realpath} from 'node:fs/promises';
import {dirname, join, relative, sep} from 'node:path';
import {verifyCollectionArtifact} from '@gramlot/gramlot';

export async function readCollectionArtifact(collection, entry) {
    const root=dirname(dirname(entry));
    const rootReal=await realpath(root);
    const content=new Map();
    async function read(file) {
        const path=join(root,file), resolved=await realpath(path);
        if (!resolved.startsWith(rootReal+sep)) throw new Error('Collection resource escapes its package');
        content.set(file,await readFile(path));
    }
    await read('grammar.json');await read('commands.json');
    for (const file of await readdir(join(root,'assets'),{recursive:true,withFileTypes:true})) {
        if(file.isDirectory())continue;
        await read(relative(root,join(file.parentPath,file.name)).split(sep).join('/'));
    }
    const hostRoot=collection.module.slice(0,-'assets/index.js'.length);
    const metadata={name:collection.name,grammar:'grammar.json',commands:'commands.json',module:'assets/index.js',
        css:collection.css.map(url=>{
            if(!url.startsWith(hostRoot))throw new Error('Collection stylesheet escapes its artifact');
            return url.slice(hostRoot.length);
        }),dependencies:collection.dependencies};
    metadata.files = [...content.keys()];
    metadata.buildId = collection.buildId;
    await verifyCollectionArtifact(metadata, content);
    if(JSON.stringify(JSON.parse(content.get('grammar.json')))!==JSON.stringify(collection.grammar)) {
        // Object member ordering is immaterial; compare canonical metadata.
        const canonical=value=>Array.isArray(value)?value.map(canonical):value&&typeof value==='object'
            ?Object.fromEntries(Object.keys(value).sort().map(key=>[key,canonical(value[key])])):value;
        if(JSON.stringify(canonical(JSON.parse(content.get('grammar.json'))))!==JSON.stringify(canonical(collection.grammar)))
            throw new Error('Collection grammar does not match its verified artifact');
    }
    return {root, content};
}
