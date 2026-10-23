import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Embeddings,decodeHalf,Game,waypointLegAccess,createBrowserClient} from '../static/engine.mjs';
import {assessWaypointHole} from '../static/waypoint-assessment.mjs';
const root=new URL('../static/model/',import.meta.url),read=f=>readFileSync(new URL(f,root)),config=JSON.parse(read('config.json')),raw=read(config.vector_fallback),e=new Embeddings(JSON.parse(read(config.words_file)),decodeHalf(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),300,new Uint8Array(read(config.hub_file)));
const settings=(start,word,target)=>({start,target,threshold:.27,mode:'distance',launch_min:.095,launch_max:.215,finish_mode:'range',waypoint:{word,threshold:.27}});
for(const [s,pair] of [[settings('cat','dog','submarine'),['cat','dog']],[settings('dolphin','cat','dog'),['cat','dog']]]){
 const check=waypointLegAccess(e,s);assert.equal(check.allowed,false);assert.ok(check.legs.find(l=>l.start===pair[0]&&l.target===pair[1]).direct);assert.equal(assessWaypointHole(e,s).suggested_par,null);
}
assert.equal(waypointLegAccess(e,settings('cat','dog','puppy')).legs.filter(l=>l.direct).length,2,'both invalid legs are reported');
assert.equal(waypointLegAccess(e,settings('dolphin','radio','submarine')).allowed,true,'SONAR is not required; the actual endpoint-word shots are checked');
assert.throws(()=>waypointLegAccess(e,settings('cat','cat','dog')),/differ|different/);
const started=performance.now();
for(const [s,par] of [[settings('makeup','gossip','sport'),4],[settings('shuttle','butler','rut'),5]]){
 const before=JSON.stringify(s),result=assessWaypointHole(e,s);assert.equal(JSON.stringify(s),before);assert.equal(result.suggested_par,par);assert.ok(result.estimate);assert.ok(result.evaluated<500,'bounded search, not vocabulary-wide branching');assert.ok(result.routes.length);
 for(const route of result.routes){const game=new Game(e,s.start,s.target,s.threshold,s);for(const word of route.words){assert.equal(game.submit(word).success,true);if(game.won)break;}assert.equal(game.won,true);assert.equal(game.state().attempts,route.strokes,'count includes automatic finish');}
}
const originalFetch=globalThis.fetch;globalThis.fetch=async url=>new Response(readFileSync(new URL(url)));
try{
 const client=await createBrowserClient({progressive:false});const s=settings('dolphin','radio','submarine');const before=(await client.request('new',s)).state;
 assert.equal((await client.request('waypoint-access',s)).allowed,true);
 await assert.rejects(client.request('new',{...settings('cat','dog','submarine'),validate_waypoint:true}),/DOG can be played directly from CAT/);
 const shot=await client.request('submit',{word:'sonar'});assert.equal(shot.event.origin,before.current,'invalid custom creation does not replace the active game');
 const report=await client.request('assess-waypoint',settings('shuttle','butler','rut'));assert.equal(report.suggested_par,5);
}finally{globalThis.fetch=originalFetch;}
console.log(`Waypoint assessment passed: direct-leg rejection, atomic creation, bounded exact routes, par 4/5, and worker fallback (${Math.round(performance.now()-started)} ms).`);

const legacyDirect=assessWaypointHole(e,settings('cat','dog','submarine'),{allowDirectLegs:true});assert.equal(legacyDirect.allowed,false);assert.ok([4,5].includes(legacyDirect.suggested_par),'existing direct-leg layouts may be classified without weakening creation validation');
for(const hole of config.puzzles.filter(h=>h.waypoint)){assert.equal(hole.par,hole.par_estimate.suggested_par);assert.equal(hole.par_estimate.version,'waypoint-par-v1');}
for(const name of ['waypoint-holes.json','player-waypoint-holes.json','new-waypoint-holes.json'])for(const hole of JSON.parse(readFileSync(new URL('../data/'+name,import.meta.url)))){
 const live=config.puzzles.find(h=>h.start===hole.start&&h.target===hole.target&&h.waypoint?.word===hole.waypoint.word);assert.equal(live.par,hole.par,'source and published bank stay aligned');assert.deepEqual(live.par_estimate,hole.par_estimate);
}

assert.equal(config.retired_waypoint_holes.length,4);
for(const retired of config.retired_waypoint_holes){
 assert.equal(config.puzzles.some(h=>h.start===retired.start&&h.waypoint?.word===retired.waypoint.word&&h.target===retired.target),false);
 assert.equal(config.golden_holes.some(h=>h.start===retired.start&&h.waypoint===retired.waypoint.word&&h.target===retired.target),false);
}
for(const hole of config.puzzles.filter(h=>h.waypoint))assert.equal(waypointLegAccess(e,hole).allowed,true,'every remaining banked waypoint layout passes direct-leg validation');

const newHoles=config.puzzles.filter(h=>h.course_set==='waypoint-discovery-v2'),sampleRoutes=JSON.parse(readFileSync(new URL('./waypoint-discovery-2-routes.json',import.meta.url)));
assert.equal(newHoles.length,20);assert.equal(new Set(newHoles.map(h=>[h.start,h.waypoint.word,h.target].join('|'))).size,20);
for(const h of newHoles){
 const sample=sampleRoutes.find(r=>r.start===h.start&&r.waypoint===h.waypoint.word&&r.target===h.target);assert.ok(sample);
 const game=new Game(e,h.start,h.target,h.threshold,{...h,challenge:{version:'stroke-play-v1',par:h.par,attempt:1,id:'new-hole-test'}});
 for(const word of sample.route){if(game.won)break;assert.equal(game.submit(word).success,true);}
 assert.equal(game.won,true,'each new hole has a verified route within the stroke limit');assert.ok(game.history.some(h=>h.waypoint_reached));
}
