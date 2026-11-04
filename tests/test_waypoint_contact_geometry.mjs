import assert from 'node:assert/strict';import fs from 'node:fs';
import {VectorClevernessAnalyser} from '../static/vector-cleverness/index.mjs';
import {Game,restoreGame,createBrowserClient,WAYPOINT_RESCUE_GEOMETRY} from '../static/engine.mjs';import {mapLayout} from '../static/map.mjs';import {waypointLayout,waypointPosition,waypointAnchors} from '../static/waypoint-map.mjs';import {loadResearchModel,researchSettings} from '../scripts/cleverness-research-utils.mjs';import {semanticRouteKey} from '../static/semantic-analysis.mjs';import {playtestKey,playtestHoleKey} from '../static/cleverness-playtest-data.mjs';
const {e,config,store}=loadResearchModel(),settings=researchSettings('doubtful','studio','cuff'),make=extra=>new Game(e,'doubtful','cuff',.27,{...settings,...extra});
const direct=make(),miss=direct.submit('talent'),via=make();via.submit('dubious');const hit=via.submit('talent');
assert.equal(miss.success,false);assert.equal(miss.inside,true);assert.equal(direct.stage,0);
assert.equal(hit.success,true);assert.equal(hit.inside,true);assert.equal(hit.waypoint_reached,true);assert.equal(via.stage,1);assert.equal(hit.contact_word,'talents');assert.equal(hit.scoring_word,undefined);assert.equal(hit.destination,e.cosine('talent','studio'));assert.equal(hit.destination,miss.destination);assert.equal(hit.required,via.history[1].required);
for(const narrow of [false,true])for(const turn of ['up','down']){
 const scene={...direct.state(),waypoint:{...direct.waypoint,turn}},d=waypointLayout(mapLayout(narrow),scene),a=waypointPosition(direct.state(),'talent',d,miss),b=waypointPosition(via.state(),'talent',d,hit),bend=waypointAnchors(d).bend;
 assert.deepEqual(a,b,'Miss ghost and successful arrival share exact coordinates');assert.ok(Math.hypot((a.x-bend.x)/(d.width*.065),(a.y-bend.y)/40)<1);
 assert.deepEqual(waypointPosition({...scene,history:[],stage:0},'talent',d,hit),b,'Flight preview uses same first-leg coordinates after target switch');
}
assert.deepEqual(restoreGame(e,via.state()).state(),via.state());
// Destination and zone are identical across unrelated incoming lies, even
// when a different plural/family contact alternative is available.
for(const word of ['talent','talents','music','musical','artist','painting','photo','photos','ability','able','creativity','creative','bacteria','bacterial','navigation','navigational','light','screen']){
 const intended=[];
 for(const current of ['doubtful','dubious','uncertain']){
  const g=make();g.current=current;const h=g.pluralShot(word);intended.push([h.destination,h.inside,h.destination_word??null]);
 }
 assert.deepEqual(intended[1],intended[0],word);assert.deepEqual(intended[2],intended[0],word);
}

const spongeSettings=researchSettings('sponge','microbiology','cheddar'),spongeDirect=new Game(e,'sponge','cheddar',.27,spongeSettings),spongeFirst=spongeDirect.submit('bacteria'),spongeVia=new Game(e,'sponge','cheddar',.27,spongeSettings);spongeVia.submit('cells');const spongeHit=spongeVia.submit('bacteria');
assert.equal(spongeFirst.destination,spongeHit.destination);assert.equal(spongeFirst.destination_word,'bacterial');assert.equal(spongeFirst.inside,true);assert.equal(spongeFirst.success,true);assert.equal(spongeHit.waypoint_reached,true,'Existing near-zone adjective generosity is retained and independent of incoming contact');

