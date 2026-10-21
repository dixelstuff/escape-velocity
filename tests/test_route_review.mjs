import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Embeddings,Game,decodeHalf} from '../static/engine.mjs';
import {reviewRoute,markedRoute,shortcutNote} from '../static/route-review.mjs';
function graph(progress={tee:0,a:.05,b:.1,c:.2,flag:1},contacts={}){
 const words=Object.keys(progress),pairs={'a,tee':.6,'a,b':.6,'b,c':.6,'b,tee':.6,'a,c':.6,...contacts};
 return {words,index:new Map(words.map((w,i)=>[w,i])),hub:w=>w==='b'?progress.hub??0:0,
 cosine(a,b){return a===b?1:a==='flag'?progress[b]:b==='flag'?progress[a]:pairs[[a,b].sort().join(',')]??.01;}};
}
const play=(e,words,rules='golf-distance-v3')=>{const g=new Game(e,'tee','flag',.6,{mode:'distance',rules});for(const w of words)assert.equal(g.submit(w).success,true,w);return g;};
let e=graph(),g=play(e,['a','b','c','flag']);
const snapshot=JSON.stringify(g.state()),r=reviewRoute(e,g.state());
assert.deepEqual(r.skips.map(x=>x.index),[1,2]);assert.equal(markedRoute(g.route,r),'tee → a* → b* → c → flag');
assert.match(shortcutNote(r),/separately/);assert.match(shortcutNote(r),/not necessarily all/);
assert.equal(JSON.stringify(g.state()),snapshot);
const both=new Game(e,'tee','flag',.6,{mode:'distance'});assert.equal(both.submit('c').success,false);
// Repeated words are checked by occurrence. Removing the first A destroys a later backtrack.
g=play(e,['a','b','a','c','flag']);const repeated=reviewRoute(e,g.state());
assert.ok(!repeated.skips.some(x=>x.index===1));assert.ok(repeated.skips.some(x=>x.index===3));
assert.ok(markedRoute(g.route,repeated).startsWith('tee → a →'));
// Misses stay in the scorecard; the successful-route review neither changes nor grades them.
g=new Game(e,'tee','flag',.6,{mode:'distance',rules:'golf-distance-v3'});g.submit('flag');for(const w of ['a','b','c','flag'])g.submit(w);
assert.deepEqual(reviewRoute(e,g.state()).skips,r.skips);assert.equal(g.state().attempts,5);
// The last green bridge can be omitted only if the literal hole word is a legal chip-in.
e=graph({tee:0,a:.1,b:.5,c:.7,flag:1});g=play(e,['a','b','c']);
assert.equal(g.automatic_shots.length,1);assert.ok(reviewRoute(e,g.state()).skips.some(x=>x.word==='c'));
e=graph({tee:0,c:.7,flag:1},{'c,tee':.6});g=play(e,['c']);assert.equal(reviewRoute(e,g.state()).skips.length,0);assert.equal(shortcutNote(reviewRoute(e,g.state())), '');
// The same apparent shortcut passes v2 but fails the actual v3 hub requirement.
e=graph({tee:0,a:.05,b:.7,flag:1,hub:1},{'b,tee':.22});
assert.ok(reviewRoute(e,play(e,['a','b'],'golf-distance-v2').state()).skips.some(x=>x.word==='a'));
assert.equal(reviewRoute(e,play(e,['a','b']).state()).skips.length,0);
assert.throws(()=>reviewRoute(e,{...g.state(),won:false}),/completed/);
assert.throws(()=>reviewRoute(e,{...g.state(),rules:'golf-distance-v1'}),/current-course/);
assert.equal(markedRoute(['different'],r),'different','stale analysis must never annotate another route');
// Actual words: every advertised omission must reproduce the entire advertised shorter route.
const base=new URL('../static/model/',import.meta.url),config=JSON.parse(readFileSync(new URL('config.json',base))),words=JSON.parse(readFileSync(new URL(config.words_file,base))),raw=readFileSync(new URL(config.vector_fallback,base));
e=new Embeddings(words,decodeHalf(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),config.dimensions,new Uint8Array(readFileSync(new URL(config.hub_file,base))));
g=new Game(e,'morph','lineage',.28,{mode:'distance'});for(const w of ['evolve','generation','lineage'])g.submit(w);
const real=reviewRoute(e,g.state());
for(const s of real.skips){const trial=new Game(e,'morph','lineage',.28,g.state());for(const word of s.shortened_route.slice(1)){if(!trial.won)assert.equal(trial.submit(word).success,true);}assert.equal(trial.won,true);assert.deepEqual(trial.route,s.shortened_route);}
console.log('Route review passed: independent omissions, whole-route replay, water/revisit history, duplicate occurrences, misses preserved, automatic finishes, hub rules, stale results and real vectors.');
