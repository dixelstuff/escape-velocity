import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Embeddings,Game,decodeHalf,restoreGame} from '../static/engine.mjs';
import {assessHole} from '../static/assessment.mjs';
import {FlightLog,journeyText} from '../static/flight-log.mjs';
const vals=new Map(Object.entries({'start,target':.1,'start,forward':.6,'forward,target':.4,'forward,branch':.6,'branch,target':.2,'start,branch':.6,'start,arrival':.6,'arrival,target':.7,'start,failed':.01,'failed,target':.05,'forward,failed':.6}));
const fake={index:new Map(['start','target','forward','branch','arrival','failed'].map(w=>[w,0])),cosine(a,b){return a===b?1:vals.get(`${a},${b}`)??vals.get(`${b},${a}`)??0;}};
const game=()=>new Game(fake,'start','target',.5,{mode:'distance'});
let g=game();
assert.equal(g.submit('arrival').won,true);
assert.equal(g.state().attempts,2);assert.equal(g.current,'target');
assert.equal(g.state().automatic_shots.length,1);
assert.equal(g.state().automatic_shots[0].attempt,2);
assert.deepEqual(g.route,['start','arrival','target']);
assert.deepEqual(restoreGame(fake,g.state()).state(),g.state());
g=game();assert.equal(g.submit('target').outcome,'miss');g.submit('forward');
assert.equal(g.submit('target').won,true);assert.equal(g.state().attempts,3);assert.equal(g.automatic_shots.length,0);
g=game();g.submit('forward');
assert.equal(g.submit('branch').outcome,'water');
assert.equal(g.submit('start').outcome,'backtrack');assert.equal(g.best_progress,.1);
assert.equal(g.submit('branch').outcome,'landed');
assert.deepEqual(restoreGame(fake,g.state()).state(),g.state());
g=game();g.submit('failed');g.submit('forward');assert.equal(g.submit('failed').outcome,'water');
vals.set('start,forward',.01);assert.equal(g.submit('start').outcome,'miss');vals.set('start,forward',.6);
assert.equal(new Game(fake,'start','target',.12).backward_allowance,.01);
const map=new Map(),storage={getItem:k=>map.get(k),setItem:(k,v)=>map.set(k,v)};
const log=new FlightLog(storage,()=>new Date(0).toISOString(),()=> 'test');g=game();log.begin(g.state(),'test');let event=g.submit('arrival');log.record('arrival',g.state(),event);
assert.equal(log.active.entries.length,2);assert.equal(log.active.entries[1].event.automatic,true);
assert.ok(journeyText(log.active).includes('2 shots'));assert.ok(journeyText(log.active).includes('Automatic finish'));
assert.equal(new FlightLog(storage).active.state.attempts,2);
const config=JSON.parse(readFileSync(new URL('../static/model/config.json',import.meta.url)));
const words=JSON.parse(readFileSync(new URL('../static/model/words.json',import.meta.url)));
const data=gunzipSync(readFileSync(new URL('../static/model/'+config.vector_file,import.meta.url)));
const packed=data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength);
const e=new Embeddings(words,decodeHalf(packed),config.dimensions,new Uint8Array(readFileSync(new URL('../static/model/'+config.hub_file,import.meta.url))));
assert.equal(packed.byteLength,config.vector_bytes);
assert.deepEqual(decodeHalf(Uint8Array.from([0,60,0,188,0,0]).buffer),Float32Array.from([1,-1,0]));
assert.throws(()=>decodeHalf(Uint8Array.from([0,124]).buffer));
for(const word of ['jeans','wheels','fishing','cracked','faded','locked','divot','icing','incubate'])assert.ok(e.index.has(word),word);
for(const fixture of JSON.parse(readFileSync(new URL('./browser-fixtures.json',import.meta.url)))){
 const round=new Game(e,fixture.start,fixture.target,fixture.threshold,fixture);
 for(const step of fixture.steps){if(step.error)assert.throws(()=>round.submit(step.word));else {const actual=round.submit(step.word);assert.equal(actual.success,step.event.success);assert.equal(actual.won,step.event.won);assert.equal(actual.outcome,step.event.outcome);}}
}
const reject=assessHole(e,{start:'cat',target:'dog'});assert.equal(reject.direct_hole_in_one,true);assert.equal(reject.playable,false);
const custom=assessHole(e,{start:'moon',target:'kitchen'});assert.equal(custom.playable,true);assert.ok(custom.openings>0);assert.ok(custom.separation_degrees>0);assert.equal(custom.estimate,true);
assert.throws(()=>assessHole(e,{start:'zzzzfake',target:'dog'}));
console.log('New course passed: counted automatic finish, direct chip-ins, connected backtracking, reset water boundary, failed-word exclusion, persistence, half-precision scoring, expanded words, custom assessments.');

