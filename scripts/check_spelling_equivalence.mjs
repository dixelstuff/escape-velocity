/** Offline audit only: curated spelling lookup, historical compatibility and performance. */
import fs from 'node:fs';import {gzipSync} from 'node:zlib';import assert from 'node:assert/strict';
import {loadResearchModel,researchSettings} from './cleverness-research-utils.mjs';
import {Game,restoreGame} from '../static/engine.mjs';
import {VectorClevernessAnalyser} from '../static/vector-cleverness/index.mjs';
import {spellingResolver,spellingPairs,canonicalSpellingState} from '../static/spelling-equivalence.mjs';
import {isRetiredHole} from '../static/hole-retirement.mjs';
const {e,config,store}=loadResearchModel(),begin=performance.now(),resolver=spellingResolver(e),lookupInit=performance.now()-begin,a=new VectorClevernessAnalyser(e,{store,modelSha:config.vector_sha256});
function play(settings,words,enabled){const g=new Game(e,settings.start,settings.final_target??settings.target,settings.final_threshold??settings.threshold??.27,{...settings,spelling_equivalence:enabled?'uk-us-v1':false});let error=null;for(const word of words){if(g.won)break;try{const ev=g.submit(word);if(!ev.success){error=`${word}: ${ev.connected?'backward':'contact'}`;break;}}catch(ex){error=ex.message;break;}}return {state:g.state(),error};}
const samples=[];
for(const enabled of [false,true])for(const word of ['color','colour']){const p=play(researchSettings('carrot','light','prism'),['orange',word],enabled),t=performance.now(),report=await a.analyse(p.state);samples.push({enabled,word,score:report.band_free.score,unrounded:report.band_free.unrounded_score,components:report.components,route:report.route,analysis_ms:performance.now()-t});}
assert.equal(samples[2].unrounded,samples[3].unrounded);assert.deepEqual(samples[2].components,samples[3].components);
const audits=['reports/fresh-daily-30/validation.json','reports/fresh-daily-50/validation.json'].flatMap(file=>JSON.parse(fs.readFileSync(file)).checks).filter(c=>!isRetiredHole(c.settings)),changed=[];let same=0;
for(const c of audits){const old=play(c.settings,c.verificationWords,false),next=play(c.settings,c.verificationWords,true);assert.ok(old.state.won);const comparable=s=>{const out=structuredClone(s);delete out.spelling_equivalence;return out};if(JSON.stringify(comparable(old.state))===JSON.stringify(comparable(next.state)))same++;else changed.push({hole:[c.start,c.waypoint,c.target],words:c.verificationWords,old_strokes:old.state.attempts,new_strokes:next.state.attempts,new_completed:next.state.won,new_error:next.error});}
const alternatives=[
 {start:'turmeric',waypoint:'cinematography',target:'popcorn',words:['yellow','colour','films']},
 {start:'celery',waypoint:'craft',target:'kayak',words:['stalk','fibre','thread','canvas','boat']},
 {start:'petunia',waypoint:'mould',target:'candelabra',words:['flower','pot','clay','mould','wax','candle']}
].map(p=>{const result=play(researchSettings(p.start,p.waypoint,p.target),p.words,true);assert.ok(result.state.won,p.start+' alternative remains playable');return {...p,completed_route:result.state.route,strokes:result.state.attempts};});
const calibrations=[];
for(const fixture of JSON.parse(fs.readFileSync('tests/vector-cleverness-fixtures.json'))){
 const old=await a.analyse(fixture.state);let current=null,error=null;
 try{const game=restoreGame(e,{...fixture.state,spelling_equivalence:'uk-us-v1'});if(!game.won)throw Error('Recorded route does not finish under shared spellings');current=await a.analyse(game.state());}catch(ex){error=ex.message;}
 calibrations.push({id:fixture.id,route:fixture.state.route,previous:old.band_free.score,current:current?.band_free.score??null,delta:current?current.band_free.score-old.band_free.score:null,error});
}
let sum=0;const N=100000,bench=f=>{const t=performance.now();for(let i=0;i<N;i++)sum+=f('carrot','prism');return performance.now()-t};const rawCos=(x,y)=>e.cosine(x,y),sharedCos=(x,y)=>resolver.model.cosine(x,y);for(let i=0;i<4;i++){bench(rawCos);bench(sharedCos);}const raw=[],shared=[];for(let i=0;i<9;i++){if(i%2){shared.push(bench(sharedCos));raw.push(bench(rawCos));}else{raw.push(bench(rawCos));shared.push(bench(sharedCos));}}const median=x=>[...x].sort((a,b)=>a-b)[Math.floor(x.length/2)],source=fs.readFileSync('static/spelling-equivalence.mjs');
const result={version:'uk-us-v1',model_sha:config.vector_sha256,canonical_policy:'Prefer the listed US form if supported; otherwise use the listed UK row. No averaged vectors or regenerated neighbourhoods.',curated_pairs:spellingPairs.length,supported_spellings:resolver.aliases.size,additional_accepted_spellings:[...resolver.aliases.keys()].filter(w=>!e.index.has(w)).length,calibrations,asset:{bytes:source.byteLength,gzip_bytes:gzipSync(source).byteLength,lookup_initialization_ms:lookupInit,shared_vector_matrix:resolver.model.vectors===e.vectors},samples,compatibility:{active_audited_routes:audits.length,exactly_unchanged:same,changed,verified_alternatives:alternatives},performance:{iterations:N,raw_median_ms:median(raw),shared_median_ms:median(shared),extra_us_per_comparison:1000*(median(shared)-median(raw))/N,checksum:sum}};
fs.writeFileSync('reports/spelling-equivalence/validation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result,null,2));
