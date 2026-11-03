import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {dailyManifest as archive} from '../static/daily-manifest.mjs';
import {DailyGame,DAILY_KEY} from '../static/daily-game.mjs';
import {completedHoles,holeNumber} from '../static/daily-ui.mjs';
import {Game,waypointLegAccess} from '../static/engine.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
const read=f=>JSON.parse(fs.readFileSync(f)),plan=read('reports/public-fifty-rebalanced/selection.json'),validation=read('reports/public-fifty-rebalanced/validation.json');
// Historical mix stays reproducible when a later public collection replaces it.
const manifest={version:1,view:plan.version,scopeToManifest:true,includeCustom:false,entryHoleId:plan.selection[0].id,holes:plan.selection.map(r=>archive.holes.find(h=>h.id===r.id))};
const historicalArchive={...archive,holes:archive.holes.slice(0,validation.archiveDefinitions)};
assert.equal(manifest.holes.length,50);assert.equal(manifest.view,plan.version);assert.equal(new Set(manifest.holes.map(h=>h.id)).size,50);
assert.equal(crypto.createHash('sha256').update(JSON.stringify(historicalArchive)).digest('hex'),validation.archiveSha256,'Entire archive must stay unchanged');
assert.equal(historicalArchive.holes.length,validation.archiveDefinitions);assert.deepEqual(manifest.holes.map(h=>h.id),validation.publicIds);
assert.equal(plan.selection.filter(r=>r.source==='playtested-30').length,20);assert.equal(plan.selection.filter(r=>r.source==='playful-50').length,30);
const previous=read('reports/public-fifty/validation.json').holes,played=read('reports/open-landscapes-30-v2/play-feedback/summary.json').rows;
assert.equal(plan.removedFromPublic.length,20);
for(const row of plan.removedFromPublic){assert.equal(previous[row.originalPublicNumber-1].id,row.id);assert.ok(!manifest.holes.some(h=>h.id===row.id));assert.ok(archive.holes.some(h=>h.id===row.id));assert.ok(row.reason.length>30);}
const audits=[...read('reports/public-fifty/safety.json').checks,...read('reports/open-landscapes-30-v2/safety.json').checks],{e}=loadResearchModel();
for(const [i,h] of manifest.holes.entries()){
 assert.deepEqual(h,archive.holes.find(x=>x.id===h.id));assert.equal(h.settings.par,5);assert.equal(h.settings.continuous_play,true);
 const words=[h.settings.start,h.settings.waypoint.word,h.settings.target],row=plan.selection[i];assert.deepEqual(words,row.words);
 const check=audits.find(c=>JSON.stringify(c.words)===JSON.stringify(words));assert.ok(check?.witness);assert.equal(waypointLegAccess(e,h.settings).allowed,true);
 const g=new Game(e,h.settings.start,h.settings.target,h.settings.threshold,h.settings);
 for(const w of check.witness.inputs){assert.equal(g.won,false);assert.equal(g.submit(w).success,true);}
 assert.equal(g.won,true);assert.deepEqual(g.route,check.witness.state.route);
 if(row.source==='playtested-30'){
  const feedback=played.find(r=>JSON.stringify(r.hole)===JSON.stringify(words));assert.ok(feedback?.completedRoutes>0);assert.equal(row.playEvidence.bestStrokes,feedback.bestStrokes);assert.equal(row.playEvidence.submittedThroughFirstFinish,feedback.submittedThroughFirstFinish);
 }
}
assert.deepEqual(manifest.holes.slice(0,2).map(h=>h.settings.start),['strike','wink']);
assert.equal(manifest.entryHoleId,manifest.holes[0].id);
// A saved hole is keyed by permanent identity, never its new display position.
const retained=manifest.holes.find(h=>previous.some(p=>p.id===h.id)),incoming=manifest.holes[0],removed=archive.holes.find(h=>h.id===plan.removedFromPublic[0].id);
const record=h=>({id:h.id,date:h.date,tee:h.settings.start,waypoint:h.settings.waypoint.word,flag:h.settings.target,completedAt:'2026-11-03T08:00:00Z',bestStrokes:{strokes:4,route:[h.settings.start,'saved-word',h.settings.target],state:{won:true,current:h.settings.target,attempts:4}}});
const data={version:1,selected:retained.date,holes:Object.fromEntries([retained,incoming,removed].map(h=>[h.id,record(h)])),customHoles:[]};
const memory=new Map([[DAILY_KEY,JSON.stringify(data)]]),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)};
const publicGame=new DailyGame(storage,manifest);assert.equal(publicGame.selected().id,retained.id);assert.deepEqual(publicGame.current(),data.holes[retained.id]);
assert.equal(publicGame.stats().completed,2);assert.equal(completedHoles(publicGame).length,2);assert.equal(publicGame.definition(removed.date),undefined);
assert.deepEqual(publicGame.data.holes[removed.id],data.holes[removed.id]);
assert.notEqual(holeNumber(publicGame,retained),'#'+(previous.findIndex(h=>h.id===retained.id)+1),'Retained hole can be renumbered without copying or resetting it');
publicGame.visit(incoming.date);assert.deepEqual(publicGame.current(),{...data.holes[incoming.id],lastPlayedAt:publicGame.current().lastPlayedAt});
const admin=new DailyGame(storage,archive);assert.equal(admin.available().filter(h=>historicalArchive.holes.some(old=>old.id===h.id)).length,431);assert.equal(admin.stats().completed,3);assert.deepEqual(admin.data.holes[removed.id],data.holes[removed.id]);
// A withdrawn selected hole falls back safely; it is never silently replaced under its ID.
const withdrawn={...data,selected:removed.date};memory.set(DAILY_KEY,JSON.stringify(withdrawn));const fallback=new DailyGame(storage,manifest);assert.equal(fallback.selected().id,incoming.id);assert.deepEqual(fallback.data.holes[removed.id],data.holes[removed.id]);
console.log('Rebalanced public course passed: 20 played + 30 newer, 50 engine completions, unchanged archive/rules, stable progress through reorder and public withdrawal, scoped stats and safe fallback.');
