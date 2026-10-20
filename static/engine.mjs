import { endpointHubs } from './hub-warning.mjs?v=golf-v24';
/** GloVe cosine scoring, independent of the map and animations. */
export class Embeddings {
  constructor(words, vectors, dimensions = 300, hubs = null) {
    if (vectors.length !== words.length * dimensions) throw Error('Incomplete word-vector download. Please reload.');
    if(hubs && hubs.length!==words.length)throw Error('Incomplete word breadth data. Please reload.');
    this.hubs=hubs;
    this.words = words;
    this.index = new Map(words.map((word, index) => [word, index]));
    this.vectors = vectors;
    this.dimensions = dimensions;
  }
  hub(word) { return (this.hubs?.[this.index.get(word)]??0)/255; }
  cosine(a, b) {
    const ai = this.index.get(a), bi = this.index.get(b);
    if (ai === undefined || bi === undefined) throw Error('Choose words in the supported vocabulary.');
    let dot = 0;
    for (let d = 0; d < this.dimensions; d++) {
      dot += this.vectors[ai * this.dimensions + d] * this.vectors[bi * this.dimensions + d];
    }
    return Math.max(-1, Math.min(1, dot));
  }
}

export function launchRequirement(current, destination, baseline, arrival, minimum=.10, maximum=.21, capArrival=true) {
  const trip=capArrival?Math.abs(Math.min(destination,arrival)-Math.min(current,arrival)):Math.abs(destination-current);
  const fraction=Math.min(1,trip/Math.max(1e-6,arrival-baseline));
  return {required:minimum+(maximum-minimum)*fraction,trip_fraction:fraction};
}
export class Game {
  constructor(embeddings,start,target,threshold=.28,options={}) {
    start=start.trim().toLowerCase();target=target.trim().toLowerCase();threshold=Number(threshold);
    const {mode='fixed',rules}=options;
    const legacy=['distance-v1','fixed-threshold-v1','fixed-threshold-v2'].includes(rules);
    const golf=!rules||rules.startsWith('golf-');
    const modern=!rules||['golf-distance-v2','golf-fixed-v2','golf-distance-v3','golf-fixed-v3'].includes(rules);
    const launch_min=options.launch_min??(legacy?.25:golf?.10:.08),launch_max=options.launch_max??(legacy?.40:modern?.21:golf?.20:.18);
    if(!embeddings.index.has(start)||!embeddings.index.has(target))throw Error('Choose words in the supported vocabulary.');
    if(start===target)throw Error('Tee and hole words must differ.');
    if(!Number.isFinite(threshold)||threshold<.1||threshold>.9)throw Error('Green threshold must be between 0.1 and 0.9.');
    if(!['fixed','distance'].includes(mode))throw Error('Unknown shot mode.');
    if(!Number.isFinite(launch_min)||!Number.isFinite(launch_max)||launch_min<.01||launch_max>.9||launch_min>launch_max)throw Error('Shot requirements must be between 0.01 and 0.9, with short shots no harder than long shots.');
    const expected=mode==='distance'?'golf-distance-v3':'golf-fixed-v3';
    if(rules&&! [expected,...(mode==='distance'?['golf-distance-v2','golf-distance-v1','distance-v1','distance-v2','distance-v3']:['golf-fixed-v2','golf-fixed-v1','fixed-threshold-v1','fixed-threshold-v2','fixed-threshold-v3'])].includes(rules))throw Error('Unknown rule version.');
    if(rules==='fixed-threshold-v1'&&mode!=='fixed')throw Error('Historical rounds use fixed shot strength.');
    Object.assign(this,{e:embeddings,start,current:start,target,threshold,mode,launch_min,launch_max,rules:rules||expected,modern,automatic_shots:[]});
    this.baseline=embeddings.cosine(start,target);this.route=[start];this.history=[];this.won=false;this.best_progress=this.baseline;
    this.backward_allowance=modern?.01:Math.max(0,Math.min(.01,.05*(this.threshold-this.baseline)));
  }
  requirement(origin,word,current=this.e.cosine(origin,this.target),destination=this.e.cosine(word,this.target)) {
    const launch=launchRequirement(current,destination,this.baseline,this.threshold,this.launch_min,this.launch_max,
      ['distance-v3','golf-distance-v1','golf-distance-v2','golf-distance-v3'].includes(this.rules));
    if(this.mode==='fixed')launch.required=this.threshold;
    if(['golf-distance-v3','golf-fixed-v3'].includes(this.rules)){
      const forward=Math.min(1,Math.max(0,Math.min(destination,this.threshold)-Math.min(current,this.threshold))/Math.max(1e-6,this.threshold-this.baseline));
      const hub=Math.max(this.e.hub?.(origin)??0,this.e.hub?.(word)??0);
      launch.hub_surcharge=.035*hub*forward**2;
      launch.required+=launch.hub_surcharge;
    }
    return launch;
  }
  submit(word) {
    word=word.trim().toLowerCase();
    if(this.won)throw Error('Hole complete. Start a new hole.');
    if(!this.e.index.has(word))throw Error('That word is outside the supported vocabulary. No shot used.');
    if(this.rules==='fixed-threshold-v1') {
      if(word===this.start||this.history.some(e=>e.word===word))throw Error('That word has already been played. No shot used.');
    } else if(word===this.current)throw Error('The ball is already on that word. No shot used.');
    const launch=this.e.cosine(this.current,word),destination=this.e.cosine(word,this.target);
    const {required,trip_fraction,hub_surcharge}=this.requirement(this.current,word,undefined,destination);
    const boundary=destination+1e-7>=this.baseline;
    const forward=destination+1e-7>=this.e.cosine(this.current,this.target);
    const forwardOnly=['distance-v2','distance-v3','fixed-threshold-v3'].includes(this.rules);
    const isGolf=this.rules.startsWith('golf-'),connected=launch+1e-7>=required;
    const backtrack=this.modern&&!forward&&this.route.includes(word);
    const safe=backtrack||destination+1e-7>=this.best_progress-this.backward_allowance;
    const success=isGolf?connected&&safe:boundary&&(!forwardOnly||forward)&&connected,inside=destination+1e-7>=this.threshold;
    const result={word,origin:this.current,launch,destination,required,trip_fraction,boundary,success,inside,won:success&&inside,attempt:this.history.length+1};
    if(hub_surcharge!==undefined)result.hub_surcharge=hub_surcharge;
    if(forwardOnly||isGolf)result.forward=forward;
    if(isGolf)Object.assign(result,{connected,safe,outcome:result.won?'green':!connected?'miss':!safe?'water':backtrack?'backtrack':!forward?'recovery':'landed'});
    if(this.modern)result.backtrack=backtrack;
    this.history.push(result);if(success){this.current=word;this.route.push(word);this.best_progress=backtrack?destination:Math.max(this.best_progress,destination);}
    if(this.modern&&result.won&&word!==this.target){
      const automatic={word:this.target,origin:word,automatic:true,outcome:'putt',attempt:this.history.length+1,success:true,inside:true,won:true};
      this.automatic_shots.push(automatic);result.automatic_shot=automatic;this.current=this.target;this.route.push(this.target);
    }
    this.won=result.won;return result;
  }
  state() {
    return structuredClone({start:this.start,current:this.current,target:this.target,threshold:this.threshold,mode:this.mode,rules:this.rules,
      launch_min:this.launch_min,launch_max:this.launch_max,baseline:this.baseline,progress:this.e.cosine(this.current,this.target),
      attempts:this.history.length+this.automatic_shots.length,route:this.route,history:this.history,won:this.won,
      ...(this.modern?{automatic_shots:this.automatic_shots}:{}),
      ...(this.rules.startsWith('golf-')?{best_progress:this.best_progress,backward_allowance:this.backward_allowance}:{})});
  }
}
export function restoreGame(embeddings,saved) {
  const options={...saved,rules:saved.rules||'fixed-threshold-v1',mode:saved.mode||'fixed'};
  const restored=new Game(embeddings,saved.start,saved.target,saved.threshold,options);
  if(!Array.isArray(saved.history))throw Error('Saved scorecard is invalid.');
  for(const event of saved.history)restored.submit(event.word);
  return restored;
}

