/** Isolate reset batches from stale tabs, including older releases writing legacy keys. */
export const PERSONAL_BATCH_KEY='word-golf.personal-play.batch.v1';
const keys=['escape-velocity.flight-log.v1','escape-velocity.flight-log.reset-backup.v1','word-golf.personal-daily.v1','word-golf.personal-daily.reset-backup.v1'];
const recoveryKeys=[keys[1],keys[3]];
const quotaError=e=>e?.name==='QuotaExceededError'||e?.code===22||e?.code===1014;
export class PersonalPlayStorage{
 constructor(storage,makeId=()=>crypto.randomUUID()){this.root=storage;this.makeId=makeId;this.batch=storage.getItem(PERSONAL_BATCH_KEY)||'legacy';}
 key(key,batch=this.batch){return batch==='legacy'?key:`word-golf.play.${batch}:${key}`;}
 assertCurrent(){if((this.root.getItem(PERSONAL_BATCH_KEY)||'legacy')!==(this.pendingFrom??this.batch)){const e=Error('Play data was reset in another tab. Reload this tab before continuing or exporting.');e.code='STALE_PLAY_BATCH';throw e;}}
 getItem(key){this.assertCurrent();return this.root.getItem(this.key(key));}
 setItem(key,value){
  this.assertCurrent();
  try{this.root.setItem(this.key(key),value);}
  catch(error){
   // Never trim current play. Recovery copies and superseded legacy records
   // may be released if they prevent saving the active batch. A pending reset
   // instead rolls back as a transaction, keeping its recovery guarantee.
   if(!quotaError(error)||this.pendingFrom!==undefined)throw error;
   for(const k of recoveryKeys)this.root.removeItem(this.key(k));
   if(this.batch!=='legacy')for(const k of keys)this.root.removeItem(k);
   this.recoveryEvicted=true;this.onRecoveryEvicted?.();
   this.root.setItem(this.key(key),value);
  }
 }
 removeItem(key){this.assertCurrent();this.root.removeItem(this.key(key));}
 newBatch(action){
  this.assertCurrent();const previous=this.batch,next=this.makeId();
  const retired=new Map(keys.map(key=>[this.key(key,previous),this.root.getItem(this.key(key,previous))]));
  this.pendingFrom=previous;this.batch=next;
  let result;
  try{
   // Hold the previous batch in memory while replacing it, rather than needing
   // space for the source plus another full recovery copy at the same time.
   for(const [key,value] of retired)if(value!==null)this.root.removeItem(key);
   result=action();this.root.setItem(PERSONAL_BATCH_KEY,next);
  }catch(error){
   for(const key of keys)try{this.root.removeItem(this.key(key,next));}catch{}
   this.batch=previous;
   for(const [key,value] of retired)if(value!==null)this.root.setItem(key,value);
   throw error;
  }finally{delete this.pendingFrom;}
  // A completed reset supersedes original pre-namespace history too.
  if(previous!=='legacy')for(const key of keys)try{this.root.removeItem(key);}catch{}
  return result;
 }
}
/** Export play in this batch, not the library of unplayed custom definitions. */
export function personalPlayExport(daily,log){
 daily.storage?.assertCurrent?.();log.storage?.assertCurrent?.();
 const played=new Set(log.data.journeys.map(j=>j.state.challenge?.id));
 const data=structuredClone(daily.data);
 // Player stats outlive research batches. Do not leak old routes back into exports.
 data.holes=Object.fromEntries(Object.entries(data.holes).filter(([id])=>played.has(id)).map(([id,h])=>[id,Object.fromEntries(['id','date','tee','waypoint','flag','journeyId'].filter(key=>h[key]!==undefined).map(key=>[key,h[key]]))]));
 if(data.customHoles)data.customHoles=data.customHoles.filter(h=>played.has(h.id));
 return {version:2,exportedAt:new Date().toISOString(),batch:daily.storage?.batch??'legacy',playerStats:daily.stats(),daily:data,play:structuredClone(log.data)};
}
