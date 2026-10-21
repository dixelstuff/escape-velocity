import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Game,Embeddings,decodeHalf} from '../static/engine.mjs';
import {chipRange} from '../static/chip-range.mjs';
import {mapLayout,projectX,chipArcBands} from '../static/map.mjs';
function fixture(baseline=.08,hub=0,targetHub=0,rules='golf-distance-v3',mode='distance'){
 const positions={tee:baseline,lie:.2,flag:1};
 const e={index:new Map(['tee','lie','flag'].map(w=>[w,0])),hub:w=>w==='flag'?targetHub:w==='lie'?hub:0,cosine(a,b){return a===b?1:a==='flag'?positions[b]:b==='flag'?positions[a]:.6;}};
 return {positions,g:new Game(e,'tee','flag',.27,{mode,launch_min:.1,launch_max:.22,rules})};
}
// The faint band spans real deterministic boundaries, rather than inventing success odds.
for(const baseline of [-.1,.08,.2])for(const targetHub of [0,.4,1]){
 const {g}=fixture(baseline,0,targetHub),before=JSON.stringify(g.state()),r=chipRange(g);
 assert.ok(r.start<=r.first&&r.first<=r.last&&r.last<=r.end);
 assert.equal(r.start,r.first);assert.equal(r.end,r.last,'there is no cosmetic padding');
 assert.ok(r.start>=baseline&&r.end<=g.threshold);
 for(const narrow of [false,true]){
  const layout=mapLayout(narrow),outer=projectX(r.first,baseline,g.threshold,layout),inner=projectX(r.last,baseline,g.threshold,layout);
  const bands=chipArcBands(outer,inner,layout);
  for(const band of bands){
   const values=band.path.match(/-?\d+\.\d+/g).map(Number);
   for(let i=0;i<values.length;i+=2){
    const radius=Math.hypot(layout.right-values[i],values[i+1]-215);
    assert.ok(radius>=layout.right-inner-.002&&radius<=layout.right-outer+.002,'paint stays within the actual hub envelope');
   }
  }
  if(targetHub===1)assert.equal(bands[0].stroke,true,'maximum-hub target leaves no remaining hub variability');
 }

 for(const hub of [0,.25,.5,.75,1]){
  for(const [progress,success] of [[r.first-1e-5,false],[r.last+1e-5,true]]){
   const {positions,g:trial}=fixture(baseline,hub,targetHub);positions.lie=progress;
   trial.submit('lie');assert.equal(trial.current,'lie');
   assert.equal(trial.submit('flag').success,success);
  }
 }
 g.submit('lie');assert.deepEqual(chipRange(g),r,'guide stays stable as lies and shot count change');
 assert.notEqual(JSON.stringify(g.state()),before);
 const snapshot=JSON.stringify(g.state());chipRange(g);assert.equal(JSON.stringify(g.state()),snapshot);
}
const fixed=fixture(.08,0,0,'golf-fixed-v3','fixed');assert.ok(Math.abs(chipRange(fixed.g).first-.27)<1e-6);
const old=fixture(.08,0,0,'golf-distance-v2');assert.equal(chipRange(old.g).first,chipRange(old.g).last);
assert.equal(chipArcBands(200,200,mapLayout()).length,1);
assert.equal(chipArcBands(200,200,mapLayout())[0].stroke,true);
assert.equal(chipRange({...fixture().g,rules:'distance-v1'}),null);
assert.equal(chipRange({...fixture().g,baseline:.28}),null);
// Actual POPCORN > HUSK is within the envelope and still chips in via the real engine.
const root=new URL('../static/model/',import.meta.url),config=JSON.parse(readFileSync(new URL('config.json',root))),words=JSON.parse(readFileSync(new URL(config.words_file,root))),raw=readFileSync(new URL(config.vector_fallback,root));
const e=new Embeddings(words,decodeHalf(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),config.dimensions,new Uint8Array(readFileSync(new URL(config.hub_file,root))));
const g=new Game(e,'popcorn','petal',.27,{mode:'distance',launch_min:.1,launch_max:.22});
const r=chipRange(g);g.submit('husk');assert.ok(g.state().progress>r.first);assert.equal(g.submit('petal').won,true);
console.log('Chip range passed: actual shot boundaries across levels/breadths, stable guide, fixed/historical rules, immutable scoring and real POPCORN chip-in.');
