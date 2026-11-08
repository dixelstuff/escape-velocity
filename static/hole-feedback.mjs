/** Optional, batch-scoped player impressions; independent of game scoring. */
export const FEEDBACK_OPTIONS={enjoyment:['1','2','3','4','5'],opening:['too_obvious','about_right','too_hard'],transitions:['forced','ordinary','satisfying']};
export function validHoleFeedback(r){return !!r&&r.version===1&&typeof r.hole_id==='string'&&typeof r.updated_at==='string'&&Object.entries(FEEDBACK_OPTIONS).every(([k,values])=>r[k]===undefined||values.includes(r[k]))&&typeof r.note==='string';}
export function mergeHoleFeedback(a=[],b=[]){const rows=new Map();for(const r of [...(Array.isArray(a)?a:[]),...(Array.isArray(b)?b:[])].filter(validHoleFeedback)){const old=rows.get(r.hole_id);if(!old||r.updated_at>=old.updated_at)rows.set(r.hole_id,r);}return [...rows.values()];}
export function saveHoleFeedback(log,definition,state,patch){
 if(!definition?.id||!state?.won)throw Error('Finish this hole before rating it.');
 if(state.challenge?.id!==definition.id)throw Error('This result belongs to another hole.');
 const words=[state.start,state.waypoint?.word,state.final_target??state.target],s=definition.settings;
 if(JSON.stringify(words)!==JSON.stringify([s.start,s.waypoint?.word,s.target]))throw Error('This result belongs to another hole.');
 log.storage?.assertCurrent?.();log.refreshSaved?.();
 const existing=(log.data.holeFeedback??[]).find(r=>r.hole_id===definition.id),at=log.now(),row={version:1,...existing,hole_id:definition.id,words,experiment:s.editorial_style??null,route:[...state.route],strokes:state.attempts,note:existing?.note??'',created_at:existing?.created_at??at,updated_at:at};
 for(const [key,value]of Object.entries(patch)){if(key==='note')row.note=String(value).trim().slice(0,500);else if(FEEDBACK_OPTIONS[key]){if(value==='')delete row[key];else if(FEEDBACK_OPTIONS[key].includes(value))row[key]=value;else throw Error('Unknown rating.');}else throw Error('Unknown rating field.');}
 log.data.holeFeedback=mergeHoleFeedback(log.data.holeFeedback,[row]);log.save();if(log.saveError)throw Error(log.warning);return row;
}
