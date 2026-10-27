/** Experimental explanations only. Never consulted by gameplay or ranking. */
import {Game} from './engine.mjs?v=golf-v182';
import {SemanticAnalyser,semanticRouteKey} from './semantic-analysis.mjs?v=golf-v182';
import {lexicalRelation} from './lexical-relations.mjs?v=golf-v182';
import {clevernessKey,CLEVERNESS_VERSION} from './cleverness-key.mjs?v=golf-v182';
export {clevernessKey,CLEVERNESS_VERSION};
const positive=x=>Math.max(0,x),EPS=1e-12;
const lexical=(a,b)=>a<b?-1:a>b?1:0;
const compactShot=(shot,error)=>shot?{word:shot.word,success:shot.success,connected:shot.connected,safe:shot.safe,launch:shot.launch,required:shot.required,hit_margin:Number.isFinite(shot.launch)&&Number.isFinite(shot.required)?shot.launch-shot.required:null,hub_surcharge:shot.hub_surcharge??0,scoring_word:shot.scoring_word??shot.word,stage:shot.stage??0,leg_target:shot.leg_target,leg_baseline:shot.leg_baseline,waypoint_reached:!!shot.waypoint_reached,waypoint_finish:!!shot.waypoint_finish,won:!!shot.won,finish_reason:shot.finish_reason??null}:{success:false,error};
export const freshRouteGame=(e,saved)=>new Game(e,saved.start,saved.final_target??saved.target,saved.final_threshold??saved.threshold,saved);

/** Only replay selected existing route words. Early automatic completion is real
 * evidence, not a failure or a hypothetical continuation. No vocabulary search.
 */
export function replaySelection(e,saved,manual,keep=null){
 const game=freshRouteGame(e,saved),events=[];
 try{
  for(const node of manual){
   if(keep&&!keep.has(node.position))continue;
   if(game.won)break;
   const shot=game.submit(node.word);events.push({position:node.position,...compactShot(shot)});
   if(!shot.success)return {valid:false,events,reason:`${node.word.toUpperCase()} was not playable.`,failed_position:node.position};
  }
  return {valid:game.won,events,reason:game.won?null:'The retained words did not complete the hole.',route:[...game.route],strokes:game.history.length+game.automatic_shots.length,dogleg:game.history.find(h=>h.waypoint_reached)?.word??null,game};
 }catch(error){return {valid:false,events,reason:error.message};}
}
const publicProof=proof=>{const {game,...result}=proof;return result;};

/** Bounded DAG over actual route positions. Its proposed combination is ALWAYS
 * replayed; independence of individually valid bypasses is never assumed.
 */
export function combineBypasses(e,saved,manual,route,opportunities){
 const end=route.length-1,edges=Array.from({length:route.length},()=>[]);
 for(let i=0;i<end;i++)edges[i].push({to:i+1,removed:[]});
 for(const o of opportunities.filter(o=>!o.changed_dogleg))edges[o.from].push({to:o.to,removed:o.removed_positions});
 const costs=Array(route.length).fill(Infinity),paths=Array(route.length).fill(null);costs[0]=0;paths[0]=[0];
 for(let i=0;i<end;i++)for(const edge of edges[i])if(costs[i]+1<costs[edge.to]){costs[edge.to]=costs[i]+1;paths[edge.to]=[...paths[i],edge.to];}
 const selected=new Set(paths[end]??route.map((_,i)=>i)),proposed=manual.filter(n=>!selected.has(n.position)).map(n=>n.position);
 let proof=replaySelection(e,saved,manual,new Set(manual.filter(n=>!proposed.includes(n.position)).map(n=>n.position))),removed=proposed;
 if(!proof.valid){
  // Conservative fallback: commit a removal only after the combination succeeds.
  removed=[];proof=replaySelection(e,saved,manual);
  for(const o of [...opportunities].filter(o=>!o.changed_dogleg).sort((a,b)=>b.removed_positions.length-a.removed_positions.length||a.from-b.from)){
   const trial=[...new Set([...removed,...o.removed_positions])],candidate=replaySelection(e,saved,manual,new Set(manual.filter(n=>!trial.includes(n.position)).map(n=>n.position)));
   if(candidate.valid){removed=trial;proof=candidate;}
  }
 }
 return {removed_positions:removed.sort((a,b)=>a-b),proof:publicProof(proof),method:'route-position DAG, verified by full engine replay; greedy verified fallback if needed',globally_optimal:false};
}

