/** Experimental final operator only; no golf bands or gameplay dependencies. */
import {finalQuality} from './cleverness-v6.7.mjs?v=vector-v1';
export const BAND_FREE_VERSION='band-free-harmonic-v1';
export const QUALITY_POWER=2/3;
export function legFactor(strokes){
 if(!Number.isInteger(strokes)||strokes<1)throw Error('Actual positive integer leg strokes required.');
 return strokes<=2?1:strokes===3?5/6:.5*.65**(strokes-4);
}
export function bandFreeScore(components,legStrokes){
 if(!Array.isArray(legStrokes)||!legStrokes.length||legStrokes.length>2)throw Error('One actual leg or two actual dogleg legs required.');
 const {semantic_ingenuity:I,strategic_effectiveness:S,route_elegance:E}=components;
 for(const v of [I,S,E])if(!Number.isFinite(v)||v<0||v>1)throw Error('Complete normalized I/S/E evidence required.');
 const harmonic=finalQuality(I,S,E,'harmonic'),quality=harmonic.value,beforePenalty=100*quality**QUALITY_POWER,legs=legStrokes.map((strokes,i)=>({leg:i+1,strokes,factor:legFactor(strokes)})),factor=legs.reduce((value,leg)=>value*leg.factor,1),unrounded=beforePenalty*factor;
 return {version:BAND_FREE_VERSION,score:Math.round(unrounded),unrounded_score:unrounded,harmonic_joint:harmonic.joint_signal,quality,unbounded_quality:harmonic.unbounded,quality_terms:harmonic.terms,quality_power:QUALITY_POWER,before_leg_penalty:beforePenalty,legs,applied_factor:factor,penalty_points:beforePenalty-unrounded,maximum_for_legs:100*factor,operator:'each actual leg factor applied once; no golf band, no previous leg factor or ceiling',formula:'100 × clip(0.5 + 1.3 × (2IS/(I+S) − 0.5) + 0.4 × (E − 0.5), 0, 1)^(2/3) × product(leg factors)'};
}
