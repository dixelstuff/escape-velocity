import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bunkerExamples} from '../static/bunker-examples.mjs';
import {dailyManifest} from '../static/daily-manifest.mjs';
import {dailyManifest as publicManifest} from '../static/public-manifest.mjs';
import {DailyGame} from '../static/daily-game.mjs';
import {Embeddings,decodeHalf,Game,restoreGame} from '../static/engine.mjs';
import {semanticBunkerArt,semanticBunkerLabel} from '../static/semantic-bunker-map.mjs';
import {waypointLayout,waypointBankY} from '../static/waypoint-map.mjs';
import {mapLayout} from '../static/map.mjs';
import {courseStyle,pinPlacement} from '../static/course-appearance.mjs';
const root=new URL('../static/model/',import.meta.url),read=f=>fs.readFileSync(new URL(f,root)),config=JSON.parse(read('config.json')),bytes=read(config.vector_fallback);
const e=new Embeddings(JSON.parse(read(config.words_file)),decodeHalf(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),config.dimensions,new Uint8Array(read(config.hub_file)));
const before=JSON.stringify(dailyManifest),examples=bunkerExamples(dailyManifest),ids=new Set();assert.equal(examples.length,5);
const memory=new Map(),daily=new DailyGame({getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},dailyManifest);
const samples=[
 'time chance wish hope rest room bed extra part second',
 'keep hope word future night lie faith doubt secret shadow',
 'spell lucky luck appeal grace necklace personality delight talent love',
 'buy wear style dance clothes price free cost liberty shop',
 'ring round wheel cycle runway fire rescue help airplane save'
];
const approaches=[['bed','sleep'],['doubt'],['love'],['buy','free'],['round','fire']];
for(const [i,example]of examples.entries()){
 const {settings,source}=example,b=settings.semantic_bunker;assert.equal(b.threshold,.4);assert.equal(b.exact_only,false);assert.ok(e.index.has(b.word));assert.equal(settings.bunker_experiment.source_id,source.id);
 const def=daily.addCustom(settings);ids.add(def.id);assert.notEqual(def.id,source.id);assert.equal(daily.addCustom(settings).id,def.id);
 const fresh=trap=>new Game(e,settings.start,settings.target,settings.threshold,{...settings,semantic_bunker:trap,challenge:{id:def.id,version:'stroke-play-v1',par:5,attempt:1,unlimited:true},dogleg_finish_rule:{version:'strong-arrival-v1',after:0}});
 let retained=0,caught=0;
 for(const word of samples[i].split(' ')){
  const normal=fresh(null),test=fresh(b),base=normal.submit(word),actual=test.submit(word);
  if(actual.bunker){caught++;assert.equal(actual.success,false);assert.equal(test.stage,0);assert.ok(actual.bunker.exact||actual.bunker.similarity>=.4);}
  else{assert.deepEqual(actual,base,'untrapped contact/progress stays identical');if(actual.success)retained++;}
 }
 assert.ok(retained>=4,`${settings.start}: preserve several familiar opening shots, got ${retained}`);assert.ok(caught>=1,`${settings.start}: at least one sample exercises the trap`);
 const controlApproach=fresh(null),trappedApproach=fresh(b);let intercepted=false;
 for(const word of approaches[i]){assert.equal(controlApproach.submit(word).success,true,'chosen bunker removes a naturally playable approach');if(!intercepted){const shot=trappedApproach.submit(word);intercepted=!!shot.bunker;}}
 assert.equal(intercepted,true,'trap actually intercepts its selected approach');
 const test=fresh(b);test.submit(b.word);assert.equal(test.history.at(-1).bunker.word,b.word);assert.equal(test.challenge_failed,true);assert.deepEqual(restoreGame(e,test.state()).state(),test.state());
 for(const narrow of [false,true]){
  const state=fresh(b).state(),style=courseStyle(source.id),d=waypointLayout(mapLayout(narrow),state,pinPlacement(source.id),style),label=semanticBunkerLabel(d,b.word.toUpperCase()),canonicalY=d.reflectY?430-label.y:label.y;
  for(const x of [label.x-label.width/2,label.x,label.x+label.width/2])assert.ok(canonicalY-label.height/2>waypointBankY(d,style,x),'preset label stays in rough');
  assert.doesNotMatch(semanticBunkerArt(state,d),/ellipse/);
 }
 console.log(`${i+1}: ${settings.start} / ${settings.waypoint.word} / ${settings.target}; ${b.word} bunker at .40; ${retained} sampled openings retained, ${caught} caught.`);
}
assert.equal(ids.size,5);assert.equal(JSON.stringify(dailyManifest),before);assert.ok(publicManifest.holes.every(h=>!h.settings.semantic_bunker));assert.equal(daily.stats().completed,0);
console.log('Five bunker examples passed: real vocabulary/engine, .40 active similarity, multiple familiar openings, exact catches, deterministic replay, isolated saved IDs, labels in rough and untouched original/public definitions.');
