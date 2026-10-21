/** Exact one-step omissions from the played route, not a global shortest-path search. */
import {Game} from './engine.mjs?v=golf-v47';
export const ROUTE_REVIEW_VERSION='route-review-v1';
export function reviewRoute(e,saved){
 if(!saved.won||!['golf-distance-v2','golf-fixed-v2','golf-distance-v3','golf-fixed-v3'].includes(saved.rules))throw Error('Shortcut review is available for completed current-course rounds.');
 const fresh=()=>new Game(e,saved.start,saved.target,saved.threshold,saved);
 const original=fresh();
 for(const event of saved.history){
  const actual=original.submit(event.word);
  if(actual.success!==event.success||actual.outcome!==event.outcome)throw Error('This scorecard could not be reproduced for shortcut review.');
 }
 if(!original.won||JSON.stringify(original.route)!==JSON.stringify(saved.route))throw Error('The saved route could not be reproduced.');
 const route=[...original.route],skips=[];
 for(let index=1;index<route.length-1;index++){
  const candidate=route.filter((_,i)=>i!==index),trial=fresh();let shortcut;
  try{
   for(let i=1;i<candidate.length;i++){
    // A green's automatic finish is already the last edge of this route.
    if(trial.won){if(i===candidate.length-1&&candidate[i]===trial.target&&trial.automatic_shots.length)break;throw Error('Different finish');}
    const shot=trial.submit(candidate[i]);
    if(!shot.success)throw Error('The remaining route is not playable');
    if(i===index)shortcut=shot;
   }
   if(trial.won&&JSON.stringify(trial.route)===JSON.stringify(candidate))skips.push({index,word:route[index],from:route[index-1],to:route[index+1],contact:shortcut.launch,required:shortcut.required,shortened_route:candidate});
  }catch{/* Omission changes contact, water, revisits or the finish: keep the step. */}
 }
 return {version:ROUTE_REVIEW_VERSION,route,skips,independent:true,complete:true};
}
export function markedRoute(route,report){
 const indices=new Set(report?.complete&&JSON.stringify(report.route)===JSON.stringify(route)?report.skips.map(s=>s.index):[]);
 return route.map((word,i)=>word+(indices.has(i)?'*':'')).join(' → ');
}
export function shortcutNote(report){
 if(!report?.skips.length)return '';
 return report.skips.length===1?'* Could have been skipped.':'* Could have been skipped. Each mark is checked separately; not necessarily all together.';
}
