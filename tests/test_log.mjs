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
let game=new Game(e,'forest','money',.4,{rules:'fixed-threshold-v2'});
log.begin(game.state(),'GloVe 6B · 300 dimensions');
const firstId=log.active.id;
for(const word of ['milk','unknownwordxyz','forest','area']) {
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
for(const expected of ['forest → milk','unknownwordxyz','No shot used','Miss','area → have','On the green','Contact cosine:','Shot / green threshold: 0.4','3 shots']) assert.ok(text.includes(expected),expected);
assert.ok(!text.includes('have → money (free)'));
const legacy=structuredClone(log.active);delete legacy.completion;
for(const entry of legacy.entries)delete entry.completion;
assert.ok(journeyText(legacy).includes('have → money (free)'));
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
// New logs record per-hop requirements and the rule version; archived old logs keep theirs.
const dynamic=new Game(e,'coffee','science',.45,{mode:'distance'});
const logger=newLog();logger.begin(dynamic.state(),'GloVe');
const hop=dynamic.submit('food');logger.record('food',dynamic.state(),hop);
assert.equal(logger.active.rules,'golf-distance-v1');
assert.equal(logger.active.entries[0].threshold,hop.required);
assert.ok(journeyText(logger.active).includes('scaled by trip length'));
assert.ok(journeyText(logger.active).includes(String(hop.required)));
// Storage denial is visible but never prevents playing/exporting.
const denied=new FlightLog({getItem:()=>null,setItem:()=>{throw Error('quota');}},undefined,()=> 'denied');
denied.begin(new Game(e,'forest','money',.4,{rules:'fixed-threshold-v2'}).state(),'GloVe');
assert.ok(denied.warning.includes('could not save'));
assert.equal(JSON.parse(denied.exportJSON()).journeys.length,1);
// Preserve unreadable storage rather than silently replacing it.
memory.set(LOG_KEY,'not valid json');
const broken=newLog();
broken.begin(new Game(e,'forest','money',.4,{rules:'fixed-threshold-v2'}).state(),'GloVe');
assert.equal(memory.get(LOG_KEY),'not valid json');
assert.equal(JSON.parse(broken.exportJSON()).unreadableOriginal,'not valid json');
assert.throws(()=>restoreGame(e,{start:'forest',target:'money',threshold:.4,history:[{word:'unknownwordxyz'}]}));
console.log('Flight log passed: all submissions, score parity, reload/resume, archived journeys, sharing, storage failure and corrupt-data recovery.');

memory.clear();
const round=new Game(e,'coffee','science',.25,{mode:'distance'});
const card=newLog();card.begin(round.state(),'GloVe');
for(const word of ['science','bean','food']){const shot=round.submit(word);card.record(word,round.state(),shot);}
assert.deepEqual(card.active.entries.map(entry=>entry.event.outcome),['miss','water','green']);
assert.equal(card.active.state.attempts,3);
assert.ok(journeyText(card.active).includes('Water hazard — ball returned'));
assert.ok(journeyText(card.active).includes('Miss — ball stayed put'));
assert.ok(journeyText(card.active).includes('3 shots'));
assert.deepEqual(restoreGame(e,newLog().active.state).state(),round.state());
