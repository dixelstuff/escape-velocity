import {maximumStrokes} from './stroke-play.mjs?v=golf-v182';
export const PRACTICE_MODE='Practice mode: best score already recorded';
export const SCORING_CLOSED='Your best score is recorded. Play next hole when ready.';
export function scoringReminder(remaining){
 if(remaining===0)return PRACTICE_MODE;
 return remaining>=1&&remaining<=3?`${remaining} scoring ${remaining===1?'attempt':'attempts'} remaining.`:'';
}
export function currentStrokeText(state){
 const strokes=state?.attempts??0,max=maximumStrokes(state?.challenge?.par??3);
 return `${strokes} ${strokes===1?'stroke':'strokes'}${strokes>=max?' (Max score)':''}`;
}
