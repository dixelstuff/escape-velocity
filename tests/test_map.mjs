import {greenContains} from '../static/course-appearance.mjs';
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
  assert.ok((d.right-d.zoneLeft)/(d.zoneRight-d.zoneLeft)>=.5);
  assert.ok(d.zoneRight<d.width);
  assert.ok(Math.abs(projectX(.45,.1,.45,d)-(d.left+d.arrivalDistance))<1e-8);
  assert.equal(projectX(1,.1,.45,d),d.axisRight);
  assert.equal(projectX(.1,.1,.45,d),d.left);
  for(let i=0;i<=100;i++)assert.ok(projectX(.45+.55*i/100,.1,.45,d)>=d.left+d.arrivalDistance-1e-8);
}
console.log('Map scale passed: semantic order, departure boundary and arrival zone centred on the cup and actual green boundary at phone and desktop widths.');

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
  assert.equal(greenContains(p,d),similarity>=green,'word position agrees with the green outline');
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

for(const order of [[0,1],[1,0]]){
 const pair=[{word:'upper-miss',x:400,y:180,width:100,height:20,radius:6,gap:5,failed:true},{word:'lower-miss',x:405,y:215,width:100,height:20,radius:6,gap:5,failed:true}];
 const obstacles=pair.map(p=>({x:p.x-8,y:p.y-8,width:16,height:16}));
 const result=layoutLabels(order.map(i=>pair[i]),obstacles,1000,430).labels;
 assert.ok(result.get('upper-miss').y+result.get('upper-miss').height<180);
 assert.ok(result.get('lower-miss').y>215);
}
console.log('Miss labels passed: upper/lower clustered misses spread outwards regardless of attempt order.');

// Reported mobile route, including high pins where CAMERA / INSPIRE crowd together.
for(const narrow of [true,false])for(const vertical of [.3,.5,.7])for(const teeY of [191,239])for(const completed of [false,true]){
 const d=mapLayout(narrow,{depth:.7,vertical,teeY}),baseline=.015662837286072318;
 const specs=[['mars',baseline,0],['inspire',.21982825649865845,-68.2],['rover',.07455649580970203,59.4],['camera',.19118485630315263,-114.4],['clarity',1,0]];
 const labels=specs.map(([word,sim,offset])=>({word,...(word==='mars'?{x:d.left,y:d.teeY}:projectPoint(sim,baseline,.27,d,offset)),width:(narrow?{mars:52.53,inspire:69.75,rover:61.85,camera:78.90,clarity:77.36}:{mars:35.82,inspire:47.89,rover:42.23,camera:53.79,clarity:52.97})[word],height:narrow?23.64:15.77,radius:word==='camera'&&!completed?16:word==='clarity'?10:6,gap:word==='camera'&&!completed?12:5,priority:word==='mars'?5:word==='camera'&&!completed?4:word==='clarity'?3:word==='inspire'?0:1,failed:word==='inspire'}));
 const obstacles=labels.map(p=>({x:p.x-p.radius-1,y:p.y-p.radius-1,width:2*p.radius+2,height:2*p.radius+8}));
 obstacles.push({x:d.right-3,y:d.holeY-51,width:33,height:52});
 const packed=layoutLabels(labels,obstacles,d.width,430);
 for(const word of ['camera','inspire']){
  const p=labels.find(p=>p.word===word),b=packed.labels.get(word);
  const gap=Math.hypot(Math.max(b.x-p.x,0,p.x-b.x-b.width),Math.max(b.y-p.y,0,p.y-b.y-b.height));
  assert.ok(gap<38,`${word} must remain close to its marker (${narrow}/${vertical}/${teeY}/${completed}): ${gap}`);
 }
 assert.equal(packed.height,430,'a small route must never expand the map for labels');
}
console.log('MARS regression passed: nearby CAMERA / INSPIRE labels stay local at high and low pin/tee positions, during play and after completion.');
