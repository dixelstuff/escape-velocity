import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {Game} from '../static/engine.mjs';
import {STROKE_PLAY,attemptLimit,retryPrefix} from '../static/stroke-play.mjs';
const app=readFileSync(new URL('../static/app.js',import.meta.url),'utf8');
const e={index:new Map(['tee','hole','bridge'].map((w,i)=>[w,i])),hub:()=>0,cosine:(a,b)=>a===b?1:.4};
const g=new Game(e,'tee','hole',.27,{golden_paths:[['bridge']],mode:'distance',finish_mode:'range',challenge:{version:STROKE_PLAY,par:3,attempt:1,id:'old-best'}});g.submit('bridge');assert.equal(g.won,true);
const best=g.state(),locked={score:-2,attempt:1},rounds={active:{finished:false},hole:{locked:false,attempts:Array.from({length:10},(_,i)=>({number:i+1,ended:true}))}};
const nodes={word:{value:'',focus(){throw Error('Result retry must not open the keyboard');}},status:{}},calls=[];
const ctx={rollingMode:false,state:structuredClone(best),busy:false,inCourse:()=>true,rounds,attemptLimit,courseExhausted:()=>false,leaveWordEntry:o=>calls.push(o),resultNavigationActive:true,lockedHoleResult:()=>locked,modelName:()=> 'test',modelHash:()=> 'test',structuredClone,flightLog:{data:{journeys:[{state:best}]},begin:s=>({id:'practice'})},client:{retryNow(saved,through,attempt){const game=new Game(e,saved.start,saved.target,saved.threshold,retryPrefix(saved,through,attempt));for(const h of saved.history.slice(0,through))game.submit(h.word);return {state:game.state()};}},lock(v){ctx.busy=v;},clearTimeout(){},retryTimer:0,setHoleLog(){},retryPreview:null,selectedLogId:null,shownEvent:null,noticeDismissed:false,activeNotice:'',update(){},$:id=>nodes[id]};
runInNewContext(app.slice(app.indexOf('function courseScoringFinished()'),app.indexOf('function renderScoringStatus()')),ctx);
runInNewContext(app.slice(app.indexOf('function keepPractising('),app.indexOf('let scoringEntryKey')),ctx);
assert.equal(ctx.courseScoringFinished(),true,'the course is exhausted even though its best was attempt one');ctx.keepPractising({fromTee:true});assert.equal(ctx.state.current,'tee');assert.equal(ctx.state.won,false);assert.equal(ctx.state.challenge.practice,true);assert.equal(ctx.state.challenge.attempt,11);assert.deepEqual(ctx.state.challenge.locked_result,locked);assert.equal(calls[0].anchor,false);assert.deepEqual(best,g.state(),'the recorded winner remains untouched');
// Footer uses the entire course history, not the earlier best's attempt number.
const footer={},footCtx={...ctx,state:best,practising:()=>false,roundSummary:()=>false,remainingHoleAttempts:()=>9,$:()=>footer,renderBag(){}};
runInNewContext(app.slice(app.indexOf('function renderScoringStatus()'),app.indexOf('function lockedHoleResult(')),footCtx);footCtx.renderScoringStatus();assert.equal(footer.textContent,'Scoring attempts exhausted');
// Explicit navigation suppresses the intermediate header anchor and ends at page top.
const scrolls=[],entries=[];
const nav={busy:false,reduced:false,leaveWordEntry:o=>entries.push(o),window:{scrollTo:o=>scrolls.push(o)},desktopInteraction:()=>false};
runInNewContext(app.slice(app.indexOf('let resultNavigationActive'),app.indexOf('function puzzleIndex()')),nav);
runInNewContext(app.slice(app.indexOf('function anchorCourseHole('),app.indexOf('// Course-card navigation owns')),nav);
await nav.resultControlNavigation(async()=>nav.anchorCourseHole({sameHole:true}));assert.equal(entries.some(o=>o?.anchor),false);assert.equal(scrolls[0].top,0);assert.equal(scrolls[0].behavior,'smooth');
nav.anchorCourseHole({sameHole:true});assert.equal(entries.at(-1).anchor,true,'ordinary within-hole anchoring remains unchanged');
await assert.rejects(nav.resultControlNavigation(async()=>{throw Error('failed');}),/failed/);let retried=false;await nav.resultControlNavigation(async()=>{retried=true;});assert.equal(retried,true,'errors never leave navigation locked');
console.log('Result actions passed: exhausted-course retry from an old best, tee restart without keyboard, immutable score, correct footer and isolated page-top navigation.');
// Mobile completion presents the title; desktop shot submission never scrolls.
const completion=app.split('\n').find(line=>line.includes('if(event.won&&!desktopInteraction())'));
for(const won of [false,true])for(const desktop of [false,true]){
 const moves=[];runInNewContext(completion,{event:{won},desktopInteraction:()=>desktop,reduced:false,window:{scrollTo:value=>moves.push(value)}});
 assert.equal(moves.length,won&&!desktop?1:0);if(moves.length){assert.equal(moves[0].top,0);assert.equal(moves[0].behavior,'smooth');}
}
console.log('Completion scrolling passed: mobile win goes to page top; ordinary shots and desktop submissions do not.');
