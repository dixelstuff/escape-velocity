/** Read-only reproducible benchmark of completed routes against the shipped model. */
import fs from 'node:fs';
import {Embeddings,Game,decodeHalf} from '../static/engine.mjs';
import {SemanticAnalyser,neighbourhoodSeparation,distinctiveness} from '../static/semantic-analysis.mjs';
const root=new URL('../static/model/',import.meta.url),read=f=>fs.readFileSync(new URL(f,root)),config=JSON.parse(read('config.json')),b=read(config.vector_fallback);
const e=new Embeddings(JSON.parse(read(config.words_file)),decodeHalf(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)),config.dimensions,new Uint8Array(read(config.hub_file))),analyser=new SemanticAnalyser(e);
const examples=[
 {tee:'pencil',waypoint:'forest',flag:'orchestra',words:['lines','lake','bass'],kind:'conceptual pivot: fishing line / bass fish and instrument'},
 {tee:'pencil',waypoint:'forest',flag:'orchestra',words:['bamboo','flute'],kind:'specific material-to-instrument connection'},
 {tee:'pencil',waypoint:'forest',flag:'orchestra',words:['work','consists'],kind:'generic grammatical bridge'},
 {tee:'pencil',waypoint:'forest',flag:'orchestra',words:['look','national'],kind:'generic category/descriptor'},
 {tee:'penguin',waypoint:'library',flag:'galaxy',words:['book','alien'],kind:'publisher / science fiction association'},
 {tee:'penguin',waypoint:'library',flag:'galaxy',words:['books','tablet'],kind:'reading device / Galaxy brand pivot'},
];
const results=[];
for(const x of examples){const settings=config.puzzles.find(h=>h.start===x.tee&&h.target===x.flag&&h.waypoint?.word===x.waypoint),g=new Game(e,x.tee,x.flag,settings.threshold,{...settings,finish_mode:'range',challenge:{version:'stroke-play-v1',par:settings.par,attempt:1,id:'semantic-benchmark'}});for(const w of x.words)g.submit(w);if(!g.won)throw Error('Benchmark route did not complete: '+x.words);const saved=g.state(),report=analyser.analyse(saved),warm=analyser.analyse(saved);const {elapsed_ms,...deterministic}=report,{elapsed_ms:warmMs,...second}=warm;if(JSON.stringify(deterministic)!==JSON.stringify(second))throw Error('Non-deterministic analysis');results.push({kind:x.kind,route:report.route,strokes:saved.attempts,best_distinctiveness:report.best_distinctiveness,best_separation:report.best_separation,dogleg:report.dogleg.available?{word:report.dogleg.word,value:report.dogleg.distinctiveness.value,alternatives:report.dogleg.distinctiveness.count}:report.dogleg,individual:report.bridges.map(w=>({word:w.word,distinctiveness:w.distinctiveness.value,separation:w.separation.value,neighbour_count:w.neighbours.length,mean_positive_affinity:w.separation.mean_positive_affinity})),first_ms:report.elapsed_ms,warm_ms:warmMs});}
fs.writeFileSync(new URL('../reports/semantic-analysis/benchmark.json',import.meta.url),JSON.stringify({version:'bridge-neighbourhood-v1',model_sha:config.vector_sha256,vocabulary:e.words.length,results},null,2)+'\n');
console.log(JSON.stringify(results,null,2));
