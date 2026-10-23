/** Per-hole limits. Archived challenge versions retain their original rules. */
export const STROKE_PLAY='stroke-play-v1';
export const attemptLimit=par=>par<=3?6:par===4?12:18;
export const maximumStrokes=par=>par+(par<=3?2:3);
export const maximumName=par=>par<=3?'double bogey':'triple bogey';
export const maximumScoreText=par=>`${maximumStrokes(par)} strokes — ${maximumName(par)}`;
export const isStrokePlay=state=>state?.challenge?.version===STROKE_PLAY;
export const exhausted=state=>isStrokePlay(state)&&state.challenge.attempt>=attemptLimit(state.challenge.par)&&(state.won||state.challenge_failed);
export function retryPrefix(saved,through,attempt){
 if(!isStrokePlay(saved)||!Number.isInteger(attempt)||attempt<=saved.challenge.attempt||attempt>attemptLimit(saved.challenge.par))throw Error('Attempt limit reached or invalid retry.');
 if(!Number.isInteger(through)||through<0||through>saved.history.length||saved.history.slice(0,through).some(h=>!h.success||h.won||h.automatic))throw Error('Choose a previously landed word.');
 return {...saved,challenge:{...saved.challenge,attempt},resumed_from:{attempt:saved.challenge.attempt,through}};
}

/** Resume at the last landed lie, leaving room for another shot after a stroke cap. */
export function retryLieThrough(saved){
 const miss=saved.history.findIndex(h=>!h.success);
 return Math.min(miss<0?saved.history.length:miss,maximumStrokes(saved.challenge.par)-1);
}

/** Selecting the original live lie cancels an uncommitted retry preview. */
export function returnsToOriginalLie(preview,through){
 const original=preview?.original?.state,source=preview?.source?.state;
 return !!original&&!original.won&&!original.challenge_failed&&
  through===original.history.length&&source?.start===original.start&&
  original.history.every((shot,i)=>shot.success&&source.history[i]?.success&&source.history[i].word===shot.word);
}
