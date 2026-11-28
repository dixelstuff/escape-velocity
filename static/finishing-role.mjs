/** Authoritative observed finishing role. No alternative-word search or novelty bonus. */
import {Game} from './engine.mjs?v=contact-floor18-v1';
export const FINISHING_ROLE_VERSION='finishing-role-v1';
export function finishingRoleEvidence(e,state,game,diagnostics){
 const base={version:FINISHING_ROLE_VERSION,available:true,applied:false,route:[...state.route]};
 const last=game.history.at(-1),position=game.history.length;
 const neutral=reason=>({...base,reason});
 if(!game.won||!game.waypoint||game.stage!==1||!last?.success||!last.won||last.stage!==1||last.waypoint_reached)return neutral('No subsequent second-leg finishing word');
 if(!last.automatic_shot||!game.automatic_shots.some(a=>a.success&&a.won&&game.sameWord(a.word,game.final_target))||game.sameWord(last.word,game.final_target))return neutral('No interior word with recorded automatic closing stroke');
 const bridge=diagnostics.bridges.find(b=>b.position===position&&game.sameWord(b.word,last.word));
 if(bridge?.strategic_functions?.removable_while_completing!==false)return neutral('Nonremovable finishing role not established');
 const {history,...options}=state,prefix=new Game(e,state.start,state.final_target,state.final_threshold,{...options,waypoint_rescue:state.waypoint_rescue??false,second_leg_finish_span:state.second_leg_finish_span??0});
 try{
  for(const h of history.slice(0,-1))if(!prefix.submit(h.word).success)throw Error('Finishing prefix failed');
 }catch(error){return {...base,available:false,reason:error.message};}
 let bypass;
 try{const hit=prefix.submit(state.final_target);bypass={success:hit.success,won:hit.won};}catch(error){bypass={error:error.message};}
 if(!(bypass.error==='Play another word to reach the flag.'||bypass.success===false&&!bypass.error))return neutral('Legal flag bypass or unrelated restriction');
 return {...base,applied:true,position,word:bridge.word,bypass,reason:'Nonremovable observed second-leg finisher has demonstrated role'};
}
/** Feed the established demonstrated-role scale into both I and S, once. */
export function restoreFinishingRole(input,proof){
 if(proof?.version!==FINISHING_ROLE_VERSION||!proof.available||!proof.applied||JSON.stringify(proof.route)!==JSON.stringify(input.state.route)||proof.position!==input.state.history.length)return input;
 const out=structuredClone(input),bridge=out.diagnostics.bridges.find(b=>b.position===proof.position&&b.word===proof.word);
 if(bridge?.strategic_functions?.removable_while_completing!==false)return input;
 bridge.strategic_functions.necessary_for_observed_next=true;
 return out;
}
