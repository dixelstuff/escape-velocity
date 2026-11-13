/** Offline audit of incoming dogleg access. Does not change the live scorer. */
import fs from 'node:fs';
import assert from 'node:assert/strict';
import {VectorClevernessAnalyser} from '../static/vector-cleverness/index.mjs';
import {applyLiveCleverness} from '../static/cleverness-live-score.mjs';
import {bandFreeScore} from '../static/vector-cleverness/band-free.mjs';
import {stretchScore} from '../static/score-stretch.mjs';
import {loadResearchModel} from './cleverness-research-utils.mjs';

const {e,store,config}=loadResearchModel();
const analyser=new VectorClevernessAnalyser(e,{store,modelSha:config.vector_sha256});
// Includes the existing strict insertion controls; no new route search.
const frozen=JSON.parse(fs.readFileSync('reports/dogleg-continuation/comparison.json'));
const rows=[];
for(const source of frozen.rows){
 const before=JSON.stringify(source.state),fresh=await analyser.analyse(source.state),legacy=structuredClone(fresh);
 // Preserve the original broad offline audit against its actual v7 baseline.
 delete legacy.dogleg_access.evidence_version;const r=applyLiveCleverness(legacy);
 assert.equal(JSON.stringify(source.state),before);
 const access=r.dogleg_access,land=r.diagnostics.stages.landing,w=land.word_evidence[0];
 const H=r.continuation_treatment.after?.landing??land.effectiveness,R=w.relevance.value;
 const a=access.available&&access.eligible&&!w.evidence.removable?access.incoming_gain:0;
 const newH=H+a*Math.max(0,R-H);
 const components={...r.components,strategic_effectiveness:Math.min(1,r.components.strategic_effectiveness+.4*(newH-H))};
 const legs=r.band_free.legs.map(l=>l.strokes),base=bandFreeScore(r.components,legs),candidate=bandFreeScore(components,legs);
 const bonus=r.band_free.strategic_bonus,delta=candidate.unrounded_score-base.unrounded_score;
 // Keep the original bounded outgoing amount. The incoming bonus pays only
 // the balance not already supplied by restoring strategic effectiveness.
 const raw=Math.min(candidate.maximum_for_legs,candidate.unrounded_score+Math.max(0,bonus.incoming_amount-delta)+(bonus.raw_amount-bonus.incoming_amount));
 const value=stretchScore(raw),score=Math.round(value);
 assert.ok(value+1e-9>=r.band_free.unrounded_score);
 assert.ok(raw<=candidate.maximum_for_legs+1e-9);
 assert.equal(components.semantic_ingenuity,r.components.semantic_ingenuity);
 assert.equal(components.route_elegance,r.components.route_elegance);
 if(a===0)assert.ok(Math.abs(value-r.band_free.unrounded_score)<1e-8);
 const cf=r.reproducibility.evidence.counterfactual;
 rows.push({id:source.id,source:source.source,insertion:source.insertion??null,tee:r.tee,waypoint:r.waypoint,flag:r.flag,route:r.route,landing:w.word,prior:access.prior,landingWaypointCosine:e.cosine(w.word,r.waypoint),incoming:access.incoming,outgoing:access.outgoing,incomingGain:access.incoming_gain,eligible:access.eligible,removable:access.removable,wordRemovable:w.evidence.removable,sameSuffixFromNamedDogleg:cf.completed,suffixKind:cf.kind,cornerUtility:land.corner.position_utility,geometry:land.corner.raw_geometric_advantage,relevance:R,landingEffectiveness:H,candidateLandingEffectiveness:newH,necessaryNext:w.evidence.necessary_next,objectiveSwitch:w.evidence.objective_switch,chargedLanding:r.diagnostics.coherence.charged_removal_positions.includes(w.position),components:r.components,candidateComponents:components,continuation:r.dogleg_continuation.classification,baseScore:Math.round(stretchScore(base.unrounded_score)),accessBonusDisplayed:r.band_free.unrounded_score-stretchScore(base.unrounded_score),incomingBonusRaw:bonus.incoming_amount,oldScore:r.primary_score,oldUnrounded:r.band_free.unrounded_score,candidateScore:score,candidateUnrounded:value,delta:score-r.primary_score,unroundedDelta:value-r.band_free.unrounded_score});
 console.log(source.id,r.primary_score,'→',score,'incoming',access.incoming_gain,'same suffix',cf.completed);
}
const originals=rows.filter(r=>r.source!=='padding'),incoming=originals.filter(r=>r.eligible&&r.incomingGain>0),same=incoming.filter(r=>r.sameSuffixFromNamedDogleg);
const insertionControls=rows.filter(r=>r.insertion).map(r=>{
 const base=rows.find(b=>b.id===r.insertion.baseId);
 return {id:r.id,baseId:base.id,overtakes:r.candidateUnrounded>base.candidateUnrounded+1e-9,unearned:r.candidateUnrounded>base.candidateUnrounded+1e-9&&r.candidateComponents.semantic_ingenuity<=base.candidateComponents.semantic_ingenuity+1e-9&&r.candidateComponents.route_elegance<=base.candidateComponents.route_elegance+1e-9};
});
const stats=rs=>({count:rs.length,changed:rs.filter(r=>r.delta!==0).length,meanIncrease:rs.length?rs.reduce((s,r)=>s+r.unroundedDelta,0)/rs.length:0,maxDisplayedIncrease:Math.max(0,...rs.map(r=>r.delta))});
const result={modelSha:config.vector_sha256,liveVersion:'band-free-harmonic-v7-dogleg-continuation',scope:'Frozen completed routes and existing strict insertion controls; historical rule settings preserved. No alternative-route search. Candidate only; no live scorer changes.',candidate:'For an eligible, nonremovable incoming-access landing, Hnew=H+a*max(0,R-H); Snew=S+0.4*(Hnew-H). Deduct the resulting base raw-score uplift from the old incoming bonus before adding any residual. Original outgoing amount, I, E, opportunity and leg controls stay fixed.',summary:{all:stats(rows),originals:stats(originals),incoming:stats(incoming),incomingWithSameSuffix:stats(same),chargedIncomingLandings:incoming.filter(r=>r.chargedLanding).map(r=>r.id),insertionControls:insertionControls.length,unearnedInsertions:insertionControls.filter(r=>r.unearned)},rows,insertionControls};
assert.equal(result.summary.unearnedInsertions.length,0);
assert.ok(rows.filter(r=>r.source==='padding').every(r=>Math.abs(r.unroundedDelta)<1e-8));
fs.mkdirSync('reports/incoming-dogleg-credit',{recursive:true});
fs.writeFileSync('reports/incoming-dogleg-credit/comparison.json',JSON.stringify(result,null,2)+'\n');
console.log('SUMMARY',JSON.stringify(result.summary));
