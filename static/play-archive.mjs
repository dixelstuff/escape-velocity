/** Detailed research records live in IndexedDB; compact player stats remain in localStorage.
 * This cached Storage interface preserves existing synchronous game writes. flush() is
 * awaited at reset boundaries; exports read the latest in-memory records; each queued batch is one atomic IDB transaction.
 */
const archiveKey=key=>/(?:^|:)escape-velocity\.flight-log\.(?:v1|reset-backup\.v1)$/.test(key)||/(?:^|:)word-golf\.personal-daily\.reset-backup\.v1$/.test(key);
export class PlayArchiveStorage {
 constructor(root,backend,entries=[]){this.root=root;this.backend=backend;this.values=new Map(entries);this.pending=new Map();this.chain=Promise.resolve();this.error=null;}
 getItem(key){return archiveKey(key)?this.values.get(key)??null:this.rootChanges?.has(key)?this.rootChanges.get(key):this.root.getItem(key);}
 setItem(key,value){if(!archiveKey(key)){this.rememberRoot(key);if(this.inTransaction)return this.rootChanges.set(key,String(value));return this.root.setItem(key,value);}this.values.set(key,String(value));this.pending.set(key,String(value));this.schedule();}
 removeItem(key){if(!archiveKey(key)){this.rememberRoot(key);if(this.inTransaction)return this.rootChanges.set(key,null);return this.root.removeItem(key);}this.values.delete(key);this.pending.set(key,null);this.schedule();}
 rememberRoot(key){if(this.rootBefore&&!this.rootBefore.has(key))this.rootBefore.set(key,this.root.getItem(key));}
 schedule(){if(this.scheduled||this.inTransaction)return;this.scheduled=true;queueMicrotask(()=>{this.scheduled=false;void this.flush().catch(()=>{});});}
 async flush(){
  if(this.inTransaction)return;
  const changes=new Map(this.pending);this.pending.clear();
  if(changes.size){this.chain=this.chain.catch(()=>{}).then(async()=>{try{await this.backend.write(changes);this.error=null;try{this.onSaved?.();}catch{}}catch(error){for(const [key,value]of changes)if(!this.pending.has(key)&&(this.values.get(key)??null)===value)this.pending.set(key,value);this.error=error;try{this.onError?.(error);}catch{}throw error;}});}
  await this.chain;if(this.error)throw this.error;
 }
 async transaction(action){
  await this.flush().catch(()=>{});const pendingBefore=new Map(this.pending);this.pending.clear();const before=new Map(this.values);this.rootBefore=new Map();this.rootChanges=new Map();this.inTransaction=true;let committed=false;
  try{const result=action();const changes=new Map(this.pending);await this.backend.write(changes);committed=true;for(const [key,value]of this.rootChanges)value===null?this.root.removeItem(key):this.root.setItem(key,value);this.pending.clear();this.error=null;return result;}
  catch(error){if(committed){const inverse=new Map([...this.pending.keys()].map(key=>[key,before.get(key)??null]));await this.backend.write(inverse);}this.values=before;this.pending=pendingBefore;for(const [key,value]of this.rootBefore){if(value===null)this.root.removeItem(key);else this.root.setItem(key,value);}throw error;}
  finally{this.rootBefore=null;this.rootChanges=null;this.inTransaction=false;}
 }
 async migrate(){
  const changes=new Map();
  for(let i=0;i<this.root.length;i++){const key=this.root.key(i);if(archiveKey(key)){const value=this.root.getItem(key);if(value!==null){changes.set(key,value);this.values.set(key,value);}}}
  // Remove local copies only after the database commits successfully.
  if(changes.size){await this.backend.write(changes);for(const key of changes.keys())this.root.removeItem(key);}
 }
}
export async function openPlayArchive(root,indexedDB=globalThis.indexedDB){
 if(!root||!indexedDB)return root;
 try{
  const db=await new Promise((resolve,reject)=>{const request=indexedDB.open('word-golf-play-archive',1);request.onupgradeneeded=()=>request.result.createObjectStore('records');request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);request.onblocked=()=>reject(Error('Play archive is blocked by another tab.'));});
  const backend={
   read:()=>new Promise((resolve,reject)=>{const tx=db.transaction('records'),store=tx.objectStore('records'),entries=[],request=store.openCursor();request.onsuccess=()=>{const c=request.result;if(c){entries.push([c.key,c.value]);c.continue();}};tx.oncomplete=()=>resolve(entries);tx.onabort=()=>reject(tx.error);tx.onerror=()=>reject(tx.error);}),
   write:changes=>new Promise((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records');for(const [key,value]of changes)value===null?store.delete(key):store.put(value,key);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error??Error('Play archive transaction failed.'));tx.onerror=()=>reject(tx.error);})
  };
  const archive=new PlayArchiveStorage(root,backend,await backend.read());await archive.migrate();return archive;
 }catch(error){return root;}
}
