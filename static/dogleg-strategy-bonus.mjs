/** Browser-only, route-local mechanical evidence. No vocabulary search or word-specific rules. */
import {Game} from './engine.mjs?v=playable-vocab-v2';
import {bandFreeScore} from './vector-cleverness/band-free.mjs?v=dogleg-continuation-v1';
export const DOGLEG_STRATEGY_VERSION='dogleg-access-bonus-v1';
export const DOGLEG_STRATEGY_POINTS=3;
export const ACCESS_MARGIN_SPAN=.05;
// Existing S includes at most .4 landing weight × .5 corner weight × .10 access uplift.
// Deduct its maximum possible raw-score value, rather than award outgoing access twice.
export const EXISTING_ACCESS_STRATEGY_BOUND=.02;
const clip=x=>Math.max(0,Math.min(1,x));
const clone=g=>Object.assign(Object.create(Object.getPrototypeOf(g)),g,{history:structuredClone(g.history),route:[...g.route],automatic_shots:structuredClone(g.automatic_shots)});
function shortfall(g,event){
 if(!event||event.success)return 0;
 const contact=Number.isFinite(event.required)&&Number.isFinite(event.launch)?Math.max(0,event.required-event.launch):0;
 const backwards=event.safe===false?Math.max(0,g.best_progress-g.backward_allowance-event.destination):0;
 return Math.max(contact,backwards);
}
function shot(g,word){
 const before=clone(g);try{const event=g.submit(word),margin=shortfall(before,event);return {works:!!event.success,margin,gain:clip(margin/ACCESS_MARGIN_SPAN),event};}
 catch(error){return {works:null,margin:null,gain:0,error:error.message};}
}
export function doglegAccessEvidence(e,s,post){
 const base={version:DOGLEG_STRATEGY_VERSION,available:true,eligible:false,incoming_gain:0,outgoing_gain:0,margin_span:ACCESS_MARGIN_SPAN};
 if(!s.waypoint)return {...base,reason:'No dogleg'};
 if(!post||!s.won)return {...base,available:false,reason:'Validated completed route required'};
 const index=post.history.length-1,landing=s.history[index],W=s.waypoint.word,F=s.final_target;
 if(post.sameWord(landing.word,W))return {...base,reason:'Literal dogleg played',landing:landing.word,waypoint:W};
 try{
  const fresh=()=>new Game(e,s.start,F,s.final_threshold,s),prefix=fresh();
  for(const h of s.history.slice(0,index))if(!prefix.submit(h.word).success)throw Error('Approach replay failed');
  const incoming=shot(prefix,W);
  // As in the existing scorer, stipulate a literal-W lie for an independent
  // outgoing test. This does not claim its incoming prefix was legal.
  const named=clone(post),wf=named.e.cosine(W,F);
  Object.assign(named,{current:W,leg_start:W,baseline:wf,best_progress:wf,won:false,challenge_failed:false,automatic_shots:[]});
  named.route=named.route.slice(0,index+1).concat(W);
  named.history.at(-1).word=W;delete named.history.at(-1).scoring_word;
  const next=s.history[index+1]?.word??F;
  let outgoing;
  if(named.finishesFrom(W,wf))outgoing={works:true,gain:0,margin:0,reason:'Literal dogleg already finishes'};
  else if(named.sameWord(next,W))outgoing={works:true,gain:0,margin:0,reason:'Already on the next word; no shot needed'};
  else outgoing=shot(named,next);
  // One exact counterfactual, not a search: can this landing simply be omitted?
  const skipped=fresh();let removable=false,skipError=null;
  try{
   let valid=true;
   for(const [i,h]of s.history.entries()){
    if(i===index)continue;if(skipped.won)break;
    if(!skipped.submit(h.word).success){valid=false;break;}
   }
   removable=valid&&skipped.won&&skipped.history.length+skipped.automatic_shots.length<s.history.length+(s.automatic_shots?.length??0);
  }catch(error){skipError=error.message;}
  return {...base,eligible:!removable,reason:removable?'Landing removable in verified replay':'Alternative dogleg landing',landing:landing.word,waypoint:W,prior:landing.origin,next,next_automatic:!s.history[index+1],incoming,outgoing,incoming_gain:removable?0:incoming.gain,outgoing_gain:removable?0:outgoing.gain,removable,skip_error:skipError};
 }catch(error){return {...base,available:false,reason:error.message};}
}
export function applyDoglegStrategyBonus(raw,components,evidence){
 const usable=!!evidence?.available&&!!evidence.eligible,a=usable&&Number.isFinite(evidence.incoming_gain)?clip(evidence.incoming_gain):0,b=usable&&Number.isFinite(evidence.outgoing_gain)?clip(evidence.outgoing_gain):0;
 const budget=DOGLEG_STRATEGY_POINTS*raw.quality*raw.applied_factor;
 const withoutOldAccess=bandFreeScore({...components,strategic_effectiveness:Math.max(0,components.strategic_effectiveness-EXISTING_ACCESS_STRATEGY_BOUND)},raw.legs.map(l=>l.strokes));
 const priorBound=Math.max(0,raw.unrounded_score-withoutOldAccess.unrounded_score);
 const incoming=budget*a,outgoing=Math.max(0,budget*b-priorBound);
 const amount=incoming+(1-a)*outgoing,unrounded=Math.min(raw.unrounded_score+amount,raw.maximum_for_legs);
 return {...raw,score:Math.round(unrounded),unrounded_score:unrounded,strategic_bonus:{...evidence,version:DOGLEG_STRATEGY_VERSION,base_unrounded:raw.unrounded_score,quality:raw.quality,leg_factor:raw.applied_factor,maximum_budget:budget,existing_outgoing_credit_bound:priorBound,incoming_amount:incoming,outgoing_top_up:outgoing,raw_amount:amount,applied_amount:unrounded-raw.unrounded_score,ceiling_limited:amount>unrounded-raw.unrounded_score+1e-10},operator:raw.operator+'; one quality/leg-scaled dogleg-access top-up, with conservative existing outgoing-credit deduction',formula:raw.formula+'; D=3QL; incoming=D*a; outgoing=max(0,D*b−oldAccessBound); add incoming+(1−a)*outgoing, capped at 100L before display stretch'};
}
