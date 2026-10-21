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
