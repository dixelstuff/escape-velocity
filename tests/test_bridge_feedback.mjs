import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {Embeddings,Game,decodeHalf} from '../static/engine.mjs';
import {assessHole} from '../static/assessment.mjs';
import {FlightLog,LOG_KEY,RESET_BACKUP_KEY,journeyText} from '../static/flight-log.mjs';
import {openingGreenShots,bridgeKey,bridgeMetrics} from '../static/bridge-feedback.mjs';
const config=JSON.parse(readFileSync(new URL('../static/model/config.json',import.meta.url)));
const buf=gunzipSync(readFileSync(new URL('../static/model/'+config.vector_file,import.meta.url)));
const e=new Embeddings(JSON.parse(readFileSync(new URL('../static/model/'+config.words_file,import.meta.url))),decodeHalf(buf.buffer.slice(buf.byteOffset,buf.byteOffset+buf.byteLength)));
const settings={start:'morph',target:'lineage',threshold:.28,mode:'distance',launch_min:.10,launch_max:.21};
const result=assessHole(e,settings),bridge=result.opening_bridges.find(b=>b.word==='evolved');assert.ok(bridge);
const memory=new Map(),storage={getItem:k=>memory.get(k),setItem:(k,v)=>memory.set(k,v)};
let time='2026-10-20T10:00:00Z',sequence=0;
const reload=()=>new FlightLog(storage,()=>time,()=> 'round-'+(++sequence));
let log=reload(),g=new Game(e,settings.start,settings.target,settings.threshold,settings);log.begin(g.state(),config.model,config.vector_sha256);
const meta={model:config.model,model_sha:config.vector_sha256,source:'preview'};
const before=JSON.stringify(g.state());const flag=log.flagBridge(result,bridge,meta);assert.equal(JSON.stringify(g.state()),before);
assert.equal(log.flagBridge(result,bridge,meta).key,flag.key);assert.equal(log.data.bridgeFeedback.length,1);
assert.deepEqual(flag.metrics,bridgeMetrics(bridge.contact,bridge.required,bridge.destination,.28));
assert.equal(flag.puzzle.start,'morph');assert.equal(flag.puzzle.rules,'golf-distance-v2');assert.equal(flag.journey_id,null);
log.noteBridge(flag.key,'Weak link to the hole <test>');log=reload();assert.equal(log.data.bridgeFeedback[0].note,'Weak link to the hole <test>');
assert.match(journeyText(log.active,log.data.bridgeFeedback),/OPENING BRIDGE FEEDBACK/);
// Preview before creating/playing the matching hole is still known spoiler exposure.
log.markBridgeView(result.settings,'preview',config.vector_sha256);log.markBridgeView(result.settings,'preview',config.vector_sha256);assert.equal(log.data.bridgeViews.length,1);
time='2026-10-20T10:00:10Z';const shot=g.submit('evolved');log.record('evolved',g.state(),shot);
let comparison=JSON.parse(log.exportJSON()).bridge_comparison;assert.equal(comparison.flagged_poor.length,1);assert.equal(comparison.played_opening_greens.length,1);
assert.equal(comparison.played_opening_greens[0].spoiler_status,'seen');assert.equal(comparison.played_opening_greens[0].flagged_poor,true);
assert.equal(comparison.played_opening_greens[0].metrics.required,shot.required);assert.equal(g.state().attempts,2,'automatic finish does not exclude a one-swing green');
// Model/settings versions stay distinct, and unflagging removes only the selected review.
const other=log.flagBridge(result,bridge,{...meta,model_sha:'different-model'});assert.notEqual(other.key,flag.key);log.unflagBridge(other.key);assert.equal(log.data.bridgeFeedback.length,1);
const altered=assessHole(e,{...settings,threshold:.30});const altBridge=altered.opening_bridges.find(b=>b.word==='evolved');log.flagBridge(altered,altBridge,meta);assert.equal(log.data.bridgeFeedback.length,2);
const fresh=()=>new Game(e,'morph','lineage',.28,settings);
const oldCount=log.data.journeys.length;log.reset(fresh().state(),config.model,config.vector_sha256);
assert.equal(log.data.bridgeFeedback.length,0);assert.equal(log.data.bridgeViews.length,0);assert.equal(JSON.parse(log.exportJSON()).bridge_comparison.played_opening_greens.length,0);
log.flagBridge(result,bridge,meta);log.noteBridge(flag.key,'New batch note wins');log.restorePrevious();assert.equal(log.data.journeys.length,oldCount+1);assert.equal(log.data.bridgeFeedback.length,2);assert.equal(log.data.bridgeFeedback.find(r=>r.key===flag.key).note,'New batch note wins');assert.equal(log.data.bridgeViews.length,1);
// A played bridge with no tracked earlier view is separate from an endorsed good bridge.
time='2026-10-20T11:00:00Z';g=new Game(e,'mate','elephant',.28,settings);log.begin(g.state(),config.model,config.vector_sha256);const bull=g.submit('bull');assert.equal(bull.inside,true);log.record('bull',g.state(),bull);
const played=openingGreenShots(log.data).at(-1);assert.equal(played.spoiler_status,'not_recorded_in_batch');assert.equal(played.flagged_poor,false);
time='2026-10-20T11:00:10Z';log.markBridgeView(g.state(),'active',config.vector_sha256);assert.equal(openingGreenShots(log.data).at(-1).spoiler_status,'not_recorded_in_batch','later spoiler viewing must not rewrite earlier exposure');
delete log.active.bridge_tracking_version;assert.equal(openingGreenShots(log.data).at(-1).spoiler_status,'unknown');
// Changing settings or model does not erase knowledge of the same tee/target spoiler.
time='2026-10-20T11:01:00Z';log.markBridgeView({...g.state(),threshold:.29},'preview','different-model');
g=new Game(e,'mate','elephant',.28,settings);log.begin(g.state(),config.model,config.vector_sha256);time='2026-10-20T11:01:10Z';const informed=g.submit('bull');log.record('bull',g.state(),informed);assert.equal(openingGreenShots(log.data).at(-1).spoiler_status,'seen');
// A failed first shot followed by a green is not an opening green.
g=fresh();log.begin(g.state(),config.model,config.vector_sha256);const miss=g.submit('lineage');log.record('lineage',g.state(),miss);const later=g.submit('evolved');log.record('evolved',g.state(),later);
assert.ok(!openingGreenShots(log.data).some(r=>r.journey_id===log.active.id));
// Flags and recovery survive storage failures without changing game data.
const prior=structuredClone(log.data),raw=memory.get(LOG_KEY),backup=memory.get(RESET_BACKUP_KEY);
const denied=new FlightLog({getItem:k=>memory.get(k),setItem:(k,v)=>{if(k===LOG_KEY)throw Error('quota');memory.set(k,v);}},()=>time,()=> 'failed');
assert.throws(()=>denied.reset(fresh().state(),config.model,config.vector_sha256),/unchanged/);assert.deepEqual(denied.data,prior);assert.equal(memory.get(LOG_KEY),raw);assert.equal(memory.get(RESET_BACKUP_KEY),backup);
denied.flagBridge(result,bridge,{...meta,model_sha:'not-persisted'});assert.match(denied.warning,/could not save/);assert.ok(JSON.parse(denied.exportJSON()).bridgeFeedback.some(r=>r.model_sha==='not-persisted'));
assert.equal(bridgeKey(result.settings,'evolved',config.vector_sha256),flag.key);
console.log('Bridge feedback passed: exact settings/model and margins, duplicate flags, notes, undo, preview persistence, played-green comparison, spoiler chronology, reset/recovery merge, cutoff separation, and storage failure.');
