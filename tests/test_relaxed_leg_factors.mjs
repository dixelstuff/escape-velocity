import assert from 'node:assert/strict';
import fs from 'node:fs';
import {bandFreeScore,legFactor,BAND_FREE_VERSION} from '../static/vector-cleverness/band-free.mjs';
import {FlightLog} from '../static/flight-log.mjs';
import {PLAYTEST_VERSION,playtestKey} from '../static/cleverness-playtest-data.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`),oldFactor=n=>n<=2?1:n===3?.88:n===4?.66:n===5?.45:.5*.65**(n-4);
assert.equal(BAND_FREE_VERSION,'band-free-harmonic-v4-relaxed-legs');
assert.deepEqual([1,2,3,4,5,6].map(legFactor),[1,1,.92,.80,.60,.39]);
for(let n=6;n<=30;n++)near(legFactor(n)/legFactor(n-1),.65);
for(const I of [0,.2,.5,.8,1])for(const S of [0,.4,.8,1])for(const E of [0,.5,1])for(let a=1;a<=9;a++)for(let b=1;b<=9;b++){
 const x=bandFreeScore({semantic_ingenuity:I,strategic_effectiveness:S,route_elegance:E},[a,b]),oldL=oldFactor(a)*oldFactor(b),oldRaw=Math.min((x.before_leg_penalty+([a,b].includes(1)?2*x.quality:0))*oldL,100*oldL);
 near(x.unrounded_score,oldRaw*x.applied_factor/oldL);assert.ok(x.unrounded_score>=oldRaw-1e-9);near(x.one_stroke_bonus.raw_amount,[a,b].includes(1)?2*x.quality*x.applied_factor:0);
 assert.ok(bandFreeScore({semantic_ingenuity:I,strategic_effectiveness:S,route_elegance:E},[a+1,b]).unrounded_score<=x.unrounded_score+1e-9);
 if(a<=2&&b<=2)near(x.unrounded_score,oldRaw);
}
const comparison=JSON.parse(fs.readFileSync('reports/relaxed-leg-factors/comparison.json'));
assert.equal(comparison.rows.length,38);
for(const row of comparison.rows){const x=bandFreeScore(row.components,row.legs);near(x.unrounded_score,row.new.unrounded);assert.equal(x.score,row.new.score);near(x.quality,row.quality);near(x.unrounded_score,row.old.unrounded*x.applied_factor/row.old.factor);}
const long=comparison.rows.find(r=>r.id==='HAMMOCK-long'),short=comparison.rows.find(r=>r.id==='HAMMOCK-short');
assert.equal(long.new.score,70);assert.equal(short.new.score,81);assert.ok(long.components.strategic_effectiveness<short.components.strategic_effectiveness);
const trapeze=Object.values(long.strategic_diagnostics).flatMap(s=>s.word_evidence).find(w=>w.word==='trapeze');assert.equal(trapeze.relevance.verified_removable,true);assert.equal(trapeze.relevance.eligible,false);
// Current-v3 cached reports are recalibrated from unrounded evidence, not rounded scores.
const f=JSON.parse(fs.readFileSync('tests/opportunity08-bonus2-fixtures.json')).fixtures.find(f=>f.id==='PLAY-B'),memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},log=new FlightLog(storage,()=> '2026-10-29T00:00:00Z',()=> 'old-v3');
log.begin(f.state,'Current');log.active.cleverness_playtest={version:'live-cleverness-vector-opportunity08-bonus2-v1',key:'old',score:0,baseline_score:0,route:f.state.route,components:f.expected.components,opportunity:{raw_ingenuity:f.rawIngenuity,pivot_positions:f.positions},band_free:{version:'band-free-harmonic-v3-opportunity08-bonus2',score:f.expected.score,unrounded_score:f.expected.unrounded},leg_efficiency:{legs:f.previousBandFree.legs},diagnostics:{aggregation:{},uncertainty:[]}};
const state=JSON.stringify(log.active.state);log.save();assert.equal(await log.refreshClevernessScores(),1);assert.equal(await log.refreshClevernessScores(),0);assert.equal(JSON.stringify(log.active.state),state);assert.equal(log.active.cleverness_playtest.band_free.score,75);assert.equal(log.active.cleverness_playtest.version,PLAYTEST_VERSION);assert.equal(log.active.cleverness_playtest.key,playtestKey(f.state,null));assert.deepEqual(log.active.cleverness_playtest.components,f.expected.components);
console.log('Relaxed legs passed: exact schedule/tail, unchanged 1–2-stroke legs, monotonicity across 4,860 fixed-quality splits, bonus/ceiling/product preserved, 38 comparisons, HAMMOCK skippability, and idempotent current-v3 saved-score migration.');
