import assert from 'node:assert/strict';
import {RollingCourse,scopedStorage,publicationWindow,usedAttempts,holeBest,utcDay} from '../static/rolling-course.mjs';
import {rollingManifest as dailyManifest} from '../static/rolling-manifest.mjs';
import {readFileSync as readFixture} from 'node:fs';
const rollingManifest={...dailyManifest,holes:dailyManifest.holes.filter(h=>!dailyManifest.dailyRelease.holeIds.includes(h.id)),arrivalsPerDay:1,publicationIds:JSON.parse(readFixture(new URL('./rolling-legacy-publications.json',import.meta.url)))};
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

const finalHoleRound=new RollingCourse(scopedStorage(storage,'last-hole.'),rollingManifest,'2026-10-25');finalHoleRound.active.index=8;finalHoleRound.advance();assert.equal(finalHoleRound.active.index,8,'View scorecard on the last hole must not turn its completed route into practice');assert.equal(finalHoleRound.active.finished,false);

// Every published date has the same bounded par and exactly one arrival/retirement.
const {balancePublications}=await import('../static/rolling-schedule.mjs');
const {publicationLength,addDays}=await import('../static/rolling-course.mjs');
let previousWindow;
for(let dayIndex=0;dayIndex<publicationLength(rollingManifest)-rollingManifest.initialNewest;dayIndex++){
 const date=addDays(rollingManifest.epoch,dayIndex),window=publicationWindow(rollingManifest,date),total=window.active.reduce((sum,h)=>sum+h.settings.par,0);
 assert.ok(total===35||total===36,date+' has par '+total);
 assert.ok(window.active.every((h,i)=>!i||h.settings.par!==3||window.active[i-1].settings.par!==3),date+' has consecutive par 3s');
 if(previousWindow){assert.deepEqual(window.active.slice(1).map(h=>h.id),previousWindow.active.slice(0,8).map(h=>h.id));assert.ok(window.retired.some(h=>h.id===previousWindow.active[8].id));}
 previousWindow=window;
}
assert.equal(new Set(rollingManifest.publicationIds).size,rollingManifest.publicationIds.length);
const manifestBefore=JSON.stringify(rollingManifest),rebuilt=balancePublications(rollingManifest);
assert.deepEqual(rebuilt.publicationIds,rollingManifest.publicationIds,'rebuilding cannot reorder frozen publications');assert.equal(JSON.stringify(rollingManifest),manifestBefore,'scheduling never changes an existing hole or its par');
const expanded={...rollingManifest,holes:[...rollingManifest.holes,{id:'future-curated-four',settings:{start:'new-tee',target:'new-flag',par:4}},{id:'future-curated-five',settings:{start:'other-tee',target:'other-flag',par:5}}]};
assert.deepEqual(balancePublications(expanded).publicationIds.slice(0,rollingManifest.publicationIds.length),rollingManifest.publicationIds,'future curation appends without moving earlier holes');
// A submitted scorecard keeps its original nine even when upgrading the starter schedule.
const legacyManifest={...rollingManifest,publicationIds:undefined},migrationStorage=scopedStorage(storage,'migration.');
const legacy=new RollingCourse(migrationStorage,legacyManifest,'2026-10-26');legacy.submit();const oldSnapshot=structuredClone(legacy.store.submissions['2026-10-26']);
const migrated=new RollingCourse(migrationStorage,rollingManifest,'2026-10-26');assert.deepEqual(migrated.current.holes.map(h=>h.challengeId),oldSnapshot.rows.map(h=>h.id));assert.deepEqual(migrated.store.submissions['2026-10-26'],oldSnapshot);assert.ok(migrated.retired().every(h=>!migrated.current.holes.some(a=>a.challengeId===h.id)));
const nextBalancedDay=new RollingCourse(migrationStorage,rollingManifest,'2026-10-27');assert.equal(nextBalancedDay.current.finished,false);assert.ok([35,36].includes(nextBalancedDay.current.holes.reduce((n,h)=>n+h.settings.par,0)));assert.deepEqual(nextBalancedDay.store.submissions['2026-10-26'],oldSnapshot);
console.log('Balanced schedule passed: all 131 dates stay par 35–36, no adjacent par 3, exact daily rotation, immutable IDs/pars, append-only curation and preserved historical submissions.');

