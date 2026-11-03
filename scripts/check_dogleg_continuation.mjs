/** Offline calibration and limited route-edit checks, not a solution search. */
import fs from 'node:fs';import assert from 'node:assert/strict';
import {Game} from '../static/engine.mjs';import {VectorClevernessAnalyser} from '../static/vector-cleverness/index.mjs';import {applyLiveCleverness} from '../static/cleverness-live-score.mjs';import {loadResearchModel} from './cleverness-research-utils.mjs';
const {e,store,config}=loadResearchModel(),analyser=new VectorClevernessAnalyser(e,{store,modelSha:config.vector_sha256}),rows=[],seen=new Set();
const previous=r=>{const c=r.continuation_treatment?.context,{dogleg_continuation,continuation_treatment,...old}=r;return applyLiveCleverness({...old,components:c?{...r.components,strategic_effectiveness:c.base_strategy,route_elegance:c.base_elegance}:r.components});};
async function check(id,state,source='calibration'){
 const key=JSON.stringify([state.route,state.waypoint.word,state.second_leg_finish_span??0,state.spelling_equivalence??'']);if(seen.has(key))return;seen.add(key);
 const before=JSON.stringify(state),r=await analyser.analyse(state),old=previous(r);assert.equal(JSON.stringify(state),before);assert.equal(r.components.semantic_ingenuity,old.components.semantic_ingenuity);assert.deepEqual(r.opportunity,old.opportunity);assert.deepEqual(r.band_free.legs,old.band_free.legs);assert.equal(r.band_free.one_stroke_bonus.eligible,old.band_free.one_stroke_bonus.eligible);assert.ok(r.band_free.unrounded_score<=r.band_free.maximum_for_legs+1e-9);assert.equal(applyLiveCleverness(r).band_free.unrounded_score,r.band_free.unrounded_score);
 if(!r.continuation_treatment.applied)assert.equal(r.band_free.unrounded_score,old.band_free.unrounded_score);
 rows.push({id,source,state,route:state.route,oldScore:old.band_free.score,newScore:r.band_free.score,oldUnrounded:old.band_free.unrounded_score,newUnrounded:r.band_free.unrounded_score,oldComponents:old.components,newComponents:r.components,proof:r.dogleg_continuation,treatment:r.continuation_treatment});console.log(id,old.band_free.score,'→',r.band_free.score,r.dogleg_continuation.classification,r.continuation_treatment.applied?'APPLIED':'');return r;
}
for(const input of JSON.parse(fs.readFileSync('reports/dogleg-continuation/inputs.json')))await check(input.id,input.state,input.source);
// Small deterministic edit pool, no search for new complete routes. Each padded
// variant inserts one word before a recorded landing and replays the same suffix.
const originals=rows.filter(r=>r.source!=='padding').slice(),pool=[...new Set(originals.flatMap(r=>r.route.slice(1,-1)))].sort();let tested=0,padded=0;
for(const original of originals.slice(0,25)){
 const s=original.state,history=s.history.filter(h=>!h.automatic),index=history.findIndex(h=>h.waypoint_reached);let found=0;
 for(const word of pool){
  if(history.some(h=>h.word===word)||word===s.start||word===s.final_target)continue;
  const g=new Game(e,s.start,s.final_target,s.final_threshold,s);let valid=true;tested++;
  try{
   for(const h of history.slice(0,index))if(!g.submit(h.word).success){valid=false;break;}
   if(!valid||g.stage!==0)continue;const inserted=g.submit(word);if(!inserted.success||!inserted.waypoint_reached||g.won)continue;
   for(const h of history.slice(index)){if(g.won)break;if(!g.submit(h.word).success){valid=false;break;}}
  }catch{continue;}
  if(!valid||!g.won)continue;
  const expected=[...s.route.slice(0,index+1),word,...s.route.slice(index+1)];
  if(JSON.stringify(g.route)!==JSON.stringify(expected))continue; // An earlier finish that replaces later choices is a different route, not padding.
  const state=g.state(),r=await check('padding-'+original.id+'-'+word,state,'padding');if(!r)continue;found++;padded++;
  // A stronger semantic journey may legitimately score higher; flag the much
  // narrower case where qualification alone overtakes a cleaner route without
  // improved ingenuity or elegance.
  const base=original.newComponents,unearned=r.band_free.unrounded_score>original.newUnrounded+1e-9&&r.components.semantic_ingenuity<=base.semantic_ingenuity+1e-9&&r.components.route_elegance<=base.route_elegance+1e-9;
  rows.at(-1).insertion={baseId:original.id,baseScore:original.newScore,unearned,ingenuityImproved:r.components.semantic_ingenuity>base.semantic_ingenuity+1e-9,eleganceImproved:r.components.route_elegance>base.route_elegance+1e-9};
  if(found===2)break;
 }
}
fs.writeFileSync('reports/dogleg-continuation/comparison.json',JSON.stringify({modelSha:config.vector_sha256,scope:'Fixed completed routes and a bounded one-word insertion pool; not an exhaustive solution search.',testedInsertions:tested,padded,rows},null,2)+'\n');
console.log('SUMMARY',JSON.stringify({routes:rows.length,changed:rows.filter(r=>r.oldScore!==r.newScore).length,padded,unearned:rows.filter(r=>r.insertion?.unearned).map(r=>({id:r.id,from:r.insertion.baseScore,to:r.newScore}))}));
