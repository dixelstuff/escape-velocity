/** Optional precomputed geometry: verified, sharded and never used by gameplay. */
export const PROFILE_VERSION='semantic-profiles-v4';
export const neighbourFingerprint=ids=>{let h=2166136261;for(const id of ids)h=Math.imul(h^id,16777619)>>>0;return h;};
export function decodeProfileShard(bytes,manifest){
 const v=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);if(String.fromCharCode(...bytes.subarray(0,4))!=='WGP4')throw Error('Invalid semantic profile header.');const start=v.getUint32(4,true),count=v.getUint32(8,true);if(bytes.length!==12+count*manifest.record_bytes)throw Error('Semantic profile length differs.');let offset=12;const f=()=>{const x=v.getFloat32(offset,true);offset+=4;return x;},u=()=>{const x=v.getUint32(offset,true);offset+=4;return x;},h=()=>{const x=v.getUint16(offset,true);offset+=2;return x;},profiles=[];
 for(let i=0;i<count;i++){
  const p={index:start+i,hub:f(),occurrence100:u(),occurrence200:u(),broad_counts:[u(),u(),u(),u()],neighbour_fingerprint:u(),scales:[]};
  for(const k of manifest.scales){const s={k,concentration:f(),density_mean:f(),density_sd:f(),density_min:f(),affinity_effective_size:f(),concentration_percentile:f(),reciprocal:h()},sizes=[h(),h()],partition={hypotheses:2,sizes,silhouette:f(),spherical_loss_gain:f(),centroid_separation:f(),word_to_centroids:[f(),f()],ari_to_200:f(),representatives:[Array.from({length:4},h).filter(i=>i!==65535),Array.from({length:4},h).filter(i=>i!==65535)]};const packed=bytes.subarray(offset,offset+Math.ceil(k/8));offset+=packed.length;partition.labels=Array.from({length:k},(_,j)=>(packed[j>>>3]>>>(j&7))&1);s.dispersion=1-s.concentration;s.partition=partition;p.scales.push(s);}
  profiles.push(p);
 }
 return {start,profiles};
}
const digest=async bytes=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))).map(x=>x.toString(16).padStart(2,'0')).join('');
export class SemanticProfileStore{
 constructor({modelSha,fetcher=(...args)=>globalThis.fetch(...args),base=new URL('./semantic-profiles/',import.meta.url),maxShards=16}={}){this.modelSha=modelSha;this.fetcher=fetcher;this.base=base;this.maxShards=maxShards;this.shards=new Map();this.pending=new Map();this.manifest=null;this.loading=null;this.loaded_bytes=0;this.checkedModels=new WeakSet();}
 async initialise(){
  if(this.manifest)return this.manifest;
  if(!this.loading)this.loading=(async()=>{const response=await this.fetcher(new URL('manifest.json',this.base));if(!response.ok)throw Error('Semantic profiles could not load (HTTP '+response.status+').');const m=await response.json();if(m.version!==PROFILE_VERSION||!this.modelSha||m.model_sha!==this.modelSha)throw Error('Semantic profiles do not match the current model.');this.manifest=m;return m;})().catch(e=>{this.loading=null;throw e;});return this.loading;
 }
 async shard(id){
  const m=await this.initialise();if(this.shards.has(id)){const x=this.shards.get(id);this.shards.delete(id);this.shards.set(id,x);return x;}
  if(!this.pending.has(id))this.pending.set(id,(async()=>{
   const entry=m.files[id];if(!entry)throw Error('Semantic profile shard is out of range.');let bytes;
   if(typeof DecompressionStream!=='undefined')try{const response=await this.fetcher(new URL(entry.gzip,this.base));if(!response.ok)throw Error('Compressed profiles unavailable.');const packed=new Uint8Array(await response.arrayBuffer());if(await digest(packed)!==entry.gzip_sha256)throw Error('Compressed profile integrity differs.');bytes=new Uint8Array(await new Response(new Blob([packed]).stream().pipeThrough(new DecompressionStream('gzip'))).arrayBuffer());if(await digest(bytes)!==entry.sha256)throw Error('Profile integrity differs.');this.loaded_bytes+=packed.length;}catch{bytes=null;}
   if(!bytes){const response=await this.fetcher(new URL(entry.file,this.base),{cache:'reload'});if(!response.ok)throw Error('Semantic profiles could not load (HTTP '+response.status+').');bytes=new Uint8Array(await response.arrayBuffer());if(await digest(bytes)!==entry.sha256)throw Error('Semantic profile integrity differs.');this.loaded_bytes+=bytes.length;}
   const decoded=decodeProfileShard(bytes,m);if(decoded.start!==id*m.shard_size||decoded.profiles.length!==entry.count)throw Error('Profile shard index differs.');if(this.shards.size>=this.maxShards)this.shards.delete(this.shards.keys().next().value);this.shards.set(id,decoded);return decoded;
  })().finally(()=>this.pending.delete(id)));return this.pending.get(id);
 }
 async forWords(e,words){
  const m=await this.initialise();if(e.words.length!==m.vocabulary||e.dimensions!==m.dimensions)throw Error('Semantic profile vocabulary differs.');
  if(!this.checkedModels.has(e)){if(await digest(new TextEncoder().encode(e.words.join('\0')))!==m.word_order_sha256)throw Error('Semantic profile word order differs.');this.checkedModels.add(e);}
  const wanted=[...new Set(words)],map=new Map();await Promise.all(wanted.map(async w=>{const index=e.index.get(w);if(index===undefined)throw Error('Word not in semantic profile vocabulary: '+w);const s=await this.shard(Math.floor(index/m.shard_size));map.set(w,{...s.profiles[index-s.start],word:w});}));return map;
 }
}
