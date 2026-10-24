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
const e=new Embeddings(words.slice(0,buffer.byteLength/1200),new Float32Array(buffer.buffer.slice(buffer.byteOffset,buffer.byteOffset+buffer.byteLength)));
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
const dynamic=new Game(e,'coffee','science',.45,{mode:'distance',rules:'golf-distance-v1'});
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
const round=new Game(e,'coffee','science',.25,{mode:'distance',rules:'golf-distance-v1'});
const card=newLog();card.begin(round.state(),'GloVe');
for(const word of ['science','bean','food']){const shot=round.submit(word);card.record(word,round.state(),shot);}
assert.deepEqual(card.active.entries.map(entry=>entry.event.outcome),['miss','water','green']);
assert.equal(card.active.state.attempts,3);
assert.ok(journeyText(card.active).includes('Water hazard — ball returned'));
assert.ok(journeyText(card.active).includes('Miss — ball stayed put'));
assert.ok(journeyText(card.active).includes('3 shots'));
assert.deepEqual(restoreGame(e,newLog().active.state).state(),round.state());

// Reset creates a new export batch and a detached, persistent recovery copy.
memory.clear();
let batch=newLog();
let played=new Game(e,'moon','kitchen',.28,{mode:'distance'});
batch.begin(played.state(),'GloVe');let playedEvent=played.submit('surface');batch.record('surface',played.state(),playedEvent);
const prior=structuredClone(batch.data);
const fresh=new Game(e,'moon','kitchen',.28,{mode:'distance'});
const freshId=batch.reset(fresh.state(),'GloVe').id;
assert.equal(batch.data.journeys.length,1);assert.equal(batch.active.state.attempts,0);
assert.deepEqual(batch.active.entries,[]);assert.ok(batch.data.batchStartedAt);
assert.deepEqual(batch.backup,prior);
assert.equal(JSON.parse(batch.exportJSON()).journeys.length,1);
assert.ok(!batch.exportJSON().includes(prior.activeId));
batch=newLog();assert.deepEqual(batch.backup,prior);assert.equal(batch.active.id,freshId);
playedEvent=fresh.submit('surface');batch.record('surface',fresh.state(),playedEvent);
const newRound=structuredClone(batch.active);
assert.equal(batch.restorePrevious(),true);
assert.equal(batch.data.journeys.length,2);assert.equal(batch.active.id,freshId);
assert.deepEqual(batch.active,newRound);assert.deepEqual(batch.data.journeys[0],prior.journeys[0]);
assert.equal(batch.restorePrevious(),false);assert.ok(!newLog().backup);

// Reset failures must preserve both the current batch and the previous backup.
const {RESET_BACKUP_KEY}=await import('../static/flight-log.mjs');
const beforeReset=structuredClone(batch.data),beforeRaw=memory.get(LOG_KEY);
memory.set(RESET_BACKUP_KEY,JSON.stringify(prior));
const guarded=new FlightLog({getItem:key=>memory.get(key),setItem:(key,value)=>{if(key===LOG_KEY)throw Error('quota');memory.set(key,value);}},undefined,()=> 'failed-reset');
assert.throws(()=>guarded.reset(fresh.state(),'GloVe'),/unchanged/);
assert.equal(memory.get(LOG_KEY),beforeRaw);assert.deepEqual(guarded.data,beforeReset);
assert.deepEqual(JSON.parse(memory.get(RESET_BACKUP_KEY)),prior);
const backupDenied=new FlightLog({getItem:key=>memory.get(key),setItem:()=>{throw Error('denied');}},undefined,()=> 'denied-reset');
assert.throws(()=>backupDenied.reset(fresh.state(),'GloVe'),/unchanged/);
assert.equal(memory.get(LOG_KEY),beforeRaw);

