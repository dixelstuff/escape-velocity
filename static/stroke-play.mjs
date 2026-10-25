/** Per-hole limits. Archived challenge versions retain their original rules. */
export const STROKE_PLAY='stroke-play-v1';
export const attemptLimit=par=>par<=3?10:par===4?15:20;
export const challengeAttemptLimit=c=>c?.tour?Infinity:c?.rolling&&Number.isInteger(c.attempt_limit)&&c.attempt_limit>=attemptLimit(c.par)?c.attempt_limit:attemptLimit(c?.par??3);
export const maximumStrokes=par=>par+2;
export const maximumName=par=>'double bogey';
export const maximumScoreText=par=>`${maximumStrokes(par)} strokes — ${maximumName(par)}`;
export const isStrokePlay=state=>state?.challenge?.version===STROKE_PLAY;
export const exhausted=state=>isStrokePlay(state)&&!state.challenge.practice&&state.challenge.attempt>=challengeAttemptLimit(state.challenge)&&(state.won||state.challenge_failed);
export function retryPrefix(saved,through,attempt){
 if(!isStrokePlay(saved)||!Number.isInteger(attempt)||attempt<=saved.challenge.attempt||(!saved.challenge.practice&&attempt>challengeAttemptLimit(saved.challenge)))throw Error('Attempt limit reached or invalid retry.');
 if(!Number.isInteger(through)||through<0||through>saved.history.length||saved.history.slice(0,through).some(h=>!h.success||h.won||h.automatic))throw Error('Choose a previously landed word.');
 return {...saved,challenge:{...saved.challenge,attempt},resumed_from:{attempt:saved.challenge.attempt,through}};
}

/** Resume at the last landed lie, leaving room for another shot after a stroke cap. */
export function retryLieThrough(saved){
 const miss=saved.history.findIndex(h=>!h.success);
 return saved.continuous_play?(miss<0?saved.history.length:miss):Math.min(miss<0?saved.history.length:miss,maximumStrokes(saved.challenge.par)-1);
}

/** Selecting the original live lie cancels an uncommitted retry preview. */
export function returnsToOriginalLie(preview,through){
 const original=preview?.original?.state,source=preview?.source?.state;
 return !!original&&!original.won&&!original.challenge_failed&&
  through===original.history.length&&source?.start===original.start&&
  original.history.every((shot,i)=>shot.success&&source.history[i]?.success&&source.history[i].word===shot.word);
}

/** Previous landed lie, excluding misses and the automatic finishing stroke. */
export function previousRetryThrough(state){
 const lies=state.history.filter(h=>h.success&&!h.automatic);
 return lies.length>1?lies.at(-2).attempt:0;
}
