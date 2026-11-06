import {applyDoglegContinuation,CONTINUATION_VERSION} from './dogleg-continuation.mjs?v=bunker-hit-only-v1';
import {applyDoglegStrategyBonus} from './dogleg-strategy-bonus.mjs?v=bunker-hit-only-v1';
import {stretchBandFree} from './score-stretch.mjs?v=cubic-results-v1';
/** Apply live-only opportunity/bonus settings; preserve historical comparison diagnostics. */
import {bandFreeScore} from './vector-cleverness/band-free.mjs?v=dogleg-continuation-v1';
import {OPPORTUNITY_RATE,BAND_FREE_VERSION,PREVIOUS_BAND_FREE_VERSION,LEGACY_BAND_FREE_VERSION} from './cleverness-score-config.mjs?v=dogleg-continuation-v1';
export function applyLiveCleverness(report){
 const raw=report.opportunity?.raw_ingenuity,N=report.opportunity?.pivot_positions;
 if(!Number.isFinite(raw)||raw<0||raw>1||!Number.isInteger(N)||N<0)throw Error('Complete raw opportunity evidence is required.');
 const factor=1/(1+OPPORTUNITY_RATE*Math.max(0,N-1)),opportunity={...report.opportunity,extra_positions:Math.max(0,N-1),factor,adjusted_ingenuity:raw*factor,rate:OPPORTUNITY_RATE},components={...report.components,semantic_ingenuity:opportunity.adjusted_ingenuity};
 const continuation=applyDoglegContinuation(report,components);Object.assign(components,continuation.components);
 const legs=(report.leg_efficiency?.legs??report.band_free?.legs)?.map(l=>l.strokes),base=bandFreeScore(components,legs);
 // Reports without continuation proof retain their actual v6/v5 identity.
 const hasEvidence=Object.hasOwn(report,'dogleg_access'),adjustedRaw=hasEvidence?applyDoglegStrategyBonus(base,components,report.dogleg_access):base,hasContinuation=report.dogleg_continuation?.version===CONTINUATION_VERSION&&JSON.stringify(report.dogleg_continuation.route)===JSON.stringify(report.spelling_equivalence?.canonical_route??report.route)&&(!!continuation.treatment.context||!report.waypoint),band_free=stretchBandFree(adjustedRaw,hasContinuation?BAND_FREE_VERSION:hasEvidence?PREVIOUS_BAND_FREE_VERSION:LEGACY_BAND_FREE_VERSION);
 const treatment=continuation.treatment;
 if(treatment.applied){
  const beforeComponents={...components,strategic_effectiveness:treatment.context.base_strategy,route_elegance:treatment.context.base_elegance},beforeBase=bandFreeScore(beforeComponents,legs),beforeRaw=hasEvidence?applyDoglegStrategyBonus(beforeBase,beforeComponents,report.dogleg_access):beforeBase,before=stretchBandFree(beforeRaw,PREVIOUS_BAND_FREE_VERSION);
  Object.assign(treatment,{previous_score:before.score,previous_unrounded:before.unrounded_score,score:band_free.score,unrounded:band_free.unrounded_score,score_delta:band_free.score-before.score});
 }
 return {...report,components,continuation_treatment:treatment,opportunity,band_free,primary_score:band_free.score,primary_scorer:band_free.version};
}
