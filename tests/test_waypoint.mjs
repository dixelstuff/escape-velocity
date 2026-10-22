import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,Embeddings,decodeHalf,restoreGame,createBrowserClient,resumeWaypoint} from '../static/engine.mjs';
import {restartSettings,startupAction} from '../static/startup.mjs';
import {chipRange} from '../static/chip-range.mjs';
import {mapLayout} from '../static/map.mjs';
import {greenContains,greenPoints,bunkerPoints,shoreY} from '../static/course-appearance.mjs';
import {waypointBunkers,waypointGreen,waypointBankY,waypointLayout,waypointPosition,waypointLake,waypointZone,waypointLandscape,waypointChipGuide,waypointAnchors} from '../static/waypoint-map.mjs';
import {courseTrees,clearOfCartPath} from '../static/course-art.mjs';
import {previousAttempts,previousWordLabels} from '../static/attempt-ghosts.mjs';
const dir=new URL('../static/model/',import.meta.url),read=f=>readFileSync(new URL(f,dir)),c=JSON.parse(read('config.json')),b=read(c.vector_fallback),e=new Embeddings(JSON.parse(read(c.words_file)),decodeHalf(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)),300,new Uint8Array(read(c.hub_file)));
const holes=JSON.parse(readFileSync(new URL('../data/waypoint-holes.json',import.meta.url)));
const options=(h,attempt=1)=>({...h,finish_mode:'range',challenge:{version:'waypoint-trial-v1',par:h.par,attempt,id:'waypoint-test'}});
const fresh=(i=0,attempt=1)=>new Game(e,holes[i].start,holes[i].target,holes[i].threshold,options(holes[i],attempt));
let g=fresh();assert.equal(g.target,'library');assert.equal(g.stage,0);
assert.throws(()=>g.submit('galaxy'),/Reach LIBRARY/);assert.equal(g.history.length,0);
const reached=g.submit('books');assert.equal(reached.waypoint_reached,true);assert.equal(reached.won,false);assert.equal(reached.automatic_shot,undefined);
assert.equal(g.target,'galaxy');assert.equal(g.current,'books');assert.equal(g.stage,1);assert.equal(g.history.length,1);assert.equal(g.baseline,e.cosine('books','galaxy'));assert.equal(g.best_progress,g.baseline);
const saved=g.state();assert.deepEqual(restoreGame(e,saved).state(),saved);assert.equal(startupAction({state:saved},{}),'restore');
for(const narrow of [false,true]){
 const d=mapLayout(narrow),initial={...saved,stage:0,target:'library',history:[]};
 assert.ok(waypointZone(initial,d).includes('waypoint-zone'));assert.ok(!waypointZone(initial,d).includes('LAND HERE FIRST'));assert.equal(waypointZone(saved,d),'');assert.ok(waypointLandscape(saved,d).includes('url(#fairway-mown)'));
 const p=waypointPosition(saved,'books',d);g.submit('space');assert.deepEqual(waypointPosition(g.state(),'books',d),p,'earlier anchors do not move after the target switches');g=restoreGame(e,saved);
}
g.submit('space');assert.equal(g.won,true);assert.equal(g.state().attempts,3);assert.deepEqual(g.route,['penguin','books','space','galaxy']);assert.deepEqual(restoreGame(e,g.state()).state(),g.state());
g=fresh();g.submit('books');g.submit('stars');assert.equal(g.challenge_failed,true);const failed=g.state();
const restarted=restartSettings(failed,{});g=new Game(e,restarted.start,restarted.target,restarted.threshold,{...restarted,finish_mode:'range',challenge:{...failed.challenge,attempt:2}});
assert.equal(g.stage,0);assert.equal(g.current,'penguin');assert.equal(g.target,'library');assert.equal(g.history.length,0);
assert.equal(previousAttempts([{id:'failed',state:failed}],g.state(),'new').length,1,'second-leg failure remains available as previous attempt');
assert.ok(previousWordLabels(failed,mapLayout(true)).some(l=>l.word==='books'));
for(let n=1;n<=12;n++){g=fresh(0,n);assert.equal(g.challenge.attempt,n);assert.equal(g.submit('stars').success,false);assert.equal(g.challenge_failed,true);}
// Par is advisory during this individual trial: legal shots can continue beyond it.
g=fresh();g.submit('books');g.challenge.par=2;assert.equal(g.challenge_failed,false);g.submit('space');assert.equal(g.won,true);assert.equal(g.state().attempts,3);
for(const [index,route] of [[1,['paper','tree','wood','violin']],[2,['diamond','crystal']]]){
 g=fresh(index);for(const word of route)g.submit(word);assert.equal(g.won,true);assert.equal(g.state().attempts,index===1?5:3);assert.deepEqual(restoreGame(e,g.state()).state(),g.state());
}
console.log('Waypoint trial: mandatory zone, target/baseline switch, no free shot, saved replay, full resets, 12 attempts, advisory par, stable mobile/desktop anchors, and three real routes passed.');

