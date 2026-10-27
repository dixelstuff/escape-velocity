import {assessWaypointHole} from './waypoint-assessment.mjs?v=golf-v182';
import { Embeddings } from './engine.mjs?v=golf-v182';
import { assessHole } from './assessment.mjs?v=golf-v182';
import { SkillAnalyser } from './skill.mjs?v=golf-v182';
import {SemanticAnalyser,semanticRouteKey} from './semantic-analysis.mjs?v=golf-v182';
const models=new Map(),skills=new Map(),semantics=new Map(),cleverness=new Map(),reports=new Map();
import {localScalingModel} from './local-scaling.mjs?v=golf-v182';
self.onmessage=async({data})=>{
  if(data.init){let e=new Embeddings(data.words,data.vectors,data.dimensions,data.hubs);if(data.localScaling)e=localScalingModel(e,data.localScaling.radii,data.localScaling.scaling,data.profile);e.word_model=data.profile||undefined;e.wordModels=models;models.set(data.profile,e);skills.set(data.profile,new SkillAnalyser(e));semantics.set(data.profile,new SemanticAnalyser(e));return;}
  let phase='Initialising analysis';
  try{const profile=(data.body.state??data.body).word_model??'';
  if(['semantic-analysis','cleverness-analysis'].includes(data.operation)){
   const state=data.body.state,key=JSON.stringify([profile,semanticRouteKey(state)]);
   phase='Calculating neighbourhood evidence';
   if(!reports.has(key)){if(reports.size>=24)reports.delete(reports.keys().next().value);reports.set(key,semantics.get(profile).analyse(state));}
   let result=reports.get(key);
   if(data.operation==='cleverness-analysis'){if(!cleverness.has(profile)){phase='Loading cleverness analysis files';const {ClevernessAnalyser}=await import('./cleverness.mjs?v=golf-v182');cleverness.set(profile,new ClevernessAnalyser(models.get(profile),semantics.get(profile)));}phase='Calculating cleverness diagnostics';result=cleverness.get(profile).analyse(state,result);}
   self.postMessage({id:data.id,result});return;
  }
  self.postMessage({id:data.id,result:data.operation==='semantic-analysis'?semantics.get(profile).analyse(data.body.state):data.operation==='assess-waypoint'?assessWaypointHole(models.get(profile),data.body):data.operation==='skill'?skills.get(profile).analyse(data.body.state):assessHole(models.get(profile),data.body)});}catch(error){self.postMessage({id:data.id,error:data.operation==='cleverness-analysis'?phase+': '+error.message:error.message});}
};
