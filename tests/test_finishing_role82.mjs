import fs from 'node:fs';
import assert from 'node:assert/strict';
import {Embeddings,decodeHalf} from '../static/engine.mjs';
import {SemanticProfileStore} from '../static/semantic-profile-store.mjs';
import {VectorClevernessAnalyser} from '../static/vector-cleverness/index.mjs';
import {replayCompleted} from '../static/vector-cleverness/evidence.mjs';
import {finishingRoleEvidence,restoreFinishingRole} from '../static/finishing-role.mjs';
import {stretchScore,stretchScore82,RAW_PIVOT_82} from '../static/score-stretch.mjs';
import {applyLiveCleverness} from '../static/cleverness-live-score.mjs';
import {compactPlaytestReport,playtestText} from '../static/cleverness-playtest-data.mjs';
import {BAND_FREE_VERSION,INCOMING_BAND_FREE_VERSION} from '../static/cleverness-score-config.mjs';
const near=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`),data=JSON.parse(fs.readFileSync(new URL('./finishing-role82-fixtures.json',import.meta.url)));
const root=new URL('../static/model/',import.meta.url),read=f=>fs.readFileSync(new URL(f,root)),config=JSON.parse(read('config.json')),bytes=read(config.vector_fallback),e=new Embeddings(JSON.parse(read(config.words_file)),decodeHalf(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),config.dimensions,new Uint8Array(read(config.hub_file))),store=new SemanticProfileStore({modelSha:config.vector_sha256,base:new URL('../static/semantic-profiles/',import.meta.url),fetcher:async u=>new Response(fs.readFileSync(u))}),a=new VectorClevernessAnalyser(e,{store,modelSha:config.vector_sha256});
assert.equal(data.model_sha,config.vector_sha256);
near(stretchScore(RAW_PIVOT_82),82);
for(const [x,y] of [[0,0],[RAW_PIVOT_82,82],[100,100]])near(stretchScore82(x),y);
let prev=-1;for(let i=0;i<=100000;i++){const n=stretchScore82(i/1000);assert.ok(n>prev&&n>=0&&n<=100);prev=n;}
for(const [x,slope] of [[0,1],[RAW_PIVOT_82,2],[100,1]]){const h=1e-5,d=x===0?(stretchScore82(h)-stretchScore82(0))/h:x===100?(stretchScore82(100)-stretchScore82(100-h))/h:(stretchScore82(x+h)-stretchScore82(x-h))/(2*h);assert.ok(Math.abs(d-slope)<1e-5);}
let sample;
for(const f of data.fixtures){
 const snapshot=JSON.stringify(f.state),r=await a.analyse(f.state);assert.equal(JSON.stringify(f.state),snapshot);assert.equal(r.primary_scorer,BAND_FREE_VERSION);near(r.band_free.raw_unrounded_score,f.expected_raw);near(r.band_free.unrounded_score,stretchScore82(f.expected_raw));near(r.band_free.maximum_for_legs,stretchScore82(100*r.band_free.applied_factor));
 for(const k of Object.keys(f.expected_components))near(r.components[k],f.expected_components[k]);
 assert.equal(r.finishing_role.applied,f.expected_applied);assert.equal(r.band_free.score,Math.round(r.band_free.unrounded_score));
 near(applyLiveCleverness(compactPlaytestReport(r)).band_free.unrounded_score,r.band_free.unrounded_score);
 const historical=structuredClone(r);delete historical.finishing_role;assert.equal(applyLiveCleverness(historical).primary_scorer,INCOMING_BAND_FREE_VERSION,'Old evidence cannot be relabelled v9');
 assert.match(playtestText(r),/Cubic display mapping: pivot 82/);
 if(r.finishing_role.applied&&!sample)sample={f,r};
}
assert.ok(sample);const {f,r}=sample,input=structuredClone(r.reproducibility.input),bridge=input.diagnostics.bridges.find(b=>b.position===r.finishing_role.position);bridge.strategic_functions.necessary_for_observed_next=false;
const before=JSON.stringify(input);assert.equal(restoreFinishingRole(input,r.finishing_role).diagnostics.bridges.find(b=>b.position===bridge.position).strategic_functions.necessary_for_observed_next,true);assert.equal(JSON.stringify(input),before);
for(const mutate of [p=>p.available=false,p=>p.applied=false,p=>p.route=['other'],p=>p.position--,p=>p.word='other',p=>p.version='old']){const p=structuredClone(r.finishing_role);mutate(p);assert.equal(restoreFinishingRole(input,p),input);}
const diagnostics=structuredClone(r.reproducibility.input.diagnostics),game=replayCompleted(e,r.reproducibility.input.state).game;
for(const mutate of [g=>g.won=false,g=>g.stage=0,g=>g.waypoint=null,g=>g.history.at(-1).won=false,g=>g.history.at(-1).stage=0,g=>g.history.at(-1).waypoint_reached=true,g=>delete g.history.at(-1).automatic_shot,g=>g.automatic_shots=[],g=>g.history.at(-1).word=g.final_target]){
 const g=Object.assign(Object.create(Object.getPrototypeOf(game)),game,{history:structuredClone(game.history),automatic_shots:structuredClone(game.automatic_shots)});mutate(g);assert.equal(finishingRoleEvidence(e,input.state,g,diagnostics).applied,false);
}
for(const removable of [true,null]){const d=structuredClone(diagnostics);d.bridges.find(b=>b.position===bridge.position).strategic_functions.removable_while_completing=removable;assert.equal(finishingRoleEvidence(e,input.state,game,d).applied,false);}
console.log(`Finishing role / 82 passed: ${data.fixtures.length} independently frozen full-role raw scores and I/S/E, neutral arrival controls, strict curve/slope/ceiling checks, compact idempotence, stale evidence rejection, occurrence guards and immutable routes.`);
