/** Live input policy only. Keep vector rows and historical engine replay intact. */
export const BLOCKED_PLAY_WORDS=Object.freeze(['yes', 'yeah', 'but', 'actually', 'indeed', 'really', 'however', 'perhaps', 'very', 'also', 'maybe', 'someone']);
const blocked=new Set(BLOCKED_PLAY_WORDS);
export const isBlockedPlayWord=word=>blocked.has(String(word??'').trim().toLowerCase());
export function requirePlayableWord(word){
 if(isBlockedPlayWord(word))throw Error('Word not allowed. Try another.');
}
export function checkLiveVocabulary(path,body){
 if(path==='submit')requirePlayableWord(body.word);
 if(path==='new'||path==='waypoint-access')for(const word of [body.start,body.target,body.final_target,body.waypoint?.word])requirePlayableWord(word);
}
