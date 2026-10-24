import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,restoreGame,Embeddings,decodeHalf,createBrowserClient} from '../static/engine.mjs';
import {STROKE_PLAY,attemptLimit,maximumStrokes,retryPrefix,returnsToOriginalLie} from '../static/stroke-play.mjs';
import {challengeFailure} from '../static/success-mode.mjs';
import {shotMotion} from '../static/shot-motion.mjs';
import {greenContains,bunkerPoints,greenPoints,courseStyle,lakeGeometry,lakeContains} from '../static/course-appearance.mjs';
import {par3Bunkers,par3Fairway,par3MidBunkers,neighbouringCourse,par3CartPath,clearOfCartPath} from '../static/course-art.mjs';
import {mapLayout} from '../static/map.mjs';
const words=['tee','hole','a','b','c','d','e','f','g','h','miss','bridge'];
const e={index:new Map(words.map((w,i)=>[w,i])),hub:()=>0,cosine(a,b){if(a===b)return 1;if(a==='miss'||b==='miss')return 0;if(a==='hole'||b==='hole')return (a==='bridge'||b==='bridge')?.3:.04;return .5;}};
const options=par=>({mode:'distance',launch_min:.095,launch_max:.215,finish_mode:'range',challenge:{version:STROKE_PLAY,par,attempt:1,id:'caps-'+par}});
for(const [par,tries,cap] of [[3,6,5],[4,12,6],[5,18,7]]){
 assert.equal(attemptLimit(par),tries);assert.equal(maximumStrokes(par),cap);
 let g=new Game(e,'tee','hole',.27,options(par));
 for(const word of ['a','b','c','d','e','f','g','h'].slice(0,cap-1)){g.submit(word);assert.equal(g.challenge_failed,false,'no early cutoff just because par is impossible');}
 g.submit('miss');assert.equal(g.history.length,cap);assert.equal(g.challenge_failed,true);assert.equal(challengeFailure(g.state()),`Maximum score: ${cap} strokes — double bogey.`);assert.equal(g.current,['a','b','c','d','e','f','g','h'][cap-2]);assert.deepEqual(restoreGame(e,g.state()).state(),g.state());
 g=new Game(e,'tee','hole',.27,options(par));g.submit('miss');assert.equal(g.challenge_failed,true,'early misses still end the attempt');
}
let g=new Game(e,'tee','hole',.27,{...options(3),golden_paths:[['bridge']]});assert.equal(g.submit('bridge').golden_holed,true);assert.equal(g.state().attempts,1);assert.equal(g.automatic_shots.length,0);assert.deepEqual(restoreGame(e,g.state()).state(),g.state());
g=new Game(e,'tee','hole',.27,options(3));g.submit('bridge');assert.equal(g.state().attempts,2,'ordinary connected finish still counts its finishing shot');
g=new Game(e,'tee','hole',.27,options(3));g.submit('a');g.submit('b');const original=g.state(),prefix=retryPrefix(original,1,2);const replay=new Game(e,'tee','hole',.27,prefix);replay.submit('a');assert.equal(replay.state().attempts,1);assert.equal(replay.state().challenge.attempt,2);assert.deepEqual(g.state(),original,'preview never mutates the source');assert.throws(()=>retryPrefix(original,1,7),/limit/);assert.throws(()=>retryPrefix({...original,history:[{success:false}]},1,2),/landed/);
// Smooth landing and roll share one ground trajectory, with no direction change.
const a={x:60,y:220},b={x:550,y:185},fraction=.92,landing=1000/1850;
const poses=Array.from({length:1001},(_,i)=>shotMotion('golden',a,b,i/1000,{tee:true,landingFraction:fraction}));
const normalPeak=shotMotion('flight',a,{x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction},.5,{tee:true}).lift;
assert.ok(Math.abs(Math.max(...poses.map(p=>p.lift))-normalPeak)<.01);assert.ok(shotMotion('golden',a,b,landing+.02,{landingFraction:fraction}).lift>0,'touchdown is followed by a bounce');assert.equal(shotMotion('golden',a,b,.85,{landingFraction:fraction}).lift,0);assert.equal(poses.at(-1).scale,0);
for(let i=1;i<poses.length;i++){assert.ok(poses[i].x>=poses[i-1].x);const p=poses[i];assert.ok(Math.abs((p.x-a.x)*(b.y-a.y)-(p.y-a.y)*(b.x-a.x))<1e-6,'flight and roll remain tangent on the same line');}
const near=[-.0001,0,.0001].map(t=>shotMotion('golden',a,b,landing+t,{landingFraction:fraction}));assert.equal(near[1].lift,0);assert.ok(near.every(p=>p.lift<.1),'flight and bounce meet at ground level');
for(const narrow of [false,true]){const old=mapLayout(narrow),compact=mapLayout(narrow,{depth:.6,vertical:.5,greenHeight:222,par3:true});assert.equal(compact.zoneRight-compact.zoneLeft,old.zoneRight-old.zoneLeft);assert.ok(compact.greenBottom-compact.greenTop<old.greenBottom-old.greenTop);assert.ok(greenContains({x:compact.right,y:compact.holeY},compact));assert.equal(compact.greenNotches.length,3);const fairway=par3Fairway(compact);assert.ok(fairway.outline.every(p=>p.x<=fairway.endX+1e-7));assert.ok(fairway.endX>compact.zoneLeft,'approach joins the front of the green');assert.ok(fairway.endX<(compact.zoneLeft+compact.zoneRight)/2,'mowing does not wrap round the sides or back');const widths=Array.from({length:81},(_,i)=>{const fraction=.1+i*.01,x=compact.left+fraction*(compact.right-compact.left);return {fraction,width:fairway.bottomY(x)-fairway.topY(x)};});const waist=widths.reduce((a,b)=>a.width<b.width?a:b);assert.ok(waist.fraction>=.25&&waist.fraction<=.4,'narrowest point is early in the hole');assert.ok(fairway.bottomY(compact.left)-fairway.topY(compact.left)>2*(64+5),'tee markers fit inside grass');assert.ok(fairway.bottomY(compact.zoneLeft-30)-fairway.topY(compact.zoneLeft-30)>waist.width*1.5,'approach spreads out to embrace the front bunkers');for(const b of par3Bunkers(compact)){const a=b.angle*Math.PI/180;for(const p of bunkerPoints(b,2)){const point={x:b.x*compact.width+p.x*Math.cos(a)-p.y*Math.sin(a),y:b.y+p.x*Math.sin(a)+p.y*Math.cos(a)};assert.equal(greenContains(point,compact),false,'sand never overlaps indented green');assert.ok(greenPoints(compact).every(q=>Math.hypot(point.x-q.x,point.y-q.y)>=4.99),'a tiny turf gap separates the edge lines');}}}
for(const narrow of [false,true])for(const teeY of [172,258])for(let i=0;i<20;i++){const style=courseStyle('path-'+i),d={...mapLayout(narrow,{depth:.6,vertical:.5,greenHeight:222,par3:true,teeY,greenCentreY:style.greenCentreY}),style},lake=lakeGeometry(d,style),p=par3CartPath(d,style);assert.ok(p.points.every(point=>!lakeContains(point,lake,5)),'south path remains out of the lake');assert.ok(p.points.every(point=>!lakeContains(point,{outline:par3Fairway(d).outline},5)),'path stays outside the fairway');const mid=par3MidBunkers(d,style)[0];assert.ok(Math.abs(mid.y-par3Fairway(d).topY(mid.x*d.width))<5,'mid-hole sand straddles fairway edge');const neighbour=neighbouringCourse(d);assert.ok(neighbour.pathPoints.every(point=>!lakeContains(point,{outline:neighbour.outline},10)),'results scene road never crosses neighbouring fairway');assert.ok(p.points.every((point,j)=>!j||point.x>p.points[j-1].x),'cart path flows onward without hairpins');assert.equal(clearOfCartPath({...p.points[50],r:12},d),false,'tree trunks cannot sit on cart path');}
const root=new URL('../static/model/',import.meta.url),read=f=>readFileSync(new URL(f,root)),c=JSON.parse(read('config.json')),raw=read(c.vector_fallback),exact=new Embeddings(JSON.parse(read(c.words_file)),decodeHalf(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),300,new Uint8Array(read(c.hub_file)));
let verified=0;
for(const h of [...c.puzzles,...c.courses.flatMap(c=>c.holes)].filter(h=>h.golden_paths))for(const path of h.golden_paths){const g=new Game(exact,h.start,h.target,h.threshold,{...h,finish_mode:'range',challenge:{version:STROKE_PLAY,par:h.par??3,attempt:1,id:'curated'}});for(const word of path){if(g.won)break;g.submit(word);}assert.equal(g.won,true,JSON.stringify([h.start,path,h.target]));assert.ok(g.history.at(-1).golden_holed||g.history.at(-1).waypoint_finish,'curated eagle or an earlier qualifying waypoint finish');assert.ok(g.state().attempts<=path.length,'natural waypoint finish is no worse than the curated route');assert.deepEqual(restoreGame(exact,g.state()).state(),g.state());verified++;}
assert.ok(verified>=25,'the real course has curated examples, not just synthetic support');
const oldFetch=globalThis.fetch;globalThis.fetch=async url=>new Response(readFileSync(new URL(url)));
try{const client=await createBrowserClient();const h=c.puzzles.find(h=>h.waypoint&&h.par===4),s=(await client.request('new',{...h,challenge:{version:STROKE_PLAY,par:4,attempt:1,id:'api-prefix'}})).state;const first=h.golden_paths?.[0]?.[0]??'books';let before=await client.request('submit',{word:first});if(before.event.success){const immediate=client.retryNow(before.state,1,2);assert.equal(typeof immediate.then,'undefined','tap selection is synchronous inside the native focus gesture');assert.equal(immediate.state.current,first);assert.deepEqual(client.restoreRetry(before.state).state,before.state);const preview=await client.request('retry-prefix',{state:before.state,through:1,attempt:2});assert.equal(preview.state.history.length,1);assert.equal(preview.state.challenge.attempt,2);assert.deepEqual((await client.request('restore',{state:before.state})).state,before.state);}}
finally{globalThis.fetch=oldFetch;}
console.log(`Stroke play passed: per-par limits, final-shot feedback, immediate misses, curated eagles (${verified} route fixtures), exact replay, reversible prefix retries, unchanged green width and smooth flight-to-roll motion.`);

