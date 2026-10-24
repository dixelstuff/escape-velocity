import assert from 'node:assert/strict';
import{readFileSync}from'node:fs';
import{createHash}from'node:crypto';
import{Embeddings,Game,decodeHalf,restoreGame,createBrowserClient}from'../static/engine.mjs';
import{skillHistoryKey}from'../static/skill.mjs';
import{puzzleKey}from'../static/bridge-feedback.mjs';
import{familyVariants}from'../static/word-families.mjs';
const read=name=>readFileSync(new URL('../'+name,import.meta.url)),config=JSON.parse(read('static/model/config.json')),extension=JSON.parse(read('data/vocabulary-extension.json')),words=JSON.parse(read('static/model/'+config.words_file)),raw=read('static/model/'+config.vector_fallback),hubs=read('static/model/'+config.hub_file),e=new Embeddings(words,decodeHalf(raw.buffer.slice(raw.byteOffset,raw.byteOffset+raw.byteLength)),300,new Uint8Array(hubs));
const hash=b=>createHash('sha256').update(b).digest('hex'),n=extension.baseline.words;
assert.equal(hash(raw.subarray(0,n*600)),extension.baseline.vector_sha256);
assert.equal(hash(hubs.subarray(0,n)),extension.baseline.hub_sha256);
assert.equal(hash(Buffer.from(JSON.stringify(words.slice(0,n)))),extension.baseline.word_list_sha256);
assert.equal(hash(read('static/model/'+config.word_models['abtt-1-v1'].vector_fallback).subarray(0,n*600)),extension.baseline.abtt_sha256);
assert.equal(hash(read('static/model/'+config.word_models['ls15-v1'].radius_file).subarray(0,n*4)),extension.baseline.ls_radius_sha256);
assert.equal(words.length,extension.total);assert.equal(config.progressive.starter_words,5000);
for(const word of ['abseil','abseiling','rappel','rappelling','carabiner','belay','crampons','bivouac','seashell','acoustics','tailoring','wetsuit'])assert.ok(e.index.has(word),word);
assert.ok(familyVariants('bacteria').includes('bacterial'));assert.ok(familyVariants('bacterial').includes('bacteria'));assert.ok(!familyVariants('bacteria').includes('bacteria'));assert.ok(!familyVariants('pathology').includes('pathological'));
const hole=JSON.parse(read('data/new-mixed-holes.json')).find(h=>h.start==='sponge');
let g=new Game(e,hole.start,hole.target,hole.threshold,hole);g.submit('cells');let event=g.submit('bacteria');assert.equal(event.waypoint_reached,true);assert.equal(event.scoring_word,'bacterial');assert.equal(g.current,'bacteria');assert.equal(g.stage,1);assert.equal(event.word,'bacteria');assert.equal(g.state().family_rescue,true);assert.deepEqual(restoreGame(e,g.state()).state(),g.state());assert.notEqual(skillHistoryKey(g.state()),skillHistoryKey({...g.state(),family_rescue:false}));assert.notEqual(puzzleKey(g.state()),puzzleKey({...g.state(),family_rescue:false}));
const old=new Game(e,hole.start,hole.target,hole.threshold,{...hole,family_rescue:false});old.submit('cells');assert.equal(old.submit('bacteria').waypoint_reached,undefined);
const oldSave=old.state();delete oldSave.family_rescue;const restored=restoreGame(e,oldSave);assert.equal(restored.stage,0);assert.equal(restored.family_rescue,false,'unversioned historical scorecards keep their original outcome');
function fake({contact=.19,alternate=.4,destination=.3,otherDestination=.3,similarity=.8}={}){
 const words=['tee','flag','bacteria','bacterial'];return{index:new Map(words.map((w,i)=>[w,i])),hub:()=>0,cosine(a,b){if(a===b)return 1;const pair=[a,b];if(pair.includes('flag'))return pair.includes('tee')?0:pair.includes('bacteria')?destination:otherDestination;if(pair.includes('tee'))return pair.includes('bacteria')?contact:alternate;return similarity;}};
}
const fresh=m=>new Game(m,'tee','flag',.27,{mode:'distance',launch_min:.1,launch_max:.2,finish_mode:'range'});
assert.equal(fresh(fake()).submit('bacteria').scoring_word,'bacterial');
assert.equal(fresh(fake({contact:.174})).submit('bacteria').success,false,'no contact rescue beyond .025');
assert.equal(fresh(fake({similarity:.65})).submit('bacteria').success,false,'cosine must be strictly above .65');
assert.equal(fresh(fake({contact:.5})).submit('bacteria').scoring_word,undefined,'existing successful finish unchanged');
assert.equal(fresh(fake({contact:.5,destination:.139,otherDestination:.16})).submit('bacteria').won,true,'near chip boundary rescued');
assert.equal(fresh(fake({contact:.5,destination:.10,otherDestination:.16})).submit('bacteria').won,false,'distant chip boundary not rescued');
assert.equal(fresh(fake({contact:.5,destination:-.02,otherDestination:.4})).submit('bacteria').outcome,'water','original backward/water shot cannot be rescued');
assert.equal(fresh(fake({otherDestination:-.02})).submit('bacteria').success,false,'unsafe replacement cannot be used');
// Test the actual progressive browser API before any common/background download.
const originalFetch=globalThis.fetch,originalCaches=globalThis.caches,requests=[];
globalThis.caches=undefined;
globalThis.fetch=async(url,options={})=>{const u=new URL(url),b=readFileSync(u);requests.push({file:u.pathname.split('/').at(-1),range:options.headers?.Range});if(options.headers?.Range){const[,a,z]=options.headers.Range.match(/bytes=(\d+)-(\d+)/);return new Response(b.subarray(+a,+z+1),{status:206,headers:{'Content-Range':`bytes ${a}-${z}/${b.length}`}});}return new Response(b);};
try{
 const client=await createBrowserClient();await client.request('new',hole);await client.request('submit',{word:'cells'});const result=await client.request('submit',{word:'bacteria'});assert.equal(result.event.scoring_word,'bacterial');assert.equal(result.state.stage,1);
 const manifest=JSON.parse(read('static/model/'+config.progressive.manifest_file));assert.ok(!requests.some(r=>r.file===manifest.starter.file),'family rescue works before the 5,000 common words arrive');
 await client.request('new',{start:'abseil',target:'acupuncture',mode:'distance',finish_mode:'range'});const known=await client.request('submit',{word:'belay'});assert.equal(known.event.word,'belay');assert.ok(Number.isFinite(known.event.launch));
 assert.ok(!requests.some(r=>r.file===config.vector_file),'new vocabulary works without downloading the whole model');
}finally{globalThis.fetch=originalFetch;globalThis.caches=originalCaches;}
console.log('Word families and rare vocabulary passed: bounded rescue, safe substitutions, saved-rule compatibility, unchanged old model data, lazy loading and real ABSEIL/BACTERIA.');
