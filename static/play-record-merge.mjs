import {BAND_FREE_VERSION} from './cleverness-score-config.mjs?v=incoming-dogleg-v1';
import {mergeHoleFeedback} from './hole-feedback.mjs?v=four-styles-v1';
const timestamp=o=>String(o?.updatedAt??o?.updated_at??o?.completedAt??o?.startedAt??'');
const score=b=>Number.isFinite(b?.unrounded)?b.unrounded:Number.isFinite(b?.cleverness)?b.cleverness:Number.isFinite(b?.score)?b.score:-1;
const current=b=>(b?.scoreVersion??b?.version)===BAND_FREE_VERSION;
function quality(a,b){
 if(!a)return b;if(!b)return a;
 const winner=current(a)!==current(b)?(current(b)?b:a):(a.version??a.scoreVersion)===(b.version??b.scoreVersion)?(score(b)>=score(a)?b:a):b,other=winner===a?b:a;
 if(winner.strokes!==other.strokes||JSON.stringify(winner.route)!==JSON.stringify(other.route))return winner;
 const enriched={...other,...winner};if(!enriched.state&&other.state)enriched.state=other.state;return enriched;
}
function strokes(a,b){if(!a)return b;if(!b)return a;if(a.strokes!==b.strokes)return b.strokes<a.strokes?b:a;return quality(a,b);}
/** Best achievements are monotone; current navigation belongs to the caller. */
export function mergeDailyRecords(stored,incoming){
 if(stored?.version!==1||!stored.holes||incoming?.version!==1||!incoming.holes)return incoming;
 const holes={...stored.holes};
 for(const [id,local]of Object.entries(incoming.holes)){
  const old=holes[id];if(!old){holes[id]=local;continue;}
  const localTime=String(local.lastPlayedAt??local.updatedAt??local.completedAt??''),oldTime=String(old.lastPlayedAt??old.updatedAt??old.completedAt??'');
  const merged={...(oldTime>localTime?local:old),...(oldTime>localTime?old:local)};
  for(const [field,pick]of [['bestStrokes',strokes],['bestCleverness',quality],['pendingCleverness',quality]]){const best=pick(old[field],local[field]);if(best)merged[field]=best;}
  if(current(merged.bestCleverness)&&current(merged.pendingCleverness)&&score(merged.bestCleverness)>=score(merged.pendingCleverness))delete merged.pendingCleverness;
  for(const field of ['completedAt','updatedAt','lastPlayedAt'])if(old[field]||local[field])merged[field]=[old[field],local[field]].filter(Boolean).sort().at(-1);
  Object.assign(local,merged);if(!('pendingCleverness'in merged))delete local.pendingCleverness;holes[id]=local; // preserve callers holding this record
 }
 const result={...stored,...incoming,holes};
 if(stored.customHoles||incoming.customHoles)result.customHoles=[...new Map([...(stored.customHoles??[]),...(incoming.customHoles??[])].map(h=>[h.id,h])).values()];
 return result;
}
export function mergeFlightRecords(stored,incoming){
 if(stored?.version!==1||!Array.isArray(stored.journeys)||incoming?.version!==1||!Array.isArray(incoming.journeys))return incoming;
 const rows=new Map(stored.journeys.map(j=>[j.id,j]));
 for(const local of incoming.journeys){const old=rows.get(local.id);if(!old){rows.set(local.id,local);continue;}
  const oldWins=timestamp(old)>timestamp(local)||timestamp(old)===timestamp(local)&&(old.entries?.length??0)>(local.entries?.length??0);
  const winner=oldWins?old:local,other=oldWins?local:old,merged={...other,...winner};
  // A delayed report is additive evidence, but only for this exact route/state key.
  const reports=[winner.cleverness_playtest,other.cleverness_playtest].filter(r=>r&&JSON.stringify(r.route)===JSON.stringify(merged.state?.route));
  if(reports.length)merged.cleverness_playtest=reports.find(r=>r.band_free?.version===BAND_FREE_VERSION)??reports[0];else delete merged.cleverness_playtest;
  Object.assign(local,merged);rows.set(local.id,local);
 }
 return {...stored,...incoming,journeys:[...rows.values()],...((stored.holeFeedback||incoming.holeFeedback)?{holeFeedback:mergeHoleFeedback(stored.holeFeedback,incoming.holeFeedback)}:{})};
}
export const isDailyRecordKey=k=>/(?:^|:)word-golf\.personal-daily\.v1$/.test(k);
export const isFlightRecordKey=k=>/(?:^|:)escape-velocity\.flight-log\.v1$/.test(k);
/** Used inside one IndexedDB read/write transaction, not a read/then-write race. */
export function mergeStoredPlay(key,stored,incoming){
 if(stored===incoming||!stored||!incoming||!isDailyRecordKey(key)&&!isFlightRecordKey(key))return incoming;
 let a,b;try{a=JSON.parse(stored);b=JSON.parse(incoming);}catch{return incoming;}
 return JSON.stringify(isDailyRecordKey(key)?mergeDailyRecords(a,b):mergeFlightRecords(a,b));
}
