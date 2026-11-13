import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {dailyManifest as archive} from '../static/daily-manifest.mjs';
import {adminHoleOrder} from '../static/admin-hole-order.mjs';
import {DailyGame,DAILY_KEY} from '../static/daily-game.mjs';
import {holeNumber} from '../static/daily-ui.mjs';
import {Game,waypointLegAccess,DOGLEG_FINISH_RULE} from '../static/engine.mjs';
import {requirePlayableWord} from '../static/playable-vocabulary.mjs';
import {spellingIdentity} from '../static/spelling-equivalence.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
const read=f=>JSON.parse(fs.readFileSync('reports/public-forty-and-new-twenty/'+f)),v=read('validation.json'),c=read('curation.json'),checks=read('opening-checks.json'),{e}=loadResearchModel();
// Reconstruct this curation before later welcoming reorder and replacement.
const publicCollection={version:1,view:'curated-forty-and-new-twenty-v1',entryHoleId:c.selectedIds[0],holes:c.finalPublicIds.map(id=>archive.holes.find(h=>h.id===id))};
assert.equal(c.reviewed.length,120);assert.equal(new Set(c.reviewed.map(h=>h.id)).size,120);assert.equal(c.selectedIds.length,40);assert.equal(c.withdrawnPublicIds.length,17);assert.equal(c.retainedAfterFeaturedIds.length,283);assert.equal(v.holes.length,20);
assert.equal(publicCollection.holes.length,343);assert.equal(publicCollection.view,'curated-forty-and-new-twenty-v1');assert.equal(publicCollection.entryHoleId,c.selectedIds[0]);
assert.deepEqual(publicCollection.holes.map(h=>h.id),c.finalPublicIds);
assert.deepEqual(publicCollection.holes.slice(0,40).map(h=>h.id),c.selectedIds);
assert.deepEqual(publicCollection.holes.slice(40,-20).map(h=>h.id),c.retainedAfterFeaturedIds);
assert.deepEqual(publicCollection.holes.slice(-20),v.holes);assert.deepEqual(c.newIds,v.holes.map(h=>h.id));
assert.ok(c.selectedIds.every(id=>c.reviewed.find(h=>h.id===id)?.enjoyment>=4));assert.ok(c.reviewed.filter(h=>h.enjoyment===5).every(h=>c.selectedIds.includes(h.id)));
assert.ok(c.reviewed.filter(h=>h.enjoyment===3).every(h=>c.retainedAfterFeaturedIds.includes(h.id)));
assert.deepEqual(c.withdrawnPublicIds.slice().sort(),c.reviewed.filter(h=>h.enjoyment<=2).map(h=>h.id).sort());
const selected=new Set(c.selectedIds),removed=new Set(c.withdrawnPublicIds);assert.deepEqual(c.retainedAfterFeaturedIds,c.priorPublicIds.filter(id=>!selected.has(id)&&!removed.has(id)));assert.equal(new Set(c.finalPublicIds).size,343);
assert.equal(crypto.createHash('sha256').update(JSON.stringify(archive.holes.slice(0,v.priorCount))).digest('hex'),v.priorSha);assert.deepEqual(archive.holes.slice(v.priorCount,v.priorCount+20),v.holes);assert.equal(new Set(archive.holes.map(h=>h.id)).size,archive.holes.length);
for(const h of publicCollection.holes)assert.deepEqual(h,archive.holes.find(a=>a.id===h.id),'Reordering does not change definitions');
const admin=adminHoleOrder(archive,publicCollection);assert.deepEqual(admin.holes.slice(0,343),publicCollection.holes);assert.equal(new Set(admin.holes.map(h=>h.id)).size,archive.holes.length);
for(const id of removed){assert.ok(!publicCollection.holes.some(h=>h.id===id));assert.ok(admin.holes.findIndex(h=>h.id===id)>=343);}
const freshness=read('freshness.json'),excludedHoles=freshness.excludedHoleIds.map(id=>archive.holes.find(h=>h.id===id));assert.ok(excludedHoles.every(Boolean));const excludedWords=new Set(excludedHoles.flatMap(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target]).map(spellingIdentity)),newWords=v.holes.flatMap(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target]).map(spellingIdentity);assert.equal(excludedWords.size,freshness.excludedWordCount);assert.equal(new Set(newWords).size,60);assert.ok(newWords.every(w=>!excludedWords.has(w)));assert.ok(c.priorPublicIds.every(id=>freshness.excludedHoleIds.includes(id)),'Freshness includes all prior public holes, including withdrawals');
let hits=0;
for(const [i,h]of v.holes.entries()){
 const s=h.settings;assert.equal(s.par,5);assert.deepEqual(s.dogleg_finish_rule,{version:DOGLEG_FINISH_RULE,after:0});assert.equal(s.second_leg_finish_span,.12);assert.equal(s.spelling_equivalence,'uk-us-v1');assert.equal(s.waypoint.turn,i%2?'down':'up');assert.equal(waypointLegAccess(e,s).allowed,true);assert.deepEqual(s.golden_paths,[]);assert.equal(s.editorial_style.experiment,'public-refresh-2026-11-13');assert.equal(s.editorial_style.position,i+1);
 for(const w of [s.start,s.waypoint.word,s.target]){requirePlayableWord(w);assert.ok(e.index.has(w));}
 assert.equal(checks[i].shots.length,6);let forward=0;
 for(const shot of checks[i].shots){requirePlayableWord(shot.word);const g=new Game(e,s.start,s.target,s.threshold,s);let ev;try{ev=g.submit(shot.word);}catch(error){assert.equal(error.message,shot.error);continue;}assert.equal(shot.error,undefined);assert.equal(ev.success,shot.success);assert.equal(ev.destination-ev.leg_baseline,shot.progress);if(ev.success&&shot.progress>0)forward++;}
 assert.ok(forward>=3);hits+=forward;
 for(const collection of [publicCollection,admin])assert.equal(holeNumber(new DailyGame(null,collection),h),'#'+(324+i));
}
const ids=[c.selectedIds[0],c.retainedAfterFeaturedIds[0],c.withdrawnPublicIds[0]],records=Object.fromEntries(ids.map(id=>{const h=archive.holes.find(h=>h.id===id);return [id,{id,date:h.date,tee:h.settings.start,waypoint:h.settings.waypoint.word,flag:h.settings.target,bestStrokes:{strokes:4,route:[h.settings.start,'saved-word',h.settings.target]}}];}));
const memory=new Map([[DAILY_KEY,JSON.stringify({version:1,selected:records[ids[0]].date,holes:records})]]),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},game=new DailyGame(storage,publicCollection);assert.deepEqual(game.current(),records[ids[0]]);assert.equal(holeNumber(game,game.selected()),'#1');assert.deepEqual(game.data.holes,records);game.save();const archivedGame=new DailyGame(storage,admin);assert.deepEqual(archivedGame.data.holes,records);archivedGame.visit(records[ids[2]].date);assert.deepEqual(archivedGame.current().bestStrokes,records[ids[2]].bestStrokes,'Public withdrawal preserves archived progress');
console.log(`Public forty and new twenty passed: rated curation, 17 public-only withdrawals, 20 new at #324–343 (${hits}/120 forward probes), stable IDs and retained progress.`);