const originalFetch=globalThis.fetch;
globalThis.fetch=async url=>{try{return new Response(readFileSync(new URL(url)));}catch{return new Response('',{status:404});}};
try{
 const client=await createBrowserClient();await client.request('new',options(holes[0]));
 const {state}=await client.request('submit',{word:'books'}),probe=restoreGame(e,state);
 assert.deepEqual(client.chipRange(state),chipRange(probe),'second-leg guide uses the final target and new baseline');
 assert.equal(client.canFinish(state),probe.finishesFrom(probe.current,state.progress));
 const failure=(await client.request('submit',{word:'stars'})).state;
 await client.request('new',options(holes[0],2));
 const retry=(await client.request('resume-waypoint',{state:failure,through:1,source_id:'browser-source'})).state;
 assert.equal(retry.current,'books');assert.equal(retry.history[0].assumed,true);
 assert.equal((await client.request('submit',{word:'space'})).state.attempts,3);
}finally{globalThis.fetch=originalFetch;}
console.log('Waypoint browser client: final-leg chip boundary and finish check use restored leg state.');

// A retry inherits the exact successful prefix, not a new free position.
const nextChallenge={...failed.challenge,attempt:2};
let resumed=resumeWaypoint(e,failed,1,nextChallenge,'source-journey');
assert.equal(resumed.current,'books');assert.equal(resumed.stage,1);assert.equal(resumed.target,'galaxy');assert.equal(resumed.state().attempts,1);
assert.equal(resumed.history[0].assumed,true);assert.equal(resumed.state().resumed_from.journey_id,'source-journey');
assert.deepEqual(restoreGame(e,resumed.state()).state(),resumed.state());
resumed.submit('space');assert.equal(resumed.won,true);assert.equal(resumed.state().attempts,3);assert.equal(resumed.history[1].assumed,undefined);
assert.deepEqual(restoreGame(e,resumed.state()).state(),resumed.state());
assert.equal(resumeWaypoint(e,failed,0,nextChallenge).stage,0);
assert.throws(()=>resumeWaypoint(e,failed,2,nextChallenge),/successful shots/);
assert.throws(()=>resumeWaypoint(e,failed,1,{...nextChallenge,id:'another-hole'}),/previous waypoint/);
assert.throws(()=>resumeWaypoint(e,failed,1,failed.challenge),/previous waypoint/);
for(const narrow of [false,true])for(const turn of ['up','down']){
 const s={...saved,waypoint:{...saved.waypoint,turn}},d=waypointLayout(mapLayout(narrow),s),a=waypointAnchors(d);
 assert.equal(d.greenBottom-d.greenTop,184);assert.equal(d.artScale,.8);
 assert.ok(turn==='up'?a.bend.y<a.tee.y&&d.greenTop>180:a.bend.y>a.tee.y&&d.greenBottom<250);
 const landscape=waypointLandscape(s,d,{phase:0});assert.ok(!landscape.includes('NaN'));assert.ok(landscape.includes('scorecard-sand'));assert.ok(landscape.includes('lake-clip'));
 assert.equal((landscape.match(/id="dogleg-centreline"/g)??[]).length,1);
 const guide=waypointChipGuide(s,d,{first:.14,last:.15});assert.ok(guide.includes('waypoint-chip-front'));assert.ok(guide.includes(`width="${d.zoneLeft}"`));
}
// Preserve the actual routes reported by the player while changing the artwork/retry UI.
for(const [index,route] of [[0,['book','atlas']],[1,['stick','fire','pit']],[2,['train','wedding','photo']]]){
 const trial=fresh(index);for(const word of route)trial.submit(word);assert.equal(trial.won,true,route.join(' → '));
}
console.log('Waypoint refinement: counted prefix retries, invalid retries, both dogleg directions, smaller green, front-only chip guide, and player routes passed.');

