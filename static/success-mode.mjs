import {STROKE_PLAY,maximumStrokes,maximumName,maximumScoreText} from './stroke-play.mjs?v=golf-v170';
/** A challenge attempt keeps ordinary shot scoring, including the automatic finish. */
export function successSettings(value){
 if(!value)return null;
 const {par=3,attempt=1,id}=value;
 if(![STROKE_PLAY,'par-challenge-v1','par-challenge-v2','waypoint-trial-v1'].includes(value.version)||!Number.isInteger(par)||par<2||par>9||!Number.isInteger(attempt)||attempt<1||typeof id!=='string'||!id||id.length>100)throw Error('Invalid Success mode settings.');
 const practice=value.practice===true,locked=value.locked_result;
 if(practice&&(!locked||!Number.isFinite(locked.score)||!Number.isInteger(locked.attempt)||locked.attempt<1))throw Error('Practice needs a locked score.');
 return {version:value.version,par,attempt,id,...(value.rolling===true&&Number.isInteger(value.attempt_limit)&&value.attempt_limit>=10&&value.attempt_limit<=10000?{rolling:true,attempt_limit:value.attempt_limit}:{}),...(practice?{practice:true,locked_result:{score:locked.score,attempt:locked.attempt}}:{})};
}
export function parUnreachable(game){
 const c=game.challenge;if(!c||game.won)return false;
 if(c.version===STROKE_PLAY)return ['miss','water'].includes(game.history.at(-1)?.outcome)||!game.continuous_play&&game.history.length>=(game.replay_stroke_cap??maximumStrokes(c.par));
 if(c.version==='waypoint-trial-v1')return ['miss','water'].includes(game.history.at(-1)?.outcome);
 if(c.version==='par-challenge-v2'&&['miss','water'].includes(game.history.at(-1)?.outcome))return true;
 const remaining=c.par-game.history.length;
 if(remaining<=0)return true;
 if(remaining>1)return false;
 // With one shot left, only the literal hole word can finish without another stroke.
 const destination=game.e.cosine(game.target,game.target),progress=game.e.cosine(game.current,game.target);
 return game.e.cosine(game.current,game.target)+1e-7<game.requirement(game.current,game.target,progress,destination).required||destination+1e-7<game.best_progress-game.backward_allowance;
}
export function challengeFailure(state){
 if(!state.challenge_failed)return '';
 if(state.challenge?.version===STROKE_PLAY)return state.history.length>=maximumStrokes(state.challenge.par)?`Maximum score: ${maximumScoreText(state.challenge.par)}.`:'Attempt over.';
 return ['par-challenge-v2','waypoint-trial-v1'].includes(state.challenge?.version)&&['miss','water'].includes(state.history.at(-1)?.outcome)?'Attempt over.':'Par is out of reach.';
}
export function successTitle(state){
 if(!state.challenge)return state.attempts===1?'Hole in one!':`Holed in ${state.attempts} shots!`;
 const difference=state.attempts-state.challenge.par;
 const result=difference===0?'Par':difference===-1?'Birdie':difference===-2?'Eagle':difference<=-3?'Albatross':difference===1?'Bogey':difference===2?'Double bogey':difference===3?'Triple bogey':`${difference} over par`;
 return `Success! ${result} on attempt ${state.challenge.attempt}`;
}

export function successOutcome(state){return successTitle(state).replace(/^Success! /,'');}
