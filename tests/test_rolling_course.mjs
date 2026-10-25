import assert from 'node:assert/strict';
import {RollingCourse,scopedStorage,publicationWindow,usedAttempts,holeBest,utcDay} from '../static/rolling-course.mjs';
import {rollingManifest} from '../static/rolling-manifest.mjs';
import {retryPrefix,exhausted,STROKE_PLAY} from '../static/stroke-play.mjs';
import {remainingHoleAttempts} from '../static/hole-attempt-log.mjs';
import {Game,restoreGame} from '../static/engine.mjs';
const entries=new Map(),storage={getItem:k=>entries.get(k)??null,setItem:(k,v)=>entries.set(k,v),removeItem:k=>entries.delete(k)};
const scope=scopedStorage(storage,'trial.');
let rounds=new RollingCourse(scope,rollingManifest,'2026-10-25',()=> 'id');
assert.equal(rounds.current.holes.length,9);assert.equal(rounds.hole.settings.start,'beaver');
const first=rounds.hole,challenge=rounds.settings().challenge;
const failed={start:'beaver',target:'electricity',baseline:0,threshold:.27,attempts:1,history:[{word:'banana',success:false,destination:0}],won:false,challenge_failed:true,challenge};
rounds.record(failed,'j1',.9);assert.equal(usedAttempts(first),1);assert.equal(rounds.playable(failed),true);
rounds=new RollingCourse(scope,rollingManifest,'2026-10-26');
assert.equal(rounds.current.holes[1].challengeId,first.challengeId);assert.equal(rounds.hole.allowance,13);assert.equal(rounds.hole.attempts[0].journeyId,'j1');assert.equal(rounds.hole.settings.start,'beaver');
rounds=new RollingCourse(scope,rollingManifest,'2026-10-26');assert.equal(rounds.hole.allowance,13,'refresh cannot award another bonus');
rounds=new RollingCourse(scope,rollingManifest,'2026-10-29');assert.equal(rounds.hole.allowance,16,'missed days do not accumulate bonuses');
assert.equal(rounds.current.holes[0].allowance,[10,15,20][rounds.current.holes[0].settings.par-3],'unattempted holes keep their original allowance');
const winning={...failed,history:[{word:'dam',success:true,destination:.5}],route:['beaver','dam','electricity'],won:true,challenge_failed:false,attempts:1,challenge:{...challenge,attempt:2,attempt_limit:16}};
rounds.record(winning,'j2',.9);assert.equal(holeBest(rounds.hole).number,2);
assert.equal(rounds.submit(),true);const snapshot=structuredClone(rounds.store.submissions[rounds.day]);assert.equal(snapshot.rows.length,9);assert.equal(snapshot.rows.find(r=>r.id===first.challengeId).strokes,1);assert.equal(rounds.playable(winning),false);assert.equal(rounds.submit(),false,'one submission per UTC date');
const neverPlayed=rounds.current.holes.find(h=>!h.attempts.length);assert.equal(neverPlayed.attempts.length,0,'submission defaults never manufacture attempts');
rounds=new RollingCourse(scope,rollingManifest,'2026-10-30');assert.equal(rounds.current.finished,false);assert.deepEqual(rounds.store.submissions['2026-10-29'],snapshot);assert.equal(holeBest(rounds.store.bank[neverPlayed.challengeId]),null);assert.equal(holeBest(rounds.hole).state.attempts,1);
// Best remains the earliest equally good route, including after a later worse hole-out.
rounds.record({...winning,attempts:3,challenge:{...winning.challenge,attempt:3,attempt_limit:rounds.hole.allowance}},'j3',.9);assert.equal(holeBest(rounds.hole).number,2);
const savedBudget=rounds.hole.allowance;
rounds=new RollingCourse(scope,rollingManifest,'2026-10-28');assert.equal(rounds.day,'2026-10-30');assert.equal(rounds.hole.allowance,savedBudget,'clock rollback cannot duplicate bonuses or unlock an earlier submission');
const retired=rounds.retired(),def=rounds.pickPractice(()=>0);assert.ok(retired.some(h=>h.id===def.id));assert.ok(!rounds.current.holes.some(h=>h.challengeId===def.id));assert.equal(rounds.active,null);assert.notEqual(rounds.pickPractice(()=>0).id,def.id,'prefer unseen retired holes');
const independent=new RollingCourse(scopedStorage(storage,'real.'),rollingManifest,'2026-10-25');assert.equal(independent.hole.attempts.length,0,'simulation and real-date progress are independent');
assert.equal(utcDay('2026-10-25T23:59:59Z'),'2026-10-25');assert.equal(utcDay('2026-10-26T00:00:00Z'),'2026-10-26');
assert.throws(()=>publicationWindow(rollingManifest,'2030-01-01'),/queue has ended/);
// The engine must retain the expanded allowance across restore/retry, not just the UI.
const e={index:new Map(['tee','hole','bridge'].map((w,i)=>[w,i])),hub:()=>0,cosine:(a,b)=>a===b?1:.4};
const g=new Game(e,'tee','hole',.27,{mode:'distance',finish_mode:'range',challenge:{version:STROKE_PLAY,par:3,attempt:10,id:'budget',rolling:true,attempt_limit:13}});g.submit('bridge');
assert.equal(exhausted(g.state()),false);assert.equal(remainingHoleAttempts(g.state()),3);
const retried=retryPrefix(g.state(),0,11),restored=restoreGame(e,retried).state();assert.equal(restored.challenge.attempt_limit,13);assert.equal(restored.challenge.rolling,true);
assert.throws(()=>retryPrefix(g.state(),0,14),/limit/);
const exhaustedHole={...g.state(),challenge:{...g.challenge,attempt:13}};assert.equal(exhausted(exhaustedHole),true);
console.log('Rolling nine passed: stable rotation, UTC bonuses, refresh/clock protection, daily snapshots, defaults, practice eligibility, storage isolation and engine allowance preservation.');
// A stale tab cannot overwrite a newer submission or spend from an old allowance.
const sharedScope=scopedStorage(storage,'tabs.'),tabA=new RollingCourse(sharedScope,rollingManifest,'2026-10-25'),tabB=new RollingCourse(sharedScope,rollingManifest,'2026-10-25');
assert.equal(tabA.hasExternalChanges(),false);tabA.submit();assert.equal(tabB.hasExternalChanges(),true);assert.equal(tabB.submit(),false);tabB.record(failed,'stale',.9);tabB.save();const tabC=new RollingCourse(sharedScope,rollingManifest,'2026-10-25');assert.equal(tabC.current.finished,true);assert.equal(tabC.store.submissions['2026-10-25'].rows.length,9);
// Exhaustion gates the whole next attempt, but the last live attempt can finish.
const lastHole=tabC.current.holes[0];tabC.current.finished=false;lastHole.attempts=[{number:10,state:{...failed,challenge:{...challenge,attempt:10}},ended:true,progress:0}];assert.equal(tabC.playable(failed),false);
lastHole.attempts[0].ended=false;assert.equal(tabC.playable({...failed,challenge:{...challenge,attempt:10}}),true);
console.log('Rolling locks passed: stale-tab submission protection and final live-attempt continuation.');
// Exercise the actual UI gates: competitive exhaustion cannot fall through to practice.
const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm');
const app=readFileSync(new URL('../static/app.js',import.meta.url),'utf8');let messages=0;
const guards={rollingMode:true,inCourse:()=>true,rounds:{playable:()=>false},rollingUI:{lockMessage(){messages++;}},state:{},clearTimeout(){},retryTimer:0};
runInNewContext(app.slice(app.indexOf('function scheduleRetry(){'),app.indexOf("$('launch-form').addEventListener('submit'")),guards);
guards.scheduleRetry();assert.equal(messages,1);
runInNewContext(app.slice(app.indexOf('function keepPractising('),app.indexOf('let scoringEntryKey')),guards);guards.keepPractising();assert.equal(messages,2);
const canPlay={...guards,checkRollingDay:()=>true,retryPreview:null};runInNewContext(app.slice(app.indexOf('function rollingCanPlay(){'),app.indexOf('async function startRollingPractice()')),canPlay);assert.equal(canPlay.rollingCanPlay(),false);canPlay.inCourse=()=>false;assert.equal(canPlay.rollingCanPlay(),true,'retired practice remains playable after daily submission');
console.log('Rolling UI guards passed: competitive exhaustion pauses instead of entering practice; retired practice stays available.');
