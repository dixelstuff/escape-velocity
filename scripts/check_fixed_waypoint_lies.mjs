/** Reproduce the TALENT report under recorded and corrected first-leg rules. */
import fs from 'node:fs';import {Game} from '../static/engine.mjs';import {loadResearchModel,researchSettings} from './cleverness-research-utils.mjs';import {mapLayout} from '../static/map.mjs';import {waypointLayout,waypointPosition} from '../static/waypoint-map.mjs';
const {e,config}=loadResearchModel(),rows=[];
for(const legacy of [true,false])for(const inputs of [['talent'],['dubious','talent']]){
 const settings={...researchSettings('doubtful','studio','cuff'),...(legacy?{waypoint_rescue:false}:{})},g=new Game(e,'doubtful','cuff',.27,settings);
 for(const word of inputs)g.submit(word);const state=g.state(),event=state.history.at(-1),positions=[];
 for(const narrow of [true,false])for(const turn of ['up','down']){const scene={...state,waypoint:{...state.waypoint,turn}},d=waypointLayout(mapLayout(narrow),scene);positions.push({narrow,turn,point:waypointPosition(scene,'talent',d,event)});}
 rows.push({legacy,inputs,event,state,positions});
}
fs.writeFileSync('reports/fixed-waypoint-lies/reproduction.json',JSON.stringify({modelSha:config.vector_sha256,talentToStudio:e.cosine('talent','studio'),talentsToStudio:e.cosine('talents','studio'),rows},null,2)+'\n');
console.log(rows.map(r=>({legacy:r.legacy,inputs:r.inputs,destination:r.event.destination,inside:r.event.inside,hit:r.event.success,reached:!!r.event.waypoint_reached})));
