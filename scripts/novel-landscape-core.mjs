/** Local diagnostic only: reject repeated-word witnesses, not player moves. */
/** Local editorial diagnostics, never gameplay or a hole-quality score.
 * Word triples and independent word associations are inputs. No word substitution,
 * vector thresholds or "clever route" targets are used to generate proposals.
 */
import fs from 'node:fs';
import {fileURLToPath} from 'node:url';
import crypto from 'node:crypto';
import {Game,waypointLegAccess} from '../static/engine.mjs';
import {spellingResolver,SPELLING_EQUIVALENCE} from '../static/spelling-equivalence.mjs';
import {loadResearchModel,researchSettings} from './cleverness-research-utils.mjs';
export const LANDSCAPE_CHECK_VERSION='novel-loop-free-diagnostic-v1';
export function buildContextGraph(model,directions){
 const resolver=spellingResolver(model),graph=new Map(),missing=new Set();
 const add=(a,b)=>{if(!graph.has(a))graph.set(a,new Set());graph.get(a).add(b);};
 for(const[word,neighbors]of Object.entries(directions))for(const neighbor of neighbors){
  if(!resolver.model.index.has(word)||!resolver.model.index.has(neighbor)){missing.add(!resolver.model.index.has(word)?word:neighbor);continue;}
  const a=resolver.resolve(word),b=resolver.resolve(neighbor);if(a===b)continue;add(a,b);add(b,a);
 }
 return {graph,resolve:resolver.resolve,missing:[...missing].sort()};
}
function clone(game){return Object.assign(Object.create(Game.prototype),game,{history:game.history.slice(),route:game.route.slice(),automatic_shots:game.automatic_shots.slice()});}
function advance(game,word){if(game.route.some(w=>game.sameWord(w,word)))return null;const next=clone(game);try{const event=next.submit(word);return event.success?{game:next,event}:null;}catch{return null;}}
export function inspectNovelLandscape(e,words,contexts,{approachDepth=4,beam=64,landingLimit=12,finishDepth=4}={}){
 const [start,waypoint,target]=words,s={...researchSettings(...words),second_leg_finish_span:.12,spelling_equivalence:SPELLING_EQUIVALENCE};
 const {graph,resolve}=contexts,options=word=>[...(graph.get(resolve(word))??[])];
 const access=waypointLegAccess(e,s),limits={approachDepth,beam,landingLimit,finishDepth,exhaustive:false};
 if(!access.allowed)return {words,allowed:false,directLegs:access.legs,limits};
 const supportedFinish=g=>{const last=g.history.at(-1)?.word??g.leg_start,origin=resolve(last)===resolve(target)?g.route.at(-2):last;return !!origin&&options(origin).some(w=>resolve(w)===resolve(target));};
 const initial=new Game(e,start,target,.27,s),openings=options(start).map(word=>{const r=advance(initial,word);return{word,hit:!!r,advances:!!r&&r.event.destination>initial.baseline,reachesDogleg:!!r?.event.waypoint_reached};});
 let frontier=[{game:initial,inputs:[]}],landings=new Map(),evaluated=0;
 const visited=new Set();
 for(let depth=0;depth<approachDepth&&frontier.length;depth++){
  const next=[];
  for(const node of frontier)for(const word of options(node.game.current)){
   evaluated++;const r=advance(node.game,word);if(!r)continue;
   const inputs=[...node.inputs,word],g=r.game;
   if(g.stage===1){const key=resolve(g.leg_start);if(!landings.has(key))landings.set(key,{game:g,inputs});continue;}
   const key=resolve(g.current);if(visited.has(key))continue;visited.add(key);
   const span=Math.max(.01,g.threshold-g.baseline),progress=(g.e.cosine(g.current,g.target)-g.baseline)/span;
   next.push({game:g,inputs,progress});
  }
  next.sort((a,b)=>b.progress-a.progress);frontier=next.slice(0,beam);
 }
 const handoffs=[];
 for(const node of landings.values()){
  const g=node.game;
  const outgoing=g.won?[]:options(g.current).map(word=>{const r=advance(g,word);return {word,hit:!!r,advances:!!r&&r.event.destination>g.baseline,finishes:!!r?.game.won,finishContextSupported:!!r?.game.won&&supportedFinish(r.game)};});
  handoffs.push({...node,landing:g.leg_start,outgoing,naturalOutgoings:outgoing.filter(o=>o.advances&&(!o.finishes||o.finishContextSupported)).length,finishedOnLanding:g.won});
 }
 handoffs.sort((a,b)=>b.naturalOutgoings-a.naturalOutgoings||a.inputs.length-b.inputs.length);
 let witness=null;
 // A bounded check from the reached lies, without changing the words to suit a path.
 let finishFrontier=handoffs.slice(0,landingLimit).map(h=>({game:h.game,inputs:h.inputs}));const finishVisited=new Set();
 for(let depth=0;depth<=finishDepth&&finishFrontier.length&&!witness;depth++){
  const next=[];
  for(const node of finishFrontier){if(node.game.won){if(supportedFinish(node.game)){witness=node;break;}continue;}if(depth===finishDepth)continue;
   for(const word of options(node.game.current)){
    evaluated++;const r=advance(node.game,word);if(!r)continue;const g=r.game,inputs=[...node.inputs,word];
    if(g.won){if(supportedFinish(g)){witness={game:g,inputs};break;}continue;}
    const key=resolve(g.leg_start)+'|'+resolve(g.current);if(finishVisited.has(key))continue;finishVisited.add(key);
    const progress=(g.e.cosine(g.current,g.target)-g.baseline)/Math.max(.01,g.threshold-g.baseline);next.push({game:g,inputs,progress});
   }if(witness)break;
  }
  next.sort((a,b)=>b.progress-a.progress);finishFrontier=next.slice(0,beam);
 }
 if(witness){const replay=new Game(e,start,target,.27,s);for(const word of witness.inputs){if(!replay.submit(word).success)throw Error('Independent replay failed');}if(!replay.won)throw Error('Replay did not complete');witness={inputs:witness.inputs,state:replay.state(),finishContextSupported:true};}
 return {words,allowed:true,directLegs:access.legs,limits,evaluated,openingCount:openings.filter(o=>o.advances).length,openings,distinctLandings:handoffs.length,usableLandings:handoffs.filter(h=>h.naturalOutgoings>=2).length,handoffs:handoffs.slice(0,landingLimit).map(({game,inputs,...h})=>({...h,inputs})),witness};
}
