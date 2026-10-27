/** Experimental final operator only; no golf bands or gameplay dependencies. */
import {finalQuality} from './cleverness-v6.7.mjs?v=vector-v1';
export const BAND_FREE_VERSION='band-free-harmonic-v2-one-stroke';
export const QUALITY_POWER=2/3;
export function legFactor(strokes){
 if(!Number.isInteger(strokes)||strokes<1)throw Error('Actual positive integer leg strokes required.');
 return strokes<=2?1:strokes===3?5/6:.5*.65**(strokes-4);
}
export function bandFreeScore(components,legStrokes){
 if(!Array.isArray(legStrokes)||!legStrokes.length||legStrokes.length>2)throw Error('One actual leg or two actual dogleg legs required.');
 const {semantic_ingenuity:I,strategic_effectiveness:S,route_elegance:E}=components;
 for(const v of [I,S,E])if(!Number.isFinite(v)||v<0||v>1)throw Error('Complete normalized I/S/E evidence required.');
 const harmonic=finalQuality(I,S,E,'harmonic'),quality=harmonic.value,beforePenalty=100*quality**QUALITY_POWER,legs=legStrokes.map((strokes,i)=>({leg:i+1,strokes,factor:legFactor(strokes)})),factor=legs.reduce((value,leg)=>value*leg.factor,1),beforeBonus=beforePenalty*factor,eligible=legs.some(l=>l.strokes===1),bonus=eligible?3*quality*factor:0,unrounded=Math.min(beforeBonus+bonus,100*factor);
 return {version:BAND_FREE_VERSION,score:Math.round(unrounded),unrounded_score:unrounded,before_bonus_score:Math.round(beforeBonus),before_bonus_unrounded_score:beforeBonus,one_stroke_bonus:{eligible,raw_amount:bonus,applied_amount:unrounded-beforeBonus,ceiling_limited:bonus>unrounded-beforeBonus+1e-10},harmonic_joint:harmonic.joint_signal,quality,unbounded_quality:harmonic.unbounded,quality_terms:harmonic.terms,quality_power:QUALITY_POWER,before_leg_penalty:beforePenalty,legs,applied_factor:factor,penalty_points:beforePenalty-beforeBonus,maximum_for_legs:100*factor,operator:'each actual leg factor applied once, then one quality-scaled bonus per eligible route; capped at 100 × leg factor product; no golf bands',formula:'Q = clip(0.5 + 1.3 × (2IS/(I+S) − 0.5) + 0.4 × (E − 0.5), 0, 1); L = product(leg factors); min(100 × Q^(2/3) × L + (any actual leg = 1 stroke ? 3 × Q × L : 0), 100 × L)'};
}
