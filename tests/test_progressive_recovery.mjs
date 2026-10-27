import assert from 'node:assert/strict';
import fs from 'node:fs';
import {progressiveModel} from '../static/progressive-model.mjs';
import {decodeHalf} from '../static/engine.mjs';
const base=new URL('../static/model/',import.meta.url),read=f=>fs.readFileSync(new URL(f,base)),config=JSON.parse(read('config.json')),words=JSON.parse(read(config.words_file)),manifest=JSON.parse(read(config.progressive.manifest_file)),packed=read(config.vector_fallback),exact=decodeHalf(packed.buffer.slice(packed.byteOffset,packed.byteOffset+packed.byteLength));
const originalFetch=globalThis.fetch,originalCaches=globalThis.caches,stores=new Map(),calls=[];let failure='cached-http',offline=false;
globalThis.caches={async open(name){if(!stores.has(name))stores.set(name,new Map());const data=stores.get(name);return {async match(key){return data.get(String(key))?.clone();},async put(key,response){data.set(String(key),response.clone());},async delete(key){return data.delete(String(key));}};}};
globalThis.fetch=async(address,options={})=>{
 const file=new URL(address).pathname.split('/').at(-1);calls.push({file,cache:options.cache});
 if(offline&&file!==config.progressive.manifest_file)throw Error('Offline');
 if(file===manifest.starter.file){
  if(failure==='cached-http'&&options.cache!=='reload')return new Response('Cached 404',{status:404});
  if(failure==='gzip-unavailable'||failure==='all-unavailable')return new Response('Unavailable',{status:503});
 }
 if(file===manifest.starter.raw_file&&failure==='all-unavailable')return new Response('Rate limited',{status:429});
 return new Response(read(file));
};
try{
 let loader=await progressiveModel(config,words,decodeHalf);await loader.whenComplete();
 assert.deepEqual(calls.filter(c=>c.file===manifest.starter.file).map(c=>c.cache),['force-cache','reload'],'an HTTP error is retried with a fresh HTTP-cache-bypassing request');
 assert.deepEqual(loader.vectors,exact);assert.equal(loader.ready.reduce((a,b)=>a+b,0),words.length);
 stores.clear();calls.length=0;failure='gzip-unavailable';
 loader=await progressiveModel(config,words,decodeHalf);await loader.whenComplete();
 assert.equal(calls.filter(c=>c.file===manifest.starter.file).length,2);assert.equal(calls.filter(c=>c.file===manifest.starter.raw_file).length,1,'compressed-pack failure falls back to the exact raw pack');assert.deepEqual(loader.vectors,exact);
 // A raw fallback is persistently useful, not downloaded afresh each time.
 calls.length=0;offline=true;
 const offlineLoader=await progressiveModel(config,words,decodeHalf);await offlineLoader.whenComplete();assert.deepEqual(offlineLoader.vectors,exact);assert.equal(calls.filter(c=>c.file!==config.progressive.manifest_file).length,0,'verified cached raw packs also work offline');
 offline=false;stores.clear();calls.length=0;failure='all-unavailable';const progress=[];
 loader=await progressiveModel(config,words,decodeHalf,p=>progress.push(p));const vectorIdentity=loader.vectors;
 await assert.rejects(()=>loader.whenComplete(),new RegExp(`HTTP 429; ${manifest.starter.raw_file.replaceAll('.','\\.')}`));
 assert.equal(calls.filter(c=>c.file===manifest.starter.file||c.file===manifest.starter.raw_file).length,3,'retry work is bounded');assert.equal(loader.ready.reduce((a,b)=>a+b,0),manifest.seed.rows.length,'failed packs never install incomplete rows');
 assert.ok(progress.at(-1).error.includes('HTTP 429'));
 failure='cached-http';await loader.whenComplete();assert.equal(loader.vectors,vectorIdentity,'Retry repairs the existing loader without replacing gameplay vectors');assert.deepEqual(loader.vectors,exact);assert.equal(progress.at(-1).complete,true);
 const seedDownloads=calls.filter(c=>c.file===manifest.seed.file).length;assert.equal(seedDownloads,1,'successfully loaded vocabulary is retained across Retry');
 // A bad Cache Storage response is evicted before fresh verified bytes install.
 const store=stores.get('word-golf-progressive-v1'),starterURL=new URL(manifest.starter.file,base).href;store.set(starterURL,new Response('Old failed response',{status:404}));calls.length=0;
 const repaired=await progressiveModel(config,words,decodeHalf);await repaired.whenComplete();assert.deepEqual(repaired.vectors,exact);assert.ok(calls.some(c=>c.file===manifest.starter.file&&c.cache==='reload'));
 console.log('Progressive recovery passed: cached HTTP failures, fresh reload, exact raw fallback, offline reuse, bounded total failure, HTTP/file diagnostics, retry after partial loading, corrupted cache eviction and unchanged vector identity.');
}finally{globalThis.fetch=originalFetch;globalThis.caches=originalCaches;}
