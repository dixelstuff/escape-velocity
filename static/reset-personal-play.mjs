import {DAILY_KEY} from './daily-game.mjs?v=opportunity08-bonus2-v1';
export const DAILY_RESET_BACKUP_KEY='word-golf.personal-daily.reset-backup.v1';
/** Reset a personal export batch, preserving hole definitions and selection.
 * The caller prepares a fresh engine state before touching saved history.
 */
export function resetPersonalPlay(daily,log,state,model,modelSha,{preserveStats=false}={}){
 if(daily.storage?.newBatch){
  const before={daily:daily.data,log:log.data,backup:log.backup};
  try{return daily.storage.newBatch(()=>resetBatch(daily,log,state,model,modelSha,preserveStats));}
  catch(error){daily.data=before.daily;log.data=before.log;log.backup=before.backup;throw error;}
 }
 return resetBatch(daily,log,state,model,modelSha,preserveStats);
}
function resetBatch(daily,log,state,model,modelSha,preserveStats){
 const next={...daily.data,holes:preserveStats?structuredClone(daily.data.holes):{}};
 if(preserveStats)for(const hole of Object.values(next.holes))delete hole.journeyId;
 const previousRaw=daily.storage?.getItem(DAILY_KEY),previousBackup=daily.storage?.getItem(DAILY_RESET_BACKUP_KEY);
 if(!daily.storage||daily.unreadable)throw Error('Could not reset play data safely. Export your data first and check browser storage.');
 // Write the small daily record first; FlightLog.reset rolls its own writes back
 // on failure. Do not change either in-memory record until both writes succeed.
 let journey;
 try{
  daily.storage.setItem(DAILY_RESET_BACKUP_KEY,JSON.stringify(daily.data));
  daily.storage.setItem(DAILY_KEY,JSON.stringify(next));
  journey=log.reset(state,model,modelSha,{persistBackup:!preserveStats});
 }catch(error){
  if(previousRaw===null)daily.storage.removeItem(DAILY_KEY);else daily.storage.setItem(DAILY_KEY,previousRaw);
  if(previousBackup===null)daily.storage.removeItem(DAILY_RESET_BACKUP_KEY);else daily.storage.setItem(DAILY_RESET_BACKUP_KEY,previousBackup);
  throw error;
 }
 daily.data=next;daily.warning='';return journey;
}
export function restorePersonalPlay(daily,log){
 if(!log.backup)return false;
 const saved=JSON.parse(daily.storage.getItem(DAILY_RESET_BACKUP_KEY)||'null');
 if(!log.restorePrevious())return false;
 if(saved?.version===1&&saved.holes)daily.data={...saved,customHoles:daily.data.customHoles??saved.customHoles};
 // Compatibility with earlier resets that backed up routes alone.
 else for(const journey of log.data.journeys)daily.record(journey);
 daily.save();return true;
}

/** Commit the archive reset before reporting success; restore live objects on failure. */
export async function clearResearchPlay(daily,log,state,model,modelSha){
 const before={daily:daily.data,log:log.data,backup:log.backup,batch:daily.storage?.batch};
 try{
  const action=()=>resetPersonalPlay(daily,log,state,model,modelSha,{preserveStats:true});
  return daily.storage?.root?.transaction?await daily.storage.root.transaction(action):action();
 }catch(error){daily.data=before.daily;log.data=before.log;log.backup=before.backup;if(daily.storage)daily.storage.batch=before.batch;throw error;}
}
