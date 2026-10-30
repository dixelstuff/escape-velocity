import assert from 'node:assert/strict';import fs from 'node:fs';import crypto from 'node:crypto';
import {dailyManifest} from '../static/daily-manifest.mjs';
import {addDay} from '../static/daily-game.mjs';
import {waypointLegAccess,Game} from '../static/engine.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
const audit=JSON.parse(fs.readFileSync('reports/fresh-daily-50/validation.json')),source=JSON.parse(fs.readFileSync('reports/fresh-daily-50/proposals.json')),{e,config}=loadResearchModel();
assert.equal(audit.oldCount,165);assert.equal(audit.firstDate,'2027-04-03');assert.equal(audit.lastDate,'2027-05-22');
assert.equal(crypto.createHash('sha256').update(JSON.stringify(dailyManifest.holes.slice(0,audit.oldCount))).digest('hex'),audit.oldSha,'Existing schedule is immutable');
const added=dailyManifest.holes.filter(h=>h.settings.course_set===audit.batch);assert.equal(added.length,50);assert.equal(source.length,50);assert.deepEqual(added,dailyManifest.holes.slice(audit.oldCount,audit.oldCount+50));
const prior=new Set();function scan(o){if(!o||typeof o!=='object')return;if(typeof o.start==='string'&&typeof o.target==='string'){prior.add(o.start);prior.add(o.target);if(o.waypoint?.word)prior.add(o.waypoint.word);}for(const v of Object.values(o))if(v&&typeof v==='object')scan(v);}
scan(dailyManifest.holes.slice(0,audit.oldCount));scan(config.puzzles);for(const f of fs.readdirSync('data').filter(f=>f.endsWith('.json')))scan(JSON.parse(fs.readFileSync('data/'+f)));
assert.deepEqual([...prior].sort(),audit.priorEndpoints);
const fresh=new Set();
for(const [i,h]of added.entries()){
 const p=source[i],check=audit.checks[i],s=h.settings;assert.equal(h.date,addDay(audit.firstDate,i));assert.equal(h.id,'daily-'+h.date);assert.equal(s.par,5);assert.equal(s.continuous_play,true);assert.deepEqual(s.golden_paths,[]);assert.equal(s.waypoint.threshold,.265);assert.equal(s.threshold,.27);assert.equal(s.launch_min,.095);assert.equal(s.launch_max,.215);assert.equal(s.waypoint.turn,i%2?'down':'up');assert.equal(waypointLegAccess(e,s).allowed,true);
 assert.deepEqual([s.start,s.waypoint.word,s.target],[p.start,p.waypoint,p.target]);
 for(const w of [s.start,s.waypoint.word,s.target]){assert.ok(e.index.has(w));assert.ok(!prior.has(w),'Previously used endpoint '+w);assert.ok(!fresh.has(w),'Repeated new word '+w);fresh.add(w);}
 assert.equal(s.second_leg_finish_span,.12);const g=new Game(e,s.start,s.target,s.threshold,{...s,challenge:{id:h.id,version:'stroke-play-v1',par:5,attempt:1,unlimited:true}});for(const word of p.verificationWords){assert.equal(g.won,false,'Verification must not contain words after completion');const event=g.submit(word);assert.equal(event.success,true,`${s.start}: ${word}`);}
 assert.equal(g.won,true);assert.equal(g.stage,1);assert.ok(g.history.some(h=>h.waypoint_reached));assert.equal(g.state().attempts,check.strokes);assert.deepEqual(g.state().route,check.route);
}
assert.equal(fresh.size,150);assert.equal(new Set(dailyManifest.holes.map(h=>h.id)).size,dailyManifest.holes.length);
console.log('Fresh schedule passed: 50 all-Par-5 holes, 150 unused distinct endpoints, original 165 unchanged, consecutive dates, direct-leg rejection and complete engine-verified routes.');
