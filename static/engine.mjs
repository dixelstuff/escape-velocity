import {familyVariants} from './word-families.mjs?v=golf-v175';
import {STROKE_PLAY,maximumStrokes,retryPrefix} from './stroke-play.mjs?v=golf-v175';
import {progressiveModel} from './progressive-model.mjs?v=golf-v175';
import {withHeadwind,headwindSettings} from './headwind.mjs?v=golf-v175';
import { chipRange } from './chip-range.mjs?v=golf-v175';
import { endpointHubs } from './hub-warning.mjs?v=golf-v175';
import {withWordModel} from './word-model.mjs?v=golf-v175';
import {localScalingModel} from './local-scaling.mjs?v=golf-v175';
import {successSettings,parUnreachable,challengeFailure} from './success-mode.mjs?v=golf-v175';
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
    if(this.rowReady&&(!this.rowReady(ai)||!this.rowReady(bi)))throw Error('This word is still loading. Try again.');
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
  constructor(embeddings,start,target,threshold=undefined,options={}) {
    const waypoint=options.waypoint;
    threshold=options.final_threshold??threshold;
    const finalTarget=String(options.final_target??target).trim().toLowerCase();
    if(waypoint){
      if(typeof waypoint.word!=='string'||!Number.isFinite(waypoint.threshold??.265)||(waypoint.threshold??.265)<.1||(waypoint.threshold??.265)>.9)throw Error('Invalid waypoint settings.');
      target=waypoint.word.trim().toLowerCase();
    }
    const headwind=headwindSettings(options.headwind);embeddings=withHeadwind(withWordModel(embeddings,options.word_model),headwind);
    start=start.trim().toLowerCase();target=target.trim().toLowerCase();threshold=Number(threshold??(options.rules ? .28 : .27));
    const {mode='fixed',rules,finish_mode='green'}=options;
    if(!['green','range'].includes(finish_mode))throw Error('Unknown finish mode.');
    const legacy=['distance-v1','fixed-threshold-v1','fixed-threshold-v2'].includes(rules);
    const golf=!rules||rules.startsWith('golf-');
    const modern=!rules||['golf-distance-v2','golf-fixed-v2','golf-distance-v3','golf-fixed-v3'].includes(rules);
    const launch_min=options.launch_min??(legacy?.25:golf?(rules?.10:.095):.08),launch_max=options.launch_max??(legacy?.40:modern?(rules ? .21 : .215):golf?.20:.18);
    if(!embeddings.index.has(start)||!embeddings.index.has(target))throw Error('Choose words in the supported vocabulary.');
    if(start===target)throw Error('Tee and hole words must differ.');
    if(!Number.isFinite(threshold)||threshold<.1||threshold>.9)throw Error('Green threshold must be between 0.1 and 0.9.');
    if(!['fixed','distance'].includes(mode))throw Error('Unknown shot mode.');
    if(!Number.isFinite(launch_min)||!Number.isFinite(launch_max)||launch_min<.01||launch_max>.9||launch_min>launch_max)throw Error('Shot requirements must be between 0.01 and 0.9, with short shots no harder than long shots.');
    const expected=mode==='distance'?'golf-distance-v3':'golf-fixed-v3';
    if(rules&&! [expected,...(mode==='distance'?['golf-distance-v2','golf-distance-v1','distance-v1','distance-v2','distance-v3']:['golf-fixed-v2','golf-fixed-v1','fixed-threshold-v1','fixed-threshold-v2','fixed-threshold-v3'])].includes(rules))throw Error('Unknown rule version.');
    if(rules==='fixed-threshold-v1'&&mode!=='fixed')throw Error('Historical rounds use fixed shot strength.');
    Object.assign(this,{word_model:embeddings.word_model,headwind,e:embeddings,start,current:start,target,threshold,mode,launch_min,launch_max,rules:rules||expected,modern,finish_mode,automatic_shots:[]});
    if(waypoint){
      if(!modern)throw Error('Waypoint holes need current golf rules.');
      if(waypoint.turn&&!['up','down'].includes(waypoint.turn))throw Error('Unknown dogleg direction.');
      if(!embeddings.index.has(finalTarget)||finalTarget===target||finalTarget===start)throw Error('Choose three different supported words.');
      this.waypoint={word:target,threshold:waypoint.threshold??.265,...(waypoint.turn?{turn:waypoint.turn}:{})};
      this.final_target=finalTarget;this.final_threshold=threshold;this.threshold=this.waypoint.threshold;
      this.stage=0;this.leg_start=start;
      this.waypoint_auto_finish=options.waypoint_auto_finish??!Array.isArray(options.history);
    }
    this.allow_backtracking=options.allow_backtracking??Array.isArray(options.history);
    this.golden_paths=Array.isArray(options.golden_paths)?options.golden_paths.map(path=>path.map(w=>String(w).trim().toLowerCase())):[];
    this.resumed_from=options.resumed_from;
    this.challenge=successSettings(options.challenge);this.challenge_failed=false;
    this.baseline=embeddings.cosine(start,target);this.route=[start];this.history=[];this.won=false;this.best_progress=this.baseline;
    this.plural_rescue=['golf-distance-v3','golf-fixed-v3'].includes(this.rules)&&(options.plural_rescue??!Array.isArray(options.history));
    this.continuous_play=options.continuous_play??!Array.isArray(options.history);
    this.family_rescue=['golf-distance-v3','golf-fixed-v3'].includes(this.rules)&&(options.family_rescue??!Array.isArray(options.history));
    this.plural_tolerance=options.plural_tolerance??(Array.isArray(options.history)?.02:.025);
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
  finishesFrom(word,destination=this.e.cosine(word,this.target)) {
    if(destination+1e-7>=this.threshold)return true;
    if(this.waypoint&&this.stage===0)return false;
    if(!this.modern||this.finish_mode!=='range'||word===this.start)return false;
    return destination+1e-7>=this.requirement(word,this.target,destination,this.e.cosine(this.target,this.target)).required;
  }
  finishShortfall(word,destination) {
    if(this.finishesFrom(word,destination))return 0;
    let required=this.threshold;
    if(!(this.waypoint&&this.stage===0)&&this.modern&&this.finish_mode==='range'&&word!==this.start)
      required=Math.min(required,this.requirement(word,this.target,destination,this.e.cosine(this.target,this.target)).required);
    return required-destination;
  }
  shotResult(word,displayWord=word) {
    const launch=this.e.cosine(this.current,word),destination=this.e.cosine(word,this.target);
    const {required,trip_fraction,hub_surcharge}=this.requirement(this.current,word,undefined,destination);
    const boundary=destination+1e-7>=this.baseline;
    const forward=destination+1e-7>=this.e.cosine(this.current,this.target);
    const forwardOnly=['distance-v2','distance-v3','fixed-threshold-v3'].includes(this.rules);
    const isGolf=this.rules.startsWith('golf-'),connected=launch+1e-7>=required;
    const backtrack=this.modern&&this.allow_backtracking!==false&&!forward&&this.route.includes(displayWord);
    const safe=backtrack||destination+1e-7>=this.best_progress-this.backward_allowance;
    const success=isGolf?connected&&safe:boundary&&(!forwardOnly||forward)&&connected,inside=destination+1e-7>=this.threshold;
    const result={word:displayWord,origin:this.current,launch,destination,required,trip_fraction,boundary,success,inside,won:success&&this.finishesFrom(word,destination),attempt:this.history.length+1};
    if(hub_surcharge!==undefined)result.hub_surcharge=hub_surcharge;
    if(forwardOnly||isGolf)result.forward=forward;
    if(isGolf)Object.assign(result,{connected,safe,outcome:result.won?'green':!connected?'miss':!safe?'water':backtrack?'backtrack':!forward?'recovery':'landed'});
    if(this.modern)result.backtrack=backtrack;
    if(word!==displayWord)result.scoring_word=word;
    return result;
  }
  isGolden(word){return this.challenge?.version===STROKE_PLAY&&this.challenge.par<=4&&this.golden_paths.some(path=>path.length===this.challenge.par-2&&path.length===this.history.length&&path.every((w,i)=>w===this.history[i].word)&&path.at(-1)===word)&&(!this.waypoint||this.history.at(-1)?.stage===1);}
  pluralResult(word) {
    const original=this.shotResult(word);
    if(!this.plural_rescue||word===this.target||original.won)return original;
    const hitNear=!original.connected&&original.required-original.launch<=this.plural_tolerance+1e-7;
    const finishNear=original.success&&this.finishShortfall(word,original.destination)<=this.plural_tolerance+1e-7;
    if(!hitNear&&!finishNear)return original;
    const variants=new Set([word+'s',word+'es',...(word.endsWith('s')?[word.slice(0,-1)]:[]),...(word.endsWith('es')?[word.slice(0,-2)]:[])]);
    const choices=[];
    for(const candidate of variants){
      if(candidate===this.current||candidate===this.target||!this.e.index.has(candidate)||this.e.cosine(word,candidate)<=.65)continue;
      const result=this.shotResult(candidate,word);
      // Rescue contact or finishing only; never rescue a backward/water hit.
      if(!original.safe||!result.success)continue;
      if(hitNear||finishNear&&result.won)choices.push(result);
    }
    choices.sort((a,b)=>Number(b.won)-Number(a.won)||this.e.cosine(word,b.scoring_word)-this.e.cosine(word,a.scoring_word)||a.scoring_word.localeCompare(b.scoring_word));
    return choices[0]??original;
  }
  /** Existing plural rescue wins first. New saves explicitly retain the family rule. */
  pluralShot(word) {
    const original=this.pluralResult(word);
    if(!this.family_rescue||original.won||original.scoring_word||word===this.target||!original.safe)return original;
    const hitNear=!original.connected&&original.required-original.launch<=.025+1e-7;
    const finishNear=original.success&&this.finishShortfall(word,original.destination)<=.025+1e-7;
    if(!hitNear&&!finishNear)return original;
    const choices=[];
    for(const candidate of familyVariants(word)){
      if(candidate===this.current||candidate===this.target||!this.e.index.has(candidate))continue;
      const similarity=this.e.cosine(word,candidate);if(similarity<=.65)continue;
      const result=this.shotResult(candidate,word);
      if(result.success&&(hitNear||finishNear&&result.won))choices.push({result,similarity});
    }
    choices.sort((a,b)=>Number(b.result.won)-Number(a.result.won)||b.similarity-a.similarity||a.result.scoring_word.localeCompare(b.result.scoring_word));
    return choices[0]?.result??original;
  }
  submit(word) {
    word=word.trim().toLowerCase();
    if(this.won)throw Error('Hole complete. Start a new hole.');
    if(this.challenge_failed)throw Error(challengeFailure({challenge:this.challenge,challenge_failed:true,history:this.history})+' Start the next attempt.');
    if(this.waypoint&&this.stage===0&&word===this.final_target)throw Error(`Reach ${this.waypoint.word.toUpperCase()} before playing the hole word. No shot used.`);
    if(this.waypoint&&this.stage===1&&word===this.waypoint.word&&this.history.some(h=>h.success&&h.word===word))throw Error('That waypoint word has already been played. Try another word.');
    if(!this.e.index.has(word))throw Error('That word is outside the supported vocabulary. No shot used.');
    if(this.rules==='fixed-threshold-v1') {
      if(word===this.start||this.history.some(e=>e.word===word))throw Error('That word has already been played. No shot used.');
    } else if(word===this.current)throw Error('The ball is already on that word. No shot used.');
    const result=this.pluralShot(word),{success,destination,inside,backtrack}=result;
    const scoringWord=result.scoring_word??word;
    let finishDestination=destination,finishInside=inside;
    if(this.resumed_from&&result.attempt<=this.resumed_from.through)result.assumed=true;
    if(this.waypoint)Object.assign(result,{stage:this.stage,leg_target:this.target,leg_baseline:this.baseline,leg_threshold:this.threshold});
    this.history.push(result);if(success){this.current=word;this.route.push(word);this.best_progress=backtrack?destination:Math.max(this.best_progress,destination);}
    if(this.waypoint&&this.stage===0&&success&&inside){
      result.won=false;result.outcome='waypoint';result.waypoint_reached=true;
      this.stage=1;this.target=this.final_target;this.threshold=this.final_threshold;this.leg_start=word;
      this.baseline=this.e.cosine(word,this.target);this.best_progress=this.baseline;
      if(this.waypoint_auto_finish){
        finishDestination=this.e.cosine(scoringWord,this.target);finishInside=finishDestination+1e-7>=this.threshold;
        result.won=this.finishesFrom(scoringWord,finishDestination);
        if(result.won)result.waypoint_finish=true;
      }
    }
    if((!this.continuous_play||this.challenge?.version!==STROKE_PLAY)&&this.challenge&&this.challenge.version!=='waypoint-trial-v1'&&result.won&&word!==this.target&&this.history.length+1>(this.challenge.version===STROKE_PLAY?(this.replay_stroke_cap??maximumStrokes(this.challenge.par)):this.challenge.par)&&!this.isGolden(word)){result.won=false;result.outcome='landed';delete result.waypoint_finish;}
    if(result.won&&this.isGolden(word)){result.golden_holed=true;result.finish_reason='golden';this.current=this.target;this.route.push(this.target);}
    if(this.modern&&result.won&&word!==this.target&&!result.golden_holed){
      const automatic={word:this.target,origin:word,automatic:true,outcome:result.waypoint_reached?'chip':finishInside?'putt':'chip',attempt:this.history.length+1,success:true,inside:true,won:true};
      if(this.finish_mode==='range'){result.finish_reason=finishInside?'green':'range';automatic.finish_reason=result.finish_reason;Object.assign(automatic,this.requirement(scoringWord,this.target,finishDestination,this.e.cosine(this.target,this.target)),{launch:finishDestination,destination:this.e.cosine(this.target,this.target)});}
      this.automatic_shots.push(automatic);result.automatic_shot=automatic;this.current=this.target;this.route.push(this.target);
    }
    this.won=result.won;
    this.challenge_failed=parUnreachable(this);
    return result;
  }
  state() {
    return structuredClone({start:this.start,current:this.current,target:this.target,threshold:this.threshold,mode:this.mode,rules:this.rules,
      launch_min:this.launch_min,launch_max:this.launch_max,baseline:this.baseline,progress:this.e.cosine(this.current,this.target),
      attempts:this.history.length+this.automatic_shots.length,route:this.route,history:this.history,won:this.won,
      ...(this.abandoned?{abandoned:true}:{}),
      ...(this.golden_paths.length?{golden_paths:this.golden_paths}:{}),
      ...(this.resumed_from?{resumed_from:this.resumed_from}:{}),
      ...(this.waypoint?{waypoint:this.waypoint,final_target:this.final_target,final_threshold:this.final_threshold,stage:this.stage,leg_start:this.leg_start,...(this.waypoint_auto_finish?{waypoint_auto_finish:true}:{})}:{}),
      ...(this.modern?{plural_rescue:this.plural_rescue,family_rescue:this.family_rescue,continuous_play:this.continuous_play,plural_tolerance:this.plural_tolerance,...(this.allow_backtracking===false?{allow_backtracking:false}:{})}:{}),
      ...(this.word_model?{word_model:this.word_model}:{}),...(this.finish_mode==='range'?{finish_mode:this.finish_mode}:{}),...(this.headwind?{headwind:this.headwind}:{}),
      ...(this.challenge?{challenge:this.challenge,challenge_failed:this.challenge_failed}:{}),
      ...(this.modern?{automatic_shots:this.automatic_shots}:{}),
      ...(this.rules.startsWith('golf-')?{best_progress:this.best_progress,backward_allowance:this.backward_allowance}:{})});
  }
}
/** Check the actual target-word shot on each leg, independently of the estimate. */
export function waypointLegAccess(embeddings,settings){
 const initial=new Game(embeddings,settings.start,settings.target,settings.threshold??.27,settings);
 if(!initial.waypoint)throw Error('Choose a waypoint word.');
 const legs=[[initial.start,initial.waypoint.word,initial.waypoint.threshold],[initial.waypoint.word,initial.final_target,initial.final_threshold]].map(([start,target,threshold])=>{
  const game=new Game(initial.e,start,target,threshold,{mode:initial.mode,launch_min:initial.launch_min,launch_max:initial.launch_max,rules:initial.rules,finish_mode:'range'}),shot=game.submit(target);
  return {start,target,direct:shot.success,contact:shot.launch,required:shot.required};
 });
 const invalid=legs.filter(leg=>leg.direct);
 return {allowed:!invalid.length,legs,message:invalid.map(leg=>`${leg.target.toUpperCase()} can be played directly from ${leg.start.toUpperCase()}.`).join(' ')};
}

