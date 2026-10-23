/** A word can occupy a separate lie on each leg of a waypoint hole. */
export const wordLieKey=(word,eventOrStage=0)=>`${word}@${typeof eventOrStage==='object'?eventOrStage?.stage??0:eventOrStage}`;
export function currentLieKey(state){
 const landed=state.history.findLast(h=>h.success&&h.word===state.current);
 return wordLieKey(state.current,landed??0);
}