let multi=fresh(1);for(const word of ['paper','tree','wood','volcano'])multi.submit(word);
assert.equal(multi.challenge_failed,true);
const prefix=multi.state(),challenge={...prefix.challenge,attempt:2};
const firstLeg=resumeWaypoint(e,prefix,1,challenge),thirdShot=resumeWaypoint(e,prefix,3,challenge);
assert.equal(firstLeg.stage,0);assert.equal(firstLeg.current,'paper');assert.equal(firstLeg.history.length,1);
assert.equal(thirdShot.stage,1);assert.equal(thirdShot.current,'wood');assert.equal(thirdShot.history.length,3);assert.ok(thirdShot.history.every(h=>h.assumed));
thirdShot.submit('violin');assert.equal(thirdShot.won,true);assert.equal(thirdShot.state().attempts,5);assert.deepEqual(restoreGame(e,thirdShot.state()).state(),thirdShot.state());
console.log('Waypoint retries: browser API and first-/third-shot prefixes preserve targets, count and replay.');

// Keep the entire lower tee marker comfortably above the lake's first cut of rough.
for(const narrow of [false,true])for(const phase of [0,1,2,3,4,5,6]){
 const d=waypointLayout(mapLayout(narrow),{...saved,waypoint:{...saved.waypoint,turn:'up'}});
 const bank=shoreY(d.left,{...d,zoneLeft:d.width*.51},{lakeY:390,wave:35,phase})-15;
 assert.ok(bank-(d.teeY+44+4.5*d.artScale)>10,'tee marker has at least ten course units of fairway before the bank');
 assert.ok(waypointBankY(d,{phase},d.left)-(d.teeY+44+4.5*d.artScale)>10,'smoothed fairway cut leaves the full marker inside the fairway');
}

for(const narrow of [false,true])for(const turn of ['up','down']){
 const d=waypointLayout(mapLayout(narrow),{...saved,waypoint:{...saved.waypoint,turn}});
 const edge=turn==='up'?d.greenTop:d.greenBottom,sign=turn==='up'?1:-1;
 assert.equal(greenContains({x:d.greenCentre,y:edge+sign*5},d),false,'greenside bunker has a real recess');
 assert.equal(greenContains({x:d.greenCentre,y:edge+sign*40},d),true,'recess does not remove the usable green');
 assert.equal(greenContains({x:d.right,y:d.holeY},d),true,'flag remains on the green');
 const raw=greenPoints({...d,greenNotch:undefined}),shaped=greenPoints(d),index=turn==='up'?48:16;
 assert.ok(sign*(shaped[index].y-raw[index].y)>12);
}
console.log('Greenside bunker recess passed in both orientations and viewports.');

const discovery=holes.filter(h=>h.course_set==='waypoint-discovery-v1');
const routes=JSON.parse(readFileSync(new URL('./waypoint-discovery-routes.json',import.meta.url)));
assert.equal(discovery.length,15);assert.equal(new Set(discovery.map(h=>[h.start,h.waypoint.word,h.target].join(':'))).size,15);
for(const h of discovery){
 const sample=routes.find(r=>r.start===h.start&&r.waypoint===h.waypoint.word&&r.target===h.target);assert.ok(sample);
 const trial=new Game(e,h.start,h.target,h.threshold,options(h));
 for(const word of sample.route){if(trial.won)break;const r=trial.submit(word);assert.ok(r.success,`${h.start}: ${word} was ${r.outcome}`);}
 assert.ok(trial.won,`${h.start} has a verified finishing route`);assert.equal(trial.stage,1);assert.ok(trial.history.some(r=>r.waypoint_reached));
 assert.deepEqual(restoreGame(e,trial.state()).state(),trial.state());
}
console.log('All fifteen new waypoint tests have a successful route through the mandatory zone and reproducible saves.');

