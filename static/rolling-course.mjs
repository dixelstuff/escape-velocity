import {CourseRounds,bestAttempt,attemptResult,landedProgress} from './course-round.mjs?v=golf-v182';
import {STROKE_PLAY,attemptLimit} from './stroke-play.mjs?v=golf-v182';
export const utcDay=value=>new Date(value).toISOString().slice(0,10);
export const addDays=(day,n)=>utcDay(Date.parse(day+'T00:00:00Z')+n*86400000);
export function scopedStorage(storage,prefix){return {getItem:k=>storage?.getItem(prefix+k)??null,setItem:(k,v)=>{if(!storage)throw Error('Storage unavailable');storage.setItem(prefix+k,v);},removeItem:k=>storage?.removeItem(prefix+k)};}
export const publicationLength=manifest=>manifest.publicationIds?.length??manifest.holes.length;
export const arrivalsPerDay=manifest=>manifest.arrivalsPerDay??1;
export const publicationDays=manifest=>Math.floor((publicationLength(manifest)-1-manifest.initialNewest)/arrivalsPerDay(manifest))+1;
export function publicationWindow(manifest,day){
 const definitions=new Map(manifest.holes.map(h=>[h.id,h]));
 const publications=manifest.publicationIds?manifest.publicationIds.map(id=>definitions.get(id)):manifest.holes;
 const offset=Math.floor((Date.parse(day+'T00:00:00Z')-Date.parse(manifest.epoch+'T00:00:00Z'))/86400000);
 const newest=manifest.initialNewest+Math.max(0,offset)*arrivalsPerDay(manifest);
 // Stop at the end of the trial queue, rather than repeat a competitive hole.
 if(newest>=publications.length)throw Error('The trial publication queue has ended. Your saved scorecards are safe.');
 return {active:publications.slice(newest-8,newest+1).reverse(),retired:publications.slice(0,newest-8)};
}
export function usedAttempts(hole){return Math.max(0,...hole.attempts.filter(a=>a.state.history.some(s=>!s.assumed&&!s.automatic)).map(a=>a.number));}
export function endedAttempts(hole){return Math.max(0,...hole.attempts.filter(a=>a.ended).map(a=>a.number));}
export function holeBest(hole){return bestAttempt({...hole,attempts:hole.attempts.filter(a=>a.state.won)});}
export class RollingCourse extends CourseRounds{
 constructor(storage,manifest,day=utcDay(Date.now()),makeId=()=>crypto.randomUUID()){
  super(null,makeId);this.storage=storage;this.manifest=manifest;this.ready=false;
  let saved;this.savedRaw=storage?.getItem('rolling-course-v1')??null;try{saved=JSON.parse(this.savedRaw??'null');}catch{this.warning='Saved rolling progress could not be read.';}
  this.store=saved?.version===1?saved:{version:1,bank:{},submissions:{},visits:[],practiceSeen:[]};
  this.rollover(day);this.ready=true;this.save();
 }
 hasExternalChanges(){return (this.storage?.getItem('rolling-course-v1')??null)!==this.savedRaw;}
 get current(){return this.data.rounds[0];}
 get day(){return this.store.day;}
 ensure(def){
  return this.store.bank[def.id]??= {settings:structuredClone(def.settings),challengeId:def.id,allowance:attemptLimit(def.settings.par??3),arrivalFraction:null,locked:false,attempts:[],lastBonus:null};
 }
 rollover(requested){
  const day=this.store.day&&this.store.day>requested?this.store.day:requested;
  const changed=this.store.day!==day,window=publicationWindow(this.manifest,day),bonus=[];
  // Submitted daily courses are immutable, including snapshots made before the balanced trial schedule.
  const snapshot=this.store.submissions[day],definitions=new Map(this.manifest.holes.map(h=>[h.id,h]));
  if(snapshot?.rows?.length===9&&snapshot.rows.every(r=>definitions.has(r.id)))window.active=snapshot.rows.map(r=>definitions.get(r.id));
  for(const def of window.active){
   const h=this.ensure(def);
   if(changed&&usedAttempts(h)>0&&h.lastPlayedDay<day&&h.lastBonus!==day){h.allowance+=3;h.lastBonus=day;bonus.push(def.id);}
   h.locked=false;h.finalized=false;
  }
  const previous=this.store.selection,holes=window.active.map(d=>this.ensure(d)),index=Math.max(0,holes.findIndex(h=>h.challengeId===previous));
  this.store.day=day;if(changed){this.store.bonus=bonus;this.store.visits.push(day);}
  const round={id:'rolling-'+day,version:'five-hole-v2',courseId:'rolling',name:'Daily nine',date:day,index,furthestIndex:8,finished:!!this.store.submissions[day],holes,model:''};
  this.data={version:'five-hole-v2',rounds:[round],activeId:this.store.practice?'practice':round.id};
  if(!this.store.selection)this.store.selection=holes[0].challengeId;
  return changed;
 }
 save(){
  if(!this.ready)return;
  if(this.hasExternalChanges()){this.warning='Rolling progress changed in another tab. Reload to use the latest saved course.';return;}
  if(this.active)this.store.selection=this.hole.challengeId;
  this.store.practice=!this.active;
  try{const raw=JSON.stringify(this.store);this.storage?.setItem('rolling-course-v1',raw);this.savedRaw=raw;if(!this.storage)throw Error();this.warning='';}catch{this.warning='Rolling progress could not be saved. Keep this page open and download your scorecards.';}
 }
 settings(){
  const h=this.hole;if(!h||this.active.finished)throw Error('Today’s scorecard is submitted.');
  const live=h.attempts.findLast(a=>!a.ended);
  const number=live&&!live.state.history.some(s=>!s.assumed&&!s.automatic)?live.number:Math.max(0,...h.attempts.map(a=>a.number))+1;
  if(number>h.allowance)throw Error('No scoring attempts remaining today.');
  return {...h.settings,continuous_play:true,challenge:{version:STROKE_PLAY,par:h.settings.par,attempt:number,id:h.challengeId,rolling:true,attempt_limit:h.allowance}};
 }
 record(state,journeyId,arrivalFraction){
  if(this.hasExternalChanges()||!this.belongs(state)||this.active.finished||state.challenge.practice||state.challenge.attempt>this.hole.allowance||!state.history.length)return;
  const h=this.hole,number=state.challenge.attempt,old=h.attempts.find(a=>a.number===number),key=JSON.stringify(state.history.map(x=>x.word));
  const record={number,journeyId,state:structuredClone(state),key,progress:landedProgress(state,arrivalFraction),ended:state.won||state.challenge_failed,skill:old?.key===key?old.skill:undefined};
  for(const a of h.attempts)if(a.number<number&&!a.ended&&a.state.history.some(s=>!s.assumed&&!s.automatic)){a.ended=true;a.state={...a.state,challenge_failed:true,abandoned:true};}
  h.arrivalFraction??=arrivalFraction;
  if(old)Object.assign(old,record);else h.attempts.push(record);
  h.lastPlayedDay=this.day;this.save();
 }
 playable(state){
  if(this.current.finished)return false;
  const h=this.hole;if(!h)return true;
  return endedAttempts(h)<h.allowance&&(!state||state.challenge.attempt<=h.allowance);
 }
 reopen(){if(!this.hole||!this.playable())return false;this.hole.locked=false;this.save();return true;}
 advance(){if(!this.active||this.active.finished)return false;if(this.active.index<8)this.active.index++;else this.active.completed=true;this.save();return true;}
 canSubmit(){return !!this.active&&!this.active.finished;}
 unfinished(){return this.current.holes.filter(h=>!holeBest(h)).length;}
 submit(){
  if(this.hasExternalChanges()||!this.canSubmit())return false;
  const rows=this.current.holes.map(h=>{const best=holeBest(h);return {id:h.challengeId,par:h.settings.par,strokes:best?Math.min(h.settings.par+2,best.state.attempts):h.settings.par+2,bestAttempt:best?.number??null,default:!best};});
  this.store.submissions[this.day]={date:this.day,submittedAt:new Date().toISOString(),rows,total:rows.reduce((s,h)=>s+h.strokes,0),par:rows.reduce((s,h)=>s+h.par,0)};
  this.current.finished=true;this.save();return true;
 }
 retired(){const active=new Set(this.current.holes.map(h=>h.challengeId));return publicationWindow(this.manifest,this.day).retired.filter(h=>!active.has(h.id));}
 pickPractice(random=Math.random){
  const retired=this.retired(),unseen=retired.filter(d=>!this.store.practiceSeen.includes(d.id)&&!this.store.bank[d.id]?.attempts.some(a=>a.state.history.some(s=>!s.assumed))),unpractised=retired.filter(d=>!this.store.practiceSeen.includes(d.id)),pool=unseen.length?unseen:unpractised.length?unpractised:retired;
  const def=pool[Math.floor(random()*pool.length)];if(!def)return null;
  if(!this.store.practiceSeen.includes(def.id))this.store.practiceSeen.push(def.id);
  this.data.activeId=null;this.store.practice=true;this.store.practiceId=def.id;this.save();return def;
 }
 returnToDaily(){this.data.activeId=this.current.id;this.store.practice=false;this.save();}
 exportData(){return {mode:'rolling-nine-trial',day:this.day,bank:structuredClone(this.store.bank),submissions:structuredClone(this.store.submissions)};}
 reset(){/* Standard scorecard reset must never erase competitive progress. */}
 restore(){}
}
