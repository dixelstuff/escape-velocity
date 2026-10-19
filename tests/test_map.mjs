import assert from 'node:assert/strict';
import { mapFraction, mapLayout, projectX } from '../static/map.mjs';
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
for(const narrow of [false,true]) {
  const d=mapLayout(narrow);
  assert.equal(d.right-d.zoneLeft,d.zoneRight-d.right);
  assert.ok(d.zoneRight<d.width);
  assert.ok(Math.abs(projectX(.45,.1,.45,d)-d.zoneLeft)<1e-8);
  assert.equal(projectX(1,.1,.45,d),d.right);
  assert.equal(projectX(.1,.1,.45,d),d.left);
  for(let i=0;i<=100;i++)assert.ok(projectX(.45+.55*i/100,.1,.45,d)>=d.zoneLeft-1e-8);
}
console.log('Map scale passed: semantic order, departure boundary and arrival zone centred on the destination at phone and desktop widths.');