export function mechanicalDiagnostics(e,saved,report){
 const route=report.route,manual=(saved.history??[]).map((event,eventIndex)=>({word:event.word,eventIndex,event})).filter(n=>n.event.success&&!n.event.automatic).map((n,i)=>({...n,position:i+1}));
 const limits={maximum_route_words:64,maximum_bypass_tests:512},unavailable=reason=>({available:false,reason,limits});
 if(manual.length>limits.maximum_route_words)return unavailable('This unusually long route exceeds the diagnostic bound; semantic evidence remains available.');
 const original=replaySelection(e,saved,manual);
 if(!original.valid||JSON.stringify(original.route)!==JSON.stringify(route))return unavailable('This saved route does not reproduce under its recorded rules/model. '+(original.reason??'Its completion differs.'));
 const before=[],after=[],game=freshRouteGame(e,saved);
 for(const node of manual){
  before[node.position]=game.state();const actual=game.submit(node.word);after[node.position]=game.state();
  if(actual.success!==node.event.success||!!actual.waypoint_reached!==!!node.event.waypoint_reached||(node.event.scoring_word??node.word)!==(actual.scoring_word??node.word))return unavailable(`The recorded landing of ${node.word.toUpperCase()} differs when replayed.`);
 }
 const landing=manual.find(n=>n.event.waypoint_reached),proofCache=new Map();let tests=0;
 const prove=removed=>{
  const key=[...removed].sort((a,b)=>a-b).join(',');if(!proofCache.has(key)){
   tests++;proofCache.set(key,replaySelection(e,saved,manual,new Set(manual.filter(n=>!removed.includes(n.position)).map(n=>n.position))));
  }return proofCache.get(key);
 };
 function directBefore(position,word){
  const g=freshRouteGame(e,saved);
  try{for(const n of manual){if(n.position>=position)break;g.submit(n.word);}if(g.won)return {success:false,error:'The prefix already finished.'};return compactShot(g.submit(word));}catch(error){return compactShot(null,error.message);}
 }
 const words=report.bridges.map(b=>{
  const next=manual.find(n=>n.position===b.position+1),direct=directBefore(b.position,b.successor),actualEvent=next?original.events.find(h=>h.position===next.position):null;
  const automatic=manual.find(n=>n.position===b.position)?.event.automatic_shot;
  const actual=actualEvent??(automatic?compactShot({...automatic,stage:saved.waypoint?1:0,leg_target:saved.final_target??saved.target,launch:automatic.launch??null,required:automatic.required??null}):null);
  const sameObjective=!!actual&&!direct.error&&(direct.leg_target??saved.final_target??saved.target)===(actual.leg_target??saved.final_target??saved.target)&&direct.stage===actual.stage;
  const proof=prove([b.position]),changedDogleg=proof.valid&&proof.dogleg!==original.dogleg;
  return {word:b.word,position:b.position,from:b.predecessor,next:b.successor,direct,actual_next:actual,same_objective:sameObjective,hit_margin_gain:sameObjective&&Number.isFinite(actual?.hit_margin)&&Number.isFinite(direct.hit_margin)?actual.hit_margin-direct.hit_margin:null,necessary_for_next:!direct.success&&!direct.error,blocked_by_rule:direct.error??null,required_dogleg_transition:!!manual.find(n=>n.position===b.position)?.event.waypoint_reached&&!direct.waypoint_reached,removable:proof.valid,removal:publicProof(proof),changed_dogleg:changedDogleg,landed_dogleg:!!manual.find(n=>n.position===b.position)?.event.waypoint_reached};
 });
 const opportunities=[];
 const add=(from,to,removed,proof)=>{
  if(!proof.valid)return;
  opportunities.push({from,to,from_word:route[from],to_word:route[to],removed_positions:removed,removed_words:removed.map(p=>route[p]),changed_dogleg:proof.dogleg!==original.dogleg,proof:publicProof(proof)});
 };
 for(const w of words)if(w.removable)add(w.position-1,w.position+1,[w.position],proofCache.get(String(w.position)));
 let bounded=false;
 for(let from=0;from<route.length-2;from++)for(let to=from+2;to<route.length;to++){
  if(to===from+2)continue;
  if(tests>=limits.maximum_bypass_tests){bounded=true;break;}
  const removed=manual.filter(n=>n.position>from&&n.position<to).map(n=>n.position);
  // Multiword search stays within an original leg and retains its landing.
  if(landing&&removed.includes(landing.position))continue;
  const startStage=from===0?0:(after[from]?.stage??0),endStage=to===route.length-1?(saved.waypoint?1:0):(before[to]?.stage??0);
  if(startStage!==endStage)continue;
  add(from,to,removed,prove(removed));
 }
 const combined=combineBypasses(e,saved,manual,route,opportunities),bestSingle=opportunities.filter(o=>o.changed_dogleg).sort((a,b)=>(a.proof.strokes-b.proof.strokes)||a.from-b.from)[0];
 if(bestSingle&&(!combined.proof.valid||bestSingle.proof.strokes<combined.proof.strokes)){combined.removed_positions=bestSingle.removed_positions;combined.proof=bestSingle.proof;combined.method='full replay with changed dogleg landing and recalculated second leg';}
 if(combined.proof.valid){const executed=new Set(combined.proof.events.map(h=>h.position));combined.removed_positions=report.bridges.filter(b=>!executed.has(b.position)).map(b=>b.position);}
 const avoidable=combined.proof.valid?Math.max(0,original.strokes-combined.proof.strokes):0;
 return {available:true,original_strokes:original.strokes,original_dogleg:original.dogleg,words,opportunities,combined,avoidable_strokes:avoidable,individually_removable:words.filter(w=>w.removable).map(w=>({word:w.word,position:w.position,changed_dogleg:w.changed_dogleg})),tests,bounded,limits,search_scope:'actual route words only; same-leg subsequences plus individually removed landings; all claims replayed to completion',possibly_inefficient:'Unsearched alternatives are unknown, not proven inefficiency.'};
}

