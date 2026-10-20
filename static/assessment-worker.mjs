import { Embeddings } from './engine.mjs?v=golf-v16';
import { assessHole } from './assessment.mjs?v=golf-v16';
import { SkillAnalyser } from './skill.mjs?v=golf-v16';
let e,skill;
self.onmessage=({data})=>{
  if(data.init){e=new Embeddings(data.words,data.vectors,data.dimensions);skill=new SkillAnalyser(e);return;}
  try{self.postMessage({id:data.id,result:data.operation==='skill'?skill.analyse(data.body.state):assessHole(e,data.body)});}catch(error){self.postMessage({id:data.id,error:error.message});}
};
