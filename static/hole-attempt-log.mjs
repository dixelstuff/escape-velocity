import {attemptLimit,challengeAttemptLimit} from './stroke-play.mjs?v=golf-v173';
/** This challenge only; assumed prefixes describe the lie, not new guesses. */
export function holeAttemptLog(journeys,state,activeId){
 if(!state?.challenge)return [];
 const rows=journeys.filter(j=>j.state.challenge?.id===state.challenge.id&&j.state.start===state.start&&j.state.waypoint?.word===state.waypoint?.word&&(j.state.final_target??j.state.target)===(state.final_target??state.target)).map(j=>{
  const shots=j.entries.filter(e=>!e.assumed&&!e.event?.assumed&&!e.event?.automatic).map(e=>({origin:e.origin,word:e.word,result:!e.event?(String(e.error).startsWith('That word is outside the supported vocabulary.')?'Not allowed':'Not played'):e.event.outcome==='water'?'Backwards':!e.event.success?'Miss':e.event.won?'Holed':e.event.waypoint_reached?'Waypoint':'Landed'}));
  return {id:j.id,number:j.state.challenge.attempt,practice:!!j.state.challenge.practice,current:j.id===activeId,from:j.state.history.filter(h=>h.assumed).at(-1)?.word??j.state.start,result:j.state.won?'Holed':j.state.abandoned||j.state.skipped||j.id!==activeId&&!j.state.challenge_failed?'Abandoned':j.state.challenge_failed?'Missed':'In progress',shots};
 });
 return rows.filter(r=>r.shots.length||r.current).sort((a,b)=>b.number-a.number);
}

export function holeControlAvailability(journeys,state){
 return {replay:!!state?.history?.some(shot=>shot.success&&!shot.automatic),log:!!state};
}

/** An in-progress attempt is still available; a finished attempt has been spent. */
export function remainingHoleAttempts(state){
 if(!state?.challenge)return null;
 if(state.challenge.practice)return 0;
 return Math.max(0,challengeAttemptLimit(state.challenge)-state.challenge.attempt+(state.won||state.challenge_failed?0:1));
}
