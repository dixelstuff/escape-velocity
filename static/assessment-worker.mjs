import { Embeddings } from './engine.mjs?v=golf-v11';
import { assessHole } from './assessment.mjs?v=golf-v11';
let e;
self.onmessage=({data})=>{
  if(data.init){e=new Embeddings(data.words,data.vectors,data.dimensions);return;}
  try{self.postMessage({id:data.id,result:assessHole(e,data.body)});}catch(error){self.postMessage({id:data.id,error:error.message});}
};
