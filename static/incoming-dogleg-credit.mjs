/** Incoming access after a setup: restore strategic relevance, without a second bonus. */
import {ACCESS_EVIDENCE_VERSION,applyDoglegStrategyBonus} from './dogleg-strategy-bonus.mjs?v=incoming-dogleg-v1';
import {bandFreeScore} from './vector-cleverness/band-free.mjs?v=incoming-dogleg-v1';
export const INCOMING_DOGLEG_VERSION='incoming-dogleg-credit-v1';
const clip=x=>Math.max(0,Math.min(1,x));
export function applyIncomingDoglegCredit(report,components,continuation){
 const legs=(report.leg_efficiency?.legs??report.band_free?.legs)?.map(l=>l.strokes);
 const base=bandFreeScore(components,legs),hasAccess=Object.hasOwn(report,'dogleg_access');
 const original=hasAccess?applyDoglegStrategyBonus(base,components,report.dogleg_access):base;
 const proof=report.dogleg_access,route=report.spelling_equivalence?.canonical_route??report.route,context=continuation.treatment.context;
 const current=!report.waypoint||!!(proof?.evidence_version===ACCESS_EVIDENCE_VERSION&&proof.available&&context&&report.dogleg_continuation?.version===continuation.treatment.version&&JSON.stringify(continuation.treatment.route)===JSON.stringify(route)&&JSON.stringify(proof.route)===JSON.stringify(route)&&proof.position===context.position&&proof.position===legs[0]&&proof.landing===context.word);
 const treatment={version:INCOMING_DOGLEG_VERSION,available:current,applied:false,route:[...(route??[])],position:proof?.position??null};
 if(!report.waypoint||!current)return {components,raw:original,treatment};
 if(legs[0]<=1)return {components,raw:original,treatment:{...treatment,reason:'One-shot dogleg retains existing scoring'}};
 if(!proof.eligible||proof.removable!==false||context.removable!==false||proof.incoming?.works!==false||!Number.isFinite(proof.incoming_gain)||proof.incoming_gain<=0)return {components,raw:original,treatment:{...treatment,reason:'No eligible nonremovable incoming advantage'}};
 const H=continuation.treatment.after?.landing??context.landing_effectiveness,R=context.relevance,a=clip(proof.incoming_gain);
 if(![H,R].every(x=>Number.isFinite(x)&&x>=0&&x<=1))return {components,raw:original,treatment:{...treatment,available:false,reason:'Landing relevance unavailable'}};
 const newH=H+a*Math.max(0,R-H),adjusted={...components,strategic_effectiveness:clip(components.strategic_effectiveness+.4*(newH-H))};
 const candidate=bandFreeScore(adjusted,legs),delta=Math.max(0,candidate.unrounded_score-base.unrounded_score),bonus=original.strategic_bonus;
 // Preserve the original Q-scaled budget and outgoing amount. Incoming access
 // receives the larger of its existing bonus and its strategic component gain.
 const incoming=Math.max(0,bonus.incoming_amount-delta),amount=incoming+bonus.raw_amount-bonus.incoming_amount;
 const unrounded=Math.min(candidate.maximum_for_legs,candidate.unrounded_score+amount);
 const raw={...candidate,score:Math.round(unrounded),unrounded_score:unrounded,strategic_bonus:{...bonus,base_unrounded:candidate.unrounded_score,incoming_before_component_credit:bonus.incoming_amount,incoming_component_credit:delta,incoming_amount:incoming,raw_amount:amount,applied_amount:unrounded-candidate.unrounded_score,ceiling_limited:amount>unrounded-candidate.unrounded_score+1e-10},operator:candidate.operator+'; incoming dogleg relevance restored after setup, overlapping incoming bonus deducted',formula:candidate.formula+'; Hnew=H+a*max(0,R-H); Snew=S+0.4*(Hnew-H); retain original access budget, deduct base raw increase from incoming bonus'};
 return {components:adjusted,raw,treatment:{...treatment,applied:newH>H,reason:'Reachable alternative turn after setup retains strategic relevance',gain:a,before:{landing:H,strategy:components.strategic_effectiveness,score_raw:original.unrounded_score},after:{landing:newH,strategy:adjusted.strategic_effectiveness,score_raw:unrounded},incoming_bonus_before:bonus.incoming_amount,incoming_bonus_remaining:incoming,component_raw_increase:delta}};
}
