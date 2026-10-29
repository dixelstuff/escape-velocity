import {assessWaypointHole} from './waypoint-assessment.mjs?v=short-second-leg-v1';
import { Embeddings } from './engine.mjs?v=short-second-leg-v1';
import { assessHole } from './assessment.mjs?v=short-second-leg-v1';
import { SkillAnalyser } from './skill.mjs?v=short-second-leg-v1';
import {SemanticAnalyser,semanticRouteKey} from './semantic-analysis.mjs?v=short-second-leg-v1';
const vectorAnalysers=new Map();
const models=new Map(),skills=new Map(),semantics=new Map(),cleverness=new Map(),associations=new Map(),v4s=new Map(),v5s=new Map(),modelShas=new Map(),reports=new Map();
import {localScalingModel} from './local-scaling.mjs?v=golf-v189';
self.onmessage=async({data})=>{
  if(data.init){modelShas.set(data.profile,data.modelSha);let e=new Embeddings(data.words,data.vectors,data.dimensions,data.hubs);if(data.localScaling)e=localScalingModel(e,data.localScaling.radii,data.localScaling.scaling,data.profile);e.word_model=data.profile||undefined;e.wordModels=models;models.set(data.profile,e);skills.set(data.profile,new SkillAnalyser(e));semantics.set(data.profile,new SemanticAnalyser(e));return;}
  let phase='Initialising analysis';
  try{const profile=(data.body.state??data.body).word_model??'';
  if(['cleverness-vector','cleverness-warm'].includes(data.operation)){if(!vectorAnalysers.has(profile))vectorAnalysers.set(profile,import('./vector-cleverness/index.mjs?v=short-second-leg-v1').then(({VectorClevernessAnalyser})=>new VectorClevernessAnalyser(models.get(profile),{modelSha:modelShas.get(profile)})).catch(error=>{vectorAnalysers.delete(profile);throw error;}));const analyser=await vectorAnalysers.get(profile),result=await (data.operation==='cleverness-warm'?analyser.warm(data.body.state):analyser.analyse(data.body.state));self.postMessage({id:data.id,result});return;}
  if(['semantic-analysis','cleverness-analysis','association-analysis','cleverness-v4','cleverness-v5'].includes(data.operation)){
   const state=data.body.state,key=JSON.stringify([profile,semanticRouteKey(state)]);
   phase='Calculating neighbourhood evidence';
   if(!reports.has(key)){if(reports.size>=24)reports.delete(reports.keys().next().value);reports.set(key,semantics.get(profile).analyse(state));}
   let result=reports.get(key);
   if(['cleverness-analysis','association-analysis','cleverness-v4','cleverness-v5'].includes(data.operation)){if(!cleverness.has(profile)){phase='Loading cleverness analysis files';const {ClevernessAnalyser}=await import('./cleverness.mjs?v=short-second-leg-v1');cleverness.set(profile,new ClevernessAnalyser(models.get(profile),semantics.get(profile)));}phase='Calculating cleverness diagnostics';result=cleverness.get(profile).analyse(state,result);}
   if(data.operation==='association-analysis'){phase='Loading association evidence';if(!associations.has(profile)){const {AssociationAnalyser}=await import('./association.mjs?v=golf-v189');associations.set(profile,new AssociationAnalyser(models.get(profile),semantics.get(profile),cleverness.get(profile)));}phase='Calculating association specificity';result=associations.get(profile).analyse(state,reports.get(key),result);}
   if(['cleverness-v4','cleverness-v5'].includes(data.operation)){phase='Loading V4 geometry and WordNet evidence';if(!v4s.has(profile)){const {ClevernessV4Analyser}=await import('./cleverness-v4.mjs?v=golf-v189');v4s.set(profile,new ClevernessV4Analyser(models.get(profile),semantics.get(profile),cleverness.get(profile),{modelSha:modelShas.get(profile)}));}phase='Loading profiles and evaluating V4 route evidence';result=await v4s.get(profile).analyse(state,reports.get(key),result);}
   if(data.operation==='cleverness-v5'){phase='Evaluating V5 semantic strategy';if(!v5s.has(profile)){const {ClevernessV5Analyser}=await import('./cleverness-v5.mjs?v=golf-v189');v5s.set(profile,new ClevernessV5Analyser(models.get(profile),semantics.get(profile),cleverness.get(profile),{v4:v4s.get(profile)}));}result=await v5s.get(profile).analyse(state,reports.get(key),cleverness.get(profile).analyse(state,reports.get(key)));}
   self.postMessage({id:data.id,result});return;
  }
  self.postMessage({id:data.id,result:data.operation==='semantic-analysis'?semantics.get(profile).analyse(data.body.state):data.operation==='assess-waypoint'?assessWaypointHole(models.get(profile),data.body):data.operation==='skill'?skills.get(profile).analyse(data.body.state):assessHole(models.get(profile),data.body)});}catch(error){self.postMessage({id:data.id,error:['cleverness-analysis','association-analysis','cleverness-v4','cleverness-v5'].includes(data.operation)?phase+': '+error.message:error.message});}
};
