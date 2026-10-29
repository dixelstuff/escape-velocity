/** Monotone cubic Hermite display scale: fixes 0, 70, 100; slope 2 at 70. */
export function stretchScore(score){
 const s=Math.max(0,Math.min(100,score));
 if(s<=70){const t=s/70;return 70*(t+t*t*t-t*t);}
 const t=(s-70)/30;return 70+30*(2*t-2*t*t+t*t*t);
}
export function stretchBandFree(raw,version){
 const value=stretchScore(raw.unrounded_score),ceiling=stretchScore(raw.maximum_for_legs);
 return {...raw,version,score:Math.round(value),unrounded_score:value,raw_score:raw.score,raw_unrounded_score:raw.unrounded_score,raw_maximum_for_legs:raw.maximum_for_legs,maximum_for_legs:ceiling,display_transform:{kind:'cubic-hermite',pivot:70,slope:2,raw_version:raw.version,raw_unrounded:raw.unrounded_score,transformed_unrounded:value,raw_ceiling:raw.maximum_for_legs,transformed_ceiling:ceiling},operator:raw.operator+'; final unrounded score and ceiling mapped through monotone cubic Hermite (pivot 70, slope 2)',formula:raw.formula+'; display T(s): s≤70 → 70(t+t³−t²), t=s/70; s>70 → 70+30(2t−2t²+t³), t=(s−70)/30'};
}
