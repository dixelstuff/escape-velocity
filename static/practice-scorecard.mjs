import {STROKE_PLAY,maximumStrokes} from './stroke-play.mjs?v=golf-v105';
/** Recent individual holes, grouped by challenge; retries never become extra holes. */
export function practiceScorecard(journeys,limit=5){
 const groups=new Map();
 for(const {state:s,course_round:round} of journeys){
  const c=s?.challenge;if(round||c?.version!==STROKE_PLAY||(!s.won&&!s.challenge_failed))continue;
  const row=groups.get(c.id)??{id:c.id,start:s.start,target:s.final_target??s.target,par:c.par,score:Infinity,attempts:new Set()};
  row.score=Math.min(row.score,(s.won?s.attempts:maximumStrokes(c.par))-c.par);row.attempts.add(c.attempt);
  groups.delete(c.id);groups.set(c.id,row);
 }
 return [...groups.values()].slice(-limit).map(({attempts,...row})=>({...row,attempts:attempts.size}));
}
