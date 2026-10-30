import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {howToPlay,SHOT_EXAMPLES,DISTANCE_EXAMPLES} from '../static/how-to-play.mjs';
import {Embeddings,decodeHalf,Game} from '../static/engine.mjs';
const root=new URL('../static/model/',import.meta.url),read=name=>readFileSync(new URL(name,root)),config=JSON.parse(read('config.json')),raw=read(config.vector_fallback),e=new Embeddings(JSON.parse(read(config.words_file)),decodeHalf(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),config.dimensions,new Uint8Array(read(config.hub_file)));
for(const example of SHOT_EXAMPLES){
 const game=new Game(e,example.ball,'ocean',.27,{mode:'distance',launch_min:.095,launch_max:.215,waypoint:{word:example.target,threshold:.265},finish_mode:'range'}),shot=game.submit(example.played);
 assert.equal(shot.success,example.hit,`${example.ball} → ${example.played}, targeting ${example.target}`);
 assert.ok(shot.destination>=game.waypoint.threshold,'both examples relate to the target; ball-word connection distinguishes the miss');
}
const html=howToPlay();assert.equal((html.match(/<figure /g)||[]).length,4);assert.equal((html.match(/<figcaption\b/g)||[]).length,4);assert.match(html,/set up shot/);assert.match(html,/shaded area/);assert.match(html,/no attempt or stroke limits/);assert.ok(!html.includes('background-image'));
const app=readFileSync(new URL('../static/app.js',import.meta.url),'utf8');assert.doesNotMatch(app,/renderRetryTip|learnWordRetry|word-golf-retry-tip-used/,'the recurring retry bubble has no remaining trigger');
console.log('How to play passed: production-engine hit/miss examples, target connection controlled, labelled diagrams, current rules and removed retry bubble.');


const distanceShots=DISTANCE_EXAMPLES.map(d=>{const g=new Game(e,d.ball,'ocean',.27,{mode:'distance',launch_min:.095,launch_max:.215,waypoint:{word:d.target,threshold:.265},finish_mode:'range'}),shot=g.submit(d.played);assert.equal(shot.success,d.hit,`worked ${d.ball} → ${d.played} towards ${d.target}`);return shot;});
assert.ok(!distanceShots[0].inside&&distanceShots[0].forward,'PAPER hits but stops short');assert.ok(distanceShots[1].destination>distanceShots[0].destination&&distanceShots[1].inside,'BOOK hits further');assert.equal(distanceShots[2].connected,false,'SHELF misses on contact despite its target connection');assert.ok(distanceShots[2].destination>distanceShots[2].leg_baseline);
assert.ok(!html.includes('<h3>Here’s the key</h3>'));assert.ok(!html.includes('<strong>Tap any earlier'));assert.ok(!html.includes('<strong>The longer'));
assert.ok(!html.includes('data-help-lie'));assert.ok(!html.includes('<button'));assert.match(html,/class="help-hand"/);assert.equal((html.match(/class="help-ball"/g)||[]).length,2);assert.match(html,/Continue from PAPER/);assert.match(html,/help-lie-ahead/);
console.log('Worked distance comparison and static before/after retry illustrations passed.');

assert.ok(!html.includes('Find a word path'));assert.match(html,/^<li class="bag-tip"><h3>Hitting the ball/);
