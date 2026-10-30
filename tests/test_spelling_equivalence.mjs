import {mapLayout} from '../static/map.mjs';
import {waypointLayout,waypointPosition} from '../static/waypoint-map.mjs';
import {wordLieKey,currentLieKey} from '../static/word-lies.mjs';
import assert from 'node:assert/strict';
import {Game,Embeddings,restoreGame} from '../static/engine.mjs';
import {spellingResolver,canonicalSpellingState,SPELLING_EQUIVALENCE,spellingPairs} from '../static/spelling-equivalence.mjs';
import {loadResearchModel,researchSettings} from '../scripts/cleverness-research-utils.mjs';
class SharedGame extends Game{constructor(e,start,target,threshold,settings={}){super(e,start,target,threshold,{spelling_equivalence:SPELLING_EQUIVALENCE,...settings});}}
const {e}=loadResearchModel(),{model,resolve,aliases}=spellingResolver(e);
assert.equal(spellingResolver(e).model,model);assert.equal(model.vectors,e.vectors);assert.equal(model.words,e.words);assert.equal(model.index.size,e.index.size);
for(const [alias,canonical]of aliases){assert.equal(model.index.get(alias),e.index.get(canonical));assert.equal(model.cosine(alias,'water'),e.cosine(canonical,'water'));assert.equal(model.hub(alias),e.hub(canonical));}
for(const [a,b]of [['color','colour'],['colors','colours'],['colorful','colourful'],['coloring','colouring'],['organized','organised'],['organizing','organising'],['organization','organisation'],['travelers','travellers'],['cancelled','canceled'],['jeweler','jeweller']])assert.equal(resolve(a),resolve(b),a+' / '+b);
for(const [a,b]of [['tire','tyre'],['story','storey'],['curb','kerb'],['check','cheque'],['meter','metre'],['draft','draught'],['custom','customs'],['drum','drums'],['inspection','inspector']])assert.notEqual(resolve(a),resolve(b),a+' must remain distinct from '+b);
function play(word,extra={}){const g=new SharedGame(e,'carrot','prism',.27,{...researchSettings('carrot','light','prism'),...extra});g.submit('orange');g.submit(word);assert.ok(g.won);return g;}
const us=play('color'),uk=play('colour');assert.equal(us.state().spelling_equivalence,SPELLING_EQUIVALENCE);assert.deepEqual(canonicalSpellingState(us.state(),e),canonicalSpellingState(uk.state(),e));assert.equal(uk.history[1].word,'colour');assert.deepEqual(uk.route,['carrot','orange','colour','prism']);assert.deepEqual(restoreGame(e,uk.state()).state(),uk.state());
const d=waypointLayout(mapLayout(true),us.state());assert.deepEqual(waypointPosition(us.state(),'color',d),waypointPosition(uk.state(),'colour',d),'Spelling does not change visual lie offset');assert.equal(currentLieKey(us.state()),currentLieKey(uk.state()));assert.equal(wordLieKey('color',1,us.state()),wordLieKey('colour',1,uk.state()));
const old=play('colour',{spelling_equivalence:false}).state();assert.ok(!old.spelling_equivalence);assert.deepEqual(restoreGame(e,old).state(),old,'Old histories replay using their original vectors');assert.equal(canonicalSpellingState(old,e).history[1].word,'colour');assert.notEqual(old.history[1].destination,uk.history[1].destination);
// All eight spellings of tee/dogleg/flag must yield the same mechanical evidence.
let reference;
for(const start of ['color','colour'])for(const waypoint of ['center','centre'])for(const target of ['theater','theatre']){
 const g=new SharedGame(e,start,target,.27,researchSettings(start,waypoint,target));g.submit('stage');const normalized=canonicalSpellingState(g.state(),e);reference??=normalized;assert.deepEqual(normalized,reference);
}
assert.throws(()=>new SharedGame(e,'color','colour',.27,{mode:'distance'}),/must differ/);assert.throws(()=>new SharedGame(e,'color','flag',.27,{waypoint:{word:'colour'}}),/must differ/);
const tiny=new Embeddings(['tee','color','colour','middle','waypoint','flag'],new Float32Array([1,0,.8,.6,.1,.995,.6,.8,0,1,0,1]),2);
const direct=new SharedGame(tiny,'tee','color',.27,{mode:'distance',rules:'golf-distance-v3',finish_mode:'range',allow_backtracking:false});direct.submit('colour');assert.ok(direct.won);assert.equal(direct.state().attempts,1,'Alternate spelling of the flag is one manual stroke');assert.equal(direct.automatic_shots.length,0);assert.equal(direct.route.at(-1),'colour');
const duplicate=new SharedGame(tiny,'color','flag',.27,{waypoint:{word:'waypoint'},mode:'distance',rules:'golf-distance-v3'});assert.throws(()=>duplicate.submit('colour'),/already on that word/);assert.equal(duplicate.history.length,0);
duplicate.current='middle';duplicate.history.push({word:'color',stage:0,success:true});assert.throws(()=>duplicate.submit('colour'),/same word already played/);assert.equal(duplicate.history.length,1);
duplicate.stage=1;assert.doesNotThrow(()=>duplicate.submit('colour'),'Reuse across different legs remains permitted');
const wp=new SharedGame(tiny,'tee','flag',.27,{waypoint:{word:'color'},mode:'distance',rules:'golf-distance-v3'});wp.stage=1;wp.current='middle';wp.history.push({word:'colour',stage:0,success:true});assert.throws(()=>wp.submit('color'),/waypoint word has already been played/);
console.log(`Spelling equivalence passed: ${spellingPairs.length} curated forms, ${aliases.size} supported aliases; exact outcomes and hubs, entered spelling retained, all endpoints, no extra finishing stroke, no same-leg alias reuse, cross-leg reuse retained, old saves intact, plural/family distinctions untouched.`);
