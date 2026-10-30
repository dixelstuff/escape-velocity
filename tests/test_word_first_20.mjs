import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {dailyManifest} from '../static/daily-manifest.mjs';
import {DailyGame,addDay} from '../static/daily-game.mjs';
import {Game,waypointLegAccess} from '../static/engine.mjs';
import {isRetiredHole} from '../static/hole-retirement.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
const text=fs.readFileSync('reports/word-first-20/proposals.json','utf8'),ps=JSON.parse(text),audit=JSON.parse(fs.readFileSync('reports/word-first-20/validation.json')),{e}=loadResearchModel();
assert.equal(ps.length,20);assert.equal(audit.oldCount,265);assert.equal(audit.firstDate,'2027-07-12');assert.equal(audit.lastDate,'2027-07-31');
assert.equal(crypto.createHash('sha256').update(text).digest('hex'),audit.proposalsSha256,'Words were fixed before post-selection safety validation');
assert.equal(crypto.createHash('sha256').update(JSON.stringify(dailyManifest.holes.slice(0,265))).digest('hex'),audit.oldSha,'Previous holes, IDs, dates and settings stay unchanged');
const batch=dailyManifest.holes.filter(h=>h.settings.course_set===audit.batch);assert.equal(batch.length,20);assert.deepEqual(batch,dailyManifest.holes.slice(265,285));
const originalKeys=new Set(dailyManifest.holes.slice(0,265).map(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target].join('|')));
for(const[i,h]of batch.entries()){
 const p=ps[i],s=h.settings,c=audit.checks[i];assert.deepEqual([s.start,s.waypoint.word,s.target],[p.start,p.waypoint,p.target]);assert.equal(h.id,c.id);assert.equal(h.date,addDay(audit.firstDate,i));
 assert.equal(s.par,5);assert.equal(s.threshold,.27);assert.equal(s.waypoint.threshold,.265);assert.equal(s.waypoint.turn,i%2?'down':'up');assert.equal(s.launch_min,.095);assert.equal(s.launch_max,.215);assert.equal(s.second_leg_finish_span,.12);assert.equal(s.spelling_equivalence,'uk-us-v1');assert.equal(s.continuous_play,true);
 assert.deepEqual(s.golden_paths,[]);assert.ok(!('route'in s)&&!('verificationWords'in s),'No route prescription in live hole settings');assert.ok(!('route'in p)&&!('verificationWords'in p),'Word proposals do not prescribe a solution');assert.equal(isRetiredHole(h),false);assert.equal(waypointLegAccess(e,s).allowed,true);
 assert.equal(originalKeys.has([p.start,p.waypoint,p.target].join('|')),false);originalKeys.add([p.start,p.waypoint,p.target].join('|'));
 assert.ok(Object.values(p.directions).every(v=>v.length>=5));assert.ok(c.safety.openings.filter(o=>o.hit&&o.forward).length>=2,'Several pre-written natural opening probes hit and advance');
 assert.equal(c.safety.search.exhaustive,false,'Bounded diagnostics never claim exhaustive coverage');
 const g=new Game(e,p.start,p.target,s.threshold,s);for(const word of c.safety.witness.inputs){assert.equal(g.won,false);assert.equal(g.submit(word).success,true);}assert.ok(g.won);assert.equal(g.stage,1);assert.deepEqual(g.route,c.safety.witness.state.route);assert.equal(g.state().attempts,c.safety.witness.state.attempts);
}
const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},daily=new DailyGame(storage,dailyManifest,{today:()=> '2026-10-31'});assert.equal(daily.available().length,263);assert.equal(daily.available().at(-20).id,batch[0].id);assert.equal(daily.available().at(-1).id,batch.at(-1).id);
assert.deepEqual(daily.available().slice(-20),batch);assert.equal(new Set(dailyManifest.holes.map(h=>h.id)).size,285);
console.log('Word-first 20 passed: fixed word-only proposals, multiple natural opening probes, legal completion diagnostics, no prescribed/golden route, original 265 definitions preserved, 263 selectable holes and #244–263 appended.');
