import assert from 'node:assert/strict';
import {practiceScorecard} from '../static/practice-scorecard.mjs';
const journey=(id,attempt,strokes,won=true,extra={})=>({state:{start:'tee-'+id,target:'hole-'+id,attempts:strokes,won,challenge_failed:!won,challenge:{id,par:3,attempt,version:'stroke-play-v1'}},...extra});
const cards=[journey('a',1,2),journey('a',2,3),journey('b',1,1,false),journey('b',2,3),journey('b',2,3),journey('course',1,2,true,{course_round:{id:'round'}})];
const original=JSON.stringify(cards),rows=practiceScorecard(cards);
assert.equal(JSON.stringify(cards),original);assert.equal(rows.length,2);assert.equal(rows[0].score,-1);assert.equal(rows[0].attempts,2);assert.equal(rows[1].score,0);assert.equal(rows[1].attempts,2);
assert.equal(practiceScorecard([journey('failed',1,1,false)])[0].score,2,'unfinished par 3 retains its capped score');
assert.equal(practiceScorecard([{state:{...cards[0].state,won:false,challenge_failed:false}}]).length,0);
assert.equal(practiceScorecard([{state:{...cards[0].state,final_target:'final',waypoint:{word:'middle'}}}])[0].target,'final');
assert.deepEqual(practiceScorecard(Array.from({length:7},(_,i)=>journey(String(i),1,3))).map(r=>r.id),['2','3','4','5','6']);
console.log('Practice scorecard passed: best per hole, unique retries, capped misses, final targets, recent-five limit and course separation.');

{
 const {bestHoleResult}=await import('../static/practice-scorecard.mjs');
 const js=[journey('best',9,2),journey('best',10,3),journey('best',11,2),journey('best',13,1,false)];
 assert.deepEqual(bestHoleResult(js,js.at(-1).state),{score:-1,attempt:9},'later retries and equal scores retain first best');
 js.push(journey('best',14,1));
 assert.deepEqual(bestHoleResult(js,js.at(-1).state),{score:-2,attempt:14},'an actual improvement replaces the best');
 assert.deepEqual(bestHoleResult([journey('other',1,1)],journey('best',2,3).state),{score:0,attempt:2},'other challenges cannot supply a best');
 assert.equal(bestHoleResult([],{...js[0].state,won:false,challenge_failed:false}),null);
}
{
 const {bestHoleResult}=await import('../static/practice-scorecard.mjs');
 const won=journey('frozen',2,3),practice=journey('frozen',7,1);practice.state.challenge.practice=true;practice.state.challenge.locked_result={score:0,attempt:2};
 assert.deepEqual(bestHoleResult([won,practice],practice.state),{score:0,attempt:2});
 assert.equal(practiceScorecard([won,practice])[0].score,0);
 assert.equal(practiceScorecard([practice]).length,0);
}