// Exercise the actual loader/cache and custom creation guard without a network service.
const {createBrowserClient}=await import('../static/engine.mjs');
const originalFetch=globalThis.fetch,originalCaches=globalThis.caches;
const downloaded=[],cacheData=new Map();
globalThis.caches={async open(){return {async match(url){return cacheData.get(String(url))?.clone();},async put(url,response){cacheData.set(String(url),response.clone());},async delete(url){cacheData.delete(String(url));}};}};
globalThis.fetch=async url=>{const path=decodeURIComponent(new URL(url).pathname);downloaded.push(path);return new Response(readFileSync(path));};
try{
 const client=await createBrowserClient({progressive:false});
 const endpointWarnings=await client.request('breadth',{start:'kind',target:'coffee'});
 assert.equal(endpointWarnings.length,1);assert.equal(endpointWarnings[0].role,'tee');assert.equal(endpointWarnings[0].very_broad,true);
 await client.request('new',{start:'coffee',target:'science',threshold:.28,mode:'distance'});
 await assert.rejects(()=>client.request('new',{start:'cat',target:'dog',threshold:.28,mode:'distance',validate_direct:true}),/direct hole in one/);
 assert.equal((await client.request('submit',{word:'food'})).event.origin,'coffee');
 await createBrowserClient({progressive:false});
 assert.equal(downloaded.filter(p=>p.endsWith(config.vector_file)).length,1,'second load must reuse the persisted model');
 const {SkillAnalyser}=await import('../static/skill.mjs');
 const skillGame=new Game(e,'morph','lineage',.28,{mode:'distance',launch_min:.10,launch_max:.21});skillGame.submit('evolved');
 const {reviewRoute}=await import('../static/route-review.mjs');
 assert.deepEqual(await client.request('route-review',{state:skillGame.state()}),reviewRoute(e,skillGame.state()));
 const viaClient=await client.request('skill',{state:skillGame.state()});
 assert.deepEqual(viaClient,new SkillAnalyser(e).analyse(skillGame.state()),'workerless skill API must use the same scoring');
 const old=new Game(new Embeddings(words,e.vectors),'moon','kitchen',.25,{mode:'distance',rules:'golf-distance-v1'});old.submit('surface');
 const restored=await client.request('restore',{state:old.state()});
 assert.equal(restored.state.rules,'golf-distance-v1');
 assert.equal(downloaded.filter(p=>p.endsWith('vectors.f32')).length,1);
 console.log('Loader passed: gzip integrity, persistent model reuse, invalid-hole state preservation, and exact legacy model on demand.');
}finally{globalThis.fetch=originalFetch;globalThis.caches=originalCaches;}

// Every advertised bridge must succeed in the real engine, with no omissions.
for(const settings of [{start:'coffee',target:'science',threshold:.28,mode:'distance',launch_min:.10,launch_max:.21},{start:'cat',target:'dog',threshold:.28,mode:'distance',launch_min:.10,launch_max:.21},{start:'moon',target:'kitchen',threshold:.3,mode:'fixed'}]){
 const assessment=assessHole(e,settings),expected=[];
 for(const word of e.words){
  if(word===settings.start)continue;
  const check=new Game(e,settings.start,settings.target,settings.threshold,settings);
  const shot=check.submit(word);
  if(shot.won)expected.push(word);
 }
 assert.equal(assessment.green_bridges,assessment.opening_bridges.length);
 assert.deepEqual(assessment.opening_bridges.map(b=>b.word).sort(),expected.sort());
 for(const b of assessment.opening_bridges){
  const shot=new Game(e,settings.start,settings.target,settings.threshold,settings).submit(b.word);
  assert.equal(shot.won,true);
  assert.ok(Math.abs(b.contact-shot.launch)<1e-7);
  assert.ok(Math.abs(b.destination-shot.destination)<1e-7);
  assert.ok(Math.abs(b.required-shot.required)<1e-7);
 }
}
console.log('Opening bridges passed: exhaustive real-engine comparison, exact listed strengths, custom settings, fixed mode, and direct hole-in-one rows.');