export function restoreGame(embeddings,saved) {
  const options={...saved,rules:saved.rules||'fixed-threshold-v1',mode:saved.mode||'fixed'};
  const restored=new Game(embeddings,saved.start,saved.target,saved.final_threshold??saved.threshold,options);
  if(!Array.isArray(saved.history))throw Error('Saved scorecard is invalid.');
  if(!saved.continuous_play&&saved.challenge?.version===STROKE_PLAY&&Math.max(saved.history.length,saved.attempts??0)>maximumStrokes(saved.challenge.par))restored.replay_stroke_cap=saved.history.length+(saved.automatic_shots?.length??0)+1;
  for(const event of saved.history)restored.submit(event.word);
  if(restored.replay_stroke_cap){delete restored.replay_stroke_cap;if(!restored.won)restored.challenge_failed=true;}
  if(saved.abandoned){restored.challenge_failed=true;restored.abandoned=true;}
  return restored;
}

/** Trial-only retry: replay an intact successful prefix, preserving its counted shots. */
export function resumeWaypoint(embeddings,source,through,challenge,sourceId=null){
  if(!source.waypoint||source.challenge?.version!=='waypoint-trial-v1'||!source.challenge_failed||challenge?.id!==source.challenge.id||challenge.version!=='waypoint-trial-v1'||challenge.par!==source.challenge.par||challenge.attempt<=source.challenge.attempt)throw Error('Choose a word from the previous waypoint attempt.');
  if(!Number.isInteger(through)||through<0||through>source.history.length||source.history.slice(0,through).some(h=>!h.success||h.automatic))throw Error('Only successful shots can be carried forward.');
  const restored=new Game(embeddings,source.start,source.final_target,source.final_threshold,{...source,challenge,resumed_from:{attempt:source.challenge.attempt,through,...(sourceId?{journey_id:sourceId}:{})}});
  for(const event of source.history.slice(0,through)){
    const actual=restored.submit(event.word);
    if(!actual.success||restored.won||restored.challenge_failed)throw Error('That position cannot be resumed.');
  }
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

export async function createBrowserClient({progressive=true,onProgress}={}) {
  const config=await loadFile('./model/config.json',false,'no-cache');
  const [words,hubBuffer]=await Promise.all([loadFile('./model/'+config.words_file),loadFile('./model/'+config.hub_file,true)]);
  const loader=progressive&&config.progressive?await progressiveModel(config,words,decodeHalf,onProgress):null;
  const vectors=loader?.vectors??await loadPackedModel(config);
  if(globalThis.crypto?.subtle){
    const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',hubBuffer))].map(v=>v.toString(16).padStart(2,'0')).join('');
    if(hash!==config.hub_sha256)throw Error('Word breadth data is damaged. Please reload.');
  }
  const hubs=new Uint8Array(hubBuffer),embeddings=new Embeddings(words,vectors,config.dimensions,hubs);
  if(loader)embeddings.rowReady=i=>!!loader.ready[i];
  function variants(word){if(typeof word!=='string')return [];word=word.trim().toLowerCase();return [word,...familyVariants(word),word+'s',word+'es',...(word.endsWith('s')?[word.slice(0,-1)]:[]),...(word.endsWith('es')?[word.slice(0,-2)]:[])];}
  async function prepare(value){
    if(!loader)return;
    if((value?.state??value)?.headwind){await loader.whenComplete();return;}
    const needed=[];
    function visit(v,key='word'){if(typeof v==='string'){if(['word','start','current','target','final_target','origin','scoring_word','route'].includes(key))needed.push(...variants(v));}else if(Array.isArray(v))v.forEach(item=>visit(item,key));else if(v&&typeof v==='object')for(const [k,item] of Object.entries(v))visit(item,k);}
    visit(value);await loader.ensureWords(needed);
  }
  function probe(saved){return Object.assign(Object.create(Game.prototype),saved,{e:withHeadwind(withWordModel(embeddings,saved.word_model),saved.headwind),modern:['golf-distance-v2','golf-fixed-v2','golf-distance-v3','golf-fixed-v3'].includes(saved.rules)});}
  const models=new Map([['',embeddings]]),loading=new Map();embeddings.wordModels=models;
  async function ensureModel(id=''){
    if(!id)return embeddings;
    if(models.has(id))return models.get(id);
    if(!config.word_models?.[id])throw Error('Unknown word model.');
    if(!loading.has(id))loading.set(id,(async()=>{
      const profile=config.word_models[id];let model;
      if(profile.algorithm==='ls15-v1'){
        await loader?.whenComplete();
        if(profile.base_vector_sha256!==config.vector_sha256)throw Error('Local-scaling data does not match this word model.');
        const buffer=await loadFile('./model/'+profile.radius_file,true,'force-cache');
        if(buffer.byteLength!==profile.radius_bytes)throw Error('Incomplete local-scaling data. Please reload.');
        if(globalThis.crypto?.subtle){const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',buffer))].map(v=>v.toString(16).padStart(2,'0')).join('');if(hash!==profile.radius_sha256)throw Error('Local-scaling data is damaged. Please reload.');}
        const view=new DataView(buffer),radii=Float32Array.from({length:words.length},(_,i)=>view.getFloat32(i*4,true));
        model=localScalingModel(embeddings,radii,profile.scaling,id);
      }else model=new Embeddings(words,await loadPackedModel(profile),config.dimensions,hubs);
      model.word_model=id;model.wordModels=models;models.set(id,model);return model;
    })().catch(error=>{loading.delete(id);throw error;}));
    return loading.get(id);
  }
  let game,historical,worker,sequence=0;const workerModels=new Set();
  // Previously played words and their variants are already loaded. Keep retry
  // selection synchronous so mobile focus stays in the native tap gesture.
  function retryNow(saved,through,attempt){
    const settings=retryPrefix(saved,through,attempt);
    const candidate=new Game(embeddings,saved.start,saved.final_target??saved.target,saved.final_threshold??saved.threshold,settings);
    for(const event of saved.history.slice(0,through))candidate.submit(event.word);
    game=candidate;return {state:game.state()};
  }
  function restoreRetry(saved){const candidate=restoreGame(embeddings,saved);game=candidate;return {state:game.state()};}
  const pending=new Map();
  async function assess(body,operation='assess'){
    await loader?.whenComplete();
    const model=await ensureModel((body.state??body).word_model);
    if(typeof Worker==='undefined'){
      if(operation==='assess-waypoint')return (await import('./waypoint-assessment.mjs?v=golf-v175')).assessWaypointHole(model,body);
      if(operation==='skill')return new (await import('./skill.mjs?v=golf-v175')).SkillAnalyser(model).analyse(body.state);
      return (await import('./assessment.mjs?v=golf-v175')).assessHole(model,body);
    }
    if(!worker){
      worker=new Worker(new URL('./assessment-worker.mjs?v=golf-v175',import.meta.url),{type:'module'});
      worker.onmessage=({data})=>{const p=pending.get(data.id);if(!p)return;pending.delete(data.id);data.error?p.reject(Error(data.error)):p.resolve(data.result);};
      worker.onerror=()=>{for(const p of pending.values())p.reject(Error('Hole assessment could not load. You can still choose a hole.'));pending.clear();worker.terminate();worker=null;workerModels.clear();};

    }
    const profile=model.word_model??'';
    if(!workerModels.has(profile)){worker.postMessage({init:true,profile,words,vectors:model.vectors,dimensions:config.dimensions,hubs,localScaling:model.localScaling});workerModels.add(profile);}
    return new Promise((resolve,reject)=>{const id=++sequence;pending.set(id,{resolve,reject});worker.postMessage({id,body,operation});});
  }
  return { config,retryNow,restoreRetry, prefetch(word){return prepare(word);},startBackground(){return loader?.startBackground()??Promise.resolve();},canFinish(state){return probe(state).finishesFrom(state.current,state.progress);},chipRange(state){return chipRange(probe(state));}, async request(path, body) {
    if(path==='display'){const saved=body.state;game=null;return {state:structuredClone(saved)};}
    if(path==='breadth')return endpointHubs(embeddings,body);
    await ensureModel((body.state??body).word_model);
    if(path==='route-review'){await loader?.whenComplete();return (await import('./route-review.mjs?v=golf-v175')).reviewRoute(embeddings,body.state);}
    if(path==='assess'||path==='assess-waypoint'||path==='skill')return assess(body,path);
    if(!['assess','skill'].includes(path))await prepare(path==='submit'?{...game?.state(),word:body.word}:body);
    if(path==='waypoint-access')return waypointLegAccess(embeddings,body);
    if (path === 'new') {
      if(body.validate_waypoint){const validation=waypointLegAccess(embeddings,body);if(!validation.allowed)throw Error(validation.message+' Choose a less directly connected pair.');}
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
    if(path==='retry-prefix')return retryNow(body.state,body.through,body.attempt);
    if(path==='resume-waypoint'){
      if(!game?.waypoint||game.history.length||game.challenge_failed||game.won)throw Error('Start the next attempt before choosing a word.');
      const candidate=resumeWaypoint(embeddings,body.state,body.through,game.challenge,body.source_id);
      if(candidate.start!==game.start||candidate.final_target!==game.final_target||candidate.waypoint.word!==game.waypoint.word||candidate.word_model!==game.word_model)throw Error('Choose a word from this hole and model.');
      game=candidate;return {state:game.state()};
    }
    if (path === 'submit') {
      if (!game) throw Error('Start a new hole first.');
      const event=game.submit(body.word);return {event,state:game.state()};
    }
    throw Error('Unknown game operation.');
  }};
}
