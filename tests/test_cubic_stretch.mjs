import assert from 'node:assert/strict';import fs from 'node:fs';
import {stretchScore} from '../static/score-stretch.mjs';
import {bandFreeScore} from '../static/vector-cleverness/band-free.mjs';
import {applyLiveCleverness} from '../static/cleverness-live-score.mjs';
import {BAND_FREE_VERSION} from '../static/cleverness-score-config.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`);
for(const s of [0,70,100])near(stretchScore(s),s);
assert.ok(Math.abs((stretchScore(70.00001)-stretchScore(69.99999))/.00002-2)<1e-6);
let prev=-1;for(let n=0;n<=10000;n++){const v=stretchScore(n/100);assert.ok(v>prev&&v>=0&&v<=100);prev=v;}
const rows=JSON.parse(fs.readFileSync('reports/relaxed-leg-factors/comparison.json')).rows;
for(const r of rows){const raw=bandFreeScore(r.components,r.legs);near(raw.unrounded_score,r.new.unrounded);near(stretchScore(raw.unrounded_score),stretchScore(r.new.unrounded));}
const report={components:{semantic_ingenuity:.4,strategic_effectiveness:.7,route_elegance:.6},opportunity:{raw_ingenuity:.5,pivot_positions:4},leg_efficiency:{legs:[{strokes:2},{strokes:3}]}};
const out=applyLiveCleverness(report),raw=bandFreeScore(out.components,[2,3]);
assert.equal(out.primary_scorer,BAND_FREE_VERSION);near(out.band_free.raw_unrounded_score,raw.unrounded_score);near(out.band_free.unrounded_score,stretchScore(raw.unrounded_score));near(out.band_free.maximum_for_legs,stretchScore(raw.maximum_for_legs));assert.deepEqual(out.band_free.legs,raw.legs);assert.deepEqual(out.band_free.one_stroke_bonus,raw.one_stroke_bonus);assert.equal(out.band_free.score,Math.round(stretchScore(raw.unrounded_score)));assert.deepEqual(report.opportunity,{raw_ingenuity:.5,pivot_positions:4});
assert.equal(applyLiveCleverness(out).band_free.unrounded_score,out.band_free.unrounded_score,'reapplying from upstream evidence cannot stretch twice');
console.table([40,50,60,70,80,90,95].map(raw=>({raw,stretched:+stretchScore(raw).toFixed(3)})));
console.log('Cubic stretch passed: fixed endpoints/pivot, central slope 2, strict ranking, transformed ceiling, unchanged raw factors/bonus, 38 v4 controls, final-only rounding and idempotence.');
