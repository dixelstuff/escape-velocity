import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {Embeddings,Game,decodeHalf,restoreGame} from '../static/engine.mjs';
import {assessHole} from '../static/assessment.mjs';
import {SkillAnalyser} from '../static/skill.mjs';
const read=p=>readFileSync(new URL('../'+p,import.meta.url));
const c=JSON.parse(read('static/model/config.json')),words=JSON.parse(read('static/model/'+c.words_file));
const data=gunzipSync(read('static/model/'+c.vector_file)),hubs=new Uint8Array(read('static/model/'+c.hub_file));
assert.equal(createHash('sha256').update(hubs).digest('hex'),c.hub_sha256);
const e=new Embeddings(words,decodeHalf(data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)),c.dimensions,hubs);
assert.throws(()=>new Embeddings(words,e.vectors,c.dimensions,hubs.slice(1)),/breadth/);
const settings={mode:'distance',launch_min:.1,launch_max:.21};
for(const word of ['essentially','thus','instead','part','addition']){
 const old=new Game(e,'loop','independent',.28,{...settings,rules:'golf-distance-v2'});
 const modern=new Game(e,'loop','independent',.28,settings);
 assert.equal(old.submit(word).won,true,word);
 assert.equal(modern.submit(word).outcome,'miss',word);
 assert.deepEqual(restoreGame(e,old.state()).state(),old.state());
 assert.deepEqual(restoreGame(e,modern.state()).state(),modern.state());
}
for(const [start,word,target] of [['morph','evolved','lineage'],['tee','shirt','neat'],['yard','tree','maple'],['mate','bull','elephant']]){
 assert.equal(new Game(e,start,target,.28,settings).submit(word).won,true,word);
}
// New bridge inspection must use exactly the same requirement as real submissions.
const report=assessHole(e,{start:'loop',target:'independent',threshold:.28,...settings});
assert.ok(!report.opening_bridges.some(b=>['essentially','thus','instead','part','addition'].includes(b.word)));
const won=new Game(e,'morph','lineage',.28,settings);won.submit('evolved');
const skill=new SkillAnalyser(e).analyse(won.state());
assert.ok(skill.score>=980&&skill.score<1000);assert.equal(skill.shots[0].required,won.history[0].required);
// Hub fees scale with forward progress, apply at either end, and never penalize lateral/backward movement.
const values={tee:0,flag:1,lie:.153,side:.07};
let h=1;
const fake={words:Object.keys(values),index:new Map(Object.keys(values).map((w,i)=>[w,i])),hub:w=>w==='lie'?h:0,
 cosine(a,b){return a===b?1:a==='flag'?values[b]:b==='flag'?values[a]:.6;}};
const fresh=()=>new Game(fake,'tee','flag',.28,{...settings,allow_backtracking:true});
let g=fresh();
assert.equal(g.requirement('lie','side').hub_surcharge,0);
assert.equal(g.requirement('lie','side',.15,.15).hub_surcharge,0);
assert.ok(Math.abs(g.requirement('tee','lie',0,.28).hub_surcharge-.035)<1e-12);
assert.ok(Math.abs(g.requirement('lie','flag',0,.14).hub_surcharge-.035/4)<1e-12);
assert.ok(Math.abs(g.requirement('tee','lie',0,.07).hub_surcharge-.035/16)<1e-12);
// At the same lie, neither extra moves nor previous misses change chip-in eligibility.
for(const route of [['lie'],['side','lie'],['side','tee','lie'],['flag','flag','lie']]){
 g=fresh();for(const word of route)g.submit(word);
 assert.equal(g.current,'lie');assert.equal(g.submit('flag').outcome,'miss');
}
h=0;g=fresh();g.submit('lie');assert.equal(g.submit('flag').won,true);
g=new Game(fake,'tee','flag',.28,{...settings,rules:'golf-distance-v2'});h=1;g.submit('lie');assert.equal(g.submit('flag').won,true);
console.log('Hub rules passed: quantized model integrity, historical replay, weak hub bridges filtered, four opening greens retained, bridge/skill parity, modest distance scaling, and chip-in independence from move/miss counts.');
