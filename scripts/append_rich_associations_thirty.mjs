/** Word-first batch, validated only for vocabulary, duplicates, direct legs and opening access. */
import fs from 'node:fs';import assert from 'node:assert/strict';import crypto from 'node:crypto';
import {dailyManifest as archive} from '../static/daily-manifest.mjs';import {dailyManifest as previousPublic} from '../static/public-manifest.mjs';
import {addDay} from '../static/daily-game.mjs';import {researchSettings,loadResearchModel} from './cleverness-research-utils.mjs';import {waypointLegAccess,DOGLEG_FINISH_RULE} from '../static/engine.mjs';import {requirePlayableWord} from '../static/playable-vocabulary.mjs';
const dir=(process.argv[2]??'reports/rich-associations-thirty').replace(/\/$/,'')+'/',batch=process.argv[3]??'rich-associations-thirty-2026-11-05',view=process.argv[4]??'rich-associations-thirty-v1';assert.ok(!archive.holes.some(h=>h.settings.course_set===batch),'Batch already added');
const proposals=JSON.parse(fs.readFileSync(dir+'proposals.json')),checks=JSON.parse(fs.readFileSync(dir+'opening-checks.json')),{e}=loadResearchModel();assert.ok(proposals.length>0);assert.equal(checks.length,proposals.length);
const keys=new Set(archive.holes.map(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target].join('|')));
const holes=proposals.map(([start,waypoint,target],i)=>{
 [start,waypoint,target].forEach(w=>{requirePlayableWord(w);assert.ok(e.index.has(w));});const key=[start,waypoint,target].join('|');assert.ok(!keys.has(key));keys.add(key);
 assert.deepEqual(checks[i].words,[start,waypoint,target]);assert.ok(checks[i].shots.filter(s=>s.success&&s.progress>0).length>=3);
 const settings={...researchSettings(start,waypoint,target),par:5,success_mode:true,success_version:'stroke-play-v1',course_set:batch,course_number:i+1,second_leg_finish_span:.12,spelling_equivalence:'uk-us-v1',dogleg_finish_rule:{version:DOGLEG_FINISH_RULE,after:0},golden_paths:[]};delete settings.challenge;settings.waypoint.turn=i%2?'down':'up';assert.ok(waypointLegAccess(e,settings).allowed);
 const date=addDay(archive.holes.at(-1).date,i+1);return {id:'daily-'+date,date,settings};
});
fs.writeFileSync(dir+'validation.json',JSON.stringify({batch,priorCount:archive.holes.length,priorSha:crypto.createHash('sha256').update(JSON.stringify(archive.holes)).digest('hex'),checks:'Independent familiar opening ideas per tee (counts in opening-checks.json); at least three legal forward hits. Direct literal legs disallowed. No continuation probes, full-route search, score targets or intended solutions.',holes,retainedPublicIds:previousPublic.holes.map(h=>h.id)},null,2)+'\n');
fs.writeFileSync('static/daily-manifest.mjs','/** Stable archive: published definitions retain their original IDs and dates. */\nexport const dailyManifest='+JSON.stringify({...archive,holes:[...archive.holes,...holes]})+';\n');
fs.writeFileSync('static/public-manifest.mjs','/** Newest playtest batch first; previous public holes retained. */\nexport const dailyManifest='+JSON.stringify({...previousPublic,view,entryHoleId:holes[0].id,holes:[...holes,...previousPublic.holes]})+';\n');
console.log(`Added ${holes.length}; current public/admin order: new batch, then earlier public holes. Stable IDs retained.`);
