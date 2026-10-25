/** Warm new daily endpoints without invalidating the cached full model or other packs. */
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
const root=new URL('../static/model/',import.meta.url),read=name=>readFileSync(new URL(name,root));
const config=JSON.parse(read('config.json')),manifest=JSON.parse(read(config.progressive.manifest_file)),words=JSON.parse(read(config.words_file)),indices=new Map(words.map((w,i)=>[w,i]));
const holes=JSON.parse(readFileSync(new URL('../data/25-october-daily-holes.json',import.meta.url))),rows=[...new Set([...manifest.seed.rows,...holes.flatMap(h=>[h.start,h.waypoint?.word,h.target].filter(Boolean).map(w=>indices.get(w)))])].sort((a,b)=>a-b);
if(rows.some(i=>!Number.isInteger(i)))throw Error('An endpoint is outside the supported vocabulary.');
const full=read(config.vector_fallback),packed=Buffer.concat(rows.map(i=>full.subarray(i*config.dimensions*2,(i+1)*config.dimensions*2))),sha=createHash('sha256').update(packed).digest('hex'),name='pack-'+sha.slice(0,16)+'.f16';
writeFileSync(new URL(name,root),packed);writeFileSync(new URL(name+'.gz',root),gzipSync(packed,{level:9}));
manifest.seed={file:name+'.gz',raw_file:name,rows,bytes:packed.length,sha256:sha};
// A handful of warmed rows may also exist in the unchanged later packs. Exact row writes are idempotent.
const data=JSON.stringify(manifest),manifestName='packs-'+createHash('sha256').update(data).digest('hex').slice(0,16)+'.json';writeFileSync(new URL(manifestName,root),data);
config.progressive.manifest_file=manifestName;writeFileSync(new URL('config.json',root),JSON.stringify(config));
console.log(`${rows.length} seed rows; all 18 new holes can display with no endpoint range fetch.`);
