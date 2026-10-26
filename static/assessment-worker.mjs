import {assessWaypointHole} from './waypoint-assessment.mjs?v=golf-v179';
import { Embeddings } from './engine.mjs?v=golf-v179';
import { assessHole } from './assessment.mjs?v=golf-v179';
import { SkillAnalyser } from './skill.mjs?v=golf-v179';
import {SemanticAnalyser} from './semantic-analysis.mjs?v=golf-v179';
const models=new Map(),skills=new Map(),semantics=new Map();
import {localScalingModel} from './local-scaling.mjs?v=golf-v179';
self.onmessage=({data})=>{
  if(data.init){let e=new Embeddings(data.words,data.vectors,data.dimensions,data.hubs);if(data.localScaling)e=localScalingModel(e,data.localScaling.radii,data.localScaling.scaling,data.profile);e.word_model=data.profile||undefined;e.wordModels=models;models.set(data.profile,e);skills.set(data.profile,new SkillAnalyser(e));semantics.set(data.profile,new SemanticAnalyser(e));return;}
  try{const profile=(data.body.state??data.body).word_model??'';self.postMessage({id:data.id,result:data.operation==='semantic-analysis'?semantics.get(profile).analyse(data.body.state):data.operation==='assess-waypoint'?assessWaypointHole(models.get(profile),data.body):data.operation==='skill'?skills.get(profile).analyse(data.body.state):assessHole(models.get(profile),data.body)});}catch(error){self.postMessage({id:data.id,error:error.message});}
};
