import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Game, restoreGame, Embeddings } from '../static/engine.mjs';
import { FlightLog, journeyText, LOG_KEY } from '../static/flight-log.mjs';
const memory = new Map();
const storage = {getItem:key=>memory.get(key)??null, setItem:(key,value)=>memory.set(key,value)};
let sequence=0;
const newLog=()=>new FlightLog(storage,()=>new Date('2026-10-19T09:00:00Z').toISOString(),()=>`journey-${++sequence}`);
const words=JSON.parse(readFileSync(new URL('../static/model/words.json',import.meta.url)));
const buffer=readFileSync(new URL('../static/model/vectors.f32',import.meta.url));
const e=new Embeddings(words,new Float32Array(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength)));
let log=newLog();
let game=new Game(e,'forest','money',.4);
log.begin(game.state(),'GloVe 6B · 300 dimensions');
const firstId=log.active.id;
for(const word of ['milk','unknownwordxyz','milk','area']) {
  try {const event=game.submit(word);log.record(word,game.state(),event);}
  catch(error){log.record(word,game.state(),null,error.message);}
}
assert.equal(log.active.entries.length,4);
assert.equal(log.active.state.attempts,2);
assert.deepEqual(log.active.entries.map(e=>e.chargedAttempt),[true,false,false,true]);
assert.equal(log.active.entries[0].origin,'forest');
assert.equal(log.active.entries[3].origin,'forest');
// Reopen as if the page closed halfway through a journey, then continue scoring.
log=newLog();
assert.equal(log.active.id,firstId);
assert.equal(log.active.entries.length,4);
game=restoreGame(e,log.active.state);
assert.equal(game.current,'area');
const event=game.submit('have');
log.record('have',game.state(),event);
assert.equal(log.active.state.won,true);
assert.equal(log.active.state.attempts,3);
assert.equal(log.active.entries.length,5);
assert.equal(log.active.entries[4].origin,'area');
assert.equal(restoreGame(e,log.active.state).won,true);
const text=journeyText(log.active);
for(const expected of ['forest → milk','unknownwordxyz','No attempt used','Failed launch','area → have','free','Launch cosine:','Launch / arrival threshold: 0.4','3 attempts']) assert.ok(text.includes(expected),expected);
const archive=structuredClone(log.active);
log.begin(new Game(e,'cheese','language',.45).state(),'GloVe');
log=newLog();
assert.equal(log.data.journeys.length,2);
assert.deepEqual(log.data.journeys[0],archive);
assert.notEqual(log.active.id,firstId);
assert.equal(JSON.parse(log.exportJSON()).journeys[0].entries.length,5);
// Snapshots are detached from mutable game data.
game.history.push({word:'changed'});
assert.equal(log.data.journeys[0].state.history.length,3);
// Storage denial is visible but never prevents playing/exporting.
const denied=new FlightLog({getItem:()=>null,setItem:()=>{throw Error('quota');}},undefined,()=> 'denied');
denied.begin(new Game(e,'forest','money',.4).state(),'GloVe');
assert.ok(denied.warning.includes('could not save'));
assert.equal(JSON.parse(denied.exportJSON()).journeys.length,1);
// Preserve unreadable storage rather than silently replacing it.
memory.set(LOG_KEY,'not valid json');
const broken=newLog();
broken.begin(new Game(e,'forest','money',.4).state(),'GloVe');
assert.equal(memory.get(LOG_KEY),'not valid json');
assert.equal(JSON.parse(broken.exportJSON()).unreadableOriginal,'not valid json');
assert.throws(()=>restoreGame(e,{start:'forest',target:'money',threshold:.4,history:[{word:'unknownwordxyz'}]}));
console.log('Flight log passed: all submissions, score parity, reload/resume, archived journeys, sharing, storage failure and corrupt-data recovery.');
