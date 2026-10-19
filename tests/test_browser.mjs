import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Embeddings, Game } from '../static/engine.mjs';
const root = new URL('../', import.meta.url);
const read = path => readFileSync(new URL(path, root));
const words = JSON.parse(read('static/model/words.json'));
const bytes = read('static/model/vectors.f32');
const vectors = new Float32Array(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength));
const embeddings = new Embeddings(words, vectors);
const fixtures = JSON.parse(read('tests/browser-fixtures.json'));
function compare(actual, expected) {
  for (const [key, value] of Object.entries(expected)) {
    if (typeof value === 'number' && !['attempt','attempts'].includes(key)) assert.ok(Math.abs(actual[key] - value) < 1e-6, `${key}: ${actual[key]} vs ${value}`);
    else if (Array.isArray(value)) { assert.equal(actual[key].length,value.length); value.forEach((v,i) => typeof v === 'object' ? compare(actual[key][i],v) : assert.deepEqual(actual[key][i],v)); }
    else assert.deepEqual(actual[key],value,key);
  }
}
for (const fixture of fixtures) {
  const game = new Game(embeddings, fixture.start, fixture.target, fixture.threshold);
  const initial = game.state();
  for (const step of fixture.steps) {
    if (step.error) assert.throws(() => game.submit(step.word));
    else compare(game.submit(step.word), step.event);
    compare(game.state(), step.state);
  }
  assert.equal(initial.attempts, 0);
  assert.deepEqual(initial.route, [fixture.start]);
}
assert.ok(Math.abs(embeddings.cosine('cheese','cheese') - 1) < 1e-6);
assert.equal(embeddings.cosine('milk','cheese'),embeddings.cosine('cheese','milk'));
assert.ok(embeddings.cosine('cheese','milk') > embeddings.cosine('cheese','language'));
assert.throws(() => new Game(embeddings, 'cheese', 'cheese', .4));
assert.throws(() => new Game(embeddings, 'cheese', 'language', NaN));
assert.throws(() => new Game(embeddings, 'cheese', 'language', .99));
// Rule boundaries on controlled inputs, independent of any lucky embedding relationships.
const scores = new Map(Object.entries({'start,target':.1,'start,forward':.6,'forward,target':.4,'forward,backward':.6,'backward,target':.2,'start,behind':.8,'behind,target':.05,'start,arrival':.5,'arrival,target':.5,'start,weak':.2,'weak,target':.8}));
const fake = {index:new Map(['start','target','forward','backward','behind','arrival','weak'].map(w=>[w,0])), cosine(a,b){return scores.get(`${a},${b}`) ?? scores.get(`${b},${a}`) ?? (a===b ? 1 : 0);}};
let game = new Game(fake,'start','target',.5);
assert.equal(game.submit('forward').success,true);
assert.equal(game.submit('backward').success,true);
game = new Game(fake,'start','target',.5);
assert.equal(game.submit('behind').boundary,false);
assert.equal(game.current,'start');
assert.equal(game.submit('weak').success,false);
assert.throws(()=>game.submit('weak'));
assert.throws(()=>game.submit('unknown'));
assert.equal(game.submit('arrival').won,true);
assert.equal(game.state().attempts,3);
assert.deepEqual(game.route,['start','arrival']);
game = new Game(fake,'start','target',.5);
assert.equal(game.submit('arrival').won,true);
assert.equal(game.state().attempts,1);
console.log(`Browser scoring passed: ${fixtures.length} real-vector Python parity journeys, independent rule cases, and cosine checks.`);
