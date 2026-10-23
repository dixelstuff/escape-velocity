import {STROKE_PLAY,attemptLimit,maximumStrokes} from './stroke-play.mjs?v=golf-v114';
import {mapFraction} from './map.mjs?v=golf-v114';
export const ROUND_VERSION='five-hole-v2';
const clamp=v=>Math.max(0,Math.min(1,v));
export const scoreText=value=>value===0?'Even':value>0?`+${value}`:`−${Math.abs(value)}`;
export const resultText=value=>value<=-3?'Albatross':value===-2?'Eagle':value===-1?'Birdie':value===0?'Par':value===1?'Bogey':value===2?'Double bogey':'Triple bogey';
export function landedProgress(state,arrivalFraction=.9){
 const best=Math.max(state.baseline,...state.history.filter(h=>h.success).map(h=>h.destination));
 return state.won?1:clamp(mapFraction(best,state.baseline,state.threshold,arrivalFraction));
}
export function attemptResult(record,par=3){
 if(record.state.challenge?.version===STROKE_PLAY)return record.state.won?record.state.attempts-par:maximumStrokes(par)-par;
 return record.state.won?Math.max(-1,record.state.attempts-par):record.progress+1e-7>=.5?1:2;
}
export function bestAttempt(hole){
 return [...hole.attempts].filter(a=>a.ended).sort((a,b)=>attemptResult(a,hole.settings.par)-attemptResult(b,hole.settings.par)||
  (a.state.challenge?.version===STROKE_PLAY?a.number-b.number:0)||
  // On unfinished holes retain the furthest landed position, never the missed destination.
  (!a.state.won&&!b.state.won?b.progress-a.progress:0)||
  (b.skill?.score??-1)-(a.skill?.score??-1)||a.number-b.number)[0]??null;
}
export function roundTotal(round){return round.holes.reduce((sum,h)=>sum+(bestAttempt(h)?attemptResult(bestAttempt(h),h.settings.par):0),0);}
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
  this.data.rounds=this.data.rounds.filter(r=>[ROUND_VERSION,'five-hole-v1'].includes(r.version)&&r.holes?.length===5&&Number.isInteger(r.index)&&r.index>=0&&r.index<5&&r.holes.every(h=>h.settings&&typeof h.challengeId==='string'&&Array.isArray(h.attempts)&&h.attempts.length<=attemptLimit(h.settings.par)&&new Set(h.attempts.map(a=>a.number)).size===h.attempts.length&&h.attempts.every(a=>Number.isInteger(a.number)&&a.number>=1&&a.number<=attemptLimit(h.settings.par)&&Array.isArray(a.state?.history)&&Number.isFinite(a.progress))));
 }
 get active(){return this.data.rounds.find(r=>r.id===this.data.activeId)??null;}
 get hole(){return this.active?.holes[this.active.index]??null;}
 save(){try{if(!this.storage)throw Error('Storage unavailable');this.storage.setItem('word-golf-courses-v1',JSON.stringify(this.data));this.warning='';}catch{this.warning='This round could not be saved on this device. Download your scorecards before leaving.';}}
 begin(course,model='',defaults={}){
  if(course.holes.length!==5)throw Error('A course needs five holes.');
  const r={version:ROUND_VERSION,id:this.makeId(),courseId:course.id,name:course.name,model,startedAt:this.now(),index:0,finished:false,holes:course.holes.map(p=>({settings:{...p,...defaults,word_model:model,par:p.par??3},challengeId:this.makeId(),arrivalFraction:null,locked:false,attempts:[]}))};
  this.data.rounds.push(r);this.data.activeId=r.id;this.save();return r;
 }
 belongs(state){return !!this.hole&&state?.challenge?.id===this.hole.challengeId;}
 settings(){const h=this.hole;if(!h||this.active.finished||h.locked)throw Error('The hole is closed.');const number=Math.max(0,...h.attempts.map(a=>a.number))+1;if(number>attemptLimit(h.settings.par))throw Error('Attempt limit reached.');return {...h.settings,challenge:{version:STROKE_PLAY,par:h.settings.par,attempt:number,id:h.challengeId}};}
 record(state,journeyId,arrivalFraction){
  if(!this.belongs(state)||this.active.finished||this.hole.locked||(!state.history.length&&!state.challenge_failed))return;
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
  if(!state.won&&!state.challenge_failed)this.record({...state,challenge_failed:true,abandoned:true,skipped:true},journeyId,arrivalFraction);
  else this.record(state,journeyId,arrivalFraction);
  return this.advance();
 }
 advance(){
  if(!this.active||this.active.finished||!bestAttempt(this.hole))return false;
  const h=this.hole;if(this.active.version==='five-hole-v1'&&!h.attempts.some(a=>a.state.won)&&h.attempts.filter(a=>a.ended).length<5)return false;
  h.locked=true;
  if(this.active.index===4){this.active.finished=true;this.active.completedAt=this.now();}else this.active.index++;
  this.save();return true;
 }
 exportData(){return this.data.rounds.map(r=>({...structuredClone(r),total_score:roundTotal(r),attempts_used:r.holes.reduce((sum,h)=>sum+h.attempts.filter(a=>a.ended).length,0),ranking_order:'score-then-attempts',overall_skill:overallSkill(r),skill_version:'best-five-paths-v1',results:r.holes.map((h,i)=>{const a=bestAttempt(h);return {hole:i+1,start:h.settings.start,target:h.settings.target,score:a?attemptResult(a,h.settings.par):null,best_attempt:a?.number??null,attempts_used:h.attempts.filter(a=>a.ended).length,locked:h.locked};})}));}
 reset(){this.data={version:ROUND_VERSION,rounds:[],activeId:null,backup:this.data.rounds};this.save();}
 restore(){const ids=new Set(this.data.rounds.map(r=>r.id));this.data.rounds=[...(this.data.backup??[]).filter(r=>!ids.has(r.id)),...this.data.rounds];delete this.data.backup;this.save();}
}
