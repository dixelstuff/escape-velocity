import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BLOCKED_PLAY_WORDS,checkLiveVocabulary,isBlockedPlayWord} from '../static/playable-vocabulary.mjs';
import {createBrowserClient,Game,restoreGame} from '../static/engine.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
assert.deepEqual(BLOCKED_PLAY_WORDS,['yes','yeah','but']);
for(const word of ['yes',' YEAH ','But']){
 assert.equal(isBlockedPlayWord(word),true);
 assert.throws(()=>checkLiveVocabulary('submit',{word}),/No shot used/);
 for(const role of ['start','target','final_target'])assert.throws(()=>checkLiveVocabulary('new',{[role]:word}),/playable vocabulary/);
 assert.throws(()=>checkLiveVocabulary('waypoint-access',{waypoint:{word}}),/playable vocabulary/);
 for(const path of ['restore','retry-prefix','display','cleverness-vector'])assert.doesNotThrow(()=>checkLiveVocabulary(path,{state:{history:[{word}]}}));
}
for(const word of ['yesterday','butter','butterfly','okay','nothing','can','does'])assert.equal(isBlockedPlayWord(word),false);
const {e}=loadResearchModel();for(const word of BLOCKED_PLAY_WORDS)assert.ok(e.index.has(word),'Retain vector rows for saved evidence');
const settings={start:'coffee',target:'science',threshold:.27,mode:'distance',finish_mode:'range'},expected=new Game(e,settings.start,settings.target,settings.threshold,settings);
const fetchBefore=globalThis.fetch,cachesBefore=globalThis.caches;
globalThis.caches=undefined;
globalThis.fetch=async url=>new Response(fs.readFileSync(decodeURIComponent(new URL(url).pathname)));
try{
 const client=await createBrowserClient({progressive:false});
 await client.request('new',settings);
 for(const word of [' YES ','yeah','but'])await assert.rejects(client.request('submit',{word}),/No shot used/);
 const expectedEvent=expected.submit('food'),actual=await client.request('submit',{word:'food'});
 assert.deepEqual(actual.event,expectedEvent);assert.deepEqual(actual.state,expected.state(),'Blocked inputs do not change route, strokes or attempts');
 for(const role of ['start','target'])await assert.rejects(client.request('new',{...settings,[role]:'yes'}),/playable vocabulary/);
 await assert.rejects(client.request('new',{...settings,waypoint:{word:'but',threshold:.265}}),/playable vocabulary/);
 // Historical engine replay is distinct from accepting a fresh live input.
 const old=new Game(e,'answer','agreement',.27,{mode:'distance',finish_mode:'range'});old.submit('yes');const saved=old.state();
 assert.deepEqual(restoreGame(e,saved).state(),saved);
 assert.deepEqual((await client.request('restore',{state:saved})).state,saved);
 await assert.rejects(client.request('submit',{word:'yeah'}),/No shot used/);
}finally{globalThis.fetch=fetchBefore;globalThis.caches=cachesBefore;}
console.log('Playable vocabulary passed: exact three-word block, normalized inputs and endpoints, no shot/state changes, real browser client, unchanged vectors and historical replay.');
