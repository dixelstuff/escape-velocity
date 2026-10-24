import {STROKE_PLAY,attemptLimit,maximumStrokes} from './stroke-play.mjs?v=golf-v153';
import {mapFraction} from './map.mjs?v=golf-v153';
export const ROUND_VERSION='five-hole-v2';
const clamp=v=>Math.max(0,Math.min(1,v));
export const scoreText=value=>value===0?'Even':value>0?`+${value}`:`−${Math.abs(value)}`;
export const resultText=value=>value<=-3?'Albatross':value===-2?'Eagle':value===-1?'Birdie':value===0?'Par':value===1?'Bogey':value===2?'Double bogey':'Triple bogey';
export function landedProgress(state,arrivalFraction=.9){
 const best=Math.max(state.baseline,...state.history.filter(h=>h.success).map(h=>h.destination));
 return state.won?1:clamp(mapFraction(best,state.baseline,state.threshold,arrivalFraction));
}
export function attemptResult(record,par=3){
 if(record.state.challenge?.version===STROKE_PLAY)return record.state.won?Math.min(2,record.state.attempts-par):maximumStrokes(par)-par;
 return record.state.won?Math.max(-1,record.state.attempts-par):record.progress+1e-7>=.5?1:2;
}
export function bestAttempt(hole){
 return [...hole.attempts].filter(a=>a.ended).sort((a,b)=>attemptResult(a,hole.settings.par)-attemptResult(b,hole.settings.par)||Number(b.state.won)-Number(a.state.won)||
  (a.state.challenge?.version===STROKE_PLAY?a.number-b.number:0)||
  // On unfinished holes retain the furthest landed position, never the missed destination.
  (!a.state.won&&!b.state.won?b.progress-a.progress:0)||
  (b.skill?.score??-1)-(a.skill?.score??-1)||a.number-b.number)[0]??null;
}
/** A failed exploration is not a posted score until the hole closes or its limit is spent. */
export function postedAttempt(hole){
 const best=bestAttempt(hole);
 return hole.finalized||hole.attempts.some(a=>a.state.won)||hole.attempts.some(a=>a.ended&&a.number>=attemptLimit(hole.settings.par))?best:null;
}
export function reachedHole(round){
 return round.furthestIndex??Math.min(round.holes.length-1,Math.max(round.index,...round.holes.map((h,i)=>h.locked?i+1:h.attempts.length?i:0)));
}
export function roundTotal(round){return round.holes.reduce((sum,h)=>sum+(postedAttempt(h)?attemptResult(postedAttempt(h),h.settings.par):0),0);}
export function overallSkill(round){
 if(!round.finished||round.holes.some(h=>h.attempts.some(a=>a.ended&&a.state.history.some(x=>x.success)&&!a.skill)))return null;
 const values=round.holes.map(h=>{const a=bestAttempt(h);if(!a||!a.state.history.some(x=>x.success))return 0;if(!a.skill)return null;return a.skill.score*(a.state.won?1:a.progress);});
 return values.some(v=>v===null)?null:Math.round(values.reduce((a,b)=>a+b,0)/round.holes.length);
}
export class CourseRounds{
 constructor(storage,makeId=()=>crypto.randomUUID(),now=()=>new Date().toISOString()){
  this.storage=storage;this.makeId=makeId;this.now=now;this.warning='';
  try{this.data=JSON.parse(storage?.getItem('word-golf-courses-v1')??'null');}catch{}
  if(!this.data||!Array.isArray(this.data.rounds))this.data={version:ROUND_VERSION,rounds:[],activeId:null};
  // Invalid or incompatible saves must never disable practice play.
  this.data.rounds=this.data.rounds.filter(r=>[ROUND_VERSION,'five-hole-v1'].includes(r.version)&&[5,9].includes(r.holes?.length)&&Number.isInteger(r.index)&&r.index>=0&&r.index<r.holes.length&&r.holes.every(h=>h.settings&&typeof h.challengeId==='string'&&Array.isArray(h.attempts)));
  for(const r of this.data.rounds)for(const h of r.holes){
   const unique=new Map();
   for(const a of h.attempts){
    if(!Number.isInteger(a.number)||a.number<1||a.number>attemptLimit(h.settings.par)||a.state?.challenge?.practice||!Array.isArray(a.state?.history)||!Number.isFinite(a.progress))continue;
    const old=unique.get(a.number);
    if(!old||!a.state.default_score&&(!old.state.won||a.state.won))unique.set(a.number,a);
   }
   h.attempts=[...unique.values()];h.finalized=!!r.finished;
   if(!r.finished&&!postedAttempt(h))h.locked=false;
  }
 }
 get active(){return this.data.rounds.find(r=>r.id===this.data.activeId)??null;}
 get hole(){return this.active?.holes[this.active.index]??null;}
 save(){try{if(!this.storage)throw Error('Storage unavailable');this.storage.setItem('word-golf-courses-v1',JSON.stringify(this.data));this.warning='';}catch{this.warning='This round could not be saved on this device. Download your scorecards before leaving.';}}
 begin(course,model='',defaults={}){
  if(![5,9].includes(course.holes.length))throw Error('A course needs five or nine holes.');
  const r={version:ROUND_VERSION,id:this.makeId(),courseId:course.id,name:course.name,model,startedAt:this.now(),index:0,furthestIndex:0,finished:false,holes:course.holes.map(p=>({settings:{...p,...defaults,word_model:model,par:p.par??3},challengeId:this.makeId(),arrivalFraction:null,locked:false,attempts:[]}))};
  this.data.rounds.push(r);this.data.activeId=r.id;this.save();return r;
 }
 belongs(state){return !!this.hole&&state?.challenge?.id===this.hole.challengeId;}
 settings(){const h=this.hole;if(!h||this.active.finished||h.locked)throw Error('The hole is closed.');const number=Math.max(0,...h.attempts.map(a=>a.number))+1;if(number>attemptLimit(h.settings.par))throw Error('Attempt limit reached.');return {...h.settings,challenge:{version:STROKE_PLAY,par:h.settings.par,attempt:number,id:h.challengeId}};}
 record(state,journeyId,arrivalFraction){
  if(state.challenge?.practice||!this.belongs(state)||this.active.finished||this.hole.locked||(!state.history.length&&!state.challenge_failed))return;
  const h=this.hole;h.arrivalFraction??=arrivalFraction;
  const number=state.challenge.attempt;if(number>attemptLimit(h.settings.par))return;
  const old=h.attempts.find(a=>a.number===number),key=JSON.stringify(state.history.map(x=>x.word)),record={number,journeyId,state:structuredClone(state),key,progress:landedProgress(state,h.arrivalFraction),ended:state.won||state.challenge_failed};
  record.skill=old?.key===key?old.skill:undefined;
  if(old)Object.assign(old,record);else h.attempts.push(record);
  this.active.updatedAt=this.now();this.save();
 }
 setSkill(roundId,holeIndex,number,key,report){
  const r=this.data.rounds.find(r=>r.id===roundId),a=r?.holes[holeIndex]?.attempts.find(a=>a.number===number);
  if(!a||a.key!==key||!Number.isFinite(report.score)||report.score<0||report.score>1000)return false;
  a.skill=structuredClone(report);this.save();return true;
 }
 /** Close the current hole early, preserving any better completed attempt. */
 skip(state,journeyId,arrivalFraction){
  if(!this.belongs(state)||this.active.finished)return false;
  if(state.challenge?.practice)return this.advance();
  if(!state.won&&!state.challenge_failed){if(state.history.length)this.record({...state,challenge_failed:true,abandoned:true,skipped:true},journeyId,arrivalFraction);}
  else this.record(state,journeyId,arrivalFraction);
  return this.advance();
 }
 advance(){
  if(!this.active||this.active.finished)return false;
  const h=this.hole;if(this.active.version==='five-hole-v1'&&!h.attempts.some(a=>a.state.won)&&h.attempts.filter(a=>a.ended).length<5)return false;
  h.locked=!!postedAttempt(h);
  if(this.active.index===this.active.holes.length-1){this.active.completed=true;this.active.completedAt=this.now();}else this.active.index++;
  this.active.furthestIndex=Math.max(reachedHole(this.active),this.active.index);
  this.save();return true;
 }
 reopen(){
  if(!this.hole||this.active.finished||Math.max(0,...this.hole.attempts.map(a=>a.number))>=attemptLimit(this.hole.settings.par))return false;
  this.hole.locked=false;this.save();return true;
 }
 canVisit(index){return !!this.active&&Number.isInteger(index)&&index>=0&&index<this.active.holes.length;}
 attemptedHoles(){return this.active?.holes.filter(h=>h.attempts.some(a=>!a.state.default_score&&a.state.history.length>0)).length??0;}
 minimumAttemptedHoles(){return Math.ceil((this.active?.holes.length??0)/2);}
 canSubmit(){return !!this.active&&!this.active.finished&&this.attemptedHoles()>=this.minimumAttemptedHoles();}
 unfinished(){return this.active?.holes.filter(h=>!postedAttempt(h)).length??0;}
 submit(){
  const r=this.active;if(!this.canSubmit())return false;
  r.furthestIndex=reachedHole(r);
  for(const h of r.holes){
   if(!bestAttempt(h)){
    const state={...h.settings,start:h.settings.start,target:h.settings.target,...(h.settings.waypoint?{waypoint:h.settings.waypoint,final_target:h.settings.target}:{}),threshold:h.settings.threshold,baseline:0,history:[],route:[h.settings.start],attempts:0,won:false,challenge_failed:true,abandoned:true,default_score:true,challenge:{id:h.challengeId,version:STROKE_PLAY,par:h.settings.par,attempt:attemptLimit(h.settings.par)}};
    const live=h.attempts.find(a=>a.number===attemptLimit(h.settings.par));
    if(live){live.ended=true;live.state={...live.state,challenge_failed:true,abandoned:true};}
    else h.attempts.push({number:attemptLimit(h.settings.par),journeyId:null,state,key:'',progress:0,ended:true});
   }
   h.locked=true;h.finalized=true;
  }
  r.finished=true;r.submittedAt=this.now();this.save();return true;
 }
 exportData(){return this.data.rounds.map(r=>({...structuredClone(r),total_score:roundTotal(r),attempts_used:r.holes.reduce((sum,h)=>sum+h.attempts.filter(a=>a.ended&&!a.state.default_score).length,0),attempts_to_best:r.holes.reduce((sum,h)=>sum+(bestAttempt(h)?.number??0),0),ranking_order:'score-then-first-best-attempt',overall_skill:overallSkill(r),skill_version:'best-five-paths-v1',results:r.holes.map((h,i)=>{const a=bestAttempt(h);return {hole:i+1,start:h.settings.start,target:h.settings.target,score:a?attemptResult(a,h.settings.par):null,best_attempt:a?.state.default_score?null:a?.number??null,default_score:!!a?.state.default_score,attempts_used:h.attempts.filter(a=>a.ended&&!a.state.default_score).length,locked:h.locked};})}));}
 reset(){this.data={version:ROUND_VERSION,rounds:[],activeId:null,backup:this.data.rounds};this.save();}
 restore(){const ids=new Set(this.data.rounds.map(r=>r.id));this.data.rounds=[...(this.data.backup??[]).filter(r=>!ids.has(r.id)),...this.data.rounds];delete this.data.backup;this.save();}
}