async function loadFile(path, binary = false, cache = 'default') {
  const response = await fetch(new URL(path, import.meta.url),{cache});
  if (!response.ok) throw Error(`Unable to load ${path}. Please reload to try again.`);
  return binary ? response.arrayBuffer() : response.json();
}

export function decodeHalf(buffer) {
  if(buffer.byteLength%2)throw Error('Incomplete word-vector download.');
  const view=new DataView(buffer), values=new Float32Array(buffer.byteLength/2);
  for(let i=0;i<values.length;i++){
    const bits=view.getUint16(i*2,true),sign=bits&0x8000?-1:1,exponent=(bits>>10)&31,fraction=bits&1023;
    if(exponent===31)throw Error('Invalid word-vector download.');
    values[i]=sign*(exponent===0?fraction*2**-24:(1+fraction/1024)*2**(exponent-15));
  }
  return values;
}
async function loadPackedModel(config) {
  const compressed=typeof DecompressionStream==='function';
  const url=new URL('./model/'+(compressed?config.vector_file:config.vector_fallback),import.meta.url);
  let cache,response;
  try{cache=await caches.open('word-golf-model-v1');response=await cache.match(url);}catch{}
  const cached=!!response;
  response??=await fetch(url,{cache:'force-cache'});
  if(!response.ok)throw Error('The word model could not load. Please reload.');
  const copy=response.clone();
  const buffer=compressed?await new Response(response.body.pipeThrough(new DecompressionStream('gzip'))).arrayBuffer():await response.arrayBuffer();
  if(buffer.byteLength!==config.vector_bytes)throw Error('Incomplete word-vector download. Please reload.');
  if(globalThis.crypto?.subtle){
    const digest=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(b=>b.toString(16).padStart(2,'0')).join('');
    if(digest!==config.vector_sha256){try{await cache?.delete(url);}catch{}throw Error('The downloaded word model is damaged. Please reload.');}
  }
  const vectors=decodeHalf(buffer);
  if(!cached)try{await cache?.put(url,copy);}catch{}
  return vectors;
}

