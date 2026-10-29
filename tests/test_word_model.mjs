import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Embeddings,Game,decodeHalf,restoreGame,createBrowserClient} from '../static/engine.mjs';
import {assessHole} from '../static/assessment.mjs';
import {SkillAnalyser,skillHistoryKey} from '../static/skill.mjs';
import {reviewRoute} from '../static/route-review.mjs';
import {puzzleKey} from '../static/bridge-feedback.mjs';
import {restartSettings} from '../static/startup.mjs';
import {FlightLog,journeyText} from '../static/flight-log.mjs';
const dir=new URL('../static/model/',import.meta.url),config=JSON.parse(readFileSync(new URL('config.json',dir))),id='abtt-1-v1',profile=config.word_models[id];
const frozenVocabulary=JSON.parse(readFileSync(new URL('../data/vocabulary-extension.json',import.meta.url))).baseline.words;
const frozenCount=report=>report.opening_bridges.filter(b=>words.indexOf(b.word)<frozenVocabulary).length;
const words=JSON.parse(readFileSync(new URL(config.words_file,dir))),hubs=new Uint8Array(readFileSync(new URL(config.hub_file,dir)));
function load(p){const raw=readFileSync(new URL(p.vector_fallback,dir));assert.equal(createHash('sha256').update(raw).digest('hex'),p.vector_sha256);return new Embeddings(words,decodeHalf(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),config.dimensions,hubs);}
const e=load(config),trial=load(profile),models=new Map([['',e],[id,trial]]);e.wordModels=models;trial.wordModels=models;trial.word_model=id;
// Preserve the pre-rescue model comparison baseline.
const normal={family_rescue:false,...config.puzzles.find(p=>p.start==='gold'&&p.target==='hover'&&!p.headwind),plural_rescue:false},settings={...normal,...profile.defaults,word_model:id};
for(const p of config.puzzles.filter(p=>!p.headwind)){const q={...p,...profile.defaults,word_model:id};if(q.waypoint){const g=new Game(e,q.start,q.target,q.threshold,q),shot=g.submit(q.target);assert.equal(shot.stage,0);assert.equal(g.history.length,1);if(!shot.waypoint_reached)assert.equal(g.won,false,'playing the flag cannot bypass the dogleg');}else assert.equal(new Game(e,q.start,q.target,q.threshold,q).submit(q.target).won,false,`No opening hole in one: ${p.start} → ${p.target}`);}
const preview=assessHole(e,settings),plain=assessHole(e,normal);
assert.equal(preview.settings.word_model,id);assert.equal(frozenCount(plain),67);
assert.ok(frozenCount(preview)>=50&&frozenCount(preview)<=55,`ABTT bridge count: ${preview.green_bridges}`);
for(const word of ['around','still','come','will','continued','hold','keep','expected'])assert.ok(!preview.opening_bridges.some(b=>b.word===word),word);
assert.ok(preview.opening_bridges.some(b=>b.word==='shiny'));
const g=new Game(e,settings.start,settings.target,settings.threshold,settings),shot=g.submit('shiny');assert.ok(g.won);
assert.equal(shot.launch,trial.cosine('gold','shiny'));assert.notEqual(g.baseline,new Game(e,normal.start,normal.target,normal.threshold,normal).baseline);
assert.deepEqual(restoreGame(e,g.state()).state(),g.state());assert.equal(restartSettings(g.state(),normal).word_model,id);
assert.notEqual(skillHistoryKey(g.state()),skillHistoryKey({...g.state(),word_model:undefined}));assert.notEqual(puzzleKey(g.state()),puzzleKey({...g.state(),word_model:undefined}));
assert.ok(reviewRoute(e,g.state()).complete);
const report=new SkillAnalyser(e).analyse(g.state());assert.ok(report.complete);assert.equal(report.shots[0].contact,shot.launch);
const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)},log=new FlightLog(storage),round=log.begin(g.state(),profile.model,profile.vector_sha256);
assert.ok(log.recordSkill(round.id,report));assert.equal(new FlightLog(storage).active.state.word_model,id);assert.match(journeyText(round),/abtt-1-v1/);
const wind=config.puzzles.find(p=>p.start==='gold'&&p.target==='hover'&&p.headwind),windGame=new Game(e,wind.start,wind.target,settings.threshold,{...settings,headwind:wind.headwind});
assert.equal(windGame.e.headwindBase,trial);assert.deepEqual(restoreGame(e,windGame.state()).state(),windGame.state());
// Exercise the browser API through its real lazy loader with local-file HTTP responses.
const originalFetch=globalThis.fetch,requests=[];
globalThis.fetch=async url=>{const u=new URL(url);requests.push(u.pathname);try{return new Response(readFileSync(u));}catch{return new Response('',{status:404});}};
try{
 const client=await createBrowserClient();
 assert.ok(!requests.some(p=>p.includes('abtt1-')),'current model loads without trial download');
 await client.request('new',normal);
 const a=await client.request('new',settings);assert.equal(a.state.word_model,id);assert.ok(requests.some(p=>p.includes('abtt1-')));
 assert.equal((await client.request('assess',settings)).green_bridges,preview.green_bridges);
 const complete=await client.request('submit',{word:'shiny'});assert.ok(complete.state.won);
 assert.equal((await client.request('skill',{state:complete.state})).shots[0].contact,shot.launch);
 assert.deepEqual((await client.request('restore',{state:complete.state})).state,complete.state);
 assert.ok(client.chipRange(complete.state));
 const count=requests.length;await client.request('new',settings);assert.equal(requests.length,count,'loaded profile reused');
 await assert.rejects(client.request('new',{...settings,word_model:'unknown'}),/Unknown word model/);
 assert.ok((await client.request('submit',{word:'shiny'})).state.won,'failed switch preserves active round');
 const back=await client.request('new',normal);assert.equal(back.state.word_model,undefined);assert.equal(back.state.baseline,e.cosine('gold','hover'));
}finally{globalThis.fetch=originalFetch;}
console.log(`Word models passed: lazy loading, current integrity, ${preview.green_bridges} ABTT bridges, excluded vague words, scoring, chip range, skill, shortcuts, headwind composition and scorecard replay.`);