function semanticPivots(analyser,saved,report){
 const e=analyser.e,objectives=[saved.waypoint?.word,saved.final_target??saved.target].filter(Boolean);
 return report.bridges.map(b=>{
  const a=analyser.row(b.predecessor),c=analyser.row(b.successor),middle=analyser.row(b.word);
  const witnesses=(side,own,other)=>analyser.nearest(side).filter(n=>n.word!==b.word&&n.word!==b.predecessor&&n.word!==b.successor).map(n=>({word:n.word,bridge_similarity:middle[n.index],side_similarity:own[n.index],other_similarity:other[n.index],support:positive(middle[n.index])*positive(own[n.index]-other[n.index])})).sort((x,y)=>y.support-x.support||lexical(x.word,y.word)).slice(0,5);
  const left=witnesses(b.predecessor,a,c),right=witnesses(b.successor,c,a),mean=xs=>xs.slice(0,3).reduce((n,x)=>n+x.support,0)/Math.min(3,xs.length||1),support=Math.sqrt(mean(left)*mean(right));
  const shortcuts=objectives.map(target=>lexicalRelation(b.word,target)).filter(Boolean).map(s=>({...s,similarity:e.cosine(s.from,s.to),credited_objective_affinity:positive(e.cosine(s.from,s.to))*s.creativity_factor,association:s.to===b.predecessor||s.to===b.successor?'played context':'objective access'})),factor=shortcuts.length?.1:1;
  const contextFactor=shortcuts.some(s=>s.association==='played context')?.1:1;
  // An additive diagnostic ordering, not a cleverness score. Neither shots,
  // objective distance, v1 distinctiveness nor mechanical economy feeds it.
  const raw=(b.separation.value+support)/2;
  return {word:b.word,position:b.position,predecessor:b.predecessor,successor:b.successor,separation:b.separation.value,distinctiveness:b.distinctiveness.value,context_support:support,left_witnesses:left,right_witnesses:right,raw_evidence:raw,objective_association_factor:factor,context_credit_factor:contextFactor,credited_evidence:raw*contextFactor,lexical_shortcuts:shortcuts,first_played:b.position===1,limitation:'Evidence for two contexts, not proof of different meanings. No human sense label is inferred.'};
 });
}

