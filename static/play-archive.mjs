import {mergeStoredPlay,isDailyRecordKey} from './play-record-merge.mjs?v=incoming-dogleg-v1';
/** Play history and durable player results share IndexedDB; small reset metadata stays in localStorage.
 * This cached Storage interface preserves existing synchronous game writes. flush() is
 * awaited at reset boundaries; exports read the latest in-memory records; each queued batch is one atomic IDB transaction.
 */
const archiveKey=key=>isDailyRecordKey(key)||/(?:^|:)escape-velocity\.flight-log\.(?:v1|reset-backup\.v1)$/.test(key)||/(?:^|:)word-golf\.personal-daily\.reset-backup\.v1$/.test(key);
export class PlayArchiveStorage {
 constructor(root,backend,entries=[]){this.root=root;this.backend=backend;this.values=new Map(entries);this.pending=new Map();this.chain=Promise.resolve();this.error=null;}
 getItem(key){return archiveKey(key)?this.values.get(key)??null:this.rootChanges?.has(key)?this.rootChanges.get(key):this.root.getItem(key);}
 setItem(key,value){if(!archiveKey(key)){this.rememberRoot(key);if(this.inTransaction)return this.rootChanges.set(key,String(value));return this.root.setItem(key,value);}const encoded=String(value);if(this.values.get(key)===encoded){if(this.pending.has(key)||this.error)this.schedule();return;}this.values.set(key,encoded);this.pending.set(key,encoded);this.schedule();}
 removeItem(key){if(!archiveKey(key)){this.rememberRoot(key);if(this.inTransaction)return this.rootChanges.set(key,null);return this.root.removeItem(key);}this.values.delete(key);this.pending.set(key,null);this.schedule();}
 rememberRoot(key){if(this.rootBefore&&!this.rootBefore.has(key))this.rootBefore.set(key,this.root.getItem(key));}
 schedule(){if(this.scheduled||this.inTransaction)return;this.scheduled=true;queueMicrotask(()=>{this.scheduled=false;void this.flush().catch(()=>{});});}
 async flush(){
  if(this.inTransaction)return;
  const changes=new Map(this.pending);this.pending.clear();
  if(changes.size){this.chain=this.chain.catch(()=>{}).then(async()=>{try{const written=await this.backend.write(changes);
      if(written instanceof Map)for(const [key,value]of written)if(this.values.get(key)===changes.get(key))this.values.set(key,value);
      this.error=null;try{this.onSaved?.();}catch{}}catch(error){for(const [key,value]of changes)if(!this.pending.has(key)&&(this.values.get(key)??null)===value)this.pending.set(key,value);this.error=error;try{this.onError?.(error);}catch{}throw error;}});}
  await this.chain;if(this.error)throw this.error;
 }
 async refresh(){
  await this.flush();if(!this.backend.read)return;
  const before=new Map(this.values),entries=await this.backend.read();
  for(const [key,value]of entries)if(!this.pending.has(key)&&this.values.get(key)===before.get(key))this.values.set(key,value);
 }
 async transaction(action){
  await this.flush().catch(()=>{});const pendingBefore=new Map(this.pending);this.pending.clear();const before=new Map(this.values);this.rootBefore=new Map();this.rootChanges=new Map();this.inTransaction=true;let committed=false;
  try{const result=action();const changes=new Map(this.pending);await this.backend.write(changes);committed=true;for(const [key,value]of this.rootChanges)value===null?this.root.removeItem(key):this.root.setItem(key,value);this.pending.clear();this.error=null;return result;}
  catch(error){if(committed){const inverse=new Map([...this.pending.keys()].map(key=>[key,before.get(key)??null]));await this.backend.write(inverse);}this.values=before;this.pending=pendingBefore;for(const [key,value]of this.rootBefore){if(value===null)this.root.removeItem(key);else this.root.setItem(key,value);}throw error;}
  finally{this.rootBefore=null;this.rootChanges=null;this.inTransaction=false;}
 }
 async migrate(){
  const changes=new Map(),originals=new Map();
  for(let i=0;i<this.root.length;i++){const key=this.root.key(i);if(archiveKey(key)){const value=this.root.getItem(key);if(value!==null){originals.set(key,value);const merged=mergeStoredPlay(key,this.values.get(key),value);changes.set(key,merged);this.values.set(key,merged);}}}
  // Remove local copies only after the database commits successfully.
  if(changes.size){const written=await this.backend.write(changes);if(written instanceof Map)for(const [key,value]of written)this.values.set(key,value);for(const key of changes.keys())if(this.root.getItem(key)===originals.get(key))this.root.removeItem(key);}
 }
}
function fallbackStorage(root){
 return {get length(){return root.length;},key:i=>root.key(i),getItem:k=>root.getItem(k),setItem:(k,v)=>root.setItem(k,v),removeItem:k=>root.removeItem(k),archiveWarning:'Saved history could not be opened. Export this session before leaving, then reload to retry.'};
}
export async function openPlayArchive(root,indexedDB=globalThis.indexedDB){
 if(!root)return root;if(!indexedDB)return fallbackStorage(root);
 try{
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('word-golf-play-archive',1);request.onupgradeneeded=()=>request.result.createObjectStore('records');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Play archive is blocked by another tab.'));});
  const backend={
   read:()=>new Promise((resolve,reject)=>{const tx=db.transaction('records'),store=tx.objectStore('records'),entries=[],request=store.openCursor();request.onsuccess=()=>{const c=request.result;if(c){entries.push([c.key,c.value]);c.continue();}};tx.oncomplete=()=>resolve(entries);tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);}),
   write:changes=>new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records'),written=new Map();
    for(const [key,value]of changes){if(value===null){store.delete(key);written.set(key,null);}else{const get=store.get(key);get.onsuccess=()=>{const merged=mergeStoredPlay(key,get.result,value);store.put(merged,key);written.set(key,merged);};}}
    tx.oncomplete=()=>resolve(written);tx.onabort=()=>reject(tx.error??Error('Play archive transaction failed.'));tx.onerror=()=>reject(tx.error);})
  };
  const archive=new PlayArchiveStorage(root,backend,await backend.read());await archive.migrate();return archive;
 }catch(error){return fallbackStorage(root);}
}
