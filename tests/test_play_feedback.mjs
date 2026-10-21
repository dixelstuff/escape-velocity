import assert from 'node:assert/strict';
import {attemptNotice} from '../static/play-feedback.mjs';
import {successOutcome} from '../static/success-mode.mjs';
assert.equal(attemptNotice({outcome:'miss',word:'science',origin:'heat'},'science'),'Miss! SCIENCE needs a stronger link to HEAT.');
assert.equal(attemptNotice({outcome:'water',word:'bean',origin:'coffee'},'science'),'Backwards! BEAN is less related to SCIENCE than COFFEE.');
assert.equal(attemptNotice({outcome:'landed'},'science'),'Par is out of reach. Try again.');
assert.equal(successOutcome({attempts:3,challenge:{par:3,attempt:4}}),'Par on attempt 4');
assert.equal(successOutcome({attempts:2,challenge:{par:3,attempt:2}}),'Birdie on attempt 2');
console.log('Compact feedback passed: actual lie/target, misses, backwards hits and separate success subtitle.');
