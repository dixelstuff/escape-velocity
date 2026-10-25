import {addDays} from './rolling-course.mjs?v=golf-v178';
/** Freeze existing daily fives; append new curated layouts without reusing a hole. */
export function buildTourSchedule(bank,existing=null){
 const definitions=new Map(bank.holes.map(h=>[h.id,h])),key=id=>{const h=definitions.get(id)?.settings;if(!h)throw Error('A published Tour hole is missing: '+id);return [h.start,h.waypoint?.word,h.target].join('|');};
 const epoch=existing?.epoch??'2026-10-25',practiceIds=[...(existing?.practiceIds??bank.publicationIds.slice(0,bank.initialNewest-8))],courses=structuredClone(existing?.courses??[]),seen=new Set(practiceIds.map(key));
 for(const [i,c] of courses.entries()){
  if(c.date!==addDays(epoch,i)||c.holeIds.length!==5)throw Error('Invalid frozen Tour calendar.');
  for(const id of c.holeIds){const k=key(id);if(seen.has(k))throw Error('A published Tour layout repeats.');seen.add(k);}
 }
 const order=[...(bank.dailyRelease?.holeIds??[]),...bank.publicationIds,...bank.holes.map(h=>h.id)];
 const remaining=order.map(id=>definitions.get(id)).filter(h=>{const k=key(h.id);if(seen.has(k))return false;seen.add(k);return true;});
 while(true){
  const patterns=courses.length%2?[[3,4,5,3,5],[3,4,5,4,5]]:[[3,4,5,4,5],[3,4,5,3,5]];
  const pattern=patterns.find(p=>[3,4,5].every(par=>remaining.filter(h=>h.settings.par===par).length>=p.filter(v=>v===par).length));if(!pattern)break;
  const holeIds=pattern.map(par=>remaining.splice(remaining.findIndex(h=>h.settings.par===par),1)[0].id);courses.push({date:addDays(epoch,courses.length),holeIds});
 }
 return {version:'daily-five-tours-v1',epoch,practiceIds,courses};
}
