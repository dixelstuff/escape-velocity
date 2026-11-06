import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game,restoreGame,Embeddings,decodeHalf,createBrowserClient} from '../static/engine.mjs';
import {bunkerExamples} from '../static/bunker-examples.mjs';
import {dailyManifest} from '../static/daily-manifest.mjs';
const root=new URL('../static/model/',import.meta.url),read=f=>fs.readFileSync(new URL(f,root)),config=JSON.parse(read('config.json')),bytes=read(config.vector_fallback);
const e=new Embeddings(JSON.parse(read(config.words_file)),decodeHalf(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength)),config.dimensions,new Uint8Array(read(config.hub_file)));
const settings=bunkerExamples(dailyManifest)[3].settings;
const options={...settings,dogleg_finish_rule:{version:'strong-arrival-v1',after:0},challenge:{id:'bunker-live-adoption',version:'stroke-play-v1',par:5,attempt:1,unlimited:true}};
const make=(old=false,trap=true)=>new Game(e,settings.start,settings.target,settings.threshold,{...options,...(!trap?{semantic_bunker:null}:{}),...(old?{history:[]}: {})});
const oldFailure=make(true);assert.ok(oldFailure.submit('free').bunker);assert.equal(oldFailure.state().bunker_hit_only_after,undefined);assert.deepEqual(restoreGame(e,oldFailure.state()).state(),oldFailure.state(),'old catch animation/feedback are not reinterpreted on reload');
const current=make(),control=make(false,false),bad=current.submit('free');assert.equal(control.submit('free').success,false);assert.equal(bad.bunker,undefined);assert.equal(current.state().bunker_hit_only_after,0);
const oldPrefix=make(true);assert.equal(oldPrefix.submit('buy').success,true);const saved=oldPrefix.state(),savedBytes=JSON.stringify(saved);
const weakControl=make(false,false);weakControl.submit('buy');const weak=weakControl.submit('freedom');assert.equal(weak.success,false,'direct dogleg word is a genuinely weak connection here');assert.ok(e.cosine('freedom','free')>=.4);
const strongControl=make(false,false);strongControl.submit('buy');assert.equal(strongControl.submit('free').success,true);
const beforeFetch=globalThis.fetch,beforeCaches=globalThis.caches;globalThis.caches=undefined;globalThis.fetch=async url=>new Response(fs.readFileSync(new URL(url)));
try{
 const client=await createBrowserClient({progressive:false});
 assert.deepEqual((await client.request('restore',{state:saved})).state,saved);
 await assert.rejects(client.request('submit',{word:'notarealwordxyz'}),/outside the supported vocabulary/);
 const result=await client.request('submit',{word:'freedom'});assert.equal(result.event.bunker,undefined);assert.deepEqual(result.event,weak);assert.equal(result.state.bunker_hit_only_after,1);assert.deepEqual(result.state.history[0],saved.history[0]);assert.equal(JSON.stringify(saved),savedBytes);assert.deepEqual(restoreGame(e,result.state).state(),result.state);
 assert.deepEqual(client.restoreRetry(saved).state,saved,'cancelled preview preserves the old live state');
 const caught=await client.request('submit',{word:'free'});assert.ok(caught.event.bunker);assert.equal(caught.event.connected,true);
 const retry=client.retryNow(oldFailure.state(),0,2).state;assert.equal(retry.bunker_hit_only_after,0);const ordinary=await client.request('submit',{word:'free'});assert.equal(ordinary.event.bunker,undefined);assert.equal(ordinary.event.success,false);
 const prefixRetry=client.retryNow(saved,1,2).state;assert.equal(prefixRetry.bunker_hit_only_after,1);assert.equal(prefixRetry.history[0].assumed,true);const missed=await client.request('submit',{word:'freedom'});assert.equal(missed.event.bunker,undefined);assert.deepEqual(restoreGame(e,missed.state).state(),missed.state);
 // Activation is clamped when retrying before the original boundary.
 const earlier=client.retryNow({...saved,bunker_hit_only_after:1},0,2).state;assert.equal(earlier.bunker_hit_only_after,0);
}finally{globalThis.fetch=beforeFetch;globalThis.caches=beforeCaches;}
console.log('Bunker hit-only passed: real weak/exact misses stay ordinary, valid trapped shots still catch, old saves replay exactly, current saved lies adopt on next valid input, and retry activation is prefix-safe without changing hole identities.');
