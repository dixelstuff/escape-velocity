import assert from 'node:assert/strict';
import {PlayArchiveStorage} from '../static/play-archive.mjs';
import {PersonalPlayStorage,PERSONAL_BATCH_KEY,personalPlayExport} from '../static/personal-play-storage.mjs';
import {DailyGame} from '../static/daily-game.mjs';
import {FlightLog,LOG_KEY,RESET_BACKUP_KEY} from '../static/flight-log.mjs';
import {clearResearchPlay} from '../static/reset-personal-play.mjs';
const local=new Map(),disk=new Map();let fail=false;
const root={get length(){return local.size;},key:i=>[...local.keys()][i],getItem:k=>local.get(k)??null,removeItem:k=>local.delete(k),setItem(k,v){if([...local].reduce((n,[key,value])=>n+(key===k?0:value.length),v.length)>12000)throw new DOMException('Full','QuotaExceededError');local.set(k,v);}};
const backend={async write(changes){if(fail)throw new DOMException('Full archive','QuotaExceededError');for(const [key,value]of changes)value===null?disk.delete(key):disk.set(key,value);}};
root.setItem(LOG_KEY,JSON.stringify({version:1,journeys:[],padding:'x'.repeat(10000)}));
const archive=new PlayArchiveStorage(root,backend);await archive.migrate();assert.equal(root.getItem(LOG_KEY),null);assert.ok(disk.get(LOG_KEY).length>10000);
archive.setItem(LOG_KEY,'x'.repeat(100000));await archive.flush();assert.equal(disk.get(LOG_KEY).length,100000);assert.ok(local.size===0);
const store=new PersonalPlayStorage(archive,()=> 'cleared'),stale=new PersonalPlayStorage(archive);
archive.setItem(LOG_KEY,JSON.stringify({version:1,journeys:[]}));await archive.flush();
const def={id:'test',date:'2026-10-29',settings:{start:'rabbit',waypoint:{word:'computing'},target:'bakery'}};
const daily=new DailyGame(store,{holes:[def]},{today:()=>def.date});daily.visit(def.date);
const log=new FlightLog(store,()=> '2026-10-29T01:00:00Z',(()=>{let i=0;return ()=>String(++i);})());
const state={start:'rabbit',current:'rabbit',waypoint:{word:'computing'},target:'computing',final_target:'bakery',challenge:{id:'test',unlimited:true,par:5},history:[],route:['rabbit'],attempts:0};
const old=log.begin({...state,won:true,attempts:4,route:['rabbit','mouse','chips','pie','bakery']},'Current');daily.record(old);
daily.current().bestStrokes.cleverness=80;daily.current().bestCleverness={...daily.current().bestStrokes,score:80,unrounded:80,version:'band-free-harmonic-v5-cubic70-slope2'};daily.save();
await archive.flush();const stats=daily.stats();
await clearResearchPlay(daily,log,state,'Current');assert.deepEqual(daily.stats(),stats);assert.equal(log.data.journeys.length,1);assert.equal(archive.getItem(store.key(RESET_BACKUP_KEY)),null);assert.ok(log.backup,'in-session recovery costs no disk space');
assert.equal(disk.get(LOG_KEY),undefined);assert.equal(root.getItem(PERSONAL_BATCH_KEY),'cleared');assert.throws(()=>stale.setItem(LOG_KEY,'old'),/another tab/);
const exported=personalPlayExport(daily,log);assert.ok(!JSON.stringify(exported.play).includes('mouse'));assert.ok(!JSON.stringify(exported.daily).includes('mouse'));assert.equal(exported.playerStats.completed,1);
daily.refreshClevernessBests(log.data.journeys);assert.deepEqual(daily.stats(),stats,'clearing research must not erase bests on reload');
const reloaded=new PlayArchiveStorage(root,backend,disk),reloadedDaily=new DailyGame(new PersonalPlayStorage(reloaded),{holes:[def]},{today:()=>def.date});assert.deepEqual(reloadedDaily.stats(),stats);
// A real asynchronous database failure rolls back both records and generation.
const before=JSON.stringify(log.data),beforeStats=JSON.stringify(daily.data),beforeDisk=[...disk],beforeLocal=[...local];store.makeId=()=> 'failed';fail=true;
await assert.rejects(clearResearchPlay(daily,log,state,'Current'),/Full archive/);assert.equal(JSON.stringify(log.data),before);assert.equal(JSON.stringify(daily.data),beforeStats);assert.deepEqual([...disk],beforeDisk);assert.deepEqual([...local],beforeLocal);assert.equal(store.batch,'cleared');fail=false;
// A failed local metadata commit also restores the already committed archive.
const write=root.setItem;root.setItem=(k,v)=>{if(k===PERSONAL_BATCH_KEY&&v==='failed')throw Error('marker failed');return write(k,v);};
await assert.rejects(clearResearchPlay(daily,log,state,'Current'),/marker failed/);assert.deepEqual([...disk].sort(),beforeDisk.sort());assert.deepEqual([...local].sort(),beforeLocal.sort());root.setItem=write;
// Failed queued saves remain available in memory and retry without losing data.
fail=true;archive.setItem(store.key(LOG_KEY),'retained');await assert.rejects(archive.flush(),/Full archive/);assert.equal(archive.getItem(store.key(LOG_KEY)),'retained');fail=false;await archive.flush();assert.equal(disk.get(store.key(LOG_KEY)),'retained');
console.log('Archive passed: migration, records beyond local quota, atomic reset/rollback, retained player stats, fresh-only exports, stale tabs, reload and failed-save retry. No real browser data was reset.');

// Clearing is still possible when a pending archive save cannot fit.
const normalWrite=backend.write;backend.write=async changes=>{if([...changes.values()].some(v=>v?.includes('oversized')))throw new DOMException('Full','QuotaExceededError');return normalWrite(changes);};
archive.setItem(store.key(LOG_KEY),'oversized');await assert.rejects(archive.flush(),/Full/);store.makeId=()=> 'after-full';await clearResearchPlay(daily,log,state,'Current');assert.equal(log.data.journeys.length,1);assert.equal(archive.error,null);assert.deepEqual(daily.stats(),stats);backend.write=normalWrite;
console.log('Full-storage recovery passed: export remains memory-backed and reset can replace a failing pending save without persisting another history copy.');
