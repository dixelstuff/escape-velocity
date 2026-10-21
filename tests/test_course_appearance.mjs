import assert from 'node:assert/strict';
import {pinPlacement,greenContains,greenPath} from '../static/course-appearance.mjs';
import {mapLayout,projectPoint,projectX,axisPoint} from '../static/map.mjs';
const locations=new Set();
for(let i=0;i<300;i++){
 const p=pinPlacement(`round-${i}`);assert.deepEqual(p,pinPlacement(`round-${i}`));
 assert.ok(p.depth>=.5&&p.depth<=.7&&p.vertical>=.3&&p.vertical<=.7);locations.add(p.depth.toFixed(4)+p.vertical.toFixed(4));
}
assert.ok(locations.size>290,'different rounds produce varied appearances');
for(const narrow of [false,true])for(const depth of [.5,.6,.7])for(const vertical of [.3,.5,.7]){
 const d=mapLayout(narrow,{depth,vertical});
 assert.ok(Math.abs((d.right-d.zoneLeft)/(d.zoneRight-d.zoneLeft)-depth)<1e-10);
 assert.ok(Math.abs((d.holeY-d.greenTop)/(d.greenBottom-d.greenTop)-vertical)<1e-10);
 assert.ok(greenContains({x:d.right,y:d.holeY},d));
 assert.ok(greenPath(d).startsWith('M')&&greenPath(d).endsWith(' Z'));
 const snapshot=JSON.stringify(d);
 for(const s of [.07,.09,.18,.26,.2699,.27,.4,.9,1])for(const dy of [-160,-70,0,70,160]){
  const p=projectPoint(s,.07,.27,d,dy),r=d.axisRight-projectX(s,.07,.27,d);
  assert.ok(Math.abs(Math.hypot(d.right-p.x,d.holeY-p.y)-r)<1e-7,'rotation preserves distance to the cup');
  assert.equal(greenContains(p,d),s>=.27,`green membership ${narrow}/${depth}/${vertical}/${s}/${dy}`);
  assert.ok(p.x>=19.999&&p.x<=d.edge+.001&&p.y>=61.999&&p.y<=370.001);
 }
 const tee=projectPoint(.07,.07,.27,d),cup=projectPoint(1,.07,.27,d);
 assert.ok(Math.hypot(tee.x-d.left,tee.y-215)<1e-8);assert.ok(Math.hypot(cup.x-d.right,cup.y-d.holeY)<1e-8);
 const edge=axisPoint(d.arrivalDistance,0,d);assert.ok(greenContains(edge,d));
 assert.equal(JSON.stringify(d),snapshot,'projection never mutates appearance');
}
console.log('Appearance passed: stable varied pins within requested ranges, organic green membership, rotated distance geometry, bounded words and immutable layouts.');