for(const narrow of [false,true]){
 const up=waypointLayout(mapLayout(narrow),{...saved,waypoint:{...saved.waypoint,turn:'up'}}),down=waypointLayout(mapLayout(narrow),{...saved,waypoint:{...saved.waypoint,turn:'down'}});
 assert.notEqual(up.bendX,down.bendX);assert.notEqual(up.bendY,430-down.bendY);assert.notEqual(up.teeY,430-down.teeY);
 for(const d of [up,down]){
  const landscape=waypointLandscape(saved,d,{phase:2});
  const guide=landscape.match(/id="dogleg-centreline" d="([^"]+)"/)[1];assert.equal((guide.match(/ C/g)??[]).length,2,'centre trace uses two smooth curves through the waypoint');
  assert.ok(landscape.includes('waypoint-dry-rough'),'cart paths stay off fairway and lake');
 }
}
console.log('Distinct dogleg geometry, two-segment centre trace, and masked rough paths passed.');

const butterfly=holes.find(h=>h.start==='butterfly');
const freestyle=new Game(e,butterfly.start,butterfly.target,butterfly.threshold,options(butterfly));
const freestyleHit=freestyle.submit('freestyle');assert.ok(freestyleHit.waypoint_reached);assert.ok(freestyleHit.leg_baseline>freestyleHit.leg_threshold);
for(const narrow of [false,true]){
 const d=waypointLayout(mapLayout(narrow),freestyle.state()),bend=waypointAnchors(d).bend;
 const landing=waypointPosition(freestyle.state(),'freestyle',d);assert.ok(((landing.x-bend.x)/(d.width*.065))**2+((landing.y-bend.y)/40)**2<1,'reached waypoint lies inside its ellipse');assert.notDeepEqual(landing,bend,'landings vary within the zone');
 const before={...freestyle.state(),history:[],stage:0};assert.deepEqual(waypointPosition(before,'freestyle',d,freestyleHit),landing,'flight preview reaches the same zone');
}
console.log('FREESTYLE regression passed: high opening cosine reaches and displays inside the waypoint.');

assert.equal(waypointZone({...freestyle.state(),stage:0},waypointLayout(mapLayout(true),freestyle.state()),true),'','occupied retry waypoint has no shading');

for(const narrow of [false,true])for(const turn of ['up','down'])for(const phase of [0,1,2,3,4,5,6]){
 const d=waypointLayout(mapLayout(narrow),{...saved,waypoint:{...saved.waypoint,turn}}),trees=courseTrees(d,{phase},waypointLake(d,{phase}));
 for(const match of trees.matchAll(/<g transform="translate\(([-\d.]+),([-\d.]+)\)"/g))assert.ok(clearOfCartPath({x:Number(match[1]),y:Number(match[2]),r:0},d),'tree centres stay off the actual drawn cart path');
 assert.equal(clearOfCartPath({...d.cartPath.points[24],r:10},d),false);
}
console.log('Cart path clearance passed for both doglegs, viewport widths and terrain phases.');

for(const narrow of [false,true])for(const turn of ['up','down'])for(const vertical of [.3,.5,.7]){
 const d=waypointLayout(mapLayout(narrow),{...saved,waypoint:{...saved.waypoint,turn}},{depth:.6,vertical});
 for(const b of waypointBunkers(d).slice(1)){
  const angle=b.angle*Math.PI/180;
  for(const p of bunkerPoints(b,2)){
   const x=b.x*d.width+p.x*Math.cos(angle)-p.y*Math.sin(angle),cy=b.y+p.x*Math.sin(angle)+p.y*Math.cos(angle),point={x,y:d.reflectY?430-cy:cy};
   assert.equal(greenContains(point,d),false,'sand bank stays outside the green');
   const distance=Math.min(...d.greenOutline.map((a,i)=>{const c=d.greenOutline[(i+1)%d.greenOutline.length],dx=c.x-a.x,dy=c.y-a.y,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy)));return Math.hypot(point.x-a.x-t*dx,point.y-a.y-t*dy);}));
   assert.ok(distance>=1.79,'a tiny fringe strip separates bank and putting edge');
  }
 }
 const complex=waypointGreen(d,{phase:0});assert.ok(complex.includes('shared-collar-join'));assert.ok(!complex.includes('#9daf7d'),'greenside sand has no separate dark grass surround');
}
console.log('Unified green/sand collar and non-touching surfaces passed at both widths and directions.');
