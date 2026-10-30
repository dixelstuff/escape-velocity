/** Publish preselected word triples. Diagnostic witnesses only validate playability; they never choose or rewrite words. */
import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {dailyManifest} from '../static/daily-manifest.mjs';
import {addDay} from '../static/daily-game.mjs';
import {Game,waypointLegAccess} from '../static/engine.mjs';
import {spellingIdentity,SPELLING_EQUIVALENCE} from '../static/spelling-equivalence.mjs';
import {loadResearchModel} from './cleverness-research-utils.mjs';
const batch='word-first-20-2026-10-31',source='reports/word-first-20/proposals.json';
const proposalsText=fs.readFileSync(source,'utf8'),proposals=JSON.parse(proposalsText);
const safety=JSON.parse(fs.readFileSync(process.argv[2]??'reports/word-first-20/safety.json'));
assert.equal(proposals.length,20);assert.ok(!dailyManifest.holes.some(h=>h.settings.course_set===batch),'Already published');
assert.equal(crypto.createHash('sha256').update(proposalsText).digest('hex'),safety.sourceSha256,'Triples were fixed before the safety search');
const{e}=loadResearchModel(),oldCount=dailyManifest.holes.length,oldSha=crypto.createHash('sha256').update(JSON.stringify(dailyManifest.holes)).digest('hex');
const firstDate=addDay(dailyManifest.holes.at(-1).date,1),checks=[],ids=new Set(dailyManifest.holes.map(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target].map(spellingIdentity).join('|')));
for(const[i,p]of proposals.entries()){
 assert.equal(Object.hasOwn(p,'verificationWords'),false,'No intended route in proposals');
 const words=[p.start,p.waypoint,p.target],key=words.map(spellingIdentity).join('|');assert.ok(!ids.has(key),'Duplicate hole');ids.add(key);
 assert.ok(Object.values(p.directions).every(d=>d.length>=5),'Independent everyday association notes for each word');
 const s={...dailyManifest.holes.at(-1).settings,start:p.start,target:p.target,waypoint:{word:p.waypoint,threshold:.265,turn:i%2?'down':'up'},par:5,spelling_equivalence:SPELLING_EQUIVALENCE,second_leg_finish_span:.12,course_set:batch,course_number:i+1,golden_paths:[]};delete s.par_estimate;
 const access=waypointLegAccess(e,s);assert.equal(access.allowed,true,'Direct-leg check: '+key);
 const check=safety.checks.find(c=>c.words.join('|')===words.join('|'));assert.ok(check?.witness,'Post-selection safety witness');assert.equal(check.search.exhaustive,false);
 const g=new Game(e,p.start,p.target,s.threshold,s);for(const w of check.witness.inputs){assert.equal(g.won,false,'No extra words after hole completion');assert.equal(g.submit(w).success,true,key+': '+w);}assert.equal(g.won,true);assert.deepEqual(g.route,check.witness.state.route);assert.equal(g.state().attempts,check.witness.state.attempts);
 const date=addDay(firstDate,i),id='daily-'+date;checks.push({id,date,settings:s,directLegs:access.legs,safety:check});
 console.log(`${i+1}: ${words.join(' > ')} — checked`);
}
const next={...dailyManifest,holes:[...dailyManifest.holes,...checks.map(c=>({id:c.id,date:c.date,settings:c.settings}))]};assert.equal(crypto.createHash('sha256').update(JSON.stringify(next.holes.slice(0,oldCount))).digest('hex'),oldSha);
fs.writeFileSync('reports/word-first-20/validation.json',JSON.stringify({batch,oldCount,oldSha,firstDate,lastDate:checks.at(-1).date,proposalsSha256:safety.sourceSha256,checks},null,2)+'\n');
fs.writeFileSync('static/daily-manifest.mjs','/** Fixed one-per-day archive; published dates never depend on player progress. */\nexport const dailyManifest='+JSON.stringify(next)+';\n');