// Reset a large batch when there is room for one full archive, but not two.
const quotaMemory=new Map();
const quotaStorage={getItem:key=>quotaMemory.get(key)??null,setItem:(key,value)=>{
 const trial=new Map(quotaMemory);trial.set(key,value);
 if([...trial.values()].reduce((n,v)=>n+v.length,0)>30000)throw Error('quota');
 quotaMemory.set(key,value);
}};
let quotaSequence=0;
let large=new FlightLog(quotaStorage,undefined,()=> 'large-batch-'+(++quotaSequence));
large.begin(fresh.state(),'GloVe');large.active.testPayload='x'.repeat(18000);large.save();
const largeRaw=quotaMemory.get(LOG_KEY);
large.reset(fresh.state(),'GloVe');
assert.equal(large.data.journeys.length,1);assert.equal(large.backup.journeys[0].testPayload.length,18000);
assert.equal(JSON.parse(quotaMemory.get(RESET_BACKUP_KEY)).journeys[0].testPayload.length,18000);
assert.equal(new FlightLog(quotaStorage).data.journeys.length,1);
assert.ok(!large.exportJSON().includes('testPayload'));
assert.equal(large.restorePrevious(),true);assert.equal(large.data.journeys.length,2);
assert.equal(large.data.journeys[0].testPayload.length,18000);
assert.equal(large.backup,null);
// Recreate the quota-limited archive for the rollback checks below.
quotaMemory.set(RESET_BACKUP_KEY,largeRaw);
// A failed backup write rolls back the smaller replacement without touching the old backup.
quotaMemory.set(LOG_KEY,largeRaw);
const rollbackLog=new FlightLog({getItem:quotaStorage.getItem,setItem:(key,value)=>{
 if(key===RESET_BACKUP_KEY)throw Error('backup denied');quotaMemory.set(key,value);
}},undefined,()=> 'rollback');
const backupBefore=quotaMemory.get(RESET_BACKUP_KEY);
assert.throws(()=>rollbackLog.reset(fresh.state(),'GloVe'),/unchanged/);
assert.equal(quotaMemory.get(LOG_KEY),largeRaw);
assert.equal(quotaMemory.get(RESET_BACKUP_KEY),backupBefore);
assert.equal(rollbackLog.data.journeys[0].testPayload.length,18000);

// Recovery is also transactional, and keeps any new play rather than undoing it.
batch=newLog();batch.reset(new Game(e,'moon','kitchen',.28,{mode:'distance'}).state(),'GloVe');
const afterReset=structuredClone(batch.data);
const restoreDenied=new FlightLog({getItem:key=>memory.get(key),setItem:()=>{throw Error('quota');}},undefined,()=> 'restore-denied');
assert.throws(()=>restoreDenied.restorePrevious(),/unchanged/);
assert.deepEqual(restoreDenied.data,afterReset);assert.ok(restoreDenied.backup);
const restoreBackupRaw=memory.get(RESET_BACKUP_KEY),restoreLogRaw=memory.get(LOG_KEY);
const restoreWriteDenied=new FlightLog({getItem:key=>memory.get(key),setItem:(key,value)=>{
 if(key===LOG_KEY)throw Error('quota');memory.set(key,value);
}});
assert.throws(()=>restoreWriteDenied.restorePrevious(),/unchanged/);
assert.equal(memory.get(RESET_BACKUP_KEY),restoreBackupRaw);
assert.equal(memory.get(LOG_KEY),restoreLogRaw);
assert.deepEqual(restoreWriteDenied.data,afterReset);


// Corrupt historical storage can still be downloaded after reset and recovery.
memory.clear();memory.set(LOG_KEY,'corrupt old log');
const corrupt=newLog();corrupt.begin(fresh.state(),'GloVe');
corrupt.reset(fresh.state(),'GloVe');assert.equal(corrupt.unreadableRaw,undefined);
assert.ok(!corrupt.exportJSON().includes('corrupt old log'));
assert.equal(corrupt.backup.unreadableOriginal,'corrupt old log');
corrupt.restorePrevious();assert.equal(JSON.parse(corrupt.exportJSON()).unreadableOriginal,'corrupt old log');
console.log('Reset passed: new-only exports, persistent recovery, preservation of new rounds, failure rollback, and unreadable-original recovery.');

