import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {howToPlay,DISTANCE_EXAMPLES} from '../static/how-to-play.mjs';
import {Embeddings,decodeHalf,Game} from '../static/engine.mjs';
const root=new URL('../static/model/',import.meta.url),read=name=>readFileSync(new URL(name,root)),config=JSON.parse(read('config.json')),raw=read(config.vector_fallback),e=new Embeddings(JSON.parse(read(config.words_file)),decodeHalf(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),config.dimensions,new Uint8Array(read(config.hub_file)));
const html=howToPlay();assert.equal((html.match(/<figure /g)||[]).length,2);assert.match(html,/shaded area/);assert.match(html,/no attempt or stroke limits/);assert.ok(!html.includes('background-image'));
assert.deepEqual([...html.matchAll(/<h3>(.*?)<\/h3>/g)].map(m=>m[1].replace(/<svg[\s\S]*?<\/svg>/g,'').trim()),['Making a shot','Negotiating the dogleg','Trying another route','Your scores']);
assert.match(html,/<strong>Longer shots need stronger connections to the ball word\.<\/strong>/);
assert.match(html,/<strong>must connect to both<\/strong>/);assert.ok(!html.includes('<strong>Par 5</strong>'));assert.ok(html.indexOf('no attempt or stroke limits')>html.indexOf('<h3>Your scores '));assert.match(html,/The aim is to get the ball in the hole with the <strong>fewest strokes<\/strong> and the <strong>highest cleverness<\/strong>/);assert.match(html,/class="help-score-trophy"/);assert.match(html,/<li class="help-closing"><p><strong><em>There are no attempt or stroke limits\. Keep exploring, even after holing out<\/em><\/strong><\/p><\/li>$/);assert.match(html,/The shortest route isn't necessarily the cleverest!/);
const app=readFileSync(new URL('../static/app.js',import.meta.url),'utf8');assert.doesNotMatch(app,/renderRetryTip|learnWordRetry|word-golf-retry-tip-used/,'the recurring retry bubble has no remaining trigger');
console.log('How to play passed: production-engine hit/miss examples, target connection controlled, labelled diagrams, current rules and removed retry bubble.');


const distanceShots=DISTANCE_EXAMPLES.map(d=>{const g=new Game(e,d.ball,'ocean',.27,{mode:'distance',launch_min:.095,launch_max:.215,waypoint:{word:d.target,threshold:.265},finish_mode:'range'}),shot=g.submit(d.played);assert.equal(shot.success,d.hit,`worked ${d.ball} → ${d.played} towards ${d.target}`);return shot;});
assert.ok(!distanceShots[0].inside&&distanceShots[0].forward,'PAPER hits but stops short');assert.ok(distanceShots[1].destination>distanceShots[0].destination&&distanceShots[1].inside,'BOOK hits further');assert.equal(distanceShots[2].connected,false,'SHELF misses on contact despite its target connection');assert.ok(distanceShots[2].destination>distanceShots[2].leg_baseline);
assert.ok(!html.includes('data-help-lie'));assert.ok(!html.includes('<button'));assert.match(html,/class="help-hand"/);assert.ok(!html.includes('help-ball'));assert.match(html,/Tap PAPER to play from there instead/);
assert.equal((html.match(/help-distance-option/g)||[]).length,3);
console.log('Three production-engine PEN examples and four-step help content passed; no decorative ball or interactive retry controls.');