// Locked course rows still restore the best route, including a never-played default row.
const {bestAttempt,postedAttempt}=await import('../static/course-round.mjs');
const reviewRound=new RollingCourse(scopedStorage(storage,'locked-review.'),rollingManifest,'2026-10-25');
const reviewWin={...winning,challenge:reviewRound.settings().challenge};reviewRound.record(reviewWin,'recorded-winner',.9);reviewRound.submit();
const reviewSnapshot=JSON.stringify(reviewRound.store.submissions),reviewLog={data:{journeys:[],activeId:null},begin(state){const j={id:'review-journey-'+this.data.journeys.length,state};this.data.journeys.push(j);this.data.activeId=j.id;return j;},save(){}};
let emptyReviews=0;
const reviewCtx={STROKE_PLAY,rollingMode:true,checkRollingDay:()=>true,rounds:reviewRound,busy:false,justHoled:true,reviewingSubmittedHole:false,state:reviewWin,setBag(){},leaveWordEntry(){},clearTimeout(){},retryTimer:0,recordCourseState(){},setHoleLog(){},retryPreview:null,postedAttempt,bestAttempt,flightLog:reviewLog,lock(v){reviewCtx.busy=v;},api:async(path,body)=>({state:structuredClone(body.state)}),modelName:()=>'',modelHash:()=>'',selectedLogId:null,shownEvent:null,activeNotice:'',noticeDismissed:false,syncPuzzleSelection(){},update(){},$:()=>({textContent:''}),anchorCourseHole(){},holeResult:()=>true,scheduleRetry(){},playFromResult:async settings=>{emptyReviews++;reviewCtx.state={...settings,challenge:settings.challenge,won:false,history:[],route:[settings.start]};}};
runInNewContext(app.slice(app.indexOf('async function navigateCourseHole(index,'),app.indexOf("$('header-next-hole').onclick=")),reviewCtx);
await reviewCtx.navigateCourseHole(0);assert.equal(reviewCtx.reviewingSubmittedHole,true);assert.equal(reviewCtx.justHoled,false);assert.deepEqual(reviewCtx.state.route,reviewWin.route);
await reviewCtx.navigateCourseHole(8);assert.equal(emptyReviews,1);assert.equal(reviewCtx.state.challenge.id,reviewRound.current.holes[8].challengeId);assert.equal(reviewRound.current.finished,true);assert.equal(JSON.stringify(reviewRound.store.submissions),reviewSnapshot,'reviewing never rewrites the submitted score');
const reviewNodes=Object.fromEntries(['replay-hole','next-hole','result-attempts-remaining','arrival-skill-value','arrival-attempt'].map(id=>[id,{}])),reviewLabels=[{},{}];
const resultCtx={...reviewCtx,inCourse:()=>true,roundSummary:()=>false,$:id=>reviewNodes[id],document:{querySelectorAll:()=>reviewLabels},renderStrokeScore(node,par,score){node.score=score;},styleResultButtonLabels(){}};
runInNewContext(app.slice(app.indexOf('function renderRollingResult(){'),app.indexOf('function courseScoringFinished(){')),resultCtx);resultCtx.renderRollingResult();assert.equal(reviewNodes['replay-hole'].hidden,true);assert.equal(reviewNodes['next-hole'].textContent,'PRACTICE HOLES');assert.equal(reviewNodes['arrival-skill-value'].score,2);
console.log('Locked review passed: recorded route restoration, unplayed default review, practice CTA and immutable submitted scores.');

// The live daily trio queue retains identities, prior snapshots and exactly six carried holes.
const {publicationDays,arrivalsPerDay}=await import('../static/rolling-course.mjs');
assert.equal(arrivalsPerDay(dailyManifest),3);let prior;
for(let offset=0;offset<publicationDays(dailyManifest);offset++){
 const date=addDays(dailyManifest.epoch,offset),w=publicationWindow(dailyManifest,date),par=w.active.reduce((n,h)=>n+h.settings.par,0);
 assert.ok([35,36].includes(par));assert.equal(w.active.length,9);
 assert.ok(w.active.every((h,i)=>!i||h.settings.par!==3||w.active[i-1].settings.par!==3));
 if(prior){assert.deepEqual(w.active.slice(3).map(h=>h.id),prior.active.slice(0,6).map(h=>h.id));assert.equal(w.retired.length-prior.retired.length,3);}
 prior=w;
}
assert.throws(()=>publicationWindow(dailyManifest,addDays(dailyManifest.epoch,publicationDays(dailyManifest))),/queue has ended/);
for(let d=0;d<6;d++){
 const fresh=publicationWindow(dailyManifest,addDays(dailyManifest.epoch,d)).active.slice(0,3);
 assert.deepEqual(fresh.map(h=>h.settings.par),[3,4,5]);assert.deepEqual(fresh.map(h=>h.id),dailyManifest.dailyRelease.holeIds.slice(d*3,d*3+3));
}
const movedQueue=dailyManifest.publicationIds.filter(id=>!dailyManifest.dailyRelease.holeIds.includes(id));
assert.deepEqual(movedQueue,rollingManifest.publicationIds,'all old holes retain their relative order after the insertion');
const trioStore=scopedStorage(storage,'trio-migration.'),oldTrio=new RollingCourse(trioStore,rollingManifest,'2026-10-25');oldTrio.record({...winning,challenge:oldTrio.settings().challenge},'old-trio-route',.9);oldTrio.submit();
const lockedOld=structuredClone(oldTrio.store.submissions['2026-10-25']),upgradeTrio=new RollingCourse(trioStore,dailyManifest,'2026-10-25');
assert.deepEqual(upgradeTrio.current.holes.map(h=>h.challengeId),lockedOld.rows.map(h=>h.id));assert.equal(upgradeTrio.store.bank[first.challengeId].attempts[0].journeyId,'old-trio-route');
const tomorrowTrio=new RollingCourse(trioStore,dailyManifest,'2026-10-26');assert.equal(tomorrowTrio.current.finished,false);assert.deepEqual(tomorrowTrio.store.submissions['2026-10-25'],lockedOld);
const retainedId=publicationWindow(dailyManifest,'2026-10-25').active[0].id,bonusScope=scopedStorage(storage,'trio-bonus.');let bonusTrio=new RollingCourse(bonusScope,dailyManifest,'2026-10-25');
bonusTrio.record({...failed,challenge:bonusTrio.settings().challenge},'new-trio-route',.9);bonusTrio=new RollingCourse(bonusScope,dailyManifest,'2026-10-26');assert.equal(bonusTrio.store.bank[retainedId].allowance,13);assert.equal(bonusTrio.current.holes[3].challengeId,retainedId);
bonusTrio=new RollingCourse(bonusScope,dailyManifest,'2026-10-26');assert.equal(bonusTrio.store.bank[retainedId].allowance,13);
console.log('Three daily arrivals passed: six-day new release, exact three-in/three-out, daily par 35–36, old queue order, saved submissions/routes and once-daily bonuses.');

assert.deepEqual(balancePublications(dailyManifest).publicationIds,dailyManifest.publicationIds,'rebuilding the daily trio queue preserves every scheduled hole');
