import assert from 'node:assert/strict';
import {previousAttempts,ghostGeometry,attemptPathText,showAttemptGhost,isGhostAttempt} from '../static/attempt-ghosts.mjs';
import {mapLayout,projectPoint,layoutLabels} from '../static/map.mjs';
const challenge={version:'par-challenge-v2',id:'challenge-a',par:3,attempt:6};
const state={start:'tee',target:'hole',current:'tee',threshold:.27,baseline:.02,word_model:'ls15-v1',challenge,history:[],route:['tee']};
function prior(attempt,extra={}){return {id:'round-'+attempt,updatedAt:String(attempt),state:{...state,challenge:{...challenge,attempt},challenge_failed:true,history:[{word:'step',origin:'tee',success:true,destination:.1,attempt:1,outcome:'landed'},{word:'miss',origin:'step',success:false,destination:.14,attempt:2,outcome:'miss'}],...extra}};}
const journeys=[prior(1),prior(2),prior(3),prior(4),prior(5),prior(5,{word_model:undefined}),prior(5,{threshold:.3}),prior(5,{challenge:{...challenge,id:'another',attempt:5}}),prior(6)];
const original=JSON.stringify(journeys),ghosts=previousAttempts(journeys,state,'active');assert.deepEqual(ghosts.map(g=>g.state.challenge.attempt),[5]);assert.deepEqual(ghosts.map(g=>g.opacity),[.72]);assert.equal(JSON.stringify(journeys),original);assert.equal(previousAttempts(journeys,{...state,challenge:undefined}).length,0);assert.equal(previousAttempts(journeys,{...state,challenge:{...challenge,id:'new-replay'}}).length,0);
assert.match(attemptPathText(ghosts[0].state),/tee → step → miss \(miss\)/);
for(const narrow of [false,true]){
 const d=mapLayout(narrow),trail=ghostGeometry(ghosts[0].state,d),step=projectPoint(.1,.02,.27,d,1.1*-62);
 assert.deepEqual(trail[0].a,{x:d.left,y:d.teeY});assert.deepEqual(trail[0].b,step);assert.deepEqual(trail[1].a,step);assert.equal(trail[1].success,false);
 const water=structuredClone(ghosts[0].state);water.history[1].outcome='water';assert.equal(isGhostAttempt(water),false);assert.deepEqual(ghostGeometry(water,d),[]);assert.match(attemptPathText(water),/miss/);
 const close=structuredClone(ghosts[0].state);close.history[1].destination=.105;assert.equal(isGhostAttempt(close),false);assert.deepEqual(ghostGeometry(close,d),[]);
 const backward=structuredClone(ghosts[0].state);backward.history[1].destination=.05;assert.equal(isGhostAttempt(backward),false);assert.deepEqual(ghostGeometry(backward,d),[]);
}
// Optional history labels cannot increase map height or displace the live label.
const live={word:'current',x:100,y:100,width:50,height:18,priority:4};
const simple=layoutLabels([live],[],300,200),mixed=layoutLabels([live,{word:'ghost',x:100,y:100,width:50,height:18,optional:true,priority:-1}],[],300,200);assert.deepEqual(mixed.labels.get('current'),simple.labels.get('current'));
const crowded=layoutLabels([{word:'ghost',x:100,y:100,width:70,height:18,optional:true}], [{x:0,y:0,width:300,height:200}],300,200);assert.equal(crowded.height,200);assert.equal(crowded.labels.size,0);
console.log('Attempt ghosts: most recent only, stronger opacity, model/challenge isolation, nonmutation, shared geometry, useful misses only (no close/backward ghosts) and optional label packing passed.');

assert.equal(showAttemptGhost(state),true);assert.equal(showAttemptGhost({...state,history:[{}]}),false);assert.equal(showAttemptGhost(state,{outcome:'landed'}),false);assert.equal(showAttemptGhost({...state,won:true}),false);

const latestBackward=prior(5);latestBackward.state.history.at(-1).outcome='water';assert.deepEqual(previousAttempts([prior(4),latestBackward],state,'active').filter(g=>isGhostAttempt(g.state)),[],'do not fall back to an older useful miss');
