import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {dailyManifest as archive} from '../static/daily-manifest.mjs';
import {adminHoleOrder} from '../static/admin-hole-order.mjs';
import {DailyGame,DAILY_KEY} from '../static/daily-game.mjs';
import {holeNumber} from '../static/daily-ui.mjs';
import {Game,waypointLegAccess,DOGLEG_FINISH_RULE} from '../static/engine.mjs';
import {requirePlayableWord} from '../static/playable-vocabulary.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
const read=f=>JSON.parse(fs.readFileSync('reports/discovery-replacement-twenty/'+f)),v=read('validation.json'),checks=read('opening-checks.json'),{e}=loadResearchModel();
// Reconstruct the original replacement collection after later batches prepend.
const publicCollection={version:1,view:'discovery-replacement-twenty-v1',entryHoleId:v.holes[0].id,holes:[...v.holes,...v.retainedPublicIds.map(id=>archive.holes.find(h=>h.id===id))]};
assert.equal(v.holes.length,20);assert.equal(publicCollection.holes.length,160);
assert.deepEqual(publicCollection.holes.slice(0,20),v.holes);
assert.deepEqual(publicCollection.holes.slice(20).map(h=>h.id),v.retainedPublicIds);
assert.equal(crypto.createHash('sha256').update(JSON.stringify(archive.holes.slice(0,v.priorCount))).digest('hex'),v.priorSha);
assert.deepEqual(archive.holes.slice(v.priorCount,v.priorCount+20),v.holes);
assert.equal(new Set(archive.holes.map(h=>h.id)).size,archive.holes.length);
const admin=adminHoleOrder(archive,publicCollection);assert.deepEqual(admin.holes.slice(0,160),publicCollection.holes);
assert.equal(v.withdrawnPublicIds.length,20);
for(const id of v.withdrawnPublicIds){assert.ok(archive.holes.some(h=>h.id===id));assert.ok(admin.holes.some(h=>h.id===id));assert.ok(!publicCollection.holes.some(h=>h.id===id));assert.ok(!v.holes.some(h=>h.id===id));}
let hits=0;
for(const [i,h]of v.holes.entries()){
 const s=h.settings;assert.equal(s.par,5);assert.deepEqual(s.dogleg_finish_rule,{version:DOGLEG_FINISH_RULE,after:0});assert.equal(s.second_leg_finish_span,.12);assert.equal(s.spelling_equivalence,'uk-us-v1');assert.equal(s.waypoint.turn,i%2?'down':'up');assert.equal(waypointLegAccess(e,s).allowed,true);assert.deepEqual(s.golden_paths,[]);
 for(const w of [s.start,s.waypoint.word,s.target]){requirePlayableWord(w);assert.ok(e.index.has(w));}
 assert.equal(checks[i].shots.length,6);let forward=0;
 for(const shot of checks[i].shots){requirePlayableWord(shot.word);const g=new Game(e,s.start,s.target,s.threshold,s),ev=g.submit(shot.word);assert.equal(ev.success,shot.success);assert.equal(ev.destination-ev.leg_baseline,shot.progress);if(ev.success&&shot.progress>0)forward++;}
 assert.ok(forward>=3);hits+=forward;
 for(const collection of [publicCollection,admin])assert.equal(holeNumber(new DailyGame(null,collection),h),'#'+(i+1));
}
const old=publicCollection.holes[20],record={id:old.id,date:old.date,tee:old.settings.start,waypoint:old.settings.waypoint.word,flag:old.settings.target,bestStrokes:{strokes:4,route:[old.settings.start,'saved-word',old.settings.target]}},memory=new Map([[DAILY_KEY,JSON.stringify({version:1,selected:old.date,holes:{[old.id]:record}})]]),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},game=new DailyGame(storage,publicCollection);
assert.deepEqual(game.current(),record);assert.equal(game.stats().completed,1);assert.equal(holeNumber(game,old),'#21');
// Withdrawing definitions from public view must not erase an existing archived result.
const withdrawn=archive.holes.find(h=>h.id===v.withdrawnPublicIds[0]),saved={id:withdrawn.id,date:withdrawn.date,tee:withdrawn.settings.start,waypoint:withdrawn.settings.waypoint.word,flag:withdrawn.settings.target,bestStrokes:{strokes:4,route:[withdrawn.settings.start,'saved-route',withdrawn.settings.target]}},historyMemory=new Map([[DAILY_KEY,JSON.stringify({version:1,selected:old.date,holes:{[withdrawn.id]:saved}})]]),historyStorage={getItem:k=>historyMemory.get(k)??null,setItem:(k,v)=>historyMemory.set(k,v)};
const publicGame=new DailyGame(historyStorage,publicCollection);assert.deepEqual(publicGame.data.holes[withdrawn.id],saved);
const adminGame=new DailyGame(historyStorage,admin);adminGame.visit(withdrawn.date);const {lastPlayedAt,...reopened}=adminGame.current();assert.deepEqual(reopened,saved);assert.equal(typeof lastPlayedAt,'string');
console.log(`Discovery replacement twenty passed: ${hits}/120 forward probes, public/admin #1–20, stable archive and saved progress.`);
