import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {dailyManifest as archive} from '../static/daily-manifest.mjs';
import {dailyManifest as publicCollection} from '../static/public-manifest.mjs';
import {adminHoleOrder} from '../static/admin-hole-order.mjs';
import {DailyGame,DAILY_KEY} from '../static/daily-game.mjs';
import {holeNumber} from '../static/daily-ui.mjs';
import {Game,waypointLegAccess,DOGLEG_FINISH_RULE} from '../static/engine.mjs';
import {requirePlayableWord} from '../static/playable-vocabulary.mjs';
import {spellingIdentity} from '../static/spelling-equivalence.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
const read=f=>JSON.parse(fs.readFileSync('reports/everyday-transitions-twenty/'+f)),v=read('validation.json'),checks=read('opening-checks.json'),{e}=loadResearchModel();
assert.equal(v.holes.length,20);assert.equal(publicCollection.holes.length,240);
assert.deepEqual(publicCollection.holes.slice(0,20),v.holes);
assert.deepEqual(publicCollection.holes.slice(20).map(h=>h.id),v.retainedPublicIds);
assert.equal(crypto.createHash('sha256').update(JSON.stringify(archive.holes.slice(0,v.priorCount))).digest('hex'),v.priorSha);
assert.deepEqual(archive.holes.slice(v.priorCount,v.priorCount+20),v.holes);
assert.equal(new Set(archive.holes.map(h=>h.id)).size,archive.holes.length);
const admin=adminHoleOrder(archive,publicCollection);assert.deepEqual(admin.holes.slice(0,240),publicCollection.holes);
assert.equal(new Set(v.holes.map(h=>h.settings.editorial_style.style)).size,1);
for(const [i,h]of v.holes.entries()){assert.equal(h.settings.editorial_style.style,'everyday-transitions');assert.equal(h.settings.editorial_style.position,i+1);assert.equal(h.settings.editorial_style.experiment,'everyday-transitions-2026-11-09');}
const freshness=read('freshness.json'),excludedHoles=freshness.excludedHoleIds.map(id=>archive.holes.find(h=>h.id===id));assert.ok(excludedHoles.every(Boolean));
const excludedWords=new Set(excludedHoles.flatMap(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target]).map(spellingIdentity)),newWords=v.holes.flatMap(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target]).map(spellingIdentity);
assert.equal(excludedWords.size,freshness.excludedWordCount);assert.equal(new Set(newWords).size,60);assert.ok(newWords.every(w=>!excludedWords.has(w)),'No recent word reuse, including withdrawn batches');
assert.ok(freshness.excludedHoleIds.some(id=>!v.retainedPublicIds.includes(id)),'Freshness includes archived holes outside the public collection');
let hits=0;
for(const [i,h]of v.holes.entries()){
 const s=h.settings;assert.equal(s.par,5);assert.deepEqual(s.dogleg_finish_rule,{version:DOGLEG_FINISH_RULE,after:0});assert.equal(s.second_leg_finish_span,.12);assert.equal(s.spelling_equivalence,'uk-us-v1');assert.equal(s.waypoint.turn,i%2?'down':'up');assert.equal(waypointLegAccess(e,s).allowed,true);assert.deepEqual(s.golden_paths,[]);
 for(const w of [s.start,s.waypoint.word,s.target]){requirePlayableWord(w);assert.ok(e.index.has(w));}
 assert.equal(checks[i].shots.length,6);let forward=0;
 for(const shot of checks[i].shots){requirePlayableWord(shot.word);const g=new Game(e,s.start,s.target,s.threshold,s);let ev;try{ev=g.submit(shot.word);}catch(error){assert.equal(error.message,shot.error);continue;}assert.equal(shot.error,undefined);assert.equal(ev.success,shot.success);assert.equal(ev.destination-ev.leg_baseline,shot.progress);if(ev.success&&shot.progress>0)forward++;}
 assert.ok(forward>=3);hits+=forward;
 for(const collection of [publicCollection,admin])assert.equal(holeNumber(new DailyGame(null,collection),h),'#'+(i+1));
}
const old=publicCollection.holes[20],record={id:old.id,date:old.date,tee:old.settings.start,waypoint:old.settings.waypoint.word,flag:old.settings.target,bestStrokes:{strokes:4,route:[old.settings.start,'saved-word',old.settings.target]}},memory=new Map([[DAILY_KEY,JSON.stringify({version:1,selected:old.date,holes:{[old.id]:record}})]]),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},game=new DailyGame(storage,publicCollection);
assert.deepEqual(game.current(),record);assert.equal(game.stats().completed,1);assert.equal(holeNumber(game,old),'#21');
console.log(`Everyday transitions twenty passed: ${hits}/120 forward probes, public/admin #1–20, stable archive and saved progress.`);
