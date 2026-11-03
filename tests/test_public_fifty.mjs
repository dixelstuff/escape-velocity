import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {dailyManifest} from '../static/daily-manifest.mjs';
import {DailyGame,DAILY_KEY,addDay} from '../static/daily-game.mjs';
import {Game,waypointLegAccess} from '../static/engine.mjs';
import {isRetiredHole} from '../static/hole-retirement.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
import {buildContextGraph} from '../scripts/check_word_landscapes.mjs';

const dir='reports/public-fifty/',read=f=>JSON.parse(fs.readFileSync(dir+f));
const ps=read('proposals.json'),v=read('validation.json'),audit=read('safety.json'),{e}=loadResearchModel();
const sha=b=>crypto.createHash('sha256').update(b).digest('hex'),ctx=buildContextGraph(e,read('directions.json'));
assert.equal(ps.length,50);assert.equal(v.oldCount,410);
assert.equal(sha(JSON.stringify(dailyManifest.holes.slice(0,v.oldCount))),v.oldSha,'Every earlier setting, stable ID and date is unchanged');
assert.equal(sha(fs.readFileSync(dir+'proposals.json')),audit.proposalsSha256);
assert.equal(sha(fs.readFileSync(dir+'directions.json')),audit.directionsSha256);
assert.equal(v.firstNumber,382);assert.equal(v.lastNumber,431);
assert.equal(v.firstDate,'2027-12-04');assert.equal(v.lastDate,'2028-01-22');
const batch=dailyManifest.holes.slice(v.oldCount,v.oldCount+50);assert.deepEqual(batch,v.holes);
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
assert.equal(daily.available().filter(h=>h.date<=v.lastDate).length,431);
assert.deepEqual(daily.data.holes[old.id],saved.holes[old.id]);assert.equal(memory.get(DAILY_KEY),JSON.stringify(saved));
daily.visit(batch[0].date);daily.visit(batch.at(-1).date);
const restored=new DailyGame(storage,dailyManifest,{today:()=> '2026-11-02'});
assert.equal(restored.selected().id,batch.at(-1).id);assert.deepEqual(restored.data.holes[old.id],saved.holes[old.id]);
console.log(`Public fifty archive passed: 50 completions, ${probes} landing-choice probes replayed, all 410 previous definitions and saved progress preserved; #382–#431 available.`);

// Same permanent hole records, two independent browsing surfaces; no destructive migration.
// Freeze the launch collection here; the current editorial mix is checked separately.
const publicManifest={version:1,scopeToManifest:true,includeCustom:false,entryHoleId:batch[0].id,holes:batch};
assert.equal(publicManifest.holes.length,50);assert.deepEqual(publicManifest.holes,batch);
assert.equal(publicManifest.includeCustom,false);assert.equal(publicManifest.scopeToManifest,true);
const oldData=JSON.parse(memory.get(DAILY_KEY)),newHole=batch[0];
oldData.customHoles=[{id:'custom-keep',date:'custom-keep',custom:true,settings:{start:'keep',waypoint:{word:'my'},target:'hole'}}];
oldData.holes['custom-keep']={id:'custom-keep',bestStrokes:{strokes:4}};
oldData.holes[newHole.id]={id:newHole.id,date:newHole.date,bestStrokes:{strokes:4,route:[newHole.settings.start,'test',newHole.settings.target]}};
memory.set(DAILY_KEY,JSON.stringify(oldData));
const publicGame=new DailyGame(storage,publicManifest,{today:()=> '2026-11-03'});
assert.equal(publicGame.available().length,50);assert.equal(publicGame.latest().id,newHole.id,'Public collection starts at #1 without relying on archive dates');
assert.equal(publicGame.definition(old.date),undefined);assert.equal(publicGame.definition('custom-keep'),undefined);
assert.equal(publicGame.stats().completed,1);assert.ok(publicGame.visibleRecords().every(h=>batch.some(def=>def.id===h.id)));
assert.deepEqual(publicGame.data.holes[old.id],oldData.holes[old.id],'Hidden archive progress remains stored');
publicGame.visit(batch.at(-1).date);
const adminAgain=new DailyGame(storage,dailyManifest,{today:()=> '2026-11-03'});
assert.equal(adminAgain.available().length,432);assert.equal(adminAgain.definition('custom-keep').id,'custom-keep');
assert.deepEqual(adminAgain.data.holes[old.id],oldData.holes[old.id]);
assert.deepEqual(adminAgain.data.holes[newHole.id],oldData.holes[newHole.id]);
assert.equal(adminAgain.stats().completed,3,'Admin stats include public, archived and custom bests');
const {completedHoles,holeNumber}=await import('../static/daily-ui.mjs');
assert.deepEqual(completedHoles(publicGame).map(h=>h.id),[newHole.id]);
assert.equal(holeNumber(publicGame,batch[0]),'#1');assert.equal(holeNumber(publicGame,batch.at(-1)),'#50');
assert.equal(holeNumber(adminAgain,batch[0]),'#382');
console.log('Public/admin passed: exactly 50 shared stable definitions, public-only stats/recent finishes, full archive/custom recovery and view-specific numbering.');
