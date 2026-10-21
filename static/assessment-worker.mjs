import { Embeddings } from './engine.mjs?v=golf-v52';
import { assessHole } from './assessment.mjs?v=golf-v52';
import { SkillAnalyser } from './skill.mjs?v=golf-v52';
const models=new Map(),skills=new Map();
self.onmessage=({data})=>{
  if(data.init){const e=new Embeddings(data.words,data.vectors,data.dimensions,data.hubs);e.word_model=data.profile||undefined;e.wordModels=models;models.set(data.profile,e);skills.set(data.profile,new SkillAnalyser(e));return;}
  try{const profile=(data.body.state??data.body).word_model??'';self.postMessage({id:data.id,result:data.operation==='skill'?skills.get(profile).analyse(data.body.state):assessHole(models.get(profile),data.body)});}catch(error){self.postMessage({id:data.id,error:error.message});}
};
