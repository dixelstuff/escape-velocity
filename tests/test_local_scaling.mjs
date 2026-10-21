import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Embeddings,Game,decodeHalf,restoreGame,createBrowserClient} from '../static/engine.mjs';
import {localScalingModel} from '../static/local-scaling.mjs';
import {assessHole} from '../static/assessment.mjs';
import {SkillAnalyser} from '../static/skill.mjs';
import {reviewRoute} from '../static/route-review.mjs';
import {FlightLog} from '../static/flight-log.mjs';
const dir=new URL('../static/model/',import.meta.url),read=name=>readFileSync(new URL(name,dir));
const config=JSON.parse(read('config.json')),profile=config.word_models['ls15-v1'],words=JSON.parse(read(config.words_file)),raw=read(config.vector_fallback),buffer=raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength);
const base=new Embeddings(words,decodeHalf(buffer),config.dimensions,new Uint8Array(read(config.hub_file)));
const radius=read(profile.radius_file);assert.equal(radius.byteLength,words.length*4);assert.equal(createHash('sha256').update(radius).digest('hex'),profile.radius_sha256);assert.equal(profile.base_vector_sha256,config.vector_sha256);
const radii=new Float32Array(radius.buffer.slice(radius.byteOffset,radius.byteOffset+radius.byteLength)),ls=localScalingModel(base,radii,profile.scaling);base.wordModels=new Map([['',base],['ls15-v1',ls]]);ls.wordModels=base.wordModels;
assert.equal(ls.vectors,base.vectors,'LS reuses vectors');assert.notEqual(profile.score_sha256,config.vector_sha256);
for(const [a,b] of [['gold','hover'],['moon','kitchen'],['coffee','science'],['maze','bone']]){
 const s=base.cosine(a,b),ra=radii[base.index.get(a)],rb=radii[base.index.get(b)];
 const expected=.85*s+.15*(Math.exp(-((1-s)**2)/(ra*rb))-profile.scaling.offset)/profile.scaling.slope;
 assert.ok(Math.abs(ls.cosine(a,b)-expected)<1e-14);assert.equal(ls.cosine(a,b),ls.cosine(b,a));assert.equal(ls.cosine(a,a),1);
}
// Frozen offline-study counts: no thresholds refitted for these holes.
const expected=[[52,83],[348,273],[36,67],[189,148],[56,75],[275,210],[27,61],[239,196],[33,57],[232,167]];
const holes=config.puzzles.filter(p=>p.comparison_set==='current-ls15-v1');assert.equal(holes.length,10);
let wonState;
for(let i=0;i<holes.length;i++){
 const hole=holes[i],settings={...hole,...profile.defaults,word_model:'ls15-v1'},preview=assessHole(base,settings),plain=assessHole(base,hole);
 assert.equal(plain.green_bridges,expected[i][0]);assert.equal(preview.green_bridges,expected[i][1]);assert.equal(preview.direct_hole_in_one,false);
 // Check all candidates against the actual engine, not just displayed rows.
 const actual=[];
 for(const word of words){if(word===hole.start)continue;const g=new Game(base,hole.start,hole.target,settings.threshold,settings);if(g.submit(word).won)actual.push(word);}
 assert.deepEqual(preview.opening_bridges.map(b=>b.word).sort(),actual.sort());
 const g=new Game(base,hole.start,hole.target,settings.threshold,{...settings,challenge:{version:'par-challenge-v1',par:3,attempt:1,id:'ls-test'}});g.submit(preview.opening_bridges[0].word);assert.ok(g.won);assert.deepEqual(restoreGame(base,g.state()).state(),g.state());wonState=g.state();
}
const row=new SkillAnalyser(ls).row('coffee');for(const word of ['science','heat','bean'])assert.equal(row[ls.index.get(word)],ls.cosine('coffee',word));
assert.ok(reviewRoute(base,wonState).complete);
const report=new SkillAnalyser(base).analyse(wonState);assert.ok(report.complete);assert.equal(report.shots[0].contact,wonState.history[0].launch);
const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},log=new FlightLog(storage);log.begin(wonState,profile.model,profile.score_sha256);assert.ok(log.recordSkill(log.active.id,report));assert.equal(new FlightLog(storage).active.model_sha,profile.score_sha256);
assert.throws(()=>new Game(base,'gold','hover',profile.defaults.threshold,{...profile.defaults,word_model:'ls15-v1',headwind:{word:'finance',strength:.5}}),/headwind experiment/);
const originalFetch=globalThis.fetch,requests=[];
globalThis.fetch=async url=>{requests.push(new URL(url).pathname);try{return new Response(readFileSync(new URL(url)));}catch{return new Response('',{status:404});}};
try{
 const client=await createBrowserClient();assert.ok(!requests.some(p=>p.includes('ls-k10')));
 const settings={...holes[0],...profile.defaults,word_model:'ls15-v1'};await client.request('new',settings);assert.equal(requests.filter(p=>p.includes('ls-k10')).length,1);assert.ok(!requests.some(p=>p.includes('abtt1')));
 const preview=await client.request('assess',settings);assert.equal(preview.green_bridges,83);const shot=await client.request('submit',{word:preview.opening_bridges[0].word});assert.ok(shot.state.won);assert.deepEqual((await client.request('restore',{state:shot.state})).state,shot.state);assert.ok(client.chipRange(shot.state));assert.ok((await client.request('skill',{state:shot.state})).complete);await client.request('new',settings);assert.equal(requests.filter(p=>p.includes('ls-k10')).length,1);
}finally{globalThis.fetch=originalFetch;}
console.log('LS15: frozen formula/counts on ten holes, exhaustive engine parity, shared vectors, lazy data, replay, skill, shortcuts and logs passed.');
