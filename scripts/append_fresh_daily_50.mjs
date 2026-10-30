/** Curated schedule append. This script validates every authored route before writing. */
import fs from 'node:fs';import crypto from 'node:crypto';import assert from 'node:assert/strict';
import {dailyManifest} from '../static/daily-manifest.mjs';
import {addDay} from '../static/daily-game.mjs';
import {waypointLegAccess} from '../static/engine.mjs';
import {loadResearchModel,playResearchRoute} from './cleverness-research-utils.mjs';
const batch='fresh-daily-2026-10-30',source='reports/fresh-daily-50/proposals.json',proposals=JSON.parse(fs.readFileSync(source));
assert.equal(proposals.length,50);assert.ok(!dailyManifest.holes.some(h=>h.settings.course_set===batch),'Batch is already appended');
const {e,config}=loadResearchModel(),used=new Set();
function scan(o){if(!o||typeof o!=='object')return;if(typeof o.start==='string'&&typeof o.target==='string'){used.add(o.start);used.add(o.target);if(o.waypoint?.word)used.add(o.waypoint.word);}for(const v of Object.values(o))if(v&&typeof v==='object')scan(v);}
scan(dailyManifest);scan(config.puzzles);for(const file of fs.readdirSync('data').filter(f=>f.endsWith('.json'))){scan(JSON.parse(fs.readFileSync('data/'+file)));}
const oldCount=dailyManifest.holes.length,oldSha=crypto.createHash('sha256').update(JSON.stringify(dailyManifest.holes)).digest('hex'),firstDate=addDay(dailyManifest.holes.at(-1).date,1),checks=[],newWords=new Set();
for(const [i,p]of proposals.entries()){
 for(const w of [p.start,p.waypoint,p.target]){assert.ok(e.index.has(w),'Unsupported '+w);assert.ok(!used.has(w),'Previously used endpoint '+w);assert.ok(!newWords.has(w),'Repeated new endpoint '+w);newWords.add(w);}
 const settings={...dailyManifest.holes.at(-1).settings,start:p.start,target:p.target,waypoint:{word:p.waypoint,threshold:.265,turn:i%2?'down':'up'},par:5,second_leg_finish_span:.12,course_set:batch,course_number:i+1,golden_paths:[]};
 delete settings.par_estimate;
 const access=waypointLegAccess(e,settings);assert.equal(access.allowed,true,`${p.start}: trivial direct leg`);
 const played=playResearchRoute(e,settings,p.verificationWords);assert.equal(played.discrepancy,null,`${p.start}: ${played.discrepancy}`);assert.ok(played.state.won);assert.ok(played.events.some(ev=>ev.waypoint_reached));
 const date=addDay(firstDate,i),id='daily-'+date;
 checks.push({id,date,number:oldCount+i+1,start:p.start,waypoint:p.waypoint,target:p.target,settings,reason:p.reason,verificationWords:p.verificationWords,route:played.state.route,strokes:played.state.attempts,directLegs:access.legs,events:played.events});
 console.log(`${oldCount+i+1} ${date}: ${p.start} > ${p.waypoint} > ${p.target} (${played.state.attempts} strokes verified)`);
}
assert.equal(newWords.size,150);
const next={...dailyManifest,holes:[...dailyManifest.holes,...checks.map(r=>({id:r.id,date:r.date,settings:r.settings}))]};
assert.equal(crypto.createHash('sha256').update(JSON.stringify(next.holes.slice(0,oldCount))).digest('hex'),oldSha);
fs.writeFileSync('reports/fresh-daily-50/validation.json',JSON.stringify({batch,oldCount,oldSha,firstDate,lastDate:checks.at(-1).date,priorEndpoints:[...used].sort(),checks},null,2)+'\n');
fs.writeFileSync('reports/fresh-daily-50/README.md','# Fifty fresh daily holes\n\nAll Par 5, appended without changing existing dates or definitions. All 150 tee/dogleg/flag words are distinct and absent from the existing schedule and banked hole endpoints. This checks published/local bank definitions, not private device history or every previously played intermediary word.\n\nEach authored verification route was replayed through the current engine with normal family rescue, direction, dogleg and automatic finishing rules. Both direct legs are rejected. These are example routes, not optimality claims, exhaustive searches or hints shown in the app. No scoring, thresholds, model files or gameplay logic changed.\n\n**Spoilers below.**\n\n| # | Date | Tee → dogleg → flag | Verified completed route | Strokes | Rationale |\n|---|---|---|---|---:|---|\n'+checks.map(r=>`| ${r.number} | ${r.date} | ${[r.start,r.waypoint,r.target].map(w=>w.toUpperCase()).join(' → ')} | ${r.route.map(w=>w.toUpperCase()).join(' → ')} | ${r.strokes} | ${r.reason} |`).join('\n')+'\n');
fs.writeFileSync('static/daily-manifest.mjs','/** Fixed one-per-day archive; published dates never depend on player progress. */\nexport const dailyManifest='+JSON.stringify(next)+';\n');