// The in-map card recalls actual guesses across this hole's attempts, not copied prefixes.
{
 const {holeAttemptLog}=await import('../static/hole-attempt-log.mjs');
 const s={start:'beetle',target:'castle',final_target:'castle',waypoint:{word:'armour'},challenge:{id:'hole-session',attempt:2},history:[{word:'knight',assumed:true}]};
 const row=(id,number,entries,extra={})=>({id,state:{...s,challenge:{...s.challenge,attempt:number},...extra},entries});
 const journeys=[row('first',1,[{origin:'horse',word:'knight',event:{success:true}},{origin:'armour',word:'knight',event:{success:false,outcome:'miss'}}],{challenge_failed:true}),row('current',2,[{origin:'horse',word:'knight',assumed:true,event:{success:true}},{origin:'knight',word:'castle',event:{automatic:true,success:true}},{origin:'knight',word:'xyzxyz',error:'That word is outside the supported vocabulary.'}]),row('other',1,[],{challenge:{id:'other-session',attempt:1}})];
 const rows=holeAttemptLog(journeys,s,'current');
 assert.deepEqual(rows.map(r=>r.number),[2,1]);assert.equal(rows[0].current,true);assert.equal(rows[0].from,'knight');
 assert.deepEqual(rows[0].shots.map(r=>r.word),['xyzxyz']);assert.equal(rows[0].shots[0].result,'Not allowed');
 assert.deepEqual(rows[1].shots.map(r=>r.word),['knight','knight'],'do not collapse the same guess from different lies/legs');
 assert.deepEqual(rows[1].shots.map(r=>r.result),['Landed','Miss']);assert.equal(rows[1].result,'Missed');
 assert.deepEqual(holeAttemptLog(journeys,{...s,challenge:undefined}),[]);
}

{
 const {holeAttemptLog}=await import('../static/hole-attempt-log.mjs');
 const state={start:'tee',target:'flag',challenge:{id:'outcomes',attempt:4},history:[]};
 const rows=holeAttemptLog(['won','abandoned','challenge_failed','live'].map((field,i)=>({id:String(i),state:{...state,challenge:{...state.challenge,attempt:i+1},[field]:true},entries:[{origin:'tee',word:'guess',event:{success:true}}]})),state,'3');
 assert.deepEqual(rows.map(r=>r.result),['In progress','Missed','Abandoned','Holed']);
}

{
 const {holeControlAvailability}=await import('../static/hole-attempt-log.mjs');
 const s={start:'tee',challenge:{id:'fresh'},history:[]};
 assert.deepEqual(holeControlAvailability([],s),{replay:false,log:true});
 assert.deepEqual(holeControlAvailability([],{...s,history:[{}]}),{replay:true,log:true});
 assert.deepEqual(holeControlAvailability([{state:{...s,history:[{}],challenge_failed:true}}],s),{replay:true,log:true});
 assert.deepEqual(holeControlAvailability([{state:{...s,challenge:{id:'older'},history:[{}],won:true}}],s),{replay:false,log:true});
}

{
 const {remainingHoleAttempts}=await import('../static/hole-attempt-log.mjs');
 const state={challenge:{par:3,attempt:1}};
 assert.equal(remainingHoleAttempts(state),6);
 assert.equal(remainingHoleAttempts({...state,challenge:{par:3,attempt:2}}),5);
 assert.equal(remainingHoleAttempts({...state,challenge:{par:3,attempt:2},won:true}),4);
 assert.equal(remainingHoleAttempts({...state,challenge:{par:3,attempt:6},challenge_failed:true}),0);
}
