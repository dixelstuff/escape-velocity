/** Isolate reset batches from stale tabs, including older releases writing legacy keys. */
export const PERSONAL_BATCH_KEY='word-golf.personal-play.batch.v1';
const keys=['escape-velocity.flight-log.v1','escape-velocity.flight-log.reset-backup.v1','word-golf.personal-daily.v1','word-golf.personal-daily.reset-backup.v1'];
export class PersonalPlayStorage{
 constructor(storage,makeId=()=>crypto.randomUUID()){
  this.root=storage;this.makeId=makeId;this.batch=storage.getItem(PERSONAL_BATCH_KEY)||'legacy';
 }
 key(key,batch=this.batch){return batch==='legacy'?key:`word-golf.play.${batch}:${key}`;}
 assertCurrent(){if((this.root.getItem(PERSONAL_BATCH_KEY)||'legacy')!==(this.pendingFrom??this.batch))throw Error('Play data was reset in another tab. Reload this tab before continuing or exporting.');}
 getItem(key){this.assertCurrent();return this.root.getItem(this.key(key));}
 setItem(key,value){this.assertCurrent();this.root.setItem(this.key(key),value);}
 removeItem(key){this.assertCurrent();this.root.removeItem(this.key(key));}
 newBatch(action){
  this.assertCurrent();const previous=this.batch,next=this.makeId();this.pendingFrom=previous;this.batch=next;
  let result;
  try{result=action();this.root.setItem(PERSONAL_BATCH_KEY,next);}
  catch(error){for(const key of keys)try{this.root.removeItem(this.key(key,next));}catch{}this.batch=previous;throw error;}
  finally{delete this.pendingFrom;}
  if(previous!=='legacy')for(const key of keys)try{this.root.removeItem(this.key(key,previous));}catch{}
  return result;
 }
}
/** Export play in this batch, not the library of unplayed custom definitions. */
export function personalPlayExport(daily,log){
 daily.storage?.assertCurrent?.();log.storage?.assertCurrent?.();
 const played=new Set([...Object.keys(daily.data.holes),...log.data.journeys.map(j=>j.state.challenge?.id)]);
 const data=structuredClone(daily.data);
 if(data.customHoles)data.customHoles=data.customHoles.filter(h=>played.has(h.id));
 return {version:1,daily:data,play:structuredClone(log.data)};
}
