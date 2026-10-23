import {wordLieKey} from './word-lies.mjs?v=golf-v116';
import {waypointPosition} from './waypoint-map.mjs?v=golf-v116';
import {projectPoint} from './map.mjs?v=golf-v116';
import {usefulForwardMiss} from './play-feedback.mjs?v=golf-v116';
/** Compare only retries in this challenge, including a completed attempt replayed within the same challenge. */
export function previousAttempts(journeys,state,activeId){
 if(!state?.challenge)return [];
 const same=s=>s.challenge?.id===state.challenge.id&&s.challenge.version===state.challenge.version&&s.challenge.par===state.challenge.par&&s.challenge.attempt<state.challenge.attempt&&(s.challenge_failed||s.won)&&s.history.length&&(state.waypoint?s.waypoint?.word===state.waypoint.word&&s.final_target===state.final_target:['target','threshold'].every(k=>s[k]===state[k]))&&['start','word_model','mode','rules','finish_mode','launch_min','launch_max'].every(k=>s[k]===state[k])&&JSON.stringify(s.headwind??null)===JSON.stringify(state.headwind??null);
 const seen=new Set();
 return journeys.filter(j=>j.id!==activeId&&same(j.state)).sort((a,b)=>b.state.challenge.attempt-a.state.challenge.attempt||String(b.updatedAt).localeCompare(String(a.updatedAt))).filter(j=>{const n=j.state.challenge.attempt;if(seen.has(n))return false;seen.add(n);return true;}).slice(0,1).map(j=>({state:j.state}));
}
/** Retain the visible word anchors for faded labels and dots, without old travel lines. */
export function previousWordLabels(state,d){
 const latest=new Map();
 for(const h of state.history.filter(h=>h.success||usefulForwardMiss(h,state)))if(!((h.word===state.start&&(h.stage??0)===0)||(h.word===state.target&&(h.stage??0)===(state.stage??0))))latest.set(wordLieKey(h.word,h),h);
 return [...latest.values()].map(h=>({key:wordLieKey(h.word,h),word:h.word,...(h.success&&!h.won&&(state.waypoint||state.challenge?.version==='stroke-play-v1')?{resumeThrough:h.attempt}:{}),pos:state.waypoint?waypointPosition(state,h.word,d,h):projectPoint(h.destination,state.baseline,state.threshold,d,.88*[-62,54,-104,97,-28,15][(h.attempt-1)%6])}));
}
export function showPreviousLabels(state,preview=null){return !preview&&!state?.history?.some(h=>!h.assumed)&&!state?.won;}

/** Old routes may suppress the zone, but must never suppress the next target label. */
export function waypointRetryDisplay(state,previousEntry,editing=false){
 const firstLeg=!!state.waypoint&&state.stage===0;
 return {showTarget:firstLeg,reference:firstLeg&&!!previousEntry&&!editing,occupied:!!previousEntry};
}
