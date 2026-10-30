import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const source=readFileSync('static/app.js','utf8');
const live={current:'paper',history:[{word:'paper'}],won:false,challenge:{attempt:7}},best={current:'flag',won:true,history:[{word:'book'}],challenge:{attempt:2}};
const input={value:'next'},launch={},preview={through:1,source:{id:'live'}},active={id:'live'};let updates=0,retries=0;
const ctx={simpleDaily:true,busy:false,state:live,dailyResultReturn:null,retryPreview:preview,shownEvent:{word:'paper'},activeNotice:'last shot',noticeDismissed:false,justHoled:false,reviewingDailyBest:false,structuredClone,daily:{current:()=>({bestStrokes:{state:best}})},flightLog:{active,data:{journeys:[]}},bestResultState:r=>r.bestStrokes.state,client:{restoreRetry:state=>({state:structuredClone(state)})},holeResult:()=>ctx.reviewingDailyBest,$:id=>id==='word'?input:launch,update(){updates++;},retryResultHole(){retries++;}};
runInNewContext(source.slice(source.indexOf('function openBestRoute(){'),source.indexOf("$('show-best-route').addEventListener('pointerdown'")),ctx);
ctx.openBestRoute();assert.equal(ctx.reviewingDailyBest,true);assert.equal(ctx.state.current,'flag');assert.equal(ctx.justHoled,false);assert.equal(ctx.retryPreview,null);assert.equal(ctx.flightLog.active,active);
ctx.resumeResultHole();assert.equal(ctx.state.current,'paper');assert.equal(ctx.state.challenge.attempt,7);assert.equal(ctx.retryPreview,preview);assert.equal(input.value,'next');assert.equal(ctx.activeNotice,'last shot');assert.equal(ctx.reviewingDailyBest,false);assert.equal(ctx.dailyResultReturn,null);assert.equal(retries,0);assert.equal(launch.disabled,false);
ctx.openBestRoute();ctx.resumeResultHole();assert.equal(ctx.state.current,'paper');assert.equal(ctx.state.history.length,1);assert.equal(retries,0,'repeated reviews cannot consume attempts or reset route');
ctx.resumeResultHole();assert.equal(retries,1,'ordinary results still start a new try');assert.equal(updates,4);
ctx.retryFromWord=(through,options)=>{assert.equal(through,0);assert.equal(options.focusEntry,false);assert.equal(ctx.state.challenge.attempt,7,'explicit restart must use current attempt numbering, not the old best');retries++;};
runInNewContext(source.slice(source.indexOf('async function retryResultHole(){'),source.indexOf("$('replay-hole').onclick=")),ctx);
ctx.openBestRoute();await ctx.retryResultHole();assert.equal(ctx.dailyResultReturn,null);assert.equal(retries,2);
console.log('Trophy results review passed: saved best on map, current lie/input/retry preview/notices/attempt count preserved, no modal and ordinary results still retry.');

// A background tap after Try Again must never cancel back to a won state.
let restored=0;const handlers={},cancelInput={value:''};
const cancel={simpleDaily:true,retryPreview:{original:{state:{won:true}}},committingRetry:false,changingRetry:false,busy:false,state:{won:false,current:'tee'},document:{addEventListener:(type,fn)=>handlers[type]=fn},client:{restoreRetry:s=>{restored++;return {state:s};}},$:()=>cancelInput,update(){},reviewingDailyBest:false};
runInNewContext(source.slice(source.indexOf('function cancelRetry(){'),source.indexOf('function commitRetry(){')),cancel);
runInNewContext(source.slice(source.indexOf("document.addEventListener('pointerdown',event=>{if(retryPreview"),source.indexOf('function tappedWord(')),cancel);
handlers.pointerdown({target:{closest:()=>null}});assert.equal(restored,0);assert.equal(cancel.state.won,false);assert.ok(cancel.retryPreview);
cancel.retryPreview={original:{state:{won:false},reviewingDailyBest:true}};cancel.cancelRetry();assert.equal(restored,0);
cancel.retryPreview={original:{state:{won:false,current:'paper'},entry:'typed'}};cancel.cancelRetry();assert.equal(restored,1);assert.equal(cancel.state.current,'paper');assert.equal(cancelInput.value,'typed','ordinary within-play cancellation still restores the current lie');

// Opening a completed hole starts playable at the tee; only the trophy reviews.
const saved={won:true,current:'flag',challenge:{unlimited:true}},record={bestStrokes:{state:saved}},def={id:'hole',date:'day',settings:{}};let replayed=0;
const opening={simpleDaily:true,busy:false,dailyResultReturn:null,retryTimer:null,retryPreview:null,state:null,reviewingDailyBest:false,clearTimeout(){},daily:{definition:()=>def,data:{selected:'day'},visit(){},current:()=>record,save(){}},flightLog:{data:{journeys:[]},save(){}},setBag(){},setHoleLog(){},bestResultState:()=>saved,api:async()=>({state:saved}),lock(){},justHoled:false,shownEvent:null,activeNotice:'',noticeDismissed:false,selectedLogId:null,$:()=>({value:''}),retryResultHole(){replayed++;},update(){throw Error('must not render completed results on navigation');}};
runInNewContext(source.slice(source.indexOf('async function openDaily(day){'),source.indexOf('function adjacentDaily(')),opening);
await opening.openDaily('day');assert.equal(replayed,1);assert.equal(opening.dailyResultReturn,null);
console.log('Trophy-only reopening passed: background taps cannot reopen results, ordinary cancellation works, and completed-hole navigation starts playable.');
