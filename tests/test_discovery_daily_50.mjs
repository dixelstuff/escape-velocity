import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {dailyManifest} from '../static/daily-manifest.mjs';
import {addDay,DailyGame} from '../static/daily-game.mjs';
import {Game,waypointLegAccess} from '../static/engine.mjs';
import {isRetiredHole} from '../static/hole-retirement.mjs';
import {spellingIdentity,SPELLING_EQUIVALENCE} from '../static/spelling-equivalence.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
const audit=JSON.parse(fs.readFileSync('reports/discovery-daily-50/validation.json'));
const proposals=JSON.parse(fs.readFileSync('reports/discovery-daily-50/proposals.json'));
const {e}=loadResearchModel(),added=dailyManifest.holes.filter(h=>h.settings.course_set===audit.batch);
assert.equal(audit.oldCount,215);assert.equal(audit.firstDate,'2027-05-23');assert.equal(audit.lastDate,'2027-07-11');
assert.equal(crypto.createHash('sha256').update(JSON.stringify(dailyManifest.holes.slice(0,audit.oldCount))).digest('hex'),audit.oldSha,'Existing definitions, dates and IDs are unchanged');
assert.equal(added.length,50);assert.equal(proposals.length,50);assert.deepEqual(added,dailyManifest.holes.slice(audit.oldCount,audit.oldCount+50));
const keys=new Set(dailyManifest.holes.slice(0,audit.oldCount).map(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target].map(spellingIdentity).join('|')));
let setups=0;
for(const[i,h]of added.entries()){
 const p=proposals[i],c=audit.checks[i],s=h.settings;
 assert.equal(h.date,addDay(audit.firstDate,i));assert.equal(h.id,'daily-'+h.date);
 assert.deepEqual([s.start,s.waypoint.word,s.target],[p.start,p.waypoint,p.target]);
 assert.equal(s.par,5);assert.equal(s.continuous_play,true);assert.deepEqual(s.golden_paths,[]);
 assert.equal(s.waypoint.threshold,.265);assert.equal(s.threshold,.27);assert.equal(s.launch_min,.095);assert.equal(s.launch_max,.215);assert.equal(s.second_leg_finish_span,.12);assert.equal(s.spelling_equivalence,SPELLING_EQUIVALENCE);
 assert.equal(s.waypoint.turn,i%2?'down':'up');assert.equal(waypointLegAccess(e,s).allowed,true,'Both literal direct legs must remain inaccessible');// Published definitions are retained even when subsequently retired by user feedback.
 const key=[s.start,s.waypoint.word,s.target].map(spellingIdentity).join('|');assert.equal(keys.has(key),false,'No existing or duplicate three-word hole');keys.add(key);
 for(const w of [s.start,s.waypoint.word,s.target,...p.verificationWords])assert.ok(e.index.has(w),'Supported vocabulary: '+w);
 const g=new Game(e,s.start,s.target,s.threshold,s);
 for(const w of p.verificationWords){assert.equal(g.won,false,'No trailing words after completion');assert.equal(g.submit(w).success,true,`${s.start}: ${w}`);}
 assert.ok(g.won);assert.equal(g.stage,1);assert.deepEqual(g.route,c.route);assert.equal(g.state().attempts,c.strokes);
 const first=g.history.findIndex(h=>h.waypoint_reached)+1;assert.ok(first>0);assert.deepEqual([first,g.state().attempts-first],c.legStrokes);if(first>=2)setups++;
}
// Record the historical audit; setup count is not an editorial quality gate.
for(const words of [['guava','horticulture','robin'],['okra','conservation','swallow'],['bellows','forge','clover']]){
 const h=dailyManifest.holes.find(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target].join('|')===words.join('|'));assert.ok(h,'Archived definition retained');assert.ok(isRetiredHole(h));
}
const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},game=new DailyGame(storage,dailyManifest,{today:()=> '2026-10-30'});
const playableBatch=added.filter(h=>!isRetiredHole(h));assert.equal(playableBatch.length,43);assert.equal(game.available().length,243);assert.equal(game.available().at(-43).id,playableBatch[0].id);assert.equal(game.available().at(-1).id,playableBatch.at(-1).id);
assert.equal(new Set(dailyManifest.holes.map(h=>h.id)).size,dailyManifest.holes.length);
console.log(`Discovery batch passed: 50 all-Par-5 holes, ${setups} verified setup approaches, 50 complete current-rule routes, inaccessible direct legs, original 215 unchanged, historical batch preserved, 43 still playable in batch, 243 playable holes overall.`);
