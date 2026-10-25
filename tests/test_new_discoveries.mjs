import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {Embeddings,decodeHalf,Game,waypointLegAccess} from '../static/engine.mjs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url));
const config=JSON.parse(read('static/model/config.json')),holes=JSON.parse(read('data/new-mixed-holes.json')),routes=JSON.parse(read('data/new-mixed-route-checks.json'));
const bytes=read('static/model/'+config.vector_fallback),words=JSON.parse(read('static/model/'+config.words_file));
const e=new Embeddings(words,decodeHalf(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),config.dimensions,new Uint8Array(read('static/model/'+config.hub_file)));
const manifest=JSON.parse(read('static/model/'+config.progressive.manifest_file)),seed=new Set(manifest.seed.rows.map(i=>words[i]));
assert.equal(holes.length,20);assert.deepEqual([3,4,5].map(par=>holes.filter(h=>h.par===par).length),[6,6,8]);
const endpoints=holes.flatMap(h=>[h.start,h.waypoint?.word,h.target].filter(Boolean));assert.equal(new Set(endpoints).size,endpoints.length);
const oldEndpoints=new Set(config.puzzles.filter(h=>h.course_set!=='new-discoveries-v1'&&h.course_set!=='daily-discoveries-2026-10-25').flatMap(h=>[h.start,h.waypoint?.word,h.target].filter(Boolean)));
assert.equal(endpoints.filter(w=>oldEndpoints.has(w)).length,3);
for(const h of holes){
 assert.deepEqual(config.puzzles.find(p=>p.course_set===h.course_set&&p.course_number===h.course_number),h);
 for(const word of[h.start,h.target,h.waypoint?.word].filter(Boolean))assert.ok(seed.has(word),word+' must load in the initial seed');
 if(h.waypoint){assert.equal(waypointLegAccess(e,h).allowed,true);assert.equal(h.par,h.par_estimate.suggested_par);}
 else assert.equal(new Game(e,h.start,h.target,h.threshold,h).submit(h.target).won,false);
 const route=routes.find(r=>r.start===h.start),game=new Game(e,h.start,h.target,h.threshold,h);
 for(const word of route.route)assert.equal(game.submit(word).success,true,h.start+' → '+word);
 assert.equal(game.won,true,h.start);assert.equal(game.state().attempts,route.strokes);assert.ok(route.strokes<=h.par);
}
// Empty play submissions must return before touching focus, logs, state or the API.
const app=read('static/app.js').toString(),source=app.slice(app.indexOf('async function submit(word){'),app.indexOf('\nfunction scheduleRetry(){'));
const submit=runInNewContext('('+source+')');
for(const word of['','   ','\n',null,undefined])assert.equal(await submit(word),false);
const html=read('static/index.html').toString();assert.match(html,/<form id="launch-form" novalidate>/);assert.doesNotMatch(html.match(/<input id="word"[^>]*>/)[0],/\brequired\b/);
console.log('20 new discoveries passed: unique endpoints, legal legs, verified human-selected routes, seed loading, and no-op empty input.');
