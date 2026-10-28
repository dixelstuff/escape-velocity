import assert from 'node:assert/strict';
import {animateLabelBody} from '../static/label-motion.mjs';
let finish,pose,options,cancelled=false;
const body={style:{transform:''},animate(frames,config){assert.equal(this.style.transform,'translate(12px,-7px)','old pose must exist before animation is installed');pose=frames;options=config;return {finished:new Promise(resolve=>finish=resolve),cancel(){cancelled=true;}};}};
const task=animateLabelBody(body,12,-7);assert.equal(body.style.transform,pose[0].transform);assert.equal(options.fill,'both');assert.equal(options.duration,360);finish();await task;assert.equal(body.style.transform,'');assert.equal(cancelled,true);
const broken={style:{},animate(){throw Error('unsupported');}};await animateLabelBody(broken,3,2);assert.equal(broken.style.transform,'');
const rejected={style:{},animate(){return {finished:Promise.reject(Error('cancelled')),cancel(){}};}};await animateLabelBody(rejected,3,2);assert.equal(rejected.style.transform,'');
let called=false;await animateLabelBody({animate(){called=true;}},.01,.01);assert.equal(called,false);
console.log('Label motion passed: synchronous first pose, backwards/forwards fill, clean completion/cancellation, unsupported fallback, and no animation for unchanged boxes.');
