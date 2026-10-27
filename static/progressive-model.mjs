/** Exact float16 rows, loaded independently of the background vocabulary download. */
export async function progressiveModel(config,words,decode,onProgress=()=>{}) {
 const base=new URL('./model/',import.meta.url),url=name=>new URL(name,base);
 const manifestResponse=await fetch(url(config.progressive.manifest_file),{cache:'force-cache'});
 if(!manifestResponse.ok)throw Error('Word index could not load. Please reload.');
 const manifest=await manifestResponse.json();
 if(manifest.model_sha256!==config.vector_sha256||manifest.dimensions!==config.dimensions)throw Error('Word index does not match the model.');
 const vectors=new Float32Array(words.length*config.dimensions),ready=new Uint8Array(words.length),index=new Map(words.map((w,i)=>[w,i]));
 const packs=[manifest.seed,manifest.starter,...manifest.background],byRow=new Map(),jobs=new Map(),rows=new Map();
 for(const pack of packs)for(const row of pack.rows)byRow.set(row,pack);
 let cache,count=0,background;
 try{cache=await caches.open('word-golf-progressive-v1');}catch{}
 const report=()=>onProgress({loaded:count,total:words.length,complete:count===words.length});
 function install(row,values){vectors.set(values,row*config.dimensions);if(!ready[row]){ready[row]=1;count++;}}
 async function verified(response,bytes,sha,gzip=false,source=''){
  if(!response.ok)throw Error(`Word data could not load (HTTP ${response.status}${source?'; '+source:''}). Try again.`);
  let buffer;try{buffer=await (gzip?new Response(response.body.pipeThrough(new DecompressionStream('gzip'))):response).arrayBuffer();}catch{throw Error('Word data is damaged or incomplete. Try again.');}
  if(buffer.byteLength!==bytes)throw Error('Incomplete word data. Try again.');
  if(sha&&globalThis.crypto?.subtle){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',buffer)),b=>b.toString(16).padStart(2,'0')).join('');if(hash!==sha)throw Error('Word data is damaged. Try again.');}
  return decode(buffer);
 }
 function packLoad(pack){
  if(pack.rows.every(row=>ready[row]))return Promise.resolve();
  if(!jobs.has(pack.file))jobs.set(pack.file,(async()=>{
   const preferred=typeof DecompressionStream==='function'?pack.file:pack.raw_file;
   const files=[...new Set([preferred,pack.raw_file])];let lastError;
   async function accept(response,file,cached){
    const address=url(file),copy=cached?null:response.clone();
    try{
     const values=await verified(response,pack.bytes,pack.sha256,file.endsWith('.gz'),file);
     for(let i=0;i<pack.rows.length;i++)install(pack.rows[i],values.subarray(i*config.dimensions,(i+1)*config.dimensions));
     if(copy)try{await cache?.put(address,copy);}catch{}
     report();return true;
    }catch(error){
     lastError=error;
     try{await cache?.delete(address);}catch{}
     // A cloned response tees its stream: awaiting one branch's cancellation
     // before cancelling the other can deadlock. Release both without blocking.
     for(const body of [response.body,copy?.body])try{body?.cancel()?.catch(()=>{});}catch{}
     return false;
    }
   }
   // Reuse a verified raw fallback offline too. Cache-storage failures must not
   // prevent a network repair, and no rows are installed before verification.
   for(const file of files){let response;try{response=await cache?.match(url(file));}catch{}
    if(response&&await accept(response,file,true))return;
   }
   const attempts=[[preferred,'force-cache'],[preferred,'reload'],...(preferred!==pack.raw_file?[[pack.raw_file,'reload']]:[])];
   for(const [file,mode] of attempts){
    try{if(await accept(await fetch(url(file),{cache:mode}),file,false))return;}
    catch(error){lastError=error;}
   }
   throw lastError??Error('Word data could not load. Try again.');
  })().finally(()=>jobs.delete(pack.file)));
  return jobs.get(pack.file);
 }
 async function rowLoad(row){
  if(ready[row])return;
  if(!rows.has(row))rows.set(row,(async()=>{
   const key=url(`row-${config.vector_sha256}-${row}`),cached=await cache?.match(key);
   if(cached){install(row,await verified(cached,config.dimensions*2));return;}
   const start=row*config.dimensions*2,end=start+config.dimensions*2-1;
   const response=await fetch(url(config.vector_fallback),{headers:{Range:`bytes=${start}-${end}`},cache:'no-store'});
   if(response.status!==206){await response.body?.cancel();return packLoad(byRow.get(row));}
   if(response.headers.get('Content-Range')!==`bytes ${start}-${end}/${config.vector_bytes}`){await response.body?.cancel();throw Error('Incomplete word data. Try again.');}
   const buffer=await response.arrayBuffer();if(buffer.byteLength!==config.dimensions*2)throw Error('Incomplete word data. Try again.');
   install(row,decode(buffer));try{await cache?.put(key,new Response(buffer));}catch{}report();
  })().finally(()=>rows.delete(row)));
  return rows.get(row);
 }
 async function ensureWords(list){await Promise.all([...new Set(list)].filter(w=>index.has(w)).map(w=>rowLoad(index.get(w))));}
 function startBackground(){
  if(!background)background=(async()=>{
   // Reuse the complete model cached by earlier releases before downloading packs.
   try{
    const old=await caches.open('word-golf-model-v1'),compressed=typeof DecompressionStream==='function';
    const response=await old.match(url(compressed?config.vector_file:config.vector_fallback));
    if(response){const values=await verified(response,config.vector_bytes,config.vector_sha256,compressed);for(let i=0;i<words.length;i++){install(i,values.subarray(i*config.dimensions,(i+1)*config.dimensions));if(i%2000===0)await new Promise(r=>setTimeout(r,0));}report();return;}
   }catch{}
   for(const pack of packs){await packLoad(pack);await new Promise(r=>setTimeout(r,0));}
  })().catch(error=>{background=null;onProgress({loaded:count,total:words.length,complete:false,error:error.message});throw error;});
  return background;
 }
 await packLoad(manifest.seed);
 return {vectors,ready,ensureWords,startBackground,whenComplete:startBackground};
}
