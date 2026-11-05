/** Host-equivalent collection inputs for Node-only Worker/bootstrap tests. */
import {register} from 'node:module';
import {GramlotServer, standardCollectionAssets} from '@gramlot/gramlot/server';
import {mount as mountPage} from '../src/standalone.js';
export const collections = new GramlotServer().collections;
export const records = collections.map(({name,module,buildId})=>({name,url:module,buildId}));
export const files = Object.fromEntries(standardCollectionAssets().map(({url,file})=>[url,file]));
const modules = Object.fromEntries(Object.entries(files).map(([url,file])=>[url,file.href]));
register('data:text/javascript,'+encodeURIComponent(`
let imports;
export function initialize(data){imports=data;}
export function resolve(name,context,next){return Object.hasOwn(imports,name)?{url:imports[name],shortCircuit:true}:next(name,context);}
`),{data:Object.fromEntries(collections.map(({name,module})=>['@gramlot/collections/'+name,modules[module]]))});
export function mount(options){return mountPage({...options,modules:{...modules,...options.modules}});}
