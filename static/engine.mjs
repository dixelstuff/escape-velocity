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

export class Game {
  constructor(embeddings, start, target, threshold = 0.5) {
    start = start.trim().toLowerCase();
    target = target.trim().toLowerCase();
    threshold = Number(threshold);
    if (!embeddings.index.has(start) || !embeddings.index.has(target)) throw Error('Choose words in the supported vocabulary.');
    if (start === target) throw Error('Start and target must differ.');
    if (!Number.isFinite(threshold) || threshold < 0.1 || threshold > 0.9) throw Error('Threshold must be between 0.1 and 0.9.');
    this.e = embeddings;
    this.start = this.current = start;
    this.target = target;
    this.threshold = threshold;
    this.baseline = embeddings.cosine(start, target);
    this.route = [start];
    this.history = [];
    this.won = false;
  }
  submit(word) {
    word = word.trim().toLowerCase();
    if (this.won) throw Error('Journey complete. Start a new puzzle.');
    if (!this.e.index.has(word)) throw Error('That word is outside the supported vocabulary. No attempt used.');
    if (word === this.start || this.history.some(event => event.word === word)) throw Error('That planet has already been tried. No attempt used.');
    const launch = this.e.cosine(this.current, word);
    const destination = this.e.cosine(word, this.target);
    const boundary = destination + 1e-7 >= this.baseline;
    const success = boundary && launch + 1e-7 >= this.threshold;
    const inside = destination + 1e-7 >= this.threshold;
    const result = {word, origin: this.current, launch, destination, boundary, success, inside,
      won: success && inside, attempt: this.history.length + 1};
    this.history.push(result);
    if (success) { this.current = word; this.route.push(word); }
    this.won = result.won;
    return result;
  }
  state() {
    return structuredClone({start:this.start, current:this.current, target:this.target, threshold:this.threshold,
      baseline:this.baseline, progress:this.e.cosine(this.current,this.target), attempts:this.history.length,
      route:this.route, history:this.history, won:this.won});
  }
}

export function restoreGame(embeddings, saved) {
  const restored = new Game(embeddings, saved.start, saved.target, saved.threshold);
  if (!Array.isArray(saved.history)) throw Error('Saved journey is invalid.');
  for (const event of saved.history) restored.submit(event.word);
  return restored;
}

async function loadFile(path, binary = false) {
  const response = await fetch(new URL(path, import.meta.url));
  if (!response.ok) throw Error(`Unable to load ${path}. Please reload to try again.`);
  return binary ? response.arrayBuffer() : response.json();
}

export async function createBrowserClient() {
  const [config, words, buffer] = await Promise.all([
    loadFile('./model/config.json'), loadFile('./model/words.json'), loadFile('./model/vectors.f32', true)
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
      game = new Game(embeddings, body.start, body.target, body.threshold);
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
