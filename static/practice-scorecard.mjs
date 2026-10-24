import {STROKE_PLAY,maximumStrokes} from './stroke-play.mjs?v=golf-v124';
/** Recent individual holes, grouped by challenge; retries never become extra holes. */
export function practiceScorecard(journeys,limit=5){
 const groups=new Map();
 for(const {state:s,course_round:round} of journeys){
  const c=s?.challenge;if(round||c?.practice||c?.version!==STROKE_PLAY||(!s.won&&!s.challenge_failed))continue;
  const row=groups.get(c.id)??{id:c.id,start:s.start,target:s.final_target??s.target,par:c.par,score:Infinity,attempts:new Set()};
  row.score=Math.min(row.score,(s.won?s.attempts:maximumStrokes(c.par))-c.par);row.attempts.add(c.attempt);
  groups.delete(c.id);groups.set(c.id,row);
 }
 return [...groups.values()].slice(-limit).map(({attempts,...row})=>({...row,attempts:attempts.size}));
}

/** Equal scores belong to the first attempt that achieved them, even after more play. */
export function bestHoleResult(journeys,state){
 if(!state?.challenge)return null;
 const completed=[...journeys.map(j=>j.state),state].filter(s=>s?.challenge?.id===state.challenge.id&&!s.challenge.practice&&s.start===state.start&&(s.final_target??s.target)===(state.final_target??state.target)&&s.waypoint?.word===state.waypoint?.word&&(s.won||s.challenge_failed));
 return state.challenge.practice?state.challenge.locked_result:completed.map(s=>({score:(s.won?s.attempts:maximumStrokes(s.challenge.par))-s.challenge.par,attempt:s.challenge.attempt})).sort((a,b)=>a.score-b.score||a.attempt-b.attempt)[0]??null;
}