export async function createBrowserClient() {
  const config=await loadFile('./model/config.json',false,'no-cache');
  const [words,vectors,hubBuffer]=await Promise.all([loadFile('./model/'+config.words_file),loadPackedModel(config),loadFile('./model/'+config.hub_file,true)]);
  if(globalThis.crypto?.subtle){
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',hubBuffer))].map(v=>v.toString(16).padStart(2,'0')).join('');
    if(hash!==config.hub_sha256)throw Error('Word breadth data is damaged. Please reload.');
  }
  const hubs=new Uint8Array(hubBuffer),embeddings=new Embeddings(words,vectors,config.dimensions,hubs);
  let game,historical,worker,sequence=0;
  const pending=new Map();
  async function assess(body,operation='assess'){
    if(typeof Worker==='undefined'){
      if(operation==='skill')return new (await import('./skill.mjs?v=golf-v24')).SkillAnalyser(embeddings).analyse(body.state);
      return (await import('./assessment.mjs?v=golf-v24')).assessHole(embeddings,body);
    }
    if(!worker){
      worker=new Worker(new URL('./assessment-worker.mjs?v=golf-v24',import.meta.url),{type:'module'});
      worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;pending.delete(data.id);data.error?p.reject(Error(data.error)):p.resolve(data.result);};
      worker.onerror=()=>{for(const p of pending.values())p.reject(Error('Hole assessment could not load. You can still choose a hole.'));pending.clear();worker.terminate();worker=null;};
      worker.postMessage({init:true,words,vectors,dimensions:config.dimensions,hubs});
    }
    return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});worker.postMessage({id,body,operation});});
  }
  return { config, async request(path, body) {
    if(path==='breadth')return endpointHubs(embeddings,body);
    if(path==='assess'||path==='skill')return assess(body,path);
    if (path === 'new') {
      const candidate=new Game(embeddings,body.start,body.target,body.threshold,body);
      if(body.validate_direct){
        const check=new Game(embeddings,body.start,body.target,body.threshold,body);
        if(check.submit(check.target).won)throw Error('These words allow a direct hole in one. Choose a more distant pair.');
      }
      game=candidate;return {state:game.state()};
    }
    if (path === 'restore') {
      let model=embeddings;
      if(!['golf-distance-v2','golf-fixed-v2','golf-distance-v3','golf-fixed-v3'].includes(body.state.rules)){
        if(!historical){
          const buffer=await loadFile('./model/vectors.f32',true,'force-cache');
          const view=new DataView(buffer);
          const exact=Float32Array.from({length:buffer.byteLength/4},(_,i)=>view.getFloat32(i*4,true));
          historical=new Embeddings(words.slice(0,config.historical_vocabulary),exact,config.dimensions);
        }
        model=historical;
      }
      game=restoreGame(model,body.state);return {state:game.state()};
    }
    if (path === 'submit') {
      if (!game) throw Error('Start a new hole first.');
      const event=game.submit(body.word);return {event,state:game.state()};
    }
    throw Error('Unknown game operation.');
  }};
}
