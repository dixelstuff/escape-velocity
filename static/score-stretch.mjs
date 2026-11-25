import {BAND_FREE_VERSION} from './cleverness-score-config.mjs?v=finishing-role82-v1';
/** Historical monotone cubic Hermite display scale: fixes 0, 70, 100; slope 2 at 70. */
export function stretchScore(score){
 const s=Math.max(0,Math.min(100,score));
 if(s<=70){const t=s/70;return 70*(t+t*t*t-t*t);}
 const t=(s-70)/30;return 70+30*(2*t-2*t*t+t*t*t);
}
// Raw point that displayed 82 on the historical curve; not a target mean.
export const RAW_PIVOT_82=77.73883076690672;
export function stretchScore82(score){
 const x=Math.max(0,Math.min(100,score)),left=x<=RAW_PIVOT_82;
 const x0=left?0:RAW_PIVOT_82,x1=left?RAW_PIVOT_82:100,y0=left?0:82,y1=left?82:100,d0=left?1:2,d1=left?2:1,h=x1-x0,t=(x-x0)/h;
 return (2*t**3-3*t*t+1)*y0+(t**3-2*t*t+t)*h*d0+(-2*t**3+3*t*t)*y1+(t**3-t*t)*h*d1;
}
export function stretchBandFree(raw,version){
 const current=version===BAND_FREE_VERSION,transform=current?stretchScore82:stretchScore;
 const value=transform(raw.unrounded_score),ceiling=transform(raw.maximum_for_legs);
 return {...raw,version,score:Math.round(value),unrounded_score:value,raw_score:raw.score,raw_unrounded_score:raw.unrounded_score,raw_maximum_for_legs:raw.maximum_for_legs,maximum_for_legs:ceiling,display_transform:{kind:'cubic-hermite',pivot:current?82:70,raw_pivot:current?RAW_PIVOT_82:70,slope:2,raw_version:raw.version,raw_unrounded:raw.unrounded_score,transformed_unrounded:value,raw_ceiling:raw.maximum_for_legs,transformed_ceiling:ceiling},operator:raw.operator+'; final unrounded score and ceiling mapped through monotone cubic Hermite (display pivot '+(current?82:70)+', slope 2)',formula:raw.formula+(current?'; display T(s): cubic Hermite knots (0,0), (77.73883076690672,82), (100,100), slopes 1,2,1':'; display T(s): s≤70 → 70(t+t³−t²), t=s/70; s>70 → 70+30(2t−2t²+t³), t=(s−70)/30')};
}
