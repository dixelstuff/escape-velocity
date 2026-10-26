import assert from 'node:assert/strict';
import fs from 'node:fs';
import {setupGain,semanticLoops,analyseJourney} from '../static/semantic-journey.mjs';
import {SemanticAnalyser,SEMANTIC_VERSION} from '../static/semantic-analysis.mjs';
import {Embeddings,Game,decodeHalf} from '../static/engine.mjs';
import {semanticSummary,signedSemantic} from '../static/semantic-panel.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
close(setupGain(.1,.4),.3);close(setupGain(.7,.2),-.5);
const cosine=(a,b)=>a===b?1:.1;
let loop=semanticLoops(['a','b','a'],cosine)[0];close(loop.raw,.9);close(loop.value,.9);
const synonyms=semanticLoops(['a','b','c','d'],(a,b)=>a===b?1:.8);assert.ok(synonyms.every(l=>l.raw===0),'equally close synonyms do not create an excursion');
const longer=semanticLoops(['a','b','c','a'],cosine);assert.equal(longer.find(l=>l.from===0&&l.to===3).value,.9,'longer returns are inspected');
const progress={available:true,points:[{value:0},{value:.5,dogleg_reached:true},{value:.6}]};
loop=semanticLoops(['a','b','a'],cosine,progress)[0];assert.equal(loop.value,0,'dogleg progress protects semantic return');close(loop.raw,.9,'raw evidence stays inspectable');
loop=semanticLoops(['a','b','a'],cosine,{available:true,points:[{value:0},{value:.1},{value:.4}]})[0];close(loop.value,.54);
const path=['a','b','c','d'],bridges=path.slice(1,-1).map((word,i)=>({word,position:i+1,eventIndex:i,separation:{value:.8}}));
const abstract=analyseJourney({route:path,bridges,saved:{},cosine});assert.equal(abstract.progression.available,false);assert.equal(abstract.best_pivot.progression_available,false);
// No objective movement means no productive score, even with a strong semantic split.
const stationary=analyseJourney({route:path,bridges,saved:{rules:'golf-distance-v3',start:'a',target:'d',threshold:.5,history:[{word:'b',success:true,destination:.1},{word:'c',success:true,destination:.1}]},cosine});assert.equal(stationary.best_pivot.value,0);
assert.equal(signedSemantic(-.031),'-0.031');assert.equal(signedSemantic(.031),'+0.031');
const root=new URL('../static/model/',import.meta.url),read=f=>fs.readFileSync(new URL(f,root)),config=JSON.parse(read('config.json')),buf=read(config.vector_fallback),e=new Embeddings(JSON.parse(read(config.words_file)),decodeHalf(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)),config.dimensions,new Uint8Array(read(config.hub_file))),a=new SemanticAnalyser(e);
function diagnostic(route){return a.analyse({won:true,start:route[0],target:route.at(-1),history:route.slice(1,-1).map(word=>({word,success:true}))});}
const robot=diagnostic(['robot','activity','disorder','chaotic','spiral','stairs']),pivot=robot.journey.best_pivot;
assert.equal(robot.version,SEMANTIC_VERSION);assert.equal(pivot.word,'spiral');assert.equal(pivot.setup_word,'chaotic');assert.deepEqual(pivot.sequence,['disorder','chaotic','spiral','stairs']);close(pivot.setup_gain,e.cosine('chaotic','spiral')-e.cosine('disorder','spiral'));assert.ok(pivot.setup_gain>0);assert.equal(pivot.progression_available,false,'provided abstract example has no invented dogleg metadata');
const synonym=diagnostic(['big','large','huge','enormous','gigantic']),backtracking=diagnostic(['ocean','beach','ocean','beach','sand']);
assert.ok(pivot.value>synonym.journey.best_pivot.value);assert.ok(backtracking.journey.backtracking.value>robot.journey.backtracking.value);assert.ok(backtracking.journey.backtracking.value>synonym.journey.backtracking.value);
assert.match(semanticSummary(robot),/DISORDER → CHAOTIC → SPIRAL → STAIRS/);assert.match(semanticSummary(robot),/semantic only/);assert.match(semanticSummary(robot),/Best setup gain/);
const settings=config.puzzles.find(p=>p.start==='pencil'&&p.waypoint?.word==='forest'&&p.target==='orchestra'),game=new Game(e,settings.start,settings.target,settings.threshold,{...settings,finish_mode:'range'});for(const word of ['lines','lake','bass'])game.submit(word);const saved=game.state(),original=JSON.stringify(saved),report=a.analyse(saved),again=a.analyse(saved);
assert.equal(JSON.stringify(saved),original);assert.deepEqual(report.journey,again.journey);assert.equal(report.journey.progression.available,true);const pts=report.journey.progression.points;assert.equal(pts[2].word,'lake');assert.equal(pts[2].value,.5);assert.equal(pts[2].dogleg_reached,true);assert.equal(pts[3].target,'orchestra');assert.equal(pts[1].target,'forest');
for(const l of report.journey.loops.filter(l=>l.crosses_dogleg))assert.equal(l.value,0);
for(const w of report.journey.words){assert.ok(Number.isFinite(w.setup.value));assert.ok(w.backtracking.value>=0&&w.backtracking.value<=1);if(w.pivot){assert.ok(w.pivot.value>=0&&w.pivot.value<=1);assert.ok(w.pivot.window_end<report.route.length-1,'automatic fixed flag contributes no pivot progress');}}
console.log('Semantic journey passed: exact signed setup gain, short/long return loops, synonym controls, objective-aware dogleg protection, zero-progress suppression, ROBOT/CHAOTIC/SPIRAL, deterministic real-route diagnostics and unchanged game state.');
