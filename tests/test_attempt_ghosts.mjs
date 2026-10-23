import assert from 'node:assert/strict';
import {previousAttempts,previousWordLabels,showPreviousLabels,waypointRetryDisplay} from '../static/attempt-ghosts.mjs';
import {mapLayout,projectPoint,layoutLabels} from '../static/map.mjs';
const challenge={version:'par-challenge-v2',id:'challenge-a',par:3,attempt:6};
const state={start:'tee',target:'hole',current:'tee',threshold:.27,baseline:.02,word_model:'ls15-v1',challenge,history:[],route:['tee']};
function prior(attempt,extra={}){return {id:'round-'+attempt,updatedAt:String(attempt),state:{...state,challenge:{...challenge,attempt},challenge_failed:true,history:[{word:'step',origin:'tee',success:true,destination:.1,attempt:1,outcome:'landed'},{word:'miss',origin:'step',success:false,destination:.14,attempt:2,outcome:'miss'}],...extra}};}
const journeys=[prior(1),prior(2),prior(3),prior(4),prior(5),prior(5,{word_model:undefined}),prior(5,{threshold:.3}),prior(5,{challenge:{...challenge,id:'another',attempt:5}}),prior(6)];
const original=JSON.stringify(journeys),latest=previousAttempts(journeys,state,'active');assert.deepEqual(latest.map(g=>g.state.challenge.attempt),[5]);assert.equal(JSON.stringify(journeys),original);assert.equal(previousAttempts(journeys,{...state,challenge:undefined}).length,0);assert.equal(previousAttempts(journeys,{...state,challenge:{...challenge,id:'new-replay'}}).length,0);
for(const narrow of [false,true]){
 const d=mapLayout(narrow),labels=previousWordLabels(latest[0].state,d);
 assert.deepEqual(labels.map(l=>l.word),['step','miss']);assert.deepEqual(labels[0].pos,projectPoint(.1,.02,.27,d,.88*-62));assert.deepEqual(Object.keys(labels[0]).sort(),['key','pos','word'],'labels have no travel-line or marker geometry');
 for(const change of [{outcome:'water'},{destination:.105},{destination:.05}]){
  const failed=structuredClone(latest[0].state);Object.assign(failed.history[1],change);assert.deepEqual(previousWordLabels(failed,d).map(l=>l.word),['step'],'keep the successful label, hide the unshown failed word');
 }
 const onlyMiss=prior(5,{history:[{word:'close',origin:'tee',outcome:'miss',destination:.021,attempt:1,success:false}]}).state;assert.deepEqual(previousWordLabels(onlyMiss,d),[]);
 const repeated=structuredClone(latest[0].state);repeated.history.push({...repeated.history[0],attempt:3});assert.deepEqual(previousWordLabels(repeated,d).map(l=>l.word),['step','miss'],'one label per word');
}
const live={word:'current',x:100,y:100,width:50,height:18,priority:4};
const simple=layoutLabels([live],[],300,200),mixed=layoutLabels([live,{word:'old',x:100,y:100,width:50,height:18,optional:true,priority:-1}],[],300,200);assert.deepEqual(mixed.labels.get('current'),simple.labels.get('current'));
const crowded=layoutLabels([{word:'old',x:100,y:100,width:70,height:18,optional:true}],[{x:0,y:0,width:300,height:200}],300,200);assert.equal(crowded.height,200);assert.equal(crowded.labels.size,0);
assert.equal(showPreviousLabels(state),true);assert.equal(showPreviousLabels({...state,history:[{}]}),false);assert.equal(showPreviousLabels(state,{outcome:'landed'}),false);assert.equal(showPreviousLabels({...state,won:true}),false);
console.log('Previous labels passed: latest attempt only, visible words retained, hidden misses excluded, no path/marker data, shared projection and optional packing.');

const won=prior(5,{won:true,challenge_failed:false,history:[{word:'first',origin:'tee',success:true,destination:.1,attempt:1},{word:'second',origin:'first',success:true,destination:.15,attempt:2},{word:'finish',origin:'second',success:true,won:true,destination:.3,attempt:3}]});
assert.equal(previousAttempts([won],state,'active').length,1,'Replay keeps the latest successful route available');
assert.deepEqual(previousWordLabels(won.state,mapLayout()).map(l=>l.word),['first','second','finish']);

const replayWaypoint={...state,waypoint:{word:'middle'},stage:0};
for(const previousEntry of [{word:'bridge',waypoint_reached:true},{word:'middle',waypoint_reached:true}]){
 assert.deepEqual(waypointRetryDisplay(replayWaypoint,previousEntry),{showTarget:true,reference:true,occupied:true},'Replay overview retains a faded waypoint even when prior route reached it');
 assert.deepEqual(waypointRetryDisplay(replayWaypoint,previousEntry,true),{showTarget:true,reference:false,occupied:true},'Entry at an earlier lie restores the active waypoint without covering the old landed word with a zone');
 assert.equal(waypointRetryDisplay({...replayWaypoint,stage:1},previousEntry,true).showTarget,false,'Second-leg retry keeps the hole as target');
}
assert.deepEqual(waypointRetryDisplay(replayWaypoint,null,true),{showTarget:true,reference:false,occupied:false},'Fresh first leg restores the target and its zone');
assert.equal(waypointRetryDisplay(state,null).showTarget,false);
