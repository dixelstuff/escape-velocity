import fs from 'node:fs';
import assert from 'node:assert/strict';
import {bandFreeScore,BAND_FREE_VERSION} from '../static/vector-cleverness/band-free.mjs';
import {dailyManifest} from '../static/daily-manifest.mjs';
const oldFactor=n=>n<=2?1:n===3?.88:n===4?.66:n===5?.45:.5*.65**(n-4);
const rows=[];
function compare(id,state,components,legs,extra={}){
 const next=bandFreeScore(components,legs),L=legs.reduce((p,n)=>p*oldFactor(n),1),raw=Math.min((next.before_leg_penalty+(legs.includes(1)?2*next.quality:0))*L,100*L);
 rows.push({id,route:state.route,strokes:state.attempts??legs.reduce((a,b)=>a+b),legs,components,quality:next.quality,old:{score:Math.round(raw),unrounded:raw,factor:L},new:{score:next.score,unrounded:next.unrounded_score,factor:next.applied_factor},...extra});
 assert.ok(next.unrounded_score+1e-9>=raw);if(legs.every(n=>n<=2))assert.ok(Math.abs(next.unrounded_score-raw)<1e-9);
}
const frozen=JSON.parse(fs.readFileSync('tests/opportunity08-bonus2-fixtures.json'));
for(const f of frozen.fixtures){compare(f.id,f.state,f.expected.components,f.previousBandFree.legs.map(l=>l.strokes),{source:'frozen current live upstream evidence'});assert.equal(rows.at(-1).old.score,f.expected.score);assert.ok(Math.abs(rows.at(-1).old.unrounded-f.expected.unrounded)<1e-9);}
for(const r of JSON.parse(fs.readFileSync('reports/band-free-cleverness/comparison.json')).results){
 if(rows.some(x=>JSON.stringify(x.route)===JSON.stringify(r.route)))continue;
 const components={...r.components,semantic_ingenuity:r.opportunity.raw_ingenuity/(1+.08*Math.max(0,r.opportunity.pivot_positions-1))};
 compare(r.id,r.state,components,r.band_free.legs.map(l=>l.strokes),{source:'saved upstream evidence, using unchanged live .08 opportunity rate',charged_removals:r.charged_removals});
}
// Independently replay the user's skippable-move comparison under current mechanics.
const {Game,Embeddings,decodeHalf}=await import('../static/engine.mjs');
const {SemanticProfileStore}=await import('../static/semantic-profile-store.mjs');
const {VectorClevernessAnalyser}=await import('../static/vector-cleverness/index.mjs');
const root=new URL('../static/model/',import.meta.url),read=f=>fs.readFileSync(new URL(f,root)),config=JSON.parse(read('config.json')),bytes=read(config.vector_fallback),e=new Embeddings(JSON.parse(read(config.words_file)),decodeHalf(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),config.dimensions,new Uint8Array(read(config.hub_file))),store=new SemanticProfileStore({modelSha:config.vector_sha256,base:new URL('../static/semantic-profiles/',import.meta.url),fetcher:async url=>new Response(fs.readFileSync(url))}),analyser=new VectorClevernessAnalyser(e,{store,modelSha:config.vector_sha256});
const hole=dailyManifest.holes.find(h=>h.settings.start==='hammock'&&h.settings.target==='carnival').settings;
for(const [id,words]of [['HAMMOCK-long',['ropes','trapeze','circus','carnival']],['HAMMOCK-short',['ropes','circus','carnival']]]){
 const g=new Game(e,hole.start,hole.target,hole.threshold,{...hole,challenge:{id:'relaxation-test',version:'stroke-play-v1',par:5,unlimited:true,attempt:1}});
 for(const word of words){if(g.won){assert.equal(g.current,word);break;}const shot=g.submit(word);assert.ok(shot.success,word);}
 assert.ok(g.won);const r=await analyser.analyse(g.state());
 compare(id,g.state(),r.components,r.band_free.legs.map(l=>l.strokes),{source:'authoritative engine replay and full vector analysis',strategic_diagnostics:r.diagnostics.stages});
}
const output={version:BAND_FREE_VERSION,oldVersion:'band-free-harmonic-v3-opportunity08-bonus2',schedule:{1:1,2:1,3:.92,4:.8,5:.6,longer:'.60 * .65 ** (strokes - 5)'},rows};
fs.writeFileSync('reports/relaxed-leg-factors/comparison.json',JSON.stringify(output,null,2)+'\n');
const md=['# Relaxed leg factors','',`Scorer: ${BAND_FREE_VERSION}. Only the final leg-factor schedule changed. Q, I, S, E, opportunity rate .08, one-stroke coefficient 2 and the 100 × L ceiling are unchanged.`,'','| Route | Legs | Before | After |','|---|---|---:|---:|',...rows.map(r=>`| ${r.route.map(w=>w.toUpperCase()).join(' → ')} | ${r.legs.join('+')} | ${r.old.score} | ${r.new.score} |`),'','Saved rows reuse fixed upstream evidence. HAMMOCK rows were independently replayed and fully analysed. No result-label bonuses or morphology adjustments were added.','', 'Longer legs: 5 = .60, 6 = .39, 7 = .2535; subsequent factors decay by .65. The old schedule had a separate six-plus formula with a large drop from .45 to .21125. The new tail retains the decay rate and anchors it at the relaxed five-stroke factor.',''];
fs.writeFileSync('reports/relaxed-leg-factors/FINDINGS.md',md.join('\n'));
console.table(rows.map(r=>({id:r.id,legs:r.legs.join('+'),old:r.old.score,new:r.new.score,S:r.components.strategic_effectiveness})));
