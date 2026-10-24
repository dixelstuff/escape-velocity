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
save(1,{won:true,strokes:4});assert.equal(attemptResult(bestAttempt(store.hole),3),1);assert.equal(store.advance(),true,'may move on after a bogey without exhausting attempts');save(1,{abandoned:true,strokes:0});assert.equal(bestAttempt(store.hole).number,1);store.advance();assert.equal(store.active.completed,true);assert.equal(store.active.finished,false);store.submit();assert.equal(store.active.finished,true);assert.equal(roundTotal(store.active),8);
const copy=new CourseRounds(storage);assert.equal(copy.active.id,store.active.id);assert.equal(copy.active.holes[2].attempts.length,18,'longer courses survive reload');const exported=copy.exportData()[0];assert.equal(exported.total_score,8);assert.equal(exported.attempts_used,38);assert.equal(exported.ranking_order,'score-then-first-best-attempt');assert.equal(exported.results.length,5);assert.equal(exported.overall_skill,null,'new play does not need skill analysis');
assert.equal(resultText(-2),'Eagle');assert.equal(resultText(3),'Triple bogey');assert.equal(scoreText(0),'Even');assert.equal(scoreText(-2),'−2');
// Original scorecards retain their historical progress-based scores.
assert.equal(attemptResult({state:{won:false},progress:.8},3),1);assert.equal(attemptResult({state:{won:false},progress:.2},3),2);
store.reset();assert.equal(store.exportData().length,0);store.restore();assert.equal(store.exportData().length,1);
console.log('Course scoring passed: mixed pars, 6/12/18 limits, eagles, capped failed attempts, saved best, earlier-attempt tie break, early next hole, reload, ranking metadata and preserved historical scores.');

store.begin(course);
const empty={...store.settings(),baseline:0,history:[],attempts:0,won:false,challenge_failed:false};
assert.equal(store.skip(empty,'skipped-empty',.9),true,'skip works before the first shot');
assert.equal(store.active.index,1);assert.equal(store.active.holes[0].locked,true);assert.equal(attemptResult(bestAttempt(store.active.holes[0]),3),2,'unplayed skipped hole receives the normal maximum score');
save(1,{won:true,strokes:3});
const exploring={...store.settings(),baseline:0,attempts:1,history:[{word:'setup',success:true,destination:.1}],won:false,challenge_failed:false};
assert.equal(store.skip(exploring,'skipped-live',.9),true);assert.equal(attemptResult(bestAttempt(store.active.holes[1]),4),-1,'skip after an unsuccessful exploration preserves the earlier birdie');
assert.equal(store.skip(exploring,'stale',.9),false,'stale hole controls cannot advance another hole');

// Nine-hole navigation and practice preserve the scored round across reload.
{
 const nine={...course,id:'nine',holes:Array.from({length:9},(_,i)=>({...course.holes[i%5]}))};store.begin(nine);
 for(let i=0;i<9;i++){
  save(1,{won:true,strokes:store.hole.settings.par});
  const before=JSON.stringify(store.hole.attempts),practice={...store.hole.attempts[0].state,attempts:1,challenge:{...store.hole.attempts[0].state.challenge,attempt:20,practice:true,locked_result:{score:0,attempt:1}}};
  store.record(practice,'practice',.9);assert.equal(JSON.stringify(store.hole.attempts),before);
  if(i===7)assert.equal(new CourseRounds(storage).active.holes.length,9);
  store.advance();assert.equal(store.active.finished,false);assert.equal(!!store.active.completed,i===8);
 }
 store.submit();assert.equal(store.active.finished,true);assert.equal(store.exportData().at(-1).results.length,9);assert.equal(roundTotal(store.active),0);
}


// Exploratory misses stay unposted; all holes are navigable and submission is final.
{
 const {postedAttempt,reachedHole}=await import('../static/course-round.mjs');
 store.begin(course);save(1,{won:false,strokes:1});
 assert.equal(postedAttempt(store.hole),null);assert.equal(roundTotal(store.active),0);
 assert.equal(store.canVisit(0),true);assert.equal(store.canVisit(1),true);
 save(2,{won:true,strokes:3});assert.equal(attemptResult(postedAttempt(store.hole),3),0);
 store.advance();assert.equal(reachedHole(store.active),1);assert.equal(store.canVisit(0),true);assert.equal(store.canVisit(2),true);
 store.active.index=0;assert.equal(store.reopen(),true);assert.equal(store.hole.locked,false);assert.equal(store.settings().challenge.attempt,3);
 assert.equal(reachedHole(new CourseRounds(storage).active),1);
 store.active.index=1;assert.equal(store.unfinished(),4);
 assert.equal(store.canSubmit(),false);assert.equal(store.submit(),false,'one played hole cannot submit a five-hole course');
 save(1,{strokes:1});store.active.index=2;save(1,{strokes:1});
 assert.equal(store.attemptedHoles(),3);assert.equal(store.canSubmit(),true);store.submit();
 assert.equal(store.active.finished,true);assert.ok(store.active.submittedAt);assert.equal(roundTotal(store.active),11);
 assert.equal(store.active.holes.filter(h=>h.attempts.some(a=>a.state.default_score)).length,2);
 assert.equal(store.exportData().at(-1).attempts_used,4,'unplayed defaults are not fabricated player attempts');
 assert.equal(store.canVisit(2),true,'submitted holes remain available for review');
 assert.equal(store.reopen(),false);const frozen=JSON.stringify(store.active.holes);save(3,{won:true,strokes:1});assert.equal(JSON.stringify(store.active.holes),frozen);
}

// Submission needs real play on half the distinct holes, rounded up.
store.begin({...course,id:'gate-nine',holes:Array.from({length:9},(_,i)=>course.holes[i%5])});
assert.equal(store.minimumAttemptedHoles(),5);
const untouched={...store.settings(),baseline:0,history:[],attempts:0,won:false,challenge_failed:false};
store.skip(untouched,'empty',.9);assert.equal(store.attemptedHoles(),0);
for(let i=1;i<=4;i++){store.active.index=i;save(1,{strokes:1});}
assert.equal(store.canSubmit(),false);assert.equal(store.submit(),false);
store.active.index=4;save(2,{strokes:1});assert.equal(store.attemptedHoles(),4,'repeated attempts do not count as extra holes');
store.active.index=5;save(1,{strokes:1});assert.equal(store.canSubmit(),true);
assert.equal(store.canVisit(-1),false);assert.equal(store.canVisit(9),false);
assert.equal(store.submit(),true);assert.equal(store.canSubmit(),false);
