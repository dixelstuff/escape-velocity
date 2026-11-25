import assert from 'node:assert/strict';
import {DailyGame,DAILY_KEY} from '../static/daily-game.mjs';
import {mergeDailyRecords} from '../static/play-record-merge.mjs';
import {completedHoles} from '../static/daily-ui.mjs';
import {BAND_FREE_VERSION} from '../static/cleverness-score-config.mjs';
const definitions=['a','b'].map((id,i)=>({id,date:`2026-11-${20+i}`,settings:{start:'tee',waypoint:{word:'bend'},target:'flag'}}));
const state=(id,word='finish',strokes=3)=>({start:'tee',waypoint:{word:'bend'},final_target:'flag',route:['tee',word,'flag'],won:true,attempts:strokes,history:[{word,success:true}],challenge:{id,unlimited:true,attempt:2}});
const oldBest=(id,word='finish',strokes=3)=>({state:state(id,word,strokes),route:state(id,word,strokes).route,journeyId:id+'-'+word,strokes,cleverness:99,scoreVersion:'band-free-harmonic-v8-incoming-dogleg',version:'band-free-harmonic-v8-incoming-dogleg',score:99,unrounded:99});
const old={version:1,selected:definitions[0].date,holes:Object.fromEntries(definitions.map(d=>[d.id,{id:d.id,date:d.date,tee:'tee',waypoint:'bend',flag:'flag',lastPlayedAt:'2026-11-22',completedAt:'2026-11-21',bestStrokes:oldBest(d.id),bestCleverness:oldBest(d.id,'other',4)}]))};
const memory=new Map([[DAILY_KEY,JSON.stringify(old)]]),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},game=new DailyGame(storage,{holes:definitions});
assert.equal(game.stats().completed,0);assert.deepEqual(Object.values(game.stats().counts),[0,0,0,0,0]);assert.equal(game.stats().averageBestCleverness,null);assert.equal(completedHoles(game).length,0);
for(const id of ['a','b']){const h=game.data.holes[id];assert.equal(h.bestCleverness.score,undefined);assert.equal(h.bestStrokes.cleverness,undefined);assert.deepEqual(h.bestStrokes.state,old.holes[id].bestStrokes.state);assert.deepEqual(h.bestCleverness.route,old.holes[id].bestCleverness.route);assert.equal(h.lastPlayedAt,old.holes[id].lastPlayedAt);}
const report=(s,n,version=BAND_FREE_VERSION)=>({route:s.route,band_free:{version,score:Math.round(n),unrounded_score:n}});
assert.equal(game.recordRetainedReport(state('a'),report(state('a'),99,'old')),false);
assert.equal(game.recordRetainedReport(state('a'),{...report(state('a'),99),route:['wrong']}),false);
const recency=game.current().lastPlayedAt;assert.equal(game.recordRetainedReport(state('a'),report(state('a'),78.8)),true);
assert.equal(game.current().lastPlayedAt,recency);assert.equal(game.stats().completed,1);assert.equal(game.stats().counts.Eagle,1);assert.equal(game.stats().clevernessByResult.Eagle,79);assert.equal(game.stats().averageBestCleverness,79);assert.equal(completedHoles(game).length,1,'A hole counts when its stroke-result route has current Cleverness, even while another retained route is pending');
const scored=structuredClone(game.data);for(const merged of [mergeDailyRecords(structuredClone(old),structuredClone(scored)),mergeDailyRecords(structuredClone(scored),structuredClone(old))]){assert.equal(merged.holes.a.bestStrokes.cleverness,78.8);assert.equal(merged.holes.b.bestCleverness.score,undefined);}
const reloaded=new DailyGame(storage,{holes:definitions});assert.equal(reloaded.stats().completed,1);assert.equal(reloaded.data.holes.b.bestStrokes.strokes,3);
assert.equal(game.recordRetainedReport(state('a','other',4),report(state('a','other',4),91.4)),true);assert.equal(game.stats().averageBestCleverness,91);assert.equal(game.stats().clevernessByResult.Eagle,79,'Result average uses the actual fewest-strokes route');
assert.equal(game.recordRetainedReport(state('b'),report(state('b'),86)),true);assert.equal(game.stats().completed,2);assert.equal(game.stats().counts.Eagle,2);
console.log('Revisit migration passed: initial zero counts/lists/averages, routes and strokes retained, exact current reports add holes individually, partial retained analysis, reload and both stale-tab merge orders, and independent result/highest averages.');
