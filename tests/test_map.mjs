import assert from 'node:assert/strict';
import { mapFraction, mapLayout, projectX, projectPoint, contourX, chipArcBands, visibleAttempts, layoutLabels } from '../static/map.mjs';
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
assert.ok(mapFraction(.1,0,.4)>.4&&mapFraction(.1,0,.4)<.45,'quarter progress remains expanded but less than the square-root version');
assert.ok(mapFraction(.225,0,.4)>.6&&mapFraction(.225,0,.4)<.675,'later progress uses the same slightly softened curve');
assert.equal(mapFraction(-.04,0,.4),-.09,'backward positions stay finite and linear');
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

const attempts=[
 {word:'back',forward:false,destination:.05},
 {word:'ahead',forward:true,destination:.28,attempt:2},
 {word:'stepping',forward:true,destination:.2,success:true,attempt:3}
];
const state={history:attempts,route:['start','stepping'],progress:.2};
assert.deepEqual(visibleAttempts(state).map(e=>e.word),['ahead','stepping']);
const original=projectX(attempts[1].destination,.1,.3,mapLayout(true));
state.progress=.25;
assert.equal(projectX(visibleAttempts(state)[0].destination,.1,.3,mapLayout(true)),original);
state.progress=.29;
assert.deepEqual(visibleAttempts(state).map(e=>e.word),['stepping']);

// A dense cluster must keep every word readable without covering any balls.
for(const width of [640,1000]){
 const balls=Array.from({length:24},(_,i)=>({word:`word-${i}`,x:width/2+(i%3)*4,y:180+(i%4)*3,width:90+(i%5)*12,height:20,priority:i===0?4:0}));
 const obstacles=balls.map(p=>({x:p.x-18,y:p.y-18,width:36,height:36}));
 const packed=layoutLabels(balls,obstacles,width);
 assert.equal(packed.labels.size,balls.length);
 const boxes=[...packed.labels.values()];
 const intersects=(a,b)=>a.x<b.x+b.width&&a.x+a.width>b.x&&a.y<b.y+b.height&&a.y+a.height>b.y;
 for(let i=0;i<boxes.length;i++){
  const box=boxes[i];assert.ok(box.x>=0&&box.x+box.width<=width&&box.y+box.height<=packed.height);
  assert.ok(obstacles.every(other=>!intersects(box,other)));
  assert.ok(boxes.slice(i+1).every(other=>!intersects(box,other)));
 }
}
console.log('Crowded label placement passed at phone and desktop widths: no missing words, overlapping labels, or covered balls.');

const recoveryHistory=[{word:'recovery',forward:false,success:true,destination:.19,outcome:'recovery'},{word:'water',forward:false,success:false,destination:.1,outcome:'water'}];
assert.deepEqual(visibleAttempts({history:recoveryHistory,route:['start','recovery'],progress:.19}).map(e=>e.word),['recovery']);

// Lateral spread must not change the visual distance that encodes semantic progress.
for(const narrow of [false,true]){
 const d=mapLayout(narrow),baseline=.07,green=.27;
 for(const similarity of [.06,.07,.09,.16,.2,.26,.269999,.27,.4,.9,1])for(const offset of [-160,-68,0,68,160]){
  const centre=projectX(similarity,baseline,green,d),p=projectPoint(similarity,baseline,green,d,offset);
  assert.ok(Math.abs(Math.hypot(d.right-p.x,p.y-215)-(d.right-centre))<1e-7);
  assert.ok(p.x>=20&&p.x<=d.edge&&Number.isFinite(p.y));
  if(similarity>=green)assert.ok(p.x>=d.zoneLeft&&p.x<=d.zoneRight);else assert.ok(p.x<=d.zoneLeft+1e-7);
 }
 assert.deepEqual(projectPoint(baseline,baseline,green,d),{x:d.left,y:215});
 assert.deepEqual(projectPoint(1,baseline,green,d),{x:d.right,y:215});
 const centre=projectX(.17,baseline,green,d),width=12,bands=chipArcBands(centre-width/2,centre+width/2,d);
 assert.equal(bands.length,16);assert.ok(contourX(centre,150,d)>centre,'range arc wraps toward the flag at its ends');
 let previous=0;
 for(const b of bands){
  assert.ok(b.opacity>previous&&b.opacity<=.78);previous=b.opacity;
  const values=b.path.match(/-?\d+\.\d+/g).map(Number);
  for(let i=0;i<values.length;i+=2){
   const radius=Math.hypot(d.right-values[i],values[i+1]-215);
   assert.ok(radius>=d.right-centre-width/2-.02&&radius<=d.right-centre+width/2+.02,'red paint stays in the narrow ribbon; no fill towards the hole');
  }
 }
}
console.log('Curved map passed: radial distance invariance, fixed anchors, bounded close lies, concentric indicator geometry and short fade with no interior fill.');
