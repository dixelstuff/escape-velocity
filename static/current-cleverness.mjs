import {BAND_FREE_VERSION} from './cleverness-score-config.mjs?v=finishing-role82-v1';
export const currentScore=b=>(b?.scoreVersion??b?.version)===BAND_FREE_VERSION;
export const hasCurrentCleverness=h=>currentScore(h?.bestStrokes)&&Number.isFinite(h.bestStrokes.cleverness);
export function currentBestCleverness(h){
 const candidates=[h?.bestCleverness,h?.pendingCleverness,hasCurrentCleverness(h)?{...h.bestStrokes,score:Math.round(h.bestStrokes.cleverness),unrounded:h.bestStrokes.cleverness}:null].filter(b=>currentScore(b)&&Number.isFinite(b.unrounded));
 return candidates.sort((a,b)=>b.unrounded-a.unrounded)[0]??null;
}
export function invalidateStaleCleverness(data){
 let changed=false;
 for(const h of Object.values(data?.holes??{}))for(const field of ['bestStrokes','bestCleverness','pendingCleverness']){
  const b=h[field];if(!b||currentScore(b))continue;
  for(const key of ['cleverness','score','unrounded','rawCleverness','rawUnrounded'])if(Object.hasOwn(b,key)){delete b[key];changed=true;}
 }
 return changed;
}
