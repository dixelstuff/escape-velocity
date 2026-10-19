import assert from 'node:assert/strict';
import { mapFraction } from '../static/map.mjs';
for(const baseline of [-.1,.05,.2,.4]) {
  assert.equal(mapFraction(baseline,baseline,.45),0);
  assert.equal(mapFraction(.45,baseline,.45),.9);
  assert.equal(mapFraction(1,baseline,.45),1);
  let previous=-Infinity;
  for(let n=0;n<=1000;n++){
    const similarity=baseline+(1-baseline)*n/1000;
    const current=mapFraction(similarity,baseline,.45);assert.ok(current>=previous);previous=current;
  }
}
assert.ok(Number.isFinite(mapFraction(.6,.6,.45)));
console.log('Map scale passed: continuous semantic order, departure boundary and compact arrival zone.');
