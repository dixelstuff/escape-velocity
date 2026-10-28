import assert from 'node:assert/strict';
import {DailyGame,DAILY_KEY} from '../static/daily-game.mjs';
import {FlightLog,LOG_KEY} from '../static/flight-log.mjs';
import {resetPersonalPlay,restorePersonalPlay,DAILY_RESET_BACKUP_KEY} from '../static/reset-personal-play.mjs';
const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v),removeItem:k=>memory.delete(k)};
const def={id:'daily-1',date:'2026-10-28',settings:{start:'rabbit',waypoint:{word:'computing'},target:'bakery'}};
const daily=new DailyGame(storage,{holes:[def]},{today:()=>def.date}),log=new FlightLog(storage,()=> '2026-10-28T12:00:00Z',(()=>{let i=0;return ()=>String(++i);})());
const own=daily.addCustom({...def.settings,start:'pencil'});daily.visit(own.date);
const state={start:'pencil',current:'pencil',target:'computing',final_target:'bakery',waypoint:{word:'computing'},challenge:{id:own.id,par:5,attempt:1,unlimited:true},history:[],route:['pencil'],attempts:0,won:false};
const completed={...state,won:true,attempts:4,route:['pencil','stick','fire','bakery']};
const old=log.begin(completed,'Current');daily.record(old);
const exported=JSON.stringify({daily:daily.data,play:log.data}),custom=structuredClone(daily.data.customHoles);
// Opening/cancelling confirmation never calls the reset function.
assert.equal(JSON.stringify({daily:daily.data,play:log.data}),exported);
const fresh=resetPersonalPlay(daily,log,state,'Current');daily.record(fresh);
assert.equal(log.data.journeys.length,1);assert.equal(log.active.state.current,'pencil');assert.equal(log.active.state.challenge.attempt,1);assert.deepEqual(log.active.state.history,[]);
assert.equal(daily.stats().completed,0);assert.equal(daily.current().bestStrokes,undefined);assert.deepEqual(daily.data.customHoles,custom);assert.equal(daily.selected().id,own.id);
assert.ok(!log.data.journeys.some(j=>j.id===old.id));assert.equal(JSON.parse(exported).play.journeys[0].state.won,true);
assert.deepEqual(new DailyGame(storage,{holes:[def]}).data,daily.data);assert.deepEqual(new FlightLog(storage).data,log.data);
// A storage failure must retain both live histories and their persisted copies.
const beforeDaily=JSON.stringify(daily.data),beforeLog=JSON.stringify(log.data),savedDaily=storage.getItem(DAILY_KEY),savedLog=storage.getItem(LOG_KEY);
const original=storage.setItem;storage.setItem=(k,v)=>{if(k===LOG_KEY)throw Error('quota');return original(k,v);};
assert.throws(()=>resetPersonalPlay(daily,log,state,'Current'),/Could not safely reset/);
assert.equal(JSON.stringify(daily.data),beforeDaily);assert.equal(JSON.stringify(log.data),beforeLog);assert.equal(storage.getItem(DAILY_KEY),savedDaily);assert.equal(storage.getItem(LOG_KEY),savedLog);
console.log('Personal reset clears exported play and bests, preserves custom holes/selection, restarts at tee, persists and rolls back on storage failure.');

storage.setItem=original;
assert.ok(restorePersonalPlay(daily,log));assert.equal(daily.stats().completed,1);assert.equal(daily.current().bestStrokes.strokes,4);assert.deepEqual(daily.data.customHoles,custom);
assert.ok(log.data.journeys.some(j=>j.id===old.id));assert.ok(log.data.journeys.some(j=>j.id===fresh.id));
assert.ok(storage.getItem(DAILY_RESET_BACKUP_KEY));
console.log('Recovery restores prior personal bests/history and retains play since reset.');
