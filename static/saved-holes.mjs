import {restartSettings} from './startup.mjs?v=golf-v160';
export const savedHoleKey=h=>[h.start,h.waypoint?.word??'',h.final_target??h.target].join('|');
/** Recover custom layouts from scorecards while preserving them across log resets. */
export function collectSavedHoles(stored,journeys,puzzles,retired=[]){
 const known=new Set([...puzzles.filter(h=>!h.saved_custom),...retired].map(savedHoleKey)),saved=new Map();
 const add=h=>{if(!h||![h.start,h.target].every(w=>typeof w==='string'&&/^[a-z]+$/.test(w))||h.waypoint&&!/^[a-z]+$/.test(h.waypoint.word))return;const key=savedHoleKey(h);if(!known.has(key))saved.set(key,{...h,saved_custom:true});};
 if(Array.isArray(stored))stored.forEach(add);
 for(const journey of journeys)if(journey?.state)add(restartSettings(journey.state,puzzles[0]));
 return [...saved.values()];
}
