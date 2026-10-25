import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Embeddings,decodeHalf,Game,waypointLegAccess} from '../static/engine.mjs';
import {rollingManifest} from '../static/rolling-manifest.mjs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url)),config=JSON.parse(read('static/model/config.json')),raw=read('static/model/'+config.vector_fallback),e=new Embeddings(JSON.parse(read('static/model/'+config.words_file)),decodeHalf(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),config.dimensions,new Uint8Array(read('static/model/'+config.hub_file)));
const packs=JSON.parse(read('static/model/'+config.progressive.manifest_file)),seed=new Set(packs.seed.rows.map(i=>e.words[i]));
const holes=JSON.parse(read('data/25-october-daily-holes.json')),routes=JSON.parse(read('data/25-october-daily-route-checks.json'));
assert.equal(holes.length,18);assert.equal(new Set(holes.map(h=>[h.start,h.waypoint?.word,h.target].join('|'))).size,18);
for(const par of [3,4,5])assert.equal(holes.filter(h=>h.par===par).length,6);
for(const [i,h] of holes.entries()){
 for(const w of [h.start,h.waypoint?.word,h.target].filter(Boolean))assert.ok(seed.has(w),'Daily endpoint ready in seed: '+w);
 const live=config.puzzles.find(p=>p.course_set===h.course_set&&p.course_number===h.course_number);assert.deepEqual(live,h);
 assert.deepEqual(rollingManifest.holes.find(d=>d.id===rollingManifest.dailyRelease.holeIds[i]).settings,h);
 if(h.waypoint)assert.equal(waypointLegAccess(e,h).allowed,true);
 else assert.equal(new Game(e,h.start,h.target,h.threshold,{...h,golden_paths:[]}).submit(h.target).success,false);
 const g=new Game(e,h.start,h.target,h.threshold,{...h,challenge:{version:'stroke-play-v1',par:h.par,attempt:1,id:'daily-curated'}});
 for(const word of routes[i].route){if(g.won)break;assert.equal(g.submit(word).success,true,`${h.start}: ${word}`);}
 assert.equal(g.won,true);assert.equal(g.state().attempts,routes[i].strokes);assert.ok(g.state().attempts<=h.par);
 if(h.waypoint)assert.ok(g.history.some(x=>x.waypoint_reached));
}
console.log('18 daily discoveries passed: six of each par, current-model routes, direct-leg rejection and source/bank/schedule agreement.');