const old=make({waypoint_rescue:false});old.submit('dubious');const legacy=old.submit('talent');assert.equal(legacy.scoring_word,'talents');assert.equal(legacy.inside,false);assert.equal(old.stage,0);assert.equal(old.state().waypoint_rescue,undefined);assert.deepEqual(restoreGame(e,old.state()).state(),old.state(),'Old wrong-looking rescue replays faithfully as recorded');
function fake({word='drum',variant='drums',contact=.20,alternate=.24,destination=.28,otherDestination=.15,similarity=.8,hub=0}={}){
 const names=['tee','waypoint','flag',word,variant];return{index:new Map(names.map((w,i)=>[w,i])),hub:w=>w===word?hub:0,cosine(a,b){if(a===b)return 1;const p=[a,b];if(p.includes('flag'))return 0;if(p.includes('waypoint'))return p.includes('tee')?0:p.includes(word)?destination:otherDestination;if(p.includes('tee'))return p.includes(word)?contact:alternate;return similarity;}};
}
const fresh=(m,extra={})=>new Game(m,'tee','flag',.27,{mode:'distance',launch_min:.095,launch_max:.215,finish_mode:'range',waypoint:{word:'waypoint',threshold:.265},...extra});
for(const[word,variant]of [['drum','drums'],['bacteria','bacterial']]){
 const m=fake({word,variant}),g=fresh(m),h=g.submit(word);assert.equal(h.success,true);assert.equal(h.destination,.28);assert.equal(h.contact_word,variant);assert.equal(h.scoring_word,undefined);assert.equal(h.waypoint_reached,true);
 const weak=fresh(fake({word,variant,alternate:.20})).submit(word);assert.equal(weak.success,false,'Shorter variant destination cannot lower required contact');assert.equal(weak.destination,.28);assert.equal(weak.inside,true);
 const nearModel=fake({word,variant,contact:.4,destination:.25,otherDestination:.30}),near=fresh(nearModel).submit(word);assert.equal(near.success,true);assert.equal(near.destination,.30);assert.equal(near.destination_word,variant);assert.equal(near.inside,true);
 const nearMiss=fresh(fake({word,variant,contact:.05,destination:.25,otherDestination:.30})).submit(word);assert.equal(nearMiss.success,false);assert.equal(nearMiss.inside,true);assert.equal(nearMiss.destination,near.destination,'Near-zone generosity is the same before contact succeeds');
 const outside=fresh(fake({word,variant,contact:.4,destination:.22,otherDestination:.30})).submit(word);assert.equal(outside.destination,.22);assert.equal(outside.inside,false,'No distant boundary rescue');
 assert.equal(fresh(fake({word,variant,contact:.15})).submit(word).success,false);
 assert.equal(fresh(fake({word,variant,similarity:.65})).submit(word).success,false);
 assert.equal(fresh(fake({word,variant,destination:-.02})).submit(word).outcome,'water');
 const hubbed=fresh(fake({word,variant,contact:.24,alternate:.245,hub:1})).submit(word);assert.equal(hubbed.success,false);assert.equal(hubbed.required,.25,'Contact rescue retains the played word hub surcharge');
}
// Non-dogleg and second-leg rescue still use their existing finishing vectors.
for(const rule of [false,{version:WAYPOINT_RESCUE_GEOMETRY,after:0}]){
 const g=new Game(e,'coal','telescope',.27,{...researchSettings('coal','wedding','telescope'),waypoint_rescue:rule});for(const w of ['train','wedding','photos'])g.submit(w);assert.ok(g.won);assert.equal(g.history.at(-1).scoring_word,'photo');assert.equal(g.history.at(-1).destination,e.cosine('photo','telescope'));
}
assert.throws(()=>make({waypoint_rescue:{version:'other',after:0}}),/Unknown waypoint rescue/);assert.throws(()=>make({waypoint_rescue:{version:WAYPOINT_RESCUE_GEOMETRY,after:-1}}),/Unknown waypoint rescue/);
const completed=JSON.parse(fs.readFileSync('reports/novel-public-twenty/safety.json')).checks[0].witness.state;
const shared=restoreGame(e,{...completed,waypoint_rescue:{version:WAYPOINT_RESCUE_GEOMETRY,after:0}}).state();assert.ok(shared.won);assert.notEqual(semanticRouteKey(completed),semanticRouteKey(shared));assert.notEqual(playtestKey(completed,config.vector_sha256),playtestKey(shared,config.vector_sha256));assert.notEqual(playtestHoleKey(completed),playtestHoleKey(shared));
const fetchBefore=globalThis.fetch,cacheBefore=globalThis.caches;globalThis.caches=undefined;globalThis.fetch=async url=>new Response(fs.readFileSync(new URL(url)));
try{
 const client=await createBrowserClient({progressive:false}),prefix=make({waypoint_rescue:false});prefix.submit('dubious');const saved=prefix.state(),serialized=JSON.stringify(saved);
 assert.deepEqual((await client.request('restore',{state:saved})).state,saved);
 await assert.rejects(client.request('submit',{word:'notarealwordxyz'}),/outside the supported vocabulary/);
 const result=await client.request('submit',{word:'talent'});assert.equal(result.event.waypoint_reached,true);assert.deepEqual(result.state.history[0],saved.history[0]);assert.deepEqual(result.state.waypoint_rescue,{version:WAYPOINT_RESCUE_GEOMETRY,after:1});assert.equal(result.state.attempts,2);assert.deepEqual(restoreGame(e,result.state).state(),result.state);
 assert.equal(JSON.stringify(saved),serialized,'Live adoption does not mutate the saved prefix');
 assert.deepEqual(client.restoreRetry(saved).state,saved,'Cancelling a retry retains the original rules and lie');
 const retry=client.retryNow(saved,1,2).state;assert.deepEqual(retry.history,saved.history.map(h=>({...h,assumed:true})));assert.deepEqual(retry.waypoint_rescue,{version:WAYPOINT_RESCUE_GEOMETRY,after:1});assert.equal((await client.request('submit',{word:'talent'})).state.stage,1);
 const tee=client.retryNow(saved,0,2).state;assert.deepEqual(tee.waypoint_rescue,{version:WAYPOINT_RESCUE_GEOMETRY,after:0});assert.equal((await client.request('submit',{word:'talent'})).event.inside,true);
}finally{globalThis.fetch=fetchBefore;globalThis.caches=cacheBefore;}
const completedContact=make();for(const word of ['dubious','talent','skill','hand'])assert.ok(completedContact.submit(word).success);assert.ok(completedContact.won);
const report=await new VectorClevernessAnalyser(e,{store,modelSha:config.vector_sha256}).analyse(completedContact.state());
assert.ok(Number.isFinite(report.primary_score));assert.deepEqual(report.route,completedContact.route);assert.equal(report.reproducibility.input.state.history[1].contact_word,'talents');assert.deepEqual(report.leg_efficiency.legs.map(l=>l.strokes),[2,3]);
console.log('Waypoint contact geometry passed: exact TALENT miss/arrival coordinates, fixed first-leg destination for plural/family rescue, full-distance contact and hub checks, no backward rescue, old-save replay, prefix-safe live adoption/retry, cache separation and unchanged second-leg PHOTO finish.');
