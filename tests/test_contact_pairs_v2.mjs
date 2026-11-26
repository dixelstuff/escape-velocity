import assert from 'node:assert/strict';import fs from 'node:fs';
import legacy from '../static/contact-data.mjs';
import {Game,Embeddings,restoreGame,createBrowserClient} from '../static/engine.mjs';
import {CONTACT_ADJUSTMENT_VERSION as V2,LEGACY_CONTACT_ADJUSTMENT_VERSION as V1,contactFrequency,contactPhraseSources,contactPairFlags,contactAdjustmentTerms,contactAdjustmentSettings,activeContactVersion,newContactRule,contactRuleForRetry} from '../static/contact-adjustments.mjs';
import {loadResearchModel,researchSettings} from '../scripts/cleverness-research-utils.mjs';
import {VectorClevernessAnalyser} from '../static/vector-cleverness/index.mjs';
import {semanticRouteKey} from '../static/semantic-analysis.mjs';
const {e,config,store}=loadResearchModel();
const oldWords=legacy.words.split('\n'),oldPairs=Buffer.from(legacy.pairs,'base64'),oldSources=Buffer.from(legacy.sources,'base64'),freq=Buffer.from(legacy.zipf,'base64');
oldWords.forEach((w,i)=>assert.equal(contactFrequency(w,e),freq.readUInt16LE(i*2)/100,'Frozen v1 frequency '+w));
for(let i=0;i<oldSources.length;i++){const k=oldPairs.readUInt32LE(i*4);assert.equal(contactPhraseSources(oldWords[Math.floor(k/65536)],oldWords[k%65536],e),oldSources[i],'Lossless v1 membership');}
assert.ok(contactPairFlags('joy','stick',e)>>3);assert.equal(contactPhraseSources('joy','stick',e),0);
assert.equal(contactAdjustmentTerms(e,'joy','stick','computer',7,V1).incoming,0);
assert.equal(contactAdjustmentTerms(e,'joy','stick','computer',7,V2).incoming,.13);
assert.equal(contactAdjustmentTerms(e,'tree','birch','cave',7,V2).incoming,0,'Already guaranteed incoming contact needs no lookup credit');
assert.ok(contactAdjustmentTerms(e,'bend','tree','birch',7,V2).outgoing>0,'Strong pair still helps outgoing contact');
assert.ok(contactPhraseSources('speaker','unit',e));
assert.equal(contactAdjustmentTerms(e,'speaker','unit','cave',7,V2).incoming,0,'Reviewed whole-pair exclusion');
assert.equal(contactAdjustmentTerms(e,'speaker','unit','cave',7,V2,{launch_max:.4}).incoming,.13,'Wider custom settings restore complete membership');
assert.equal(contactAdjustmentTerms(e,'tree','birch','cave',7,V2,{plural_tolerance:.1}).incoming,.13,'Wider rescue settings restore incoming membership');
const altered=[...e.words];altered[0]='mismatched-vocabulary';assert.throws(()=>new Embeddings(altered,e.vectors,e.dimensions,e.hubs),/does not match/);
const legacyRule={version:V1,after:1},mixed=newContactRule(3,legacyRule);
assert.deepEqual(mixed,{version:V2,after:3,previous:legacyRule});
assert.deepEqual([0,1,2,3].map(i=>activeContactVersion(mixed,i)),[null,V1,V1,V2]);
assert.deepEqual(contactRuleForRetry(mixed,2),{version:V2,after:2,previous:legacyRule});
assert.deepEqual(contactRuleForRetry(mixed,0),newContactRule(0));
assert.deepEqual(contactRuleForRetry(mixed,4),mixed);
assert.throws(()=>contactAdjustmentSettings({version:V2,after:1,previous:{version:V1,after:1}}),/previous/);

const fixtures=JSON.parse(fs.readFileSync('tests/fixtures/contact-pairs-v2.json'));
assert.equal(fixtures.model_sha256,config.vector_sha256);assert.equal(fixtures.cases.length,101);
for(const c of fixtures.cases){
 const make=()=>{const s=c.settings,g=new Game(e,s.start,s.final_target,s.final_threshold,s);for(const w of c.prefix)g.submit(w);return g;};
 const old=make();old.contact_adjustment=old.contact_adjustment??{version:V1,after:old.history.length};
 const revised=make();revised.contact_adjustment=newContactRule(revised.history.length,revised.contact_adjustment);
 const a=old.submit(c.word),b=revised.submit(c.word);
 assert.equal(a.success,false,c.id+' v1 miss');assert.equal(b.success,true,c.id+' v2 hit');
 for(const [actual,wanted]of [[a,c.legacy],[b,c.revised]])for(const field of ['destination','required','launch'])assert.ok(Math.abs(actual[field]-wanted[field])<1e-6,c.id+' '+field);
 assert.equal(a.destination,b.destination);assert.deepEqual(restoreGame(e,revised.state()).state(),revised.state(),c.id+' round trip');
}

const settings=researchSettings('doubtful','studio','cuff');
const old=new Game(e,'doubtful','cuff',.27,{...settings,contact_adjustment:{version:V1,after:0}});
assert.ok(old.submit('dubious').success);const saved=old.state(),snapshot=structuredClone(saved);
const fetchBefore=globalThis.fetch,cacheBefore=globalThis.caches;globalThis.caches=undefined;globalThis.fetch=async url=>new Response(fs.readFileSync(new URL(url)));
let completed;
try{
 const client=await createBrowserClient({progressive:false});await client.request('restore',{state:saved});
 await assert.rejects(client.request('submit',{word:'like'}),/Word not allowed/);
 assert.deepEqual(client.restoreRetry(saved).state,saved,'Invalid input/restore cannot upgrade v1');
 const next=await client.request('submit',{word:'talent'});
 assert.deepEqual(next.state.contact_adjustment,{version:V2,after:1,previous:{version:V1,after:0}});
 assert.deepEqual(next.state.history[0],saved.history[0],'Upgrade preserves historical required contact');
 assert.deepEqual(saved,snapshot,'No mutation of supplied snapshots');
 assert.deepEqual(restoreGame(e,next.state).state(),next.state);
 const retry=client.retryNow(next.state,1,2).state;
 assert.deepEqual(retry.contact_adjustment,next.state.contact_adjustment);
 assert.deepEqual(retry.history[0],{...saved.history[0],assumed:true});
 assert.deepEqual(client.retryNow(next.state,0,2).state.contact_adjustment,newContactRule(0));
 await client.request('restore',{state:next.state});
 await client.request('submit',{word:'skill'});completed=(await client.request('submit',{word:'hand'})).state;
 assert.ok(completed.won);assert.deepEqual(restoreGame(e,completed).state(),completed);
}finally{globalThis.fetch=fetchBefore;globalThis.caches=cacheBefore;}
const withoutPrevious=structuredClone(completed);delete withoutPrevious.contact_adjustment.previous;
assert.notEqual(semanticRouteKey(completed),semanticRouteKey(withoutPrevious),'Mixed policy boundaries participate in cache identity');
const report=await new VectorClevernessAnalyser(e,{modelSha:config.vector_sha256,store}).analyse(completed);
assert.ok(Number.isFinite(report.primary_score));assert.deepEqual(report.route,completed.route);
console.log('V2 contact pairs passed: all frozen source/frequency values, 101 reviewed gains, role fallback, mixed replay/adoption/retry and scoring.');