const {retryLieThrough}=await import('../static/stroke-play.mjs');
assert.equal(retryLieThrough({challenge:{par:3},history:[{success:true},{success:true},{success:false}]}),2);
assert.equal(retryLieThrough({challenge:{par:3},history:[{success:false}]}),0);
assert.equal(retryLieThrough({challenge:{par:3},history:Array.from({length:5},()=>({success:true}))}),4);

// Returning to the live lie restores the original attempt rather than committing a retry.
const live={start:'tee',current:'b',history:[{word:'a',success:true},{word:'b',success:true}],challenge:{attempt:3}};
const retry={source:{state:structuredClone(live)},original:{state:structuredClone(live)},attempt:4};
assert.equal(returnsToOriginalLie(retry,2),true);
assert.equal(retry.original.state.challenge.attempt,3,'original count remains available for restore');
assert.equal(returnsToOriginalLie(retry,1),false,'an earlier lie still previews a retry');
assert.equal(returnsToOriginalLie(null,2),false);
assert.equal(returnsToOriginalLie({...retry,original:{state:{...live,won:true}}},2),false);
assert.equal(returnsToOriginalLie({...retry,original:{state:{...live,challenge_failed:true}}},2),false);
assert.equal(returnsToOriginalLie({...retry,source:{state:{...live,history:[{word:'b',success:true},{word:'b',success:true}]}}},2),false,'same word on a different route is not the original lie');
const resumed={...live,history:live.history.map(h=>({...h,assumed:true})),challenge:{attempt:4}};
assert.equal(returnsToOriginalLie({...retry,original:{state:resumed}},2),true,'after an automatic miss retry, restore the resumed attempt');
assert.equal(returnsToOriginalLie({source:{state:live},original:{state:{...live,current:'tee',history:[]}}},0),true,'a tee preview can also be cancelled');

