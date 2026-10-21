/** A challenge attempt keeps ordinary shot scoring, including the automatic finish. */
export function successSettings(value){
 if(!value)return null;
 const {par=3,attempt=1,id}=value;
 if(value.version!=='par-challenge-v1'||!Number.isInteger(par)||par<2||par>9||!Number.isInteger(attempt)||attempt<1||typeof id!=='string'||!id||id.length>100)throw Error('Invalid Success mode settings.');
 return {version:'par-challenge-v1',par,attempt,id};
}
export function parUnreachable(game){
 const c=game.challenge;if(!c||game.won)return false;
 const remaining=c.par-game.history.length;
 if(remaining<=0)return true;
 if(remaining>1)return false;
 // With one shot left, only the literal hole word can finish without another stroke.
 const destination=game.e.cosine(game.target,game.target),progress=game.e.cosine(game.current,game.target);
 return game.e.cosine(game.current,game.target)+1e-7<game.requirement(game.current,game.target,progress,destination).required||destination+1e-7<game.best_progress-game.backward_allowance;
}
export function successTitle(state){
 if(!state.challenge)return state.attempts===1?'Hole in one!':`Holed in ${state.attempts} shots!`;
 const difference=state.attempts-state.challenge.par;
 const result=difference===0?'Par':difference===-1?'Birdie':difference===-2?'Eagle':difference<=-3?'Albatross':`${difference} over par`;
 return `Success! ${result} on attempt ${state.challenge.attempt}`;
}