function doglegDiagnostics(e,saved,report){
 const old=report.dogleg,chosen=report.bridges.find(b=>b.dogleg);
 if(!saved.waypoint)return null;
 if(!chosen||!old?.available)return {available:false,reason:old?.reason??'No reproducible dogleg landing pool.'};
 const prefix=(saved.history??[]).slice(0,chosen.eventIndex),pool=[chosen.word,...old.alternatives.map(a=>a.word)],candidates=[];
 for(const word of pool){
  const g=freshRouteGame(e,saved);
  try{
   for(const event of prefix)g.submit(event.word);
   const shot=g.submit(word);
   if(!shot.success||!shot.waypoint_reached)continue;
   const current=g.e.cosine(word,g.final_target),credited=g.e.cosine(shot.scoring_word??word,g.final_target),shortfall=g.finishShortfall(shot.scoring_word??word,credited),required=g.requirement(word,g.final_target,current,g.e.cosine(g.final_target,g.final_target)).required;
   candidates.push({word,scoring_word:shot.scoring_word??word,immediate_completion:g.won,automatic_finish:!!shot.automatic_shot,second_leg_baseline:g.baseline,flag_affinity:current,credited_finish_affinity:credited,finish_shortfall:shortfall,target_hit_requirement:required,target_hit_margin:current-required,first_leg_hit_margin:Number.isFinite(shot.launch)&&Number.isFinite(shot.required)?shot.launch-shot.required:null});
  }catch{/* Candidate coverage is stated below; no inferred uniqueness. */}
 }
 const actual=candidates.find(c=>c.word===chosen.word);if(!actual)return {available:false,reason:'Chosen landing was not reproduced in the candidate replay.'};
 const n=candidates.length,others=candidates.filter(c=>c.word!==chosen.word),finishers=candidates.filter(c=>c.immediate_completion).length;
 return {available:true,word:chosen.word,position:chosen.position,actual,candidate_count:n,expected_candidates:old.region_words_including_choice,coverage:n===old.region_words_including_choice?'all legal one-shot landing words in the supported vocabulary from this incoming lie':'partial replayed candidate pool',complete_coverage:n===old.region_words_including_choice,vocabulary_size:e.words.length,immediate_completions:finishers,immediate_completion_fraction:n?finishers/n:null,others_with_greater_finish_shortfall:others.filter(c=>c.finish_shortfall>actual.finish_shortfall+EPS).length,other_candidates:others.length,candidates,interpretation:'Finish shortfall describes immediate access, not how difficult it is to find a later continuation. Completion alone is not ingenuity. Semantic pivot evidence for this word overlaps and must not be added twice.'};
}

export class ClevernessAnalyser{
 constructor(e,semantic=new SemanticAnalyser(e)){this.semantic=semantic;this.cache=new Map();}
 analyse(saved,semanticReport=null){
  const key=clevernessKey(saved);if(this.cache.has(key))return this.cache.get(key);
  const start=performance.now(),report=semanticReport??this.semantic.analyse(saved);
  if(report.key!==semanticRouteKey(saved))throw Error('Semantic evidence belongs to a different route.');
  // Resolve exactly the profile/headwind analyser already used for v1.
  let analyser=this.semantic;
  if(report!==semanticReport||saved.word_model||saved.headwind){const variant=this.semantic.variants.get(JSON.stringify([saved.word_model??'',saved.headwind??null]));if(variant)analyser=variant;}
  const e=analyser.e,pivots=semanticPivots(analyser,saved,report),mechanics=mechanicalDiagnostics(e,saved,report);
  let dogleg=null;
  if(mechanics.available){try{dogleg=doglegDiagnostics(e,saved,report);}catch(error){dogleg={available:false,reason:'Dogleg alternatives could not be replayed.'};}}
  else if(saved.waypoint)dogleg={available:false,reason:'Route reproduction is required before comparing dogleg mechanics.'};
  const ordered=[...pivots].sort((a,b)=>b.credited_evidence-a.credited_evidence||a.position-b.position);
  const overlaps=[];for(let i=0;i<pivots.length;i++)for(let j=i+1;j<pivots.length;j++){const a=pivots[i],b=pivots[j],forward=(e.cosine(a.predecessor,b.predecessor)+e.cosine(a.successor,b.successor))/2,reverse=(e.cosine(a.predecessor,b.successor)+e.cosine(a.successor,b.predecessor))/2;overlaps.push({positions:[a.position,b.position],similar_contexts:Math.max(forward,reverse)});}
  const result={version:CLEVERNESS_VERSION,key,experimental:true,route:report.route,semantic_pivots:pivots,strongest_pivots:ordered.slice(0,3),context_overlap:overlaps,mechanics,dogleg,lexical_shortcuts:pivots.flatMap(p=>p.lexical_shortcuts.map(s=>({...s,position:p.position}))),secondary:{backtracking:report.journey?.backtracking??null,progression:report.journey?.progression??null},elapsed_ms:performance.now()-start,limitations:['No final cleverness score. Evidence ordering is provisional, not calibrated to human ratings.','Static embeddings may miss secondary senses. Witness words are evidence, not semantic explanations.','Mechanical necessity is relative to the actual next shot and played prefix, not all possible continuations.','A verified compression is a proof, not a globally shortest route. No alternative vocabulary routes are searched.']};
  if(this.cache.size>=24)this.cache.delete(this.cache.keys().next().value);this.cache.set(key,result);return result;
 }
}
