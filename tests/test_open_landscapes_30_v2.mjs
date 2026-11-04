import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {dailyManifest} from '../static/daily-manifest.mjs';
import {DailyGame,DAILY_KEY,addDay} from '../static/daily-game.mjs';
import {waypointLegAccess} from '../static/engine.mjs';
import {HistoricalWaypointGame as Game} from './historical-waypoint-game.mjs';
import {isRetiredHole} from '../static/hole-retirement.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
import {buildContextGraph} from '../scripts/check_word_landscapes.mjs';

const dir='reports/open-landscapes-30-v2/',read=f=>JSON.parse(fs.readFileSync(dir+f));
const ps=read('proposals.json'),v=read('validation.json'),audit=read('safety.json'),{e}=loadResearchModel();
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),ctx=buildContextGraph(e,read('directions.json'));
assert.equal(ps.length,30);assert.equal(v.oldCount,380);
assert.equal(sha(JSON.stringify(dailyManifest.holes.slice(0,v.oldCount))),v.oldSha,'Every earlier setting, stable ID and date is unchanged');
assert.equal(sha(fs.readFileSync(dir+'proposals.json')),audit.proposalsSha256);
assert.equal(sha(fs.readFileSync(dir+'directions.json')),audit.directionsSha256);
assert.equal(v.firstNumber,352);assert.equal(v.lastNumber,381);
assert.equal(v.firstDate,'2027-11-04');assert.equal(v.lastDate,'2027-12-03');
const batch=dailyManifest.holes.slice(v.oldCount,v.oldCount+30);assert.deepEqual(batch,v.holes);
assert.equal(new Set(dailyManifest.holes.map(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target].map(ctx.resolve).join('|'))).size,dailyManifest.holes.length);
let probes=0;
for(const[i,h]of batch.entries()){
 const p=ps[i],s=h.settings,c=audit.checks[i];
 assert.deepEqual([s.start,s.waypoint.word,s.target],[p.start,p.waypoint,p.target]);
 assert.deepEqual(c.words,[p.start,p.waypoint,p.target]);
 assert.equal(h.id,'daily-'+addDay(v.firstDate,i));assert.equal(h.date,addDay(v.firstDate,i));
 assert.equal(s.course_set,v.batch);assert.equal(s.course_number,i+1);assert.equal(s.par,5);
 assert.equal(s.waypoint.turn,i%2?'down':'up');assert.equal(s.waypoint.threshold,.265);
 assert.equal(s.threshold,.27);assert.equal(s.launch_min,.095);assert.equal(s.launch_max,.215);
 assert.equal(s.continuous_play,true);assert.equal(s.spelling_equivalence,'uk-us-v1');assert.equal(s.second_leg_finish_span,.12);
 assert.deepEqual(s.golden_paths,[]);assert.equal(isRetiredHole(h),false);
 assert.equal(waypointLegAccess(e,s).allowed,true);
 assert.ok(!('route' in p)&&!('verificationWords' in p)&&!('route' in s),'No intended route in live settings');
 const make=inputs=>{const g=new Game(e,s.start,s.target,.27,s);for(const w of inputs){assert.equal(g.won,false);assert.equal(g.submit(w).success,true);}return g;};
 const witness=make(c.witness.inputs);assert.equal(witness.won,true);assert.deepEqual(witness.route,c.witness.state.route);
 assert.equal(witness.state().attempts,c.witness.state.attempts,'Automatic finishing strokes counted by authoritative engine');
 assert.equal(c.limits.exhaustive,false);
 // Preserve the published evidence, not a universal numeric definition of a good hole.
 assert.equal(c.choices.profiles.length,c.choices.landings);
 for(const profile of c.choices.profiles){
  const g=make(profile.inputs);assert.equal(g.stage,1);assert.equal(g.leg_start,profile.landing);
  assert.equal(g.baseline,profile.flagSimilarity);assert.equal(g.won,profile.finishedOnArrival);
  if(!g.won)for(const word of c.choices.pool){
   const shot=make(profile.inputs);let result;try{result=shot.submit(word);}catch{}
   assert.equal(!!result?.success,profile.successfulWords.includes(word));
   assert.equal(!!result?.success&&result.destination>g.baseline,profile.advancingWords.includes(word));
   assert.equal(!!result?.success&&shot.won,profile.finishingWords.includes(word));probes++;
  }
  for(const w of profile.naturalOptions)assert.ok(ctx.graph.get(ctx.resolve(profile.landing))?.has(ctx.resolve(w)));
  if(profile.shortFinish){const finish=make([...profile.inputs,...profile.shortFinish.inputs]);assert.equal(finish.won,true);assert.equal(finish.route.length-g.route.length,profile.shortFinish.remainingStrokes);}
 }
}
// Expanding the archive must neither remap earlier IDs nor mutate retained best routes.
const old=dailyManifest.holes.find(h=>!isRetiredHole(h));
const saved={version:1,selected:old.date,holes:{[old.id]:{id:old.id,date:old.date,bestStrokes:{strokes:4,route:[old.settings.start,'remembered',old.settings.target]}}}};
const memory=new Map([[DAILY_KEY,JSON.stringify(saved)]]),storage={getItem:k=>memory.get(k)??null,setItem:(k,val)=>memory.set(k,val)};
const daily=new DailyGame(storage,dailyManifest,{today:()=> '2026-11-02'});
assert.deepEqual(daily.available().filter(h=>h.settings.course_set===v.batch),batch);
assert.equal(daily.available().filter(h=>h.date<=v.lastDate).length,381);
assert.deepEqual(daily.data.holes[old.id],saved.holes[old.id]);assert.equal(memory.get(DAILY_KEY),JSON.stringify(saved));
daily.visit(batch[0].date);daily.visit(batch.at(-1).date);
const restored=new DailyGame(storage,dailyManifest,{today:()=> '2026-11-02'});
assert.equal(restored.selected().id,batch.at(-1).id);assert.deepEqual(restored.data.holes[old.id],saved.holes[old.id]);
console.log(`Open landscapes passed: 30 completions, ${probes} landing-choice probes replayed, all 380 previous definitions and saved progress preserved; #352–#381 available.`);
