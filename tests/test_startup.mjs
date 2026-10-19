import assert from 'node:assert/strict';
import { startupAction, isOpening } from '../static/startup.mjs';
const opening={start:'coffee',target:'science',threshold:.12,mode:'distance',rules:'distance-v2',launch_min:.08,launch_max:.18};
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

assert.equal(startupAction({state:{...opening,threshold:.3,launch_min:.12,launch_max:.3},entries:[]},opening),'upgrade');
assert.equal(startupAction({state:{...opening,threshold:.4},entries:[]},opening),'restore');
