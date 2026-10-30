import assert from 'node:assert/strict';
import fs from 'node:fs';
import {Game,restoreGame} from '../static/engine.mjs';import {loadResearchModel,researchSettings} from '../scripts/cleverness-research-utils.mjs';
import {VectorClevernessAnalyser} from '../static/vector-cleverness/index.mjs';import {playtestKey} from '../static/cleverness-playtest-data.mjs';
import {semanticRouteKey} from '../static/semantic-analysis.mjs';
const {e,config,store}=loadResearchModel(),a=new VectorClevernessAnalyser(e,{store,modelSha:config.vector_sha256});
function state(word,old=false){const g=new Game(e,'carrot','prism',.27,{...researchSettings('carrot','light','prism'),spelling_equivalence:'uk-us-v1',...(old?{spelling_equivalence:false}:{})});g.submit('orange');g.submit(word);assert.ok(g.won);return g.state();}
const oldUS=state('color',true),oldUK=state('colour',true),us=state('color'),uk=state('colour');
assert.notEqual(semanticRouteKey(oldUS),semanticRouteKey(us),'Old/new semantic caches must not collide even for identical numeric shots');
const [r0,r1,r2,r3]=await Promise.all([a.analyse(oldUS),a.analyse(oldUK),a.analyse(us),a.analyse(uk)]);
assert.equal(r0.band_free.score,86);assert.equal(r1.band_free.score,89,'Archived original-vector analysis remains reproducible');assert.equal(r2.band_free.score,86);assert.equal(r3.band_free.score,86);assert.equal(r2.band_free.unrounded_score,r3.band_free.unrounded_score);assert.deepEqual(r2.components,r3.components);assert.deepEqual(r2.band_free,r3.band_free);const numericEvidence=x=>Array.isArray(x)?x.map(numericEvidence):x&&typeof x==='object'?Object.fromEntries(Object.entries(x).filter(([k])=>k!=='timing'&&!k.endsWith('_ms')).map(([k,v])=>[k,numericEvidence(v)])):x;assert.deepEqual(numericEvidence(r2.reproducibility.input),numericEvidence(r3.reproducibility.input),'All semantic evidence is equal; elapsed timings are observational');
assert.equal(r2.band_free.unrounded_score,r0.band_free.unrounded_score,'The existing canonical-row score and complete formula are unchanged');
for(const [s,r,w]of [[us,r2,'color'],[uk,r3,'colour']]){assert.equal(r.key,playtestKey(s,config.vector_sha256));assert.equal(r.route[2],w);assert.equal(r.spelling_equivalence.version,'uk-us-v1');assert.equal(r.spelling_equivalence.canonical_route[2],'color');assert.equal(r.reproducibility.input.state.spelling_equivalence,'uk-us-v1');assert.equal(s.history[1].word,w);assert.equal((await a.analyse(s)).band_free.unrounded_score,r.band_free.unrounded_score);}
console.log('Spelling Cleverness passed: exact COLOR/COLOUR equality at 86 including unrounded score, I/S/E and canonical evidence; original 86/89 archived diagnostics retained, formula unchanged, cache identities separated and entered spelling retained in reports.');

for(const f of JSON.parse(fs.readFileSync(new URL('./vector-cleverness-fixtures.json',import.meta.url)))){const old=await a.analyse(f.state),shared=restoreGame(e,{...f.state,spelling_equivalence:'uk-us-v1'}).state();assert.ok(shared.won);const current=await a.analyse(shared);assert.equal(current.band_free.score,old.band_free.score,f.id+' existing calibration score unchanged');}
console.log('All 23 existing calibration scores are unchanged under shared spelling semantics.');
