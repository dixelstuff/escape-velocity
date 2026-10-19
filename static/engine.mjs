/** Full-precision GloVe cosine scoring, independent of the map and animations. */
export class Embeddings {
  constructor(words, vectors, dimensions = 300) {
    if (vectors.length !== words.length * dimensions) throw Error('Incomplete word-vector download. Please reload.');
    this.words = words;
    this.index = new Map(words.map((word, index) => [word, index]));
    this.vectors = vectors;
    this.dimensions = dimensions;
  }
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

export function launchRequirement(current, destination, baseline, arrival, minimum=.08, maximum=.18) {
  const fraction=Math.min(1,Math.abs(destination-current)/Math.max(1e-6,arrival-baseline));
  return {required:minimum+(maximum-minimum)*fraction,trip_fraction:fraction};
}
export class Game {
  constructor(embeddings,start,target,threshold=.12,options={}) {
    start=start.trim().toLowerCase();target=target.trim().toLowerCase();threshold=Number(threshold);
    const {mode='fixed',rules}=options;
    const legacy=rules&& !['distance-v2','fixed-threshold-v3'].includes(rules);
    const launch_min=options.launch_min??(legacy?.25:.08),launch_max=options.launch_max??(legacy?.40:.18);
    if(!embeddings.index.has(start)||!embeddings.index.has(target))throw Error('Choose words in the supported vocabulary.');
    if(start===target)throw Error('Start and target must differ.');
    if(!Number.isFinite(threshold)||threshold<.1||threshold>.9)throw Error('Arrival threshold must be between 0.1 and 0.9.');
    if(!['fixed','distance'].includes(mode))throw Error('Unknown launch mode.');
    if(!Number.isFinite(launch_min)||!Number.isFinite(launch_max)||launch_min<.01||launch_max>.9||launch_min>launch_max)throw Error('Launch requirements must be between 0.01 and 0.9, with short hops no harder than long jumps.');
    const expected=mode==='distance'?'distance-v2':'fixed-threshold-v3';
    if(rules&&! [expected,...(mode==='distance'?['distance-v1']:['fixed-threshold-v1','fixed-threshold-v2'])].includes(rules))throw Error('Unknown rule version.');
    if(rules==='fixed-threshold-v1'&&mode!=='fixed')throw Error('Legacy journeys use fixed launches.');
    Object.assign(this,{e:embeddings,start,current:start,target,threshold,mode,launch_min,launch_max,rules:rules||expected});
    this.baseline=embeddings.cosine(start,target);this.route=[start];this.history=[];this.won=false;
  }
  submit(word) {
    word=word.trim().toLowerCase();
    if(this.won)throw Error('Journey complete. Start a new puzzle.');
    if(!this.e.index.has(word))throw Error('That word is outside the supported vocabulary. No attempt used.');
    if(this.rules==='fixed-threshold-v1') {
      if(word===this.start||this.history.some(e=>e.word===word))throw Error('That planet has already been tried. No attempt used.');
    } else if(word===this.current)throw Error('You are already on that planet. No attempt used.');
    const launch=this.e.cosine(this.current,word),destination=this.e.cosine(word,this.target);
    let {required,trip_fraction}=launchRequirement(this.e.cosine(this.current,this.target),destination,this.baseline,this.threshold,this.launch_min,this.launch_max);
    if(this.mode==='fixed')required=this.threshold;
    const boundary=destination+1e-7>=this.baseline;
    const forward=destination+1e-7>=this.e.cosine(this.current,this.target);
    const forwardOnly=['distance-v2','fixed-threshold-v3'].includes(this.rules);
    const success=boundary&&(!forwardOnly||forward)&&launch+1e-7>=required,inside=destination+1e-7>=this.threshold;
    const result={word,origin:this.current,launch,destination,required,trip_fraction,boundary,success,inside,won:success&&inside,attempt:this.history.length+1};
    if(forwardOnly)result.forward=forward;
    this.history.push(result);if(success){this.current=word;this.route.push(word);}this.won=result.won;return result;
  }
  state() {
    return structuredClone({start:this.start,current:this.current,target:this.target,threshold:this.threshold,mode:this.mode,rules:this.rules,
      launch_min:this.launch_min,launch_max:this.launch_max,baseline:this.baseline,progress:this.e.cosine(this.current,this.target),
      attempts:this.history.length,route:this.route,history:this.history,won:this.won});
  }
}
export function restoreGame(embeddings,saved) {
  const options={...saved,rules:saved.rules||'fixed-threshold-v1',mode:saved.mode||'fixed'};
  const restored=new Game(embeddings,saved.start,saved.target,saved.threshold,options);
  if(!Array.isArray(saved.history))throw Error('Saved journey is invalid.');
  for(const event of saved.history)restored.submit(event.word);
  return restored;
}

async function loadFile(path, binary = false, cache = 'default') {
  const response = await fetch(new URL(path, import.meta.url),{cache});
  if (!response.ok) throw Error(`Unable to load ${path}. Please reload to try again.`);
  return binary ? response.arrayBuffer() : response.json();
}

export async function createBrowserClient() {
  const [config, words, buffer] = await Promise.all([
    loadFile('./model/config.json',false,'no-cache'), loadFile('./model/words.json'), loadFile('./model/vectors.f32', true)
  ]);
  // Data is explicitly little-endian float32. Modern browser platforms use little-endian.
  const littleEndian = new Uint8Array(new Uint32Array([1]).buffer)[0] === 1;
  let vectors;
  if (littleEndian) vectors = new Float32Array(buffer);
  else {
    const view = new DataView(buffer);
    vectors = Float32Array.from({length:buffer.byteLength / 4}, (_, i) => view.getFloat32(i * 4, true));
  }
  const embeddings = new Embeddings(words, vectors, config.dimensions);
  let game;
  return { config, request(path, body) {
    if (path === 'new') {
      game = new Game(embeddings, body.start, body.target, body.threshold, body);
      return {state:game.state()};
    }
    if (path === 'restore') {
      game = restoreGame(embeddings, body.state);
      return {state:game.state()};
    }
    if (path === 'submit') {
      if (!game) throw Error('Start a new journey first.');
      const event = game.submit(body.word);
      return {event, state:game.state()};
    }
    throw Error('Unknown game operation.');
  }};
}
