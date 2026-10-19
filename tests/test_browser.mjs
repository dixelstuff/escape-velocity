import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Embeddings, Game, launchRequirement, restoreGame } from '../static/engine.mjs';
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
  const game = new Game(embeddings, fixture.start, fixture.target, fixture.threshold, fixture);
  const initial = game.state();
  for (const step of fixture.steps) {
    if (step.error) assert.throws(() => game.submit(step.word));
    else compare(game.submit(step.word), step.event);
    compare(game.state(), step.state);
  }
  compare(restoreGame(embeddings,game.state()).state(),game.state());
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
let game = new Game(fake,'start','target',.5,{rules:'fixed-threshold-v2'});
assert.equal(game.submit('forward').success,true);
assert.equal(game.submit('backward').success,true);
game = new Game(fake,'start','target',.5,{rules:'fixed-threshold-v2'});
assert.equal(game.submit('behind').boundary,false);
assert.equal(game.current,'start');
assert.equal(game.submit('weak').success,false);
assert.equal(game.submit('weak').success,false);
assert.throws(()=>game.submit('unknown'));
assert.equal(game.submit('arrival').won,true);
assert.equal(game.state().attempts,4);
assert.deepEqual(game.route,['start','arrival']);
game = new Game(fake,'start','target',.5,{rules:'fixed-threshold-v2'});
assert.equal(game.submit('arrival').won,true);
assert.equal(game.state().attempts,1);

const oneJump=new Game(fake,'start','target',.5,{mode:'distance'});assert.equal(oneJump.submit('arrival').won,true);assert.equal(oneJump.state().attempts,1);
assert.equal(launchRequirement(.2,.2,.1,.5).required,.08);
assert.equal(launchRequirement(.1,.8,.1,.5).required,.18);
assert.deepEqual(launchRequirement(.2,.3,.1,.5),launchRequirement(.3,.2,.1,.5));
game=new Game(fake,'start','target',.5,{mode:'distance',rules:'distance-v1'});
game.submit('forward');game.submit('start');game.submit('forward');
assert.equal(game.state().attempts,3);
assert.deepEqual(restoreGame(fake,game.state()).state(),game.state());
const oldGame=new Game(fake,'start','target',.5,{rules:'fixed-threshold-v1'});oldGame.submit('weak');
const oldSaved=oldGame.state();delete oldSaved.rules;delete oldSaved.mode;
const restored=restoreGame(fake,oldSaved);assert.equal(restored.rules,'fixed-threshold-v1');
assert.throws(()=>restored.submit('weak'));
assert.throws(()=>new Game(fake,'start','target',.5,{mode:'distance',launch_min:.5,launch_max:.3}));

console.log(`Browser scoring passed: ${fixtures.length} real-vector Python parity journeys, independent rule cases, and cosine checks.`);

game=new Game(fake,'start','target',.5,{mode:'distance'});
game.submit('forward');
const backward=game.submit('backward');
assert.equal(backward.forward,false);assert.equal(backward.success,false);
assert.equal(game.current,'forward');assert.equal(game.state().attempts,2);
assert.deepEqual(restoreGame(fake,game.state()).state(),game.state());
assert.equal(new Game(fake,'start','target').threshold,.25);
assert.equal(game.launch_min,.08);assert.equal(game.launch_max,.18);

assert.deepEqual(launchRequirement(.23,.25,.037,.25),launchRequirement(.23,.8,.037,.25));
assert.ok(launchRequirement(.23,.8,.037,.25).required<.09);
assert.ok(launchRequirement(.23,.8,.037,.25).required<launchRequirement(.133,.8,.037,.25).required);
scores.set('forward,weak',.12);
const gentle=new Game(fake,'start','target',.5,{mode:'distance'});
const overshoot=new Game(fake,'start','target',.5,{mode:'distance',rules:'distance-v2'});
for(const g of [gentle,overshoot])g.submit('forward');
assert.equal(gentle.submit('weak').won,true);
assert.equal(overshoot.submit('weak').success,false);
assert.deepEqual(restoreGame(fake,gentle.state()).state(),gentle.state());
