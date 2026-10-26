import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Embeddings,Game,decodeHalf} from '../static/engine.mjs';
import {SemanticAnalyser,distinctiveness,neighbourhoodSeparation,completedBridgeRoute,semanticRouteKey} from '../static/semantic-analysis.mjs';
import {semanticPercent,semanticSummary} from '../static/semantic-panel.mjs';
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-12,`${a} != ${b}`);
assert.deepEqual(distinctiveness(.2,[.1,.2,.2,.3]),{value:.25,lower:1,tied:2,higher:1,count:4});assert.equal(distinctiveness(1,[]).value,null);
assert.equal(distinctiveness(-.1,[-.2,-.05]).value,.5);
assert.equal(neighbourhoodSeparation([[1,0],[0,1]]).value,1);
assert.equal(neighbourhoodSeparation([[1,1],[1,1]]).value,0);
assert.equal(neighbourhoodSeparation([[.9,.1],[.7,.2]]).value,0,'one side alone is not a two-sided split');
close(neighbourhoodSeparation([[.8,.6],[.6,.8]]).value,1/7);
close(neighbourhoodSeparation([[1,0],[1,0],[0,1]]).value,8/9);
assert.equal(neighbourhoodSeparation([]).value,0);
assert.equal(neighbourhoodSeparation([[-.5,-.2],[-1,0]]).value,0);
const weak=neighbourhoodSeparation([[.01,0],[0,.01]]);assert.equal(weak.value,1);close(weak.mean_positive_affinity,.005,'weak split remains inspectable rather than mislabelled as strong');
for(let k=0;k<100;k++){const pairs=Array.from({length:100},(_,i)=>[Math.sin(i+k),Math.cos(i-k)]),a=neighbourhoodSeparation(pairs),b=neighbourhoodSeparation(pairs.map(([x,y])=>[y,x]));close(a.value,b.value);assert.ok(a.value>=0&&a.value<=1);}
const fixture={won:true,start:'tee',target:'flag',history:[{word:'a',success:true},{word:'bad',success:false},{word:'b',success:true,waypoint_reached:true},{word:'a',success:true},{word:'flag',success:true}]};
const parsed=completedBridgeRoute(fixture);assert.deepEqual(parsed.route,['tee','a','b','a','flag']);assert.deepEqual(parsed.bridges.map(b=>[b.word,b.predecessor,b.successor,b.position,b.eventIndex]),[['a','tee','b',1,0],['b','a','a',2,2],['a','b','flag',3,3]]);assert.throws(()=>completedBridgeRoute({...fixture,won:false}),/after holing/);
assert.deepEqual(completedBridgeRoute({won:true,start:'tee',target:'flag',history:[{word:'flag',success:true}]}).bridges,[],'a typed fixed flag is never a bridge');
const words=['a','b','c','d'],small=new Embeddings(words,new Float32Array([1,0,1,0,1,0,0,1]),2),tiny=new SemanticAnalyser(small);
assert.deepEqual(tiny.nearest('a').map(n=>n.word),['b','c','d']);assert.equal(tiny.nearest('a'),tiny.nearest('a'),'nearest neighbourhood is cached');assert.equal(tiny.nearest('a').length,3);
assert.equal(semanticPercent(null),'—');assert.equal(semanticPercent(.0123),'1.2%');assert.equal(semanticPercent(1),'100%');assert.match(semanticSummary({best_distinctiveness:{word:'<test>',value:.5}}),/&lt;TEST&gt;/);
const root=new URL('../static/model/',import.meta.url),read=f=>readFileSync(new URL(f,root)),config=JSON.parse(read('config.json')),bytes=read(config.vector_fallback),e=new Embeddings(JSON.parse(read(config.words_file)),decodeHalf(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),config.dimensions,new Uint8Array(read(config.hub_file))),analyser=new SemanticAnalyser(e);
const settings=config.puzzles.find(p=>p.start==='pencil'&&p.waypoint?.word==='forest'&&p.target==='orchestra');
function finish(words){const g=new Game(e,settings.start,settings.target,settings.threshold,{...settings,finish_mode:'range',challenge:{version:'stroke-play-v1',par:5,attempt:1,id:'semantic-test'}});for(const w of words)g.submit(w);assert.equal(g.won,true);return g.state();}
const saved=finish(['lines','lake','bass']),before=structuredClone(saved),report=analyser.analyse(saved);assert.deepEqual(saved,before,'analysis never mutates a completed attempt');assert.equal(report.bridges.length,3);assert.deepEqual(report.route,['pencil','lines','lake','bass','orchestra']);assert.equal(report.dogleg.word,'lake');assert.equal(report.dogleg.available,true);assert.equal(report.dogleg.waypoint,'forest');assert.ok(!report.bridges.some(b=>b.word==='forest'),'an unplayed dogleg word is not inserted');
for(const bridge of report.bridges){assert.equal(bridge.neighbours.length,100);assert.equal(new Set(bridge.neighbours.map(n=>n.word)).size,100);assert.ok(!bridge.neighbours.some(n=>n.word===bridge.word));const expected=[...e.words].filter(w=>w!==bridge.word).sort((a,b)=>e.cosine(bridge.word,b)-e.cosine(bridge.word,a)||(a<b?-1:a>b?1:0)).slice(0,100);assert.deepEqual(bridge.neighbours.map(n=>n.word),expected);}
// Independently test ALL legal one-shot dogleg candidates at the actual lie.
const prefix=new Game(e,settings.start,settings.target,settings.threshold,{...settings,finish_mode:'range'});prefix.submit('lines');const pool=[];
for(const w of e.words){if(w===prefix.current||w===prefix.final_target||w==='lake')continue;const shot=prefix.pluralShot(w);if(shot.success&&shot.inside)pool.push(w);}
assert.deepEqual(new Set(report.dogleg.alternatives.map(a=>a.word)),new Set(pool));assert.equal(report.dogleg.distinctiveness.count,pool.length);
close(report.dogleg.distinctiveness.value,pool.filter(w=>Math.min(e.cosine('lines',w),e.cosine(w,'bass'))<Math.min(e.cosine('lines','lake'),e.cosine('lake','bass'))-1e-12).length/pool.length);
const repeated=analyser.analyse(saved),{elapsed_ms,...stable}=report,{elapsed_ms:ignore,...second}=repeated;assert.deepEqual(stable,second,'repeatable values and deterministic neighbour tie ordering');
assert.notEqual(semanticRouteKey(saved),semanticRouteKey({...saved,waypoint:{...saved.waypoint,threshold:.3}}),'cache identity includes dogleg settings');
const literal=completedBridgeRoute({...saved,history:[{word:'forest',success:true,waypoint_reached:true},{word:'flute',success:true}]});assert.equal(literal.bridges.filter(b=>b.word==='forest').length,1,'a deliberately played waypoint stays in the route');
console.log('Semantic analysis passed: strict local ranks, continuous symmetric split, ties/empty/weak signals, endpoint roles, repeated word positions, cached deterministic 100-NN, exact dogleg alternatives, escaped UI and immutable game state.');
