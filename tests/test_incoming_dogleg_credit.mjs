import fs from 'node:fs';
import assert from 'node:assert/strict';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
import {VectorClevernessAnalyser} from '../static/vector-cleverness/index.mjs';
import {applyLiveCleverness} from '../static/cleverness-live-score.mjs';
import {compactPlaytestReport,playtestText} from '../static/cleverness-playtest-data.mjs';
import {BAND_FREE_VERSION,CONTINUATION_BAND_FREE_VERSION} from '../static/cleverness-score-config.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const {e,store,config}=loadResearchModel(),analyser=new VectorClevernessAnalyser(e,{store,modelSha:config.vector_sha256});
const frozen=JSON.parse(fs.readFileSync('reports/dogleg-continuation/comparison.json'));
const audit=new Map(JSON.parse(fs.readFileSync('reports/incoming-dogleg-credit/comparison.json')).rows.map(r=>[r.id,r]));
const reports=new Map();let changed=0,oneShot=0;
for(const f of frozen.rows){
 const snapshot=JSON.stringify(f.state),r=await analyser.analyse(f.state),expected=audit.get(f.id),legs=r.band_free.legs;
 assert.equal(JSON.stringify(f.state),snapshot);
 assert.equal(r.primary_scorer,BAND_FREE_VERSION,f.id+' current evidence identity');
 const oldReport=structuredClone(r);delete oldReport.dogleg_access.evidence_version;
 const old=applyLiveCleverness(oldReport);
 assert.equal(old.primary_scorer,CONTINUATION_BAND_FREE_VERSION,'Old evidence must retain v7 until reanalysis');
 near(old.band_free.unrounded_score,expected.oldUnrounded);
 const exempt=legs[0].strokes===1;
 near(r.band_free.unrounded_score,exempt?expected.oldUnrounded:expected.candidateUnrounded);
 if(exempt){oneShot++;assert.equal(r.incoming_dogleg_treatment.applied,false);assert.deepEqual(r.components,old.components);assert.deepEqual(r.band_free.one_stroke_bonus,old.band_free.one_stroke_bonus);}
 if(r.primary_score!==old.primary_score)changed++;
 assert.equal(r.components.semantic_ingenuity,old.components.semantic_ingenuity);
 assert.equal(r.components.route_elegance,old.components.route_elegance);
 assert.deepEqual(r.opportunity,old.opportunity);assert.deepEqual(legs,old.band_free.legs);
 assert.ok(r.band_free.unrounded_score>=old.band_free.unrounded_score-1e-9);
 assert.ok(r.band_free.unrounded_score<=r.band_free.maximum_for_legs+1e-9);
 near(applyLiveCleverness(r).band_free.unrounded_score,r.band_free.unrounded_score);
 const compact=compactPlaytestReport(r),again=applyLiveCleverness(compact);
 near(again.band_free.unrounded_score,r.band_free.unrounded_score);
 assert.deepEqual(again.components,r.components);assert.equal(again.primary_scorer,BAND_FREE_VERSION);
 if(f.source==='padding'){near(r.band_free.unrounded_score,old.band_free.unrounded_score);assert.equal(r.incoming_dogleg_treatment.applied,false);}
 if(r.incoming_dogleg_treatment.applied){
  const t=r.incoming_dogleg_treatment,b=r.band_free.strategic_bonus;
  assert.ok(legs[0].strokes>=2);assert.equal(r.dogleg_access.incoming.works,false);
  assert.equal(r.dogleg_access.removable,false);
  near(t.after.landing,t.before.landing+t.gain*Math.max(0,r.continuation_treatment.context.relevance-t.before.landing));
  near(b.incoming_amount,Math.max(0,t.incoming_bonus_before-t.component_raw_increase));
  near(b.raw_amount-b.incoming_amount,old.band_free.strategic_bonus.raw_amount-old.band_free.strategic_bonus.incoming_amount);
 }
 reports.set(f.id,r);
}
assert.equal(changed,18);assert.ok(oneShot>0);
for(const[id,score]of [['P-A',85],['PLAY-B',83],['E',79],['play-e36eac4f-77d5-4a2b-9eda-e2bc51c4d666',88]])assert.equal(reports.get(id).primary_score,score,id);
const target=reports.get('P-A');assert.match(playtestText(target),/Incoming strategic correction:/);
for(const mutate of [r=>r.dogleg_access.route=['wrong'],r=>r.dogleg_access.position++,r=>r.dogleg_access.available=false,r=>delete r.dogleg_access.evidence_version]){
 const r=structuredClone(target);mutate(r);const out=applyLiveCleverness(r);
 assert.equal(out.incoming_dogleg_treatment.applied,false);assert.equal(out.primary_scorer,CONTINUATION_BAND_FREE_VERSION);
}
for(const mutate of [r=>r.dogleg_access.eligible=false,r=>r.dogleg_access.removable=true,r=>r.dogleg_access.incoming_gain=0,r=>r.dogleg_access.incoming.works=true]){
 const r=structuredClone(target);mutate(r);assert.equal(applyLiveCleverness(r).incoming_dogleg_treatment.applied,false);
}
const partial=structuredClone(target);partial.dogleg_access.incoming_gain=.1;
assert.ok(applyLiveCleverness(partial).components.strategic_effectiveness<target.components.strategic_effectiveness);
const literal=await analyser.analyse(JSON.parse(fs.readFileSync('tests/dogleg-strategy-fixtures.json')).stamp);
assert.equal(literal.primary_scorer,BAND_FREE_VERSION);assert.equal(literal.incoming_dogleg_treatment.applied,false);
console.log(`Incoming dogleg credit passed: ${frozen.rows.length} frozen routes, ${changed} changed scores, ${oneShot} one-shot exemptions, 32 unchanged insertion controls, graded access, bonus overlap, ceilings, exact examples, full/compact idempotence and v7 evidence fallback.`);
