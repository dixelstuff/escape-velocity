import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {dailyManifest as archive} from '../static/daily-manifest.mjs';
import {dailyManifest as publicCollection} from '../static/public-manifest.mjs';
import {adminHoleOrder} from '../static/admin-hole-order.mjs';
import {DailyGame,DAILY_KEY} from '../static/daily-game.mjs';
import {holeNumber} from '../static/daily-ui.mjs';
import {Game,waypointLegAccess,DOGLEG_FINISH_RULE} from '../static/engine.mjs';
import {requirePlayableWord} from '../static/playable-vocabulary.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
const read=f=>JSON.parse(fs.readFileSync('reports/inviting-discovery-ten/'+f)),v=read('validation.json'),checks=read('opening-checks.json'),{e}=loadResearchModel();
assert.equal(v.holes.length,10);assert.equal(publicCollection.holes.length,170);
assert.deepEqual(publicCollection.holes.slice(0,10),v.holes);
assert.deepEqual(publicCollection.holes.slice(10).map(h=>h.id),v.retainedPublicIds);
assert.equal(crypto.createHash('sha256').update(JSON.stringify(archive.holes.slice(0,v.priorCount))).digest('hex'),v.priorSha);
assert.deepEqual(archive.holes.slice(v.priorCount,v.priorCount+10),v.holes);
assert.equal(new Set(archive.holes.map(h=>h.id)).size,archive.holes.length);
const admin=adminHoleOrder(archive,publicCollection);assert.deepEqual(admin.holes.slice(0,170),publicCollection.holes);
let hits=0;
for(const [i,h]of v.holes.entries()){
 const s=h.settings;assert.equal(s.par,5);assert.deepEqual(s.dogleg_finish_rule,{version:DOGLEG_FINISH_RULE,after:0});assert.equal(s.second_leg_finish_span,.12);assert.equal(s.spelling_equivalence,'uk-us-v1');assert.equal(s.waypoint.turn,i%2?'down':'up');assert.equal(waypointLegAccess(e,s).allowed,true);assert.deepEqual(s.golden_paths,[]);
 for(const w of [s.start,s.waypoint.word,s.target]){requirePlayableWord(w);assert.ok(e.index.has(w));}
 assert.equal(checks[i].shots.length,6);let forward=0;
 for(const shot of checks[i].shots){requirePlayableWord(shot.word);const g=new Game(e,s.start,s.target,s.threshold,s),ev=g.submit(shot.word);assert.equal(ev.success,shot.success);assert.equal(ev.destination-ev.leg_baseline,shot.progress);if(ev.success&&shot.progress>0)forward++;}
 assert.ok(forward>=3);hits+=forward;
 for(const collection of [publicCollection,admin])assert.equal(holeNumber(new DailyGame(null,collection),h),'#'+(i+1));
}
const old=publicCollection.holes[10],record={id:old.id,date:old.date,tee:old.settings.start,waypoint:old.settings.waypoint.word,flag:old.settings.target,bestStrokes:{strokes:4,route:[old.settings.start,'saved-word',old.settings.target]}},memory=new Map([[DAILY_KEY,JSON.stringify({version:1,selected:old.date,holes:{[old.id]:record}})]]),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},game=new DailyGame(storage,publicCollection);
assert.deepEqual(game.current(),record);assert.equal(game.stats().completed,1);assert.equal(holeNumber(game,old),'#11');
console.log(`Inviting discovery ten passed: ${hits}/60 forward probes, public/admin #1–10, stable archive and saved progress.`);
