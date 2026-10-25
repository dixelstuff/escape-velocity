import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {Game,restoreGame} from '../static/engine.mjs';
import {STROKE_PLAY,attemptLimit,maximumStrokes,retryLieThrough,retryPrefix} from '../static/stroke-play.mjs';
import {SCORING_CLOSED,PRACTICE_MODE,scoringReminder,currentStrokeText} from '../static/scoring-status.mjs';
import {FlightLog} from '../static/flight-log.mjs';
import {bestHoleResult} from '../static/practice-scorecard.mjs';
for(const [par,n] of [[3,10],[4,15],[5,20]])assert.equal(attemptLimit(par),n);
assert.equal(currentStrokeText({attempts:8,challenge:{par:5}}),'8 strokes (Max score)');
assert.equal(currentStrokeText({attempts:1,challenge:{par:3}}),'1 stroke');
assert.equal(scoringReminder(4),'');assert.equal(scoringReminder(3),'3 scoring attempts remaining.');assert.equal(scoringReminder(1),'1 scoring attempt remaining.');assert.equal(scoringReminder(0),PRACTICE_MODE);
const e={index:new Map(['tee','hole','a','b','c','d','e','f','g','bridge','miss'].map((w,i)=>[w,i])),hub:()=>0,cosine(a,b){return a===b?1:a==='miss'||b==='miss'?0:a==='hole'||b==='hole'?(a==='bridge'||b==='bridge'?.3:.04):.5;}};
const options={mode:'distance',launch_min:.095,launch_max:.215,finish_mode:'range',challenge:{version:STROKE_PLAY,par:3,attempt:1,id:'continuous'}};
const g=new Game(e,'tee','hole',.27,options);
for(const w of ['a','b','c','d','e','f']){g.submit(w);assert.equal(g.challenge_failed,false);}
assert.equal(retryLieThrough(g.state()),6,'a long route keeps the whole last successful prefix');
assert.deepEqual(restoreGame(e,g.state()).state(),g.state(),'restore does not invent a cutoff');
g.submit('bridge');assert.equal(g.won,true);assert.equal(g.state().attempts,8,'the actual route still counts every stroke');
const log=new FlightLog(null,()=>new Date().toISOString(),()=> 'bag-test');log.begin(g.state(),'test');log.record('bridge',g.state(),g.history.at(-1));assert.equal(log.active.scored_strokes,maximumStrokes(3));assert.equal(log.active.score_to_par,2);
const locked={score:0,attempt:2},practice=new Game(e,'tee','hole',.27,{...options,challenge:{...options.challenge,attempt:11,practice:true,locked_result:locked}});practice.submit('bridge');assert.equal(practice.won,true);assert.deepEqual(bestHoleResult([],practice.state()),locked,'a better practice result cannot replace the locked best');
const p=retryPrefix({...g.state(),challenge:{...g.challenge,attempt:10,practice:true,locked_result:locked}},0,11);assert.equal(p.challenge.practice,true);
// Scoring belongs to preparing the next shot; feedback remains untouched.
const app=readFileSync(new URL('../static/app.js',import.meta.url),'utf8');
const code=app.slice(app.indexOf('let scoringEntryKey'),app.indexOf('function renderBag()'));
let active=false,desktop=false,saves=0;
const ctx={tourMode:false,rollingMode:false,state:{challenge:{id:'entry',par:3,attempt:8},history:[]},scoringReminder,remainingHoleAttempts:s=>s.challenge.practice?0:11-s.challenge.attempt,SCORING_CLOSED,PRACTICE_MODE,busy:false,holeResult:()=>false,courseResult:()=>false,desktopInteraction:()=>desktop,document:{body:{classList:{contains:()=>active}}},retryPreview:null,flightLog:{data:{},save(){saves++;}},activeNotice:'A needed a stronger link.'};
runInNewContext(code,ctx);assert.equal(ctx.entryScoringNotice(),'');
active=true;assert.equal(ctx.entryScoringNotice(),'3 scoring attempts remaining.');assert.equal(ctx.activeNotice,'A needed a stronger link.');
active=false;assert.equal(ctx.entryScoringNotice(),'');assert.equal(ctx.activeNotice,'A needed a stronger link.');
desktop=true;assert.equal(ctx.entryScoringNotice(),'3 scoring attempts remaining.','desktop has an independent entry reminder without relying on focus');
ctx.state={challenge:{id:'entry',par:3,attempt:11,practice:true},history:[]};assert.equal(ctx.entryScoringNotice(),SCORING_CLOSED);assert.equal(saves,1);assert.equal(ctx.entryScoringNotice(),SCORING_CLOSED,'intro stays stable for the entry');
ctx.state.history.push({});assert.equal(ctx.entryScoringNotice(),PRACTICE_MODE);assert.equal(saves,1);
const restored={...ctx};runInNewContext(code,restored);assert.equal(restored.entryScoringNotice(),PRACTICE_MODE,'the introduction does not repeat after reload');
ctx.retryPreview={original:{state:{challenge:{id:'entry',par:3,attempt:10},history:[]}}};assert.equal(ctx.entryScoringNotice(),'1 scoring attempt remaining.','an uncommitted retry does not announce practice early');
console.log('Entry reminders passed: mobile phases, independent desktop context, preserved feedback, one-time practice introduction and reload persistence.');
// Render the actual notice: exhausted mobile holes must not add an idle fallback.
const noticeNodes={
 'entry-scoring-note':{},
 'shot-notice':{classList:{remove(){}}},
 'shot-notice-text':{replaceChildren(...children){this.children=children;}}
};
const noticeCtx={entryScoringNotice:()=>'',desktopInteraction:()=>false,activeNotice:'',noticeDismissed:false,holeResult:()=>false,courseResult:()=>false,practising:()=>true,PRACTICE_MODE,$:id=>noticeNodes[id],document:{querySelector:()=>({classList:{toggle(){}}}),createTextNode:text=>text,createElement:()=>({textContent:''})}};
runInNewContext(app.slice(app.indexOf('function renderNotice(){'),app.indexOf('async function newGame(')),noticeCtx);
noticeCtx.renderNotice();assert.equal(noticeNodes['shot-notice'].hidden,true,'inactive practice has no unsolicited reminder');
noticeCtx.entryScoringNotice=()=>PRACTICE_MODE;noticeCtx.renderNotice();assert.equal(noticeNodes['shot-notice'].hidden,false,'active mobile entry shows practice context');
noticeCtx.entryScoringNotice=()=>'';noticeCtx.activeNotice='CLAY needed a stronger link to BAG.';noticeCtx.renderNotice();assert.equal(noticeNodes['shot-notice'].hidden,false);assert.equal(noticeNodes['shot-notice-text'].children.map(n=>typeof n==='string'?n:n.textContent).join(''),noticeCtx.activeNotice,'inactive view preserves previous-shot feedback');
noticeCtx.desktopInteraction=()=>true;noticeCtx.entryScoringNotice=()=>PRACTICE_MODE;noticeCtx.activeNotice='';noticeCtx.renderNotice();assert.equal(noticeNodes['shot-notice'].hidden,true);assert.equal(noticeNodes['entry-scoring-note'].textContent,PRACTICE_MODE,'desktop keeps its separate entry note');
// The best-route card follows the recorded scoring winner, including during practice.
const routeHelper=app.slice(app.indexOf('function bestRouteState()'),app.indexOf('function renderHoleLog()'));
const winner={start:'tee',won:true,route:['tee','specific','hole'],challenge:{id:'same',attempt:2}},later={...winner,route:['tee','other','hole'],challenge:{id:'same',attempt:3}};
const routeCtx={tourMode:false,rollingMode:false,state:later,inCourse:()=>false,practising:()=>false,bestHoleResult:()=>({score:0,attempt:2}),flightLog:{data:{journeys:[{state:winner},{state:later}]}},bestAttempt:()=>({state:winner}),rounds:{hole:{}}};
runInNewContext(routeHelper,routeCtx);assert.equal(routeCtx.bestRouteState(),winner);
routeCtx.state={...later,challenge:{...later.challenge,practice:true}};routeCtx.practising=()=>true;assert.equal(routeCtx.bestRouteState(),winner);
routeCtx.inCourse=()=>true;assert.equal(routeCtx.bestRouteState(),winner);
routeCtx.bestAttempt=()=>null;routeCtx.flightLog.data.journeys=[];routeCtx.state={won:false,challenge:{id:'same'}};assert.equal(routeCtx.bestRouteState(),null);
const practiceRoute={won:true,attempts:3,route:['tee','setup','hole'],challenge:{id:'same',attempt:11,practice:true}};routeCtx.flightLog.data.journeys=[{state:practiceRoute}];assert.equal(routeCtx.bestRouteState(),practiceRoute,'a practice hole-out is available when no scoring route was holed');
// At the tee the menu action simply dismisses; elsewhere it previews a retry.
const teeAction=app.slice(app.indexOf("$('bag-return-tee').onclick="),app.indexOf("$('word').addEventListener('focus'",app.indexOf("$('bag-return-tee').onclick=")));
const teeButton={},teeCalls=[],teeCtx={$:()=>teeButton,state:{history:[]},setBag:v=>teeCalls.push(['bag',v]),retryFromWord:(n,o)=>teeCalls.push(['retry',n,o.focusEntry]),returnToHoleHeader:()=>teeCalls.push(['anchor']),showReturnTeeTip:()=>teeCalls.push(['tip'])};
runInNewContext(teeAction,teeCtx);teeButton.onclick();assert.deepEqual(teeCalls,[['bag',false],['tip']]);
teeCtx.state.history=[{success:true}];teeCalls.length=0;teeButton.onclick();assert.deepEqual(teeCalls,[['bag',false],['retry',0,false],['anchor'],['tip']]);
console.log('Bag cards passed: recorded best-route selection, practice isolation, and no-op Return to tee at the tee.');

// The return-to-tee hint is shown once per browser session, surviving reloads.
const sessionTip=app.slice(app.indexOf('let returnTeeTipShown'),app.indexOf("$('bag-return-tee').onclick="));
const sessionValues=new Map();let notices=0;
const sessionCtx={sessionStorage:{getItem:k=>sessionValues.get(k),setItem:(k,v)=>sessionValues.set(k,v)},cancelScoringNotice(){},renderNotice(){notices++;},activeNotice:'',noticeDismissed:true};
runInNewContext(sessionTip,sessionCtx);sessionCtx.showReturnTeeTip();assert.equal(notices,1);assert.match(sessionCtx.activeNotice,/tap any previous lie/);assert.equal(sessionCtx.noticeDismissed,false);sessionCtx.showReturnTeeTip();assert.equal(notices,1);
const reloadCtx={...sessionCtx};runInNewContext(sessionTip,reloadCtx);reloadCtx.showReturnTeeTip();assert.equal(notices,1);
console.log('Session retry hint passed: first selection only, with reload persistence.');
