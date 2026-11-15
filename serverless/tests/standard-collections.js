/** Host-equivalent collection inputs for Node-only Worker/bootstrap tests. */
import {register} from 'node:module';
import {GramlotServer, collectionAssets} from '@gramlot/gramlot/server';
import {mount as mountPage} from '../src/standalone.js';
export const collections = new GramlotServer().collections;
export const records = collections.map(({name,module,buildId})=>({name,url:module,buildId}));
export const files = Object.fromEntries(collectionAssets().map(({url,file})=>[url,file]));
// The third-party libraries the Worker names (GramlotServer.libraryModules): assets/libraries/<name>.js of each artifact.
export const libraries = new GramlotServer().libraryModules(collections);
const libraryFile = url => {
    const collection = collections.find(item => Object.values(item.libraries ?? {}).includes(url));
    return new URL(url.slice(collection.module.length - 'assets/index.js'.length), new URL('../../', files[collection.module])).href;
};
const modules = {...Object.fromEntries(Object.entries(files).map(([url,file])=>[url,file.href])),
    ...Object.fromEntries(Object.values(libraries).map(url => [url, libraryFile(url)]))};
register('data:text/javascript,'+encodeURIComponent(`
let imports;
export function initialize(data){imports=data;}
export function resolve(name,context,next){return Object.hasOwn(imports,name)?{url:imports[name],shortCircuit:true}:next(name,context);}
`),{data:{...Object.fromEntries(collections.map(({name,module})=>['@gramlot/collections/'+name,modules[module]])),
    ...Object.fromEntries(Object.entries(libraries).map(([name,url])=>['@gramlot/libraries/'+name,modules[url]]))}});
export function mount(options){return mountPage({...options,modules:{...modules,...options.modules}});}
