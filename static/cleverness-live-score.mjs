/** Apply live-only opportunity/bonus settings; preserve historical comparison diagnostics. */
import {bandFreeScore} from './vector-cleverness/band-free.mjs?v=relaxed-legs-v1';
import {OPPORTUNITY_RATE} from './cleverness-score-config.mjs?v=relaxed-legs-v1';
export function applyLiveCleverness(report){
 const raw=report.opportunity?.raw_ingenuity,N=report.opportunity?.pivot_positions;
 if(!Number.isFinite(raw)||raw<0||raw>1||!Number.isInteger(N)||N<0)throw Error('Complete raw opportunity evidence is required.');
 const factor=1/(1+OPPORTUNITY_RATE*Math.max(0,N-1)),opportunity={...report.opportunity,extra_positions:Math.max(0,N-1),factor,adjusted_ingenuity:raw*factor,rate:OPPORTUNITY_RATE},components={...report.components,semantic_ingenuity:opportunity.adjusted_ingenuity};
 const legs=(report.leg_efficiency?.legs??report.band_free?.legs)?.map(l=>l.strokes),band_free=bandFreeScore(components,legs);
 return {...report,components,opportunity,band_free,primary_score:band_free.score,primary_scorer:band_free.version};
}
