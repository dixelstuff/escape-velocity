import assert from 'node:assert/strict';
import {shotMotion} from '../static/shot-motion.mjs';
const a={x:100,y:270},b={x:800,y:215};
for(const kind of ['flight','putt','chip']){
 const original=JSON.stringify({a,b});let previousX=a.x;
 for(let i=0;i<=200;i++){
  const p=shotMotion(kind,a,b,i/200);
  assert.ok(Object.values(p).every(Number.isFinite));
  assert.ok(p.x>=previousX&&p.x<=b.x);previousX=p.x;
  assert.ok(p.scale>=-1e-12&&p.scale<=1&&p.lift>=0);
  assert.ok(p.shadowScale>=-1e-12&&p.shadowScale<=1);
  if(kind==='putt'){
   assert.equal(p.lift,0,'putt never leaves the ground');
   assert.ok(Math.abs((p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x))<1e-7,'roll follows the straight ground segment');
  }
 }
 const start=shotMotion(kind,a,b,0),end=shotMotion(kind,a,b,1);
 assert.equal(start.x,a.x);assert.equal(start.y,a.y);assert.equal(start.lift,0);
 assert.equal(end.x,b.x);assert.equal(end.y,b.y);assert.equal(end.lift,0);
 assert.ok(Math.abs(end.scale-(kind==='flight'?1:0))<1e-12);
 assert.equal(JSON.stringify({a,b}),original);
}
for(const t of [.55,.73,.85,.9,1])assert.ok(shotMotion('chip',a,b,t).lift<1e-10,'chip makes ground contact between hops and rolls at the end');
const heights=[.275,.64,.79].map(t=>shotMotion('chip',a,b,t).lift);
assert.ok(heights[0]>heights[1]&&heights[1]>heights[2]&&heights[2]>0,'two bounces diminish after the initial flight');
assert.equal(shotMotion('putt',a,b,.9).scale,1);
assert.ok(shotMotion('putt',a,b,.97).scale<1,'ball sinks only at the cup');
assert.ok(shotMotion('flight',a,b,.5).shadowScale<1,'shadow stays smaller while the ball is airborne');
console.log('Shot motion passed: ground-only putting, diminishing chip bounces, straight ground travel, exact endpoints, cup sink, attached shadow and immutable inputs.');
