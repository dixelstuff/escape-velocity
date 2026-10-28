import assert from 'node:assert/strict';
import {PersonalPlayStorage,PERSONAL_BATCH_KEY,personalPlayExport} from '../static/personal-play-storage.mjs';
import {DailyGame} from '../static/daily-game.mjs';import {FlightLog,LOG_KEY} from '../static/flight-log.mjs';
import {resetPersonalPlay} from '../static/reset-personal-play.mjs';
const map=new Map(),root={getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)};
const first=new PersonalPlayStorage(root,()=> 'reset-one'),stale=new PersonalPlayStorage(root);
const manifest={holes:[{id:'x',date:'2026-10-28',settings:{}}]},daily=new DailyGame(first,manifest),log=new FlightLog(first,()=> '2026-10-28T12:00:00Z',(()=>{let i=0;return ()=>String(++i);})());
const state={start:'rabbit',current:'rabbit',route:['rabbit'],history:[],attempts:0,challenge:{id:'x',unlimited:true,par:5},waypoint:{word:'computing'},target:'bakery'};
log.begin({...state,route:['rabbit','old','bakery'],won:true},'Current');const legacy=root.getItem(LOG_KEY);
resetPersonalPlay(daily,log,state,'Current');assert.equal(root.getItem(PERSONAL_BATCH_KEY),'reset-one');assert.equal(log.data.journeys.length,1);
assert.throws(()=>stale.setItem(LOG_KEY,legacy),/another tab/);assert.throws(()=>stale.getItem(LOG_KEY),/another tab/);
// An older release can still write the old key; it cannot contaminate the active batch.
root.setItem(LOG_KEY,legacy);const reload=new FlightLog(new PersonalPlayStorage(root));assert.equal(reload.data.journeys.length,1);assert.deepEqual(reload.active.state.route,['rabbit']);
const before=JSON.stringify(log.data),dayBefore=JSON.stringify(daily.data);const original=root.setItem;
root.setItem=(k,v)=>{if(k===PERSONAL_BATCH_KEY)throw Error('quota');return original(k,v);};first.makeId=()=> 'failed-batch';
assert.throws(()=>resetPersonalPlay(daily,log,state,'Current'),/quota/);assert.equal(first.batch,'reset-one');assert.equal(JSON.stringify(log.data),before);assert.equal(JSON.stringify(daily.data),dayBefore);assert.equal(root.getItem(PERSONAL_BATCH_KEY),'reset-one');
console.log('Reset batch isolation passed: legacy migration, stale current/old-release tabs, current-only export source, refresh and failed-commit rollback.');

daily.data.customHoles=[{id:'unused-custom',settings:{start:'old'}},{id:'x',settings:{start:'rabbit'}}];daily.record(log.active);
const exported=personalPlayExport(daily,log);assert.deepEqual(exported.daily.customHoles.map(h=>h.id),['x']);assert.equal(daily.data.customHoles.length,2);assert.deepEqual(exported.play.journeys.map(j=>j.state.route),[['rabbit']]);
console.log('Personal export excludes unrelated saved custom definitions without deleting them.');
