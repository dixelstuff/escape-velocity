import assert from 'node:assert/strict';
import {CourseRounds,bestAttempt,attemptResult,roundTotal,scoreText,resultText} from '../static/course-round.mjs';
import {STROKE_PLAY,attemptLimit} from '../static/stroke-play.mjs';
const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};let id=0;
const store=new CourseRounds(storage,()=>`id-${++id}`,()=>new Date(0).toISOString());
const course={id:'test',name:'Test course',holes:[3,4,5,3,4].map((par,i)=>({start:'tee'+i,target:'flag'+i,par,threshold:.27,waypoint:par>3?{word:'middle'+i}:undefined,golden_paths:par===3?[['clever']]:undefined}))};
store.begin(course);assert.deepEqual(store.active.holes.map(h=>h.settings.par),[3,4,5,3,4]);
function save(number,{won=false,strokes=3,abandoned=false}={}){const h=store.hole,s={start:h.settings.start,target:h.settings.target,baseline:0,threshold:.27,challenge:{id:h.challengeId,version:STROKE_PLAY,attempt:number,par:h.settings.par},won,challenge_failed:!won,abandoned,attempts:strokes,history:strokes?[{word:'setup',success:true,destination:.1}]:[]};store.record(s,`journey-${number}`,.9);return h.attempts.find(a=>a.number===number);}
let a=save(1,{won:true,strokes:2});assert.equal(attemptResult(a,3),-1);save(2,{won:true,strokes:2});assert.equal(bestAttempt(store.hole).number,1,'earlier attempt breaks score ties');save(3,{won:true,strokes:1});assert.equal(attemptResult(bestAttempt(store.hole),3),-2,'eagles remain -2');
for(let n=4;n<=6;n++)save(n);assert.equal(attemptResult(bestAttempt(store.hole),3),-2,'later failed attempts cannot erase an eagle');assert.throws(()=>store.settings(),/limit/);store.advance();
assert.equal(store.settings().challenge.version,STROKE_PLAY);assert.equal(store.settings().challenge.par,4);assert.equal(attemptLimit(4),12);
for(let n=1;n<=12;n++)save(n,{strokes:1});assert.equal(attemptResult(bestAttempt(store.hole),4),3);assert.throws(()=>store.settings(),/limit/);store.advance();
assert.equal(store.hole.settings.par,5);for(let n=1;n<=18;n++)save(n);assert.throws(()=>store.settings(),/limit/);store.advance();
save(1,{won:true,strokes:4});assert.equal(attemptResult(bestAttempt(store.hole),3),1);assert.equal(store.advance(),true,'may move on after a bogey without exhausting attempts');save(1,{abandoned:true,strokes:0});assert.equal(bestAttempt(store.hole).number,1);store.advance();assert.equal(store.active.finished,true);assert.equal(roundTotal(store.active),8);
const copy=new CourseRounds(storage);assert.equal(copy.active.id,store.active.id);assert.equal(copy.active.holes[2].attempts.length,18,'longer courses survive reload');const exported=copy.exportData()[0];assert.equal(exported.total_score,8);assert.equal(exported.attempts_used,38);assert.equal(exported.ranking_order,'score-then-attempts');assert.equal(exported.results.length,5);assert.equal(exported.overall_skill,null,'new play does not need skill analysis');
assert.equal(resultText(-2),'Eagle');assert.equal(resultText(3),'Triple bogey');assert.equal(scoreText(0),'Even');assert.equal(scoreText(-2),'−2');
// Original scorecards retain their historical progress-based scores.
assert.equal(attemptResult({state:{won:false},progress:.8},3),1);assert.equal(attemptResult({state:{won:false},progress:.2},3),2);
store.reset();assert.equal(store.exportData().length,0);store.restore();assert.equal(store.exportData().length,1);
console.log('Course scoring passed: mixed pars, 6/12/18 limits, eagles, capped failed attempts, saved best, earlier-attempt tie break, early next hole, reload, ranking metadata and preserved historical scores.');
