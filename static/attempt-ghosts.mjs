import {projectPoint} from './map.mjs?v=golf-v65';
import {usefulForwardMiss} from './play-feedback.mjs?v=golf-v65';
/** Compare only retries in this challenge, never another model or a replay. */
export function previousAttempts(journeys,state,activeId){
 if(!state?.challenge)return [];
 const same=s=>s.challenge?.id===state.challenge.id&&s.challenge.version===state.challenge.version&&s.challenge.par===state.challenge.par&&s.challenge.attempt<state.challenge.attempt&&s.challenge_failed&&s.history.length&&['start','target','word_model','threshold','mode','rules','finish_mode','launch_min','launch_max'].every(k=>s[k]===state[k])&&JSON.stringify(s.headwind??null)===JSON.stringify(state.headwind??null);
 const seen=new Set();
 return journeys.filter(j=>j.id!==activeId&&same(j.state)).sort((a,b)=>b.state.challenge.attempt-a.state.challenge.attempt||String(b.updatedAt).localeCompare(String(a.updatedAt))).filter(j=>{const n=j.state.challenge.attempt;if(seen.has(n))return false;seen.add(n);return true;}).slice(0,1).map(j=>({state:j.state}));
}
/** Retain the visible word anchors for faded labels and dots, without old travel lines. */
export function previousWordLabels(state,d){
 const seen=new Set([state.start,state.target]);
 return state.history.filter(h=>h.success||usefulForwardMiss(h,state)).flatMap(h=>{
  if(seen.has(h.word))return [];seen.add(h.word);
  const first=state.history.find(e=>e.word===h.word);
  return [{word:h.word,pos:projectPoint(first.destination,state.baseline,state.threshold,d,1.1*[-62,54,-104,97,-28,15][(first.attempt-1)%6])}];
 });
}
export function showPreviousLabels(state,preview=null){return !preview&&!state?.history?.length&&!state?.won;}
