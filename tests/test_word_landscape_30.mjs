import assert from 'node:assert/strict';
import fs from 'node:fs';import crypto from 'node:crypto';
import {dailyManifest} from '../static/daily-manifest.mjs';
import {DailyGame,addDay} from '../static/daily-game.mjs';
import {Game,waypointLegAccess} from '../static/engine.mjs';
import {isRetiredHole,retiredHoleWords} from '../static/hole-retirement.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
import {buildContextGraph,inspectWordLandscape,LANDSCAPE_CHECK_VERSION} from '../scripts/check_word_landscapes.mjs';
const dir='reports/word-landscape-30/',read=f=>JSON.parse(fs.readFileSync(dir+f)),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const ps=read('proposals.json'),v=read('validation.json'),safety=read('safety.json'),{e}=loadResearchModel(),ctx=buildContextGraph(e,read('directions.json'));
assert.equal(ps.length,30);assert.equal(v.oldCount,285);assert.ok(dailyManifest.holes.length>=315);assert.equal(sha(JSON.stringify(dailyManifest.holes.slice(0,285))),v.oldSha,'Every prior definition and stable ID is preserved');
assert.equal(sha(fs.readFileSync(dir+'proposals.json')),v.proposalsSha256);assert.equal(sha(fs.readFileSync(dir+'candidates.json')),safety.candidatesSha256);assert.equal(sha(fs.readFileSync(dir+'directions.json')),safety.directionsSha256);assert.equal(safety.version,LANDSCAPE_CHECK_VERSION);
const batch=dailyManifest.holes.slice(285,315);assert.equal(v.firstDate,'2027-08-01');assert.equal(v.lastDate,'2027-08-30');
const keys=new Set(dailyManifest.holes.slice(0,285).map(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target].map(ctx.resolve).join('|')));
for(const[i,h]of batch.entries()){
 const p=ps[i],c=v.checks[i].safety,s=h.settings,w=[p.start,p.waypoint,p.target],key=w.map(ctx.resolve).join('|');assert.ok(!keys.has(key));keys.add(key);
 assert.deepEqual([s.start,s.waypoint.word,s.target],w);assert.equal(s.par,5);assert.equal(s.course_set,v.batch);assert.equal(s.course_number,i+1);assert.equal(h.date,addDay(v.firstDate,i));assert.equal(h.id,'daily-'+h.date);
 assert.equal(s.threshold,.27);assert.equal(s.waypoint.threshold,.265);assert.equal(s.launch_min,.095);assert.equal(s.launch_max,.215);assert.equal(s.second_leg_finish_span,.12);assert.equal(s.spelling_equivalence,'uk-us-v1');assert.equal(s.continuous_play,true);assert.deepEqual(s.golden_paths,[]);assert.equal(isRetiredHole(h),['fold','root','border','tide','sleep'].includes(s.start));assert.equal(waypointLegAccess(e,s).allowed,true);
 assert.ok(!('route' in p)&&!('verificationWords'in p)&&!('route'in s),'No prescribed routes in proposals or game data');assert.ok(c.openingCount>=2);assert.ok(c.handoffs.length>=1);assert.equal(c.limits.exhaustive,false);assert.equal(c.witness.finishContextSupported,true);
 const make=()=>new Game(e,s.start,s.target,s.threshold,s),g=make();for(const word of c.witness.inputs){assert.equal(g.won,false);assert.equal(g.submit(word).success,true);}assert.equal(g.won,true);assert.deepEqual(g.route,c.witness.state.route);
 const last=g.history.at(-1).word,origin=ctx.resolve(last)===ctx.resolve(s.target)?g.route.at(-2):last;assert.ok(ctx.graph.get(ctx.resolve(origin)).has(ctx.resolve(s.target)),'Automatic as well as explicit final associations checked against independent context notes');
 for(const handoff of c.handoffs){const prefix=make();for(const word of handoff.inputs)assert.equal(prefix.submit(word).success,true);assert.equal(prefix.stage,1);assert.equal(prefix.leg_start,handoff.landing);
  for(const o of handoff.outgoing){const probe=make();for(const word of handoff.inputs)probe.submit(word);let result;try{result=probe.submit(o.word);}catch{}assert.equal(!!result?.success,o.hit,'Outgoing shot is checked from the actual reached lie, not the named waypoint');}
 }
}
const storage={getItem:()=>null,setItem:()=>{}},daily=new DailyGame(storage,dailyManifest,{today:()=> '2026-11-01'});assert.deepEqual(daily.available().filter(h=>h.settings.course_set===v.batch),batch.filter(h=>!['fold','root','border','tide','sleep'].includes(h.settings.start)));assert.equal(dailyManifest.holes.slice(0,315).filter(h=>!isRetiredHole(h)).length,286);assert.deepEqual(retiredHoleWords[25],['fame','scatter','ribbon']);
for(const words of read('controls.json').slice(0,4)){const h=dailyManifest.holes.find(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target].join('|')===words.join('|'));assert.ok(h&&!isRetiredHole(h));assert.equal(daily.definition(h.date),h,'All four player-approved holes remain available unchanged');}
const tiny=inspectWordLandscape(e,['warm','question','scale'],ctx,{approachDepth:2,finishDepth:2,beam:8,landingLimit:4});assert.deepEqual(inspectWordLandscape(e,['warm','question','scale'],ctx,{approachDepth:2,finishDepth:2,beam:8,landingLimit:4}),tiny,'Diagnostics are deterministic');
console.log('Word landscape 30 passed: every prior definition unchanged, authorised retirements, 30 legal word-first proposals, real dogleg handoffs and final associations replayed independently, historical batch preserved.');
