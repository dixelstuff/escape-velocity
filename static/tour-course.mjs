import {RollingCourse,holeBest} from './rolling-course.mjs?v=golf-v177';
export const TOURS=[{id:'pro',name:'Pro Tour',icon:'🏆',max:24},{id:'amateur',name:'Amateur Tour',icon:'⛳',max:49},{id:'social',name:'Social Tour',icon:'🏌️',max:Infinity}];
export const tourFor=attempts=>TOURS.find(t=>attempts<=t.max)??TOURS[2];
export const spentAttempts=hole=>hole.attempts.filter(a=>a.state.history.some(s=>!s.assumed&&!s.automatic)).length;
export function tourStatus(attempts){const tour=tourFor(attempts),left=tour.max-attempts,next=TOURS[TOURS.indexOf(tour)+1];return {tour,left,next,detail:next?left?`${left} ${left===1?'attempt':'attempts'} remaining in ${tour.name}`:`Next attempt enters ${next.name}`:'Unlimited attempts in Social Tour'};}
export const compareTourScores=(a,b)=>a.total-b.total||b.eagles-a.eagles||a.totalAttempts-b.totalAttempts;
export function rankTourScores(scores,day,tour){
 const entries=scores.filter(s=>s.date===day&&s.tour===tour).sort(compareTourScores);
 let rank=0;return entries.map((s,i)=>{if(!i||compareTourScores(s,entries[i-1])!==0)rank=i+1;return {...s,rank};});
}
export function tourWindow(manifest,day){
 const course=manifest.courses.find(c=>c.date===day);
 if(!course)throw Error('This daily Tour course is not scheduled yet. Your saved scorecards are safe.');
 const definitions=new Map(manifest.holes.map(h=>[h.id,h]));
 return {active:course.holeIds.map(sourceId=>({id:`tour-${day}-${sourceId}`,sourceId,settings:definitions.get(sourceId).settings})),retired:[...manifest.practiceIds,...manifest.courses.filter(c=>c.date<day).flatMap(c=>c.holeIds)].map(id=>definitions.get(id))};
}
/** Daily fives are isolated from the rolling trial and have no per-hole attempt allowance. */
export class TourCourse extends RollingCourse{
 ensure(def){const h=super.ensure(def);h.sourceId=def.sourceId;h.allowance=Number.MAX_SAFE_INTEGER;h.settings.golden_paths=h.settings.par<=4?(h.settings.golden_paths??[]):[];return h;}
 rollover(requested){
  const day=this.store.day&&this.store.day>requested?this.store.day:requested,changed=this.store.day!==day;
  let active=tourWindow(this.manifest,day).active;const snapshot=this.store.submissions[day];
  if(snapshot?.rows?.length===5&&snapshot.rows.every(r=>this.store.bank[r.id]))active=snapshot.rows.map(r=>({id:r.id,sourceId:this.store.bank[r.id].sourceId,settings:this.store.bank[r.id].settings}));
  const holes=active.map(d=>this.ensure(d)),index=Math.max(0,holes.findIndex(h=>h.challengeId===this.store.selection));
  this.store.day=day;this.store.bonus=[];if(changed){this.store.visits.push(day);this.store.practice=false;}
  const round={id:'tour-'+day,version:'five-hole-v2',courseId:'tour',name:'Daily Tour',date:day,index,furthestIndex:4,finished:!!snapshot,holes,model:''};
  this.data={version:'five-hole-v2',rounds:[round],activeId:this.store.practice?'practice':round.id};
  if(!this.store.selection)this.store.selection=holes[0].challengeId;return changed;
 }
 settings(){const settings=super.settings();return {...settings,challenge:{...settings.challenge,tour:true}};}
 totalAttempts(){return this.current.holes.reduce((sum,h)=>sum+spentAttempts(h),0);}
 qualification(){return tourStatus(this.totalAttempts());}
 wouldSpendAttempt(state){return this.belongs(state)&&!this.hole.attempts.some(a=>a.number===state.challenge.attempt&&a.state.history.some(s=>!s.assumed&&!s.automatic));}
 needsBoundaryConsent(state){const count=this.totalAttempts();return this.wouldSpendAttempt(state)&&[24,49].includes(count)&&!this.store.boundaryConsent?.[this.day]?.includes(count);}
 acknowledgeBoundary(){const days=this.store.boundaryConsent??={},entries=days[this.day]??=[];if(!entries.includes(this.totalAttempts()))entries.push(this.totalAttempts());this.save();}
 playable(){return !this.current.finished;}
 reopen(){if(!this.playable())return false;this.hole.locked=false;this.save();return true;}
 advance(){if(!this.active||this.active.finished)return false;if(this.active.index<4)this.active.index++;else this.active.completed=true;this.save();return true;}
 submit(){
  if(this.hasExternalChanges()||!this.canSubmit())return false;
  const rows=this.current.holes.map(h=>{const best=holeBest(h);return {id:h.challengeId,par:h.settings.par,strokes:best?Math.min(h.settings.par+2,best.state.attempts):h.settings.par+2,bestAttempt:best?.number??null,default:!best,attempts:spentAttempts(h)};});
  const totalAttempts=this.totalAttempts();
  this.store.submissions[this.day]={id:'tour-'+this.day,date:this.day,player:'You',submittedAt:new Date().toISOString(),rows,total:rows.reduce((s,h)=>s+h.strokes,0),par:rows.reduce((s,h)=>s+h.par,0),totalAttempts,eagles:rows.filter(h=>h.par-h.strokes===2).length,tour:tourFor(totalAttempts).id};
  this.current.finished=true;this.save();return true;
 }
 retired(){return tourWindow(this.manifest,this.day).retired;}
 pickPractice(random=Math.random){
  const retired=this.retired(),played=new Set(Object.values(this.store.bank).filter(h=>spentAttempts(h)>0).map(h=>h.sourceId)),unseen=retired.filter(d=>!played.has(d.id)&&!this.store.practiceSeen.includes(d.id)),fresh=retired.filter(d=>!this.store.practiceSeen.includes(d.id)),pool=unseen.length?unseen:fresh.length?fresh:retired;
  const def=pool[Math.floor(random()*pool.length)];if(!def)return null;
  if(!this.store.practiceSeen.includes(def.id))this.store.practiceSeen.push(def.id);
  this.data.activeId=null;this.store.practice=true;this.store.practiceId=def.id;this.save();return def;
 }
 exportData(){return {...super.exportData(),mode:'daily-five-tours',ranking_order:'strokes-eagles-attempts'};}
}
