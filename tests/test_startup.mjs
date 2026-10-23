import assert from 'node:assert/strict';
import { startupAction, isOpening, restartSettings } from '../static/startup.mjs';
const opening={start:'coffee',target:'science',threshold:.28,mode:'distance',rules:'golf-distance-v3',launch_min:.10,launch_max:.21};
const old={rules:'fixed-threshold-v1',state:{start:'forest',target:'money',threshold:.4,attempts:0,history:[]},entries:[]};
assert.equal(startupAction(null,opening),'opening');
assert.equal(startupAction(old,opening),'upgrade');
assert.equal(startupAction({...old,entries:[{word:'unknown'}]},opening),'upgrade');
assert.equal(startupAction({...old,state:{...old.state,attempts:1,history:[{word:'park'}]}},opening),'upgrade');
assert.equal(startupAction({...old,rules:'distance-v1',state:{...old.state,rules:'distance-v1',mode:'distance'}},opening),'upgrade');
assert.equal(startupAction({...old,state:{...old.state,start:'garden',target:'computer'}},opening),'upgrade');
assert.ok(isOpening(opening,opening));
assert.ok(!isOpening({...opening,mode:'fixed'},opening));
assert.equal(startupAction({state:{...opening,attempts:0,history:[]},entries:[]},opening),'restore');
console.log('Startup passed: older rules start a fresh easier journey while logs remain archived; current rules resume unchanged.');

assert.equal(startupAction({state:{...opening,threshold:.3,launch_min:.12,launch_max:.3,rules:'distance-v3'},entries:[]},opening),'upgrade');
assert.equal(startupAction({state:{...opening,threshold:.4},entries:[]},opening),'restore');

assert.equal(startupAction({state:{...opening,rules:'distance-v2'},entries:[]},opening),'upgrade');
assert.equal(startupAction({state:{...opening,rules:'fixed-threshold-v3',threshold:.12},entries:[]},opening),'upgrade');

assert.equal(startupAction({state:{...opening,threshold:.25,launch_min:.09,launch_max:.19},entries:[]},opening),'upgrade');

assert.equal(startupAction({state:{...opening,rules:'golf-distance-v1'}},opening),'upgrade');

assert.equal(startupAction({state:{...opening,rules:'golf-distance-v2'}},opening),'upgrade');

const latest={...opening,threshold:.27,launch_max:.22};
const previous={...opening,threshold:.28,launch_max:.21,start:'ocean',target:'iris'};
assert.equal(startupAction({state:previous},latest),'restore','do not rewrite an existing round');
assert.deepEqual(restartSettings(previous,latest),{...latest,start:'ocean',target:'iris'});
assert.equal(previous.threshold,.28,'the archived state is immutable');
const custom={...previous,threshold:.35,launch_max:.30};
assert.equal(restartSettings(custom,latest).threshold,.35,'intentional custom settings survive a restart');

const v43={...latest,launch_min:.095,launch_max:.215,finish_mode:'range'};
assert.deepEqual(restartSettings({...latest,start:'mars',target:'clarity'},v43),{...v43,start:'mars',target:'clarity'});
assert.equal(startupAction({state:{...latest,finish_mode:'range'}},v43),'restore','keep in-progress rounds on their recorded settings');
assert.equal(restartSettings({...latest,launch_min:.12},v43).launch_min,.12,'preserve custom strengths');
const v55={...opening,success_mode:true,success_version:'par-challenge-v2'};
const oldChallenge={state:{...v55,challenge:{version:'par-challenge-v1',id:'old',attempt:3,par:3}}};
assert.equal(startupAction(oldChallenge,v55),'upgrade','archive budget-only challenges before immediate retries');
assert.equal(startupAction({state:{...oldChallenge.state,challenge:{...oldChallenge.state.challenge,version:'par-challenge-v2'}}},v55),'restore','resume current attempt and its ghost history');

const {collectSavedHoles}=await import('../static/saved-holes.mjs');
const standard={start:'coffee',target:'science',threshold:.27};
const recoveredCustom={start:'dolphin',target:'submarine',threshold:.27,waypoint:{word:'radio',threshold:.27},par:5};
const recoveredFinished={...recoveredCustom,target:'submarine',final_target:'submarine',final_threshold:.27,challenge:{par:5}};
const recovered=collectSavedHoles([], [{state:recoveredFinished},{state:recoveredFinished},{state:standard}], [standard]);
assert.equal(recovered.length,1);assert.equal(recovered[0].waypoint.word,'radio');assert.equal(recovered[0].target,'submarine');
assert.deepEqual(collectSavedHoles(recovered,[],[standard]),recovered,'custom holes survive clearing scorecards');
assert.equal(collectSavedHoles([{start:'<bad>',target:'word'}],[],[standard]).length,0);

const {bankRestartSettings}=await import('../static/startup.mjs');
const oldWaypoint={start:'tee',target:'flag',final_target:'flag',threshold:.27,final_threshold:.27,mode:'distance',launch_min:.095,launch_max:.215,waypoint:{word:'middle',threshold:.27},challenge:{par:5,attempt:8}};
const estimatedBank={start:'tee',target:'flag',threshold:.27,mode:'distance',launch_min:.095,launch_max:.215,waypoint:{word:'middle',threshold:.27},par:4,par_estimate:{version:'waypoint-par-v1'}};
assert.equal(bankRestartSettings(oldWaypoint,standard,[estimatedBank]).par,4);assert.equal(oldWaypoint.challenge.par,5,'fresh restart never rewrites a saved attempt');
assert.equal(bankRestartSettings({...oldWaypoint,launch_max:.3},standard,[estimatedBank]).par,5,'custom thresholds retain their own par');
