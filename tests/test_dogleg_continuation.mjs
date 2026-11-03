import fs from 'node:fs';import assert from 'node:assert/strict';
import {Game} from '../static/engine.mjs';import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
import {VectorClevernessAnalyser} from '../static/vector-cleverness/index.mjs';import {replayCompleted} from '../static/vector-cleverness/evidence.mjs';
import {doglegContinuationEvidence,applyDoglegContinuation,CONTINUATION_VERSION} from '../static/dogleg-continuation.mjs';
import {applyLiveCleverness} from '../static/cleverness-live-score.mjs';import {compactPlaytestReport,playtestText} from '../static/cleverness-playtest-data.mjs';
import {BAND_FREE_VERSION,PREVIOUS_BAND_FREE_VERSION,ONE_STROKE_BONUS} from '../static/cleverness-score-config.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,`${a} != ${b}`),{e,store,config}=loadResearchModel(),analyser=new VectorClevernessAnalyser(e,{store,modelSha:config.vector_sha256});
const fixtures=JSON.parse(fs.readFileSync('tests/dogleg-continuation-fixtures.json')),reports=[];
for(const f of fixtures){
 const snapshot=JSON.stringify(f.state),r=await analyser.analyse(f.state),proof=r.dogleg_continuation,t=r.continuation_treatment;
 assert.equal(JSON.stringify(f.state),snapshot);assert.equal(r.primary_scorer,BAND_FREE_VERSION);assert.equal(r.band_free.score,f.expected);assert.equal(proof.version,CONTINUATION_VERSION);assert.equal(t.applied,true);
 const {dogleg_continuation,continuation_treatment,...previous}=r,base={...previous,components:{...r.components,strategic_effectiveness:t.context.base_strategy,route_elegance:t.context.base_elegance}},old=applyLiveCleverness(base);assert.equal(old.primary_scorer,PREVIOUS_BAND_FREE_VERSION);assert.equal(old.band_free.score,f.previous);
 assert.equal(r.components.semantic_ingenuity,old.components.semantic_ingenuity);assert.deepEqual(r.opportunity,old.opportunity);assert.deepEqual(r.band_free.legs,old.band_free.legs);assert.equal(r.band_free.one_stroke_bonus.eligible,old.band_free.one_stroke_bonus.eligible);assert.equal(r.band_free.one_stroke_bonus.raw_amount,r.band_free.one_stroke_bonus.eligible?ONE_STROKE_BONUS*r.band_free.quality*r.band_free.applied_factor:0);assert.equal(r.band_free.strategic_bonus.applied_amount,0);
 near(applyLiveCleverness(r).band_free.unrounded_score,r.band_free.unrounded_score);
 const compact=compactPlaytestReport(r);assert.ok(!compact.dogleg_continuation.skipped.events,'Do not inflate stored play data with duplicate counterfactual events');near(applyLiveCleverness(compact).band_free.unrounded_score,r.band_free.unrounded_score);assert.match(playtestText(r),/Dogleg continuation:/);
 if(f.id==='blank'){
  assert.equal(proof.classification,'finish_setup');assert.equal(proof.skipped.completed,false);assert.equal(proof.skipped.landing,'take');assert.ok(proof.skipped.events.at(-1).recorded_automatic);assert.equal(proof.skipped.events.at(-1).success,false);assert.equal(t.context.removable,false);near(r.components.route_elegance,old.components.route_elegance);assert.ok(r.components.strategic_effectiveness>old.components.strategic_effectiveness);
 }else{
  assert.equal(proof.classification,'redundant_landing');assert.equal(proof.skipped.strokes,3);assert.equal(proof.skipped.landing,f.state.route.at(-2));near(t.after.landing,.5);near(r.components.route_elegance,old.components.route_elegance+.1);
 }
 reports.push(r);
}
// Exact ordinary within-leg redundancy and unknown replay states cannot trigger.
const original=reports[0],wrongRoute={...original,dogleg_continuation:{...original.dogleg_continuation,route:['different']},continuation_treatment:undefined};assert.equal(applyDoglegContinuation(wrongRoute,original.components).treatment.applied,false);
const unknown={...original,dogleg_continuation:{...original.dogleg_continuation,available:false},continuation_treatment:undefined};assert.equal(applyDoglegContinuation(unknown,original.components).treatment.applied,false);
const ordinary={...original,dogleg_continuation:{...original.dogleg_continuation,classification:'unchanged'},continuation_treatment:undefined};assert.equal(applyDoglegContinuation(ordinary,original.components).treatment.applied,false);
// Other redundant positions remain charged, including saturated penalties.
for(const count of [1,2,3,4]){
 const r=structuredClone(original),ctx=r.continuation_treatment.context;ctx.charged_positions=Array.from({length:count},(_,i)=>i+2);ctx.elegance_terms={baseline:.7,verified_redundancy:-.2*Math.min(1,count/2)};ctx.base_elegance=Object.values(ctx.elegance_terms).reduce((a,b)=>a+b,0);
 const out=applyDoglegContinuation(r,r.components);near(out.components.route_elegance,.7-.2*Math.min(1,(count-1)/2));
}
// Preserve malformed/legacy mixed-finishing evidence neutrally; no speculative credit.
const s=structuredClone(fixtures[0].state);s.second_leg_finish_after=1;const neutral=doglegContinuationEvidence(e,s,replayCompleted(e,fixtures[0].state).post);assert.equal(neutral.available,false);
const literal=JSON.parse(fs.readFileSync('tests/dogleg-strategy-fixtures.json')).stamp;const same=doglegContinuationEvidence(e,literal,replayCompleted(e,literal).post);assert.equal(same.classification,'unchanged');assert.match(same.reason,/Literal/);
// An actual word reused across legs retains its own history positions; proof code
// never mutates the route, nor interprets a restriction error as a useful setup.
const saved=JSON.stringify(fixtures[2].state),replay=replayCompleted(e,fixtures[2].state);doglegContinuationEvidence(replay.post.e,fixtures[2].state,replay.post);assert.equal(JSON.stringify(fixtures[2].state),saved);
console.log('Dogleg continuation passed: 62/65/78, exact shortcut vs lost finish, full recorded auto stroke, scoped strategy/elegance, saturation, literal/missing evidence, compact idempotence and historical v6 fallback.');

const padding=JSON.parse(fs.readFileSync('tests/dogleg-continuation-padding.json')),bases=new Map();
for(const b of padding.bases)bases.set(b.id,await analyser.analyse(b.state));
for(const p of padding.padded){
 const r=await analyser.analyse(p.state),b=bases.get(p.baseId),at=r.route.indexOf(p.insertedWord);assert.deepEqual([...r.route.slice(0,at),...r.route.slice(at+1)],b.route,'Padding test retains the whole original journey');
 const betterSemantics=r.components.semantic_ingenuity>b.components.semantic_ingenuity+1e-9,betterElegance=r.components.route_elegance>b.components.route_elegance+1e-9;
 if(!betterSemantics&&!betterElegance)assert.ok(r.band_free.unrounded_score<=b.band_free.unrounded_score+1e-9,'A mere inserted detour cannot overtake the cleaner route through the adjustment alone: '+p.id);
}
console.log(`Padding controls passed: ${padding.padded.length} deterministic strict insertions preserve the original route and do not gain an unearned advantage.`);
