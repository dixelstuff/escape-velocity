import {projectPoint,projectX,axisPoint} from './map.mjs?v=golf-v56';
/** Compare only retries in this challenge, never another model or a replay. */
export function previousAttempts(journeys,state,activeId){
 if(!state?.challenge)return [];
 const same=s=>s.challenge?.id===state.challenge.id&&s.challenge.version===state.challenge.version&&s.challenge.par===state.challenge.par&&s.challenge.attempt<state.challenge.attempt&&s.challenge_failed&&s.history.length&&['start','target','word_model','threshold','mode','rules','finish_mode','launch_min','launch_max'].every(k=>s[k]===state[k])&&JSON.stringify(s.headwind??null)===JSON.stringify(state.headwind??null);
 const seen=new Set();
 return journeys.filter(j=>j.id!==activeId&&same(j.state)).sort((a,b)=>b.state.challenge.attempt-a.state.challenge.attempt||String(b.updatedAt).localeCompare(String(a.updatedAt))).filter(j=>{const n=j.state.challenge.attempt;if(seen.has(n))return false;seen.add(n);return true;}).slice(0,1).map(j=>({state:j.state,opacity:.72}));
}
export function attemptPathText(state){
 return [state.start,...state.history.map(e=>e.word+(e.outcome==='miss'?' (miss)':e.outcome==='water'?' (penalty)':''))].join(' → ');
}
/** Project old shots into the same course frame used by the current attempt. */
export function ghostGeometry(state,d){
 const position=(word,event)=>{
  if(word===state.start)return {x:d.left,y:d.teeY};
  if(word===state.target)return {x:d.right,y:d.holeY};
  const h=state.history.find(e=>e.word===word)||event;
  return projectPoint(h.destination,state.baseline,state.threshold,d,1.1*[-62,54,-104,97,-28,15][(h.attempt-1)%6]);
 };
 return state.history.map(h=>({word:h.word,origin:h.origin,success:h.success,water:h.outcome==='water',a:position(h.origin,h),b:h.outcome==='water'?{x:Math.max(48,Math.min(d.zoneLeft*.65,axisPoint(projectX(h.destination,state.baseline,state.threshold,d)-d.left,0,d).x)),y:407}:position(h.word,h)}));
}

export function showAttemptGhost(state,preview=null){return !preview&&!state?.history?.length&&!state?.won;}
