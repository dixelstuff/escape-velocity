import assert from 'node:assert/strict';
import fs from 'node:fs';
import {BLOCKED_PLAY_WORDS,checkLiveVocabulary,isBlockedPlayWord} from '../static/playable-vocabulary.mjs';
import {createBrowserClient,Game,restoreGame} from '../static/engine.mjs';
import {loadResearchModel} from '../scripts/cleverness-research-utils.mjs';
assert.deepEqual(BLOCKED_PLAY_WORDS,['yes', 'yeah', 'but', 'actually', 'indeed', 'really', 'however', 'perhaps', 'very', 'also', 'maybe', 'someone', 'use', 'used', 'uses', 'using']);
for(const word of BLOCKED_PLAY_WORDS.flatMap(w=>[w,` ${w.toUpperCase()} `])){
 assert.equal(isBlockedPlayWord(word),true);
 assert.throws(()=>checkLiveVocabulary('submit',{word}),{message:'Word not allowed. Try another.'});
 for(const role of ['start','target','final_target'])assert.throws(()=>checkLiveVocabulary('new',{[role]:word}),{message:'Word not allowed. Try another.'});
 assert.throws(()=>checkLiveVocabulary('waypoint-access',{waypoint:{word}}),{message:'Word not allowed. Try another.'});
 for(const path of ['restore','retry-prefix','display','cleverness-vector'])assert.doesNotThrow(()=>checkLiveVocabulary(path,{state:{history:[{word}]}}));
}
for(const word of ['yesterday','butter','butterfly','okay','nothing','can','does','useful','useless','reuse','reused','user','users','amusing','abuse','like','liked','likes','liking'])assert.equal(isBlockedPlayWord(word),false);
const {e}=loadResearchModel();for(const word of BLOCKED_PLAY_WORDS)assert.ok(e.index.has(word),'Retain vector rows for saved evidence');
const settings={start:'coffee',target:'science',threshold:.27,mode:'distance',finish_mode:'range'},expected=new Game(e,settings.start,settings.target,settings.threshold,settings);
const fetchBefore=globalThis.fetch,cachesBefore=globalThis.caches;
globalThis.caches=undefined;
globalThis.fetch=async url=>new Response(fs.readFileSync(decodeURIComponent(new URL(url).pathname)));
try{
 const client=await createBrowserClient({progressive:false});
 await client.request('new',settings);
 for(const word of BLOCKED_PLAY_WORDS.map(w=>` ${w.toUpperCase()} `))await assert.rejects(client.request('submit',{word}),{message:'Word not allowed. Try another.'});
 const expectedEvent=expected.submit('food'),actual=await client.request('submit',{word:'food'});
 assert.deepEqual(actual.event,expectedEvent);assert.deepEqual(actual.state,expected.state(),'Blocked inputs do not change route, strokes or attempts');
 for(const role of ['start','target'])await assert.rejects(client.request('new',{...settings,[role]:'yes'}),{message:'Word not allowed. Try another.'});
 await assert.rejects(client.request('new',{...settings,waypoint:{word:'but',threshold:.265}}),{message:'Word not allowed. Try another.'});
 // Historical engine replay is distinct from accepting a fresh live input.
 const old=new Game(e,'answer','agreement',.27,{mode:'distance',finish_mode:'range'});old.submit('yes');const saved=old.state();
 assert.deepEqual(restoreGame(e,saved).state(),saved);
 assert.deepEqual((await client.request('restore',{state:saved})).state,saved);
 const beforeUse=new Game(e,'tool','help',.27,{mode:'distance',finish_mode:'range'});beforeUse.submit('use');const historicUse=beforeUse.state();assert.deepEqual(restoreGame(e,historicUse).state(),historicUse);assert.deepEqual((await client.request('restore',{state:historicUse})).state,historicUse,'old USE routes retain exact replay');
 await assert.rejects(client.request('submit',{word:'yeah'}),{message:'Word not allowed. Try another.'});
}finally{globalThis.fetch=fetchBefore;globalThis.caches=cachesBefore;}
console.log('Playable vocabulary passed: exact sixteen-word block, normalized inputs and endpoints, no shot/state changes, real browser client, unchanged vectors and historical replay.');
