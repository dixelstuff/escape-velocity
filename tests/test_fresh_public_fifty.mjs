import fs from 'node:fs';
import crypto from 'node:crypto';
import assert from 'node:assert/strict';
import {dailyManifest as archive} from '../static/daily-manifest.mjs';
// Freeze this former public selection; current public composition is checked by test_discovery_public_twenty.mjs.
import {DailyGame,DAILY_KEY,addDay} from '../static/daily-game.mjs';
import {completedHoles,holeNumber} from '../static/daily-ui.mjs';
import {waypointLegAccess} from '../static/engine.mjs';
import {HistoricalWaypointGame as Game} from './historical-waypoint-game.mjs';
import {isRetiredHole} from '../static/hole-retirement.mjs';
import {spellingIdentity} from '../static/spelling-equivalence.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
const dir='reports/fresh-public-fifty/',read=f=>JSON.parse(fs.readFileSync(f)),v=read(dir+'validation.json'),ps=read(dir+'proposals.json'),audit=read(dir+'safety.json'),sha=b=>crypto.createHash('sha256').update(b).digest('hex');
const manifest={version:1,view:'fresh-public-fifty-v3',scopeToManifest:true,includeCustom:false,entryHoleId:v.holes[0].id,holes:v.holes};
assert.equal(v.oldCount,460);assert.equal(sha(JSON.stringify(archive.holes.slice(0,v.oldCount))),v.oldSha,'All previous definitions and IDs stay exactly unchanged');
const batch=archive.holes.slice(v.oldCount,v.oldCount+50);assert.deepEqual(batch,v.holes);assert.deepEqual(manifest.holes,batch);assert.equal(manifest.holes.length,50);
assert.equal(manifest.view,'fresh-public-fifty-v3');assert.equal(manifest.entryHoleId,batch[0].id);assert.equal(manifest.scopeToManifest,true);assert.equal(manifest.includeCustom,false);
assert.equal(v.firstNumber,432);assert.equal(v.lastNumber,481);assert.equal(v.firstDate,'2028-01-23');assert.equal(v.lastDate,'2028-03-12');
assert.equal(sha(fs.readFileSync(dir+'proposals.json')),audit.proposalsSha256);assert.equal(sha(fs.readFileSync(dir+'directions.json')),audit.directionsSha256);
const formerIds=new Set([...read('reports/public-fifty-rebalanced/selection.json').selection.map(h=>h.id),...read('reports/public-fifty/validation.json').holes.map(h=>h.id)]);
assert.ok(batch.every(h=>!formerIds.has(h.id)),'No previous public hole is reused in the fresh collection');
assert.equal(new Set(archive.holes.map(h=>[h.settings.start,h.settings.waypoint.word,h.settings.target].map(spellingIdentity).join('|'))).size,archive.holes.length,'No duplicate triples, including spelling aliases');
const {e}=loadResearchModel();let samples=0,landings=0;
for(const[i,h]of batch.entries()){
 const p=ps[i],s=h.settings,c=audit.checks[i],words=[p.start,p.waypoint,p.target];assert.deepEqual(c.words,words);assert.deepEqual(words,[s.start,s.waypoint.word,s.target]);
 assert.equal(h.id,'daily-'+addDay(v.firstDate,i));assert.equal(h.date,addDay(v.firstDate,i));assert.equal(s.course_set,v.batch);assert.equal(s.course_number,i+1);
 assert.equal(s.par,5);assert.equal(s.continuous_play,true);assert.equal(s.threshold,.27);assert.equal(s.waypoint.threshold,.265);assert.equal(s.launch_min,.095);assert.equal(s.launch_max,.215);assert.equal(s.second_leg_finish_span,.12);assert.equal(s.spelling_equivalence,'uk-us-v1');assert.equal(s.waypoint.turn,i%2?'down':'up');assert.deepEqual(s.golden_paths,[]);assert.equal(isRetiredHole(h),false);
 assert.ok(!('route' in s)&&!('route' in p)&&!('verificationWords' in p),'Live definitions contain no intended solution');assert.equal(waypointLegAccess(e,s).allowed,true);
 const make=inputs=>{const g=new Game(e,s.start,s.target,s.threshold,s);for(const w of inputs){assert.equal(g.won,false);assert.equal(g.submit(w).success,true);}return g;};
 const complete=make(c.witness.inputs);assert.equal(complete.won,true);assert.deepEqual(complete.route,c.witness.state.route);assert.equal(complete.state().attempts,c.witness.state.attempts);
 assert.equal(c.limits.exhaustive,false);assert.equal(c.choices.profiles.length,c.choices.landings);
 for(const[j,profile]of c.choices.profiles.entries()){
  const g=make(profile.inputs);landings++;assert.equal(g.stage,1);assert.equal(g.leg_start,profile.landing);assert.equal(g.baseline,profile.flagSimilarity);assert.equal(g.won,profile.finishedOnArrival);
  // Independently replay a deterministic spread of the shared pool. Full engine
  // evidence was generated offline; repeating every exploratory shot is unnecessary.
  const stride=Math.max(1,Math.ceil(c.choices.pool.length/8));
  if(!g.won)for(const[wordIndex,word]of c.choices.pool.entries())if((wordIndex+j)%stride===0){
   const probe=make(profile.inputs);let event;try{event=probe.submit(word);}catch{}
   assert.equal(!!event?.success,profile.successfulWords.includes(word));assert.equal(!!event?.success&&event.destination>g.baseline,profile.advancingWords.includes(word));assert.equal(!!event?.success&&probe.won,profile.finishingWords.includes(word));samples++;
  }
  if(profile.shortFinish){const finish=make([...profile.inputs,...profile.shortFinish.inputs]);assert.equal(finish.won,true);assert.equal(finish.route.length-g.route.length,profile.shortFinish.remainingStrokes);}
 }
}
// Replacing a view never erases or relabels the player's archived results.
const old=archive.holes.find(h=>h.id===[...formerIds][0]),oldRecord={id:old.id,date:old.date,tee:old.settings.start,waypoint:old.settings.waypoint.word,flag:old.settings.target,bestStrokes:{strokes:4,route:[old.settings.start,'saved',old.settings.target]}};
const saved={version:1,selected:old.date,holes:{[old.id]:oldRecord},customHoles:[{id:'custom-keep',date:'custom-keep',custom:true,settings:{start:'keep',waypoint:{word:'my'},target:'hole'}}]};
const memory=new Map([[DAILY_KEY,JSON.stringify(saved)]]),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},publicGame=new DailyGame(storage,manifest);
assert.equal(publicGame.available().length,50);assert.equal(publicGame.selected().id,batch[0].id);assert.equal(publicGame.stats().completed,0);assert.deepEqual(completedHoles(publicGame),[]);assert.deepEqual(publicGame.data.holes[old.id],oldRecord);assert.equal(memory.get(DAILY_KEY),JSON.stringify(saved),'Loading the replacement view is not a reset');
assert.equal(holeNumber(publicGame,batch[0]),'#1');assert.equal(holeNumber(publicGame,batch.at(-1)),'#50');assert.equal(publicGame.definition(old.date),undefined);assert.equal(publicGame.definition('custom-keep'),undefined);
publicGame.visit(batch[0].date);const state=structuredClone(audit.checks[0].witness.state);state.challenge={id:batch[0].id,version:'stroke-play-v1',par:5,attempt:1,unlimited:true};publicGame.record({id:'fresh-finish',updatedAt:'2026-11-04T01:00:00Z',state});assert.equal(publicGame.stats().completed,1);
const publicReload=new DailyGame(storage,manifest);assert.deepEqual(publicReload.current().bestStrokes.route,state.route);assert.deepEqual(publicReload.data.holes[old.id],oldRecord);
const admin=new DailyGame(storage,{...archive,holes:archive.holes.slice(0,v.oldCount+50)});assert.equal(admin.available().filter(h=>!h.custom).length,481);assert.equal(admin.definition('custom-keep').id,'custom-keep');assert.deepEqual(admin.data.holes[old.id],oldRecord);assert.equal(admin.stats().completed,2);
console.log(`Fresh fifty passed: 50 complete engine replays, ${landings} independently restored dogleg lies, ${samples} sampled onward-shot replays, no old public holes, unchanged archive/rules and retained progress.`);