const teeSides=new Set();
for(let i=0;i<30;i++){
 const style=courseStyle('angled-tee-'+i);teeSides.add(style.par3TeeY);
 const before=mapLayout(false,{depth:.6,vertical:.5,par3:true,greenHeight:222,teeY:style.teeY,greenCentreY:style.greenCentreY});
 const angled=mapLayout(false,{depth:.6,vertical:.5,par3:true,greenHeight:222,teeY:style.par3TeeY,greenCentreY:style.greenCentreY});
 assert.equal(angled.teeY,style.par3TeeY);assert.equal(angled.holeY,before.holeY);assert.equal(angled.greenTop,before.greenTop);assert.equal(angled.greenBottom,before.greenBottom);
 const turf=par3Fairway(angled);assert.ok(turf.topY(angled.left)<angled.teeY-64&&turf.bottomY(angled.left)>angled.teeY+64,'both tee markers remain in fairway');
}
assert.deepEqual([...teeSides].sort((a,b)=>a-b),[168,187,210]);

// Practice preserves the scored milestone through retry, completion and restore.
{
 const locked={score:0,attempt:2};
 const g=new Game(e,'tee','hole',.27,{...options(3),challenge:{...options(3).challenge,attempt:7,practice:true,locked_result:locked}});
 g.submit('miss');
 const saved=g.state();assert.equal(saved.challenge.practice,true);assert.deepEqual(saved.challenge.locked_result,locked);
 const next=retryPrefix(saved,0,8);const p=new Game(e,'tee','hole',.27,next);p.submit('bridge');
 assert.equal(p.won,true);assert.deepEqual(restoreGame(e,p.state()).state().challenge.locked_result,locked);
 const {exhausted}=await import('../static/stroke-play.mjs');assert.equal(exhausted(p.state()),false);
 const course=c.courses.find(x=>x.id==='24-october');assert.equal(course.holes.length,9);
 for(const fixture of JSON.parse(readFileSync(new URL('../data/24-october-route-checks.json',import.meta.url)))){
  const h=course.holes.find(x=>x.start===fixture.start),game=new Game(exact,h.start,h.target,h.threshold,{...h,challenge:{version:STROKE_PLAY,par:h.par,attempt:1,id:'october-route'}});
  if(h.waypoint){const {waypointLegAccess}=await import('../static/engine.mjs');assert.equal(waypointLegAccess(exact,h).allowed,true);}
  for(const word of fixture.route){if(game.won)break;const shot=game.submit(word);assert.equal(shot.success,true,h.start+' '+word);}
  assert.equal(game.won,true,h.start+' has a verified recognisable route');
 }
}

// Older longer attempts remain replayable after the new double-bogey cap.
{
 const old=new Game(e,'tee','hole',.27,options(4));old.replay_stroke_cap=7;
 for(const w of ['a','b','c','d','e'])old.submit(w);
 old.submit('bridge');const saved=old.state();assert.equal(saved.won,true);assert.equal(saved.attempts,7);
 assert.deepEqual(restoreGame(e,saved).state(),saved);
}
