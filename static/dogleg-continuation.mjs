/** Route-local finishing evidence and bounded component adjustment; no word search. */
import {Game} from './engine.mjs?v=fixed-waypoint-lie-v1';
import {DEFAULT_CONFIG} from './vector-cleverness/cleverness-v6.mjs?v=cubic-results-v1';
export const CONTINUATION_VERSION='dogleg-continuation-v1';
const clip=x=>Math.max(0,Math.min(1,x));
const outcome=g=>({completed:g.won,strokes:g.history.length+g.automatic_shots.length,route:[...g.route],landing:g.history.find(h=>h.waypoint_reached)?.word??null});
export function doglegContinuationEvidence(e,state,post){
 const history=state.history??[],index=history.findIndex(h=>h.waypoint_reached),landing=history[index],next=history[index+1];
 const base={version:CONTINUATION_VERSION,available:true,classification:'unchanged',route:[...(state.route??[])],position:index+1,actual_strokes:state.attempts,landing:landing?.word??null,next:next?.word??null};
 if(!state.waypoint)return {...base,reason:'No dogleg'};
 if(!state.won||!post||!landing?.success)return {...base,available:false,reason:'Validated completed dogleg required'};
 if(!next)return {...base,reason:'No subsequent chosen word'};
 if(post.sameWord(landing.word,state.waypoint.word))return {...base,reason:'Literal dogleg retains existing treatment'};
 if((state.second_leg_finish_after??0)>0)return {...base,available:false,reason:'Mixed historical finishing rules: preserve existing score evidence'};
 const skipped=new Game(e,state.start,state.final_target,state.final_threshold,state),events=[];let first=null,failed=false;
 try{
  for(const[i,h]of history.entries()){
   if(i===index)continue;if(skipped.won)break;
   const event=skipped.submit(h.word);events.push({source_position:i+1,...event});if(i===index+1)first=event;
   if(!event.success){if(i<=index+1)return {...base,reason:'Observed next contact failed; existing role applies',skipped:{...outcome(skipped),events}};failed=true;break;}
  }
  // An automatic final stroke is part of the recorded continuation too. Test
  // that same word explicitly if changing the turn stopped the auto-finish.
  if(!skipped.won&&!failed)for(const auto of state.automatic_shots??[]){
   if(skipped.won)break;
   const event=skipped.submit(auto.word);events.push({recorded_automatic:true,...event});
   if(!event.success)break;
  }
 }catch(error){return {...base,available:false,reason:'Counterfactual restriction or unavailable evidence',error:error.message};}
 const skippedOutcome={...outcome(skipped),events},nextTurns=first?.success&&first.waypoint_reached&&skipped.sameWord(first.word,next.word);
 if(skipped.won&&skippedOutcome.strokes<state.attempts&&nextTurns)return {...base,classification:'redundant_landing',reason:'Next chosen word can replace the landing and finish sooner',skipped:skippedOutcome};
 if(!skipped.won&&nextTurns&&!first.won)return {...base,classification:'finish_setup',reason:'Landing enables a finishing continuation that the later turn loses',skipped:skippedOutcome};
 return {...base,reason:'No verified delayed-turn finishing distinction',skipped:skippedOutcome};
}
function contextFor(report,components){
 const previous=report.continuation_treatment;
 if(previous?.version===CONTINUATION_VERSION&&JSON.stringify(previous.route)===JSON.stringify(report.dogleg_continuation?.route))return previous.context;
 const land=report.diagnostics?.stages?.landing,word=land?.word_evidence?.[0],coherence=report.diagnostics?.coherence;
 if(!word||!coherence)return null;
 return {position:word.position,word:word.word,base_strategy:components.strategic_effectiveness,base_elegance:components.route_elegance,landing_effectiveness:land.effectiveness,relevance:word.relevance.value,role:word.role,necessary_next:word.evidence.necessary_next,objective_switch:word.evidence.objective_switch,removable:word.evidence.removable,charged_positions:[...(coherence.charged_removal_positions??[])],elegance_terms:{...coherence.terms},ordinary_role:DEFAULT_CONFIG.strategy.ordinary_role,redundancy_penalty:DEFAULT_CONFIG.elegance.redundancy_penalty,redundancy_saturation:DEFAULT_CONFIG.elegance.redundancy_saturation};
}
export function applyDoglegContinuation(report,components){
 const proof=report.dogleg_continuation,route=report.spelling_equivalence?.canonical_route??report.route,rawContext=contextFor(report,components);
 const finiteContext=rawContext&&['base_strategy','base_elegance','landing_effectiveness','relevance','role'].every(k=>Number.isFinite(rawContext[k])&&rawContext[k]>=0&&rawContext[k]<=1);
 const context=finiteContext&&rawContext.position===proof?.position&&rawContext.word===proof?.landing?rawContext:null;
 const valid=proof?.version===CONTINUATION_VERSION&&JSON.stringify(proof.route)===JSON.stringify(route);
 const treatment={version:CONTINUATION_VERSION,route:proof?.route??[],available:!!(valid&&proof.available),classification:proof?.classification??'unchanged',applied:false,context};
 if(!valid||!context)return {components,treatment};
 const base={...components,strategic_effectiveness:context.base_strategy,route_elegance:context.base_elegance};
 if(!proof.available)return {components:base,treatment};
 let effectiveness=context.landing_effectiveness,elegance=context.base_elegance;
 if(proof.classification==='redundant_landing'&&context.removable&&context.charged_positions.includes(proof.position)){
  effectiveness=Math.max(effectiveness,context.relevance);
  const n=context.charged_positions.length,p=context.redundancy_penalty,s=context.redundancy_saturation;
  elegance=clip(Object.values(context.elegance_terms).reduce((a,b)=>a+b,0)+p*(clip(n/s)-clip((n-1)/s)));
  treatment.applied=true;treatment.reason='One bounded strategic cost; no duplicate landing elegance charge';
 }else if(proof.classification==='finish_setup'&&!context.removable&&!context.necessary_next&&!context.objective_switch&&Number.isFinite(context.role)){
  // Reuse the established demonstrated-setup role, retaining its existing
  // substitute-specificity attenuation. No semantic originality is invented.
  const demonstrated=clip(context.role/context.ordinary_role);
  effectiveness=Math.max(effectiveness,context.relevance,demonstrated);
  treatment.applied=effectiveness>context.landing_effectiveness;treatment.reason='Verified finishing setup receives the existing demonstrated-role scale';
 }
 const adjusted={...base,strategic_effectiveness:clip(context.base_strategy+.4*(effectiveness-context.landing_effectiveness)),route_elegance:elegance};
 return {components:adjusted,treatment:{...treatment,before:{strategy:context.base_strategy,elegance:context.base_elegance,landing:context.landing_effectiveness},after:{strategy:adjusted.strategic_effectiveness,elegance,landing:effectiveness}}};
}
