/** Structural hole estimate; this is not a human skill rating or a shortest-path claim. */
import { Game } from './engine.mjs?v=golf-v133';
export function assessHole(e,settings){
  const game=new Game(e,settings.start,settings.target,settings.threshold??.27,{mode:'distance',launch_min:.095,launch_max:.215,...settings});
  e=game.e;
  const {start,target,baseline,threshold,launch_min,launch_max}=game;
  const direct=new Game(e,start,target,threshold,{mode:game.mode,launch_min,launch_max,rules:game.rules}).submit(target).won;
  const n=e.words.length,d=e.dimensions,si=e.index.get(start)*d,ti=e.index.get(target)*d,progress=new Float32Array(n),contacts=new Float32Array(n);
  let openings=0;
  const opening_bridges=[];
  const candidates=[];
  for(let i=0;i<n;i++){
    let contact=0,destination=0;
    for(let k=0;k<d;k++){const v=e.vectors[i*d+k];contact+=v*e.vectors[si+k];destination+=v*e.vectors[ti+k];}
    contact=Math.max(-1,Math.min(1,contact));destination=Math.max(-1,Math.min(1,destination));
    if(e.scaleSimilarity){contact=e.scaleSimilarity(i,si/d,contact);destination=e.scaleSimilarity(i,ti/d,destination);}
    contacts[i]=contact;progress[i]=destination;
    const required=game.requirement(start,e.words[i],baseline,destination).required;
    if(e.words[i]===start)continue;
    const shot=game.pluralShot(e.words[i]);
    if(!shot.success)continue;
    openings++;if(shot.won)opening_bridges.push({word:e.words[i],contact:shot.launch,destination:shot.destination,required:shot.required,direct:e.words[i]===target,...(shot.scoring_word?{scoring_word:shot.scoring_word}:{})});
    else if(destination>baseline)candidates.push(i);
  }
  // Look ahead from a small set of promising openings. Absence is not proof of impossibility.
  candidates.sort((a,b)=>(progress[b]+.15*contacts[b])-(progress[a]+.15*contacts[a]));
  let twoStepOpenings=0;
  for(const i of candidates.slice(0,8)){
    let found=false;
    for(let j=0;j<n&&!found;j++){
      if(!game.finishesFrom(e.words[j],progress[j]))continue;
      let contact=0;for(let k=0;k<d;k++)contact+=e.vectors[i*d+k]*e.vectors[j*d+k];
      contact=Math.max(-1,Math.min(1,contact));if(e.scaleSimilarity)contact=e.scaleSimilarity(i,j,contact);
      const required=game.requirement(e.words[i],e.words[j],progress[i],progress[j]).required;
      found=contact+1e-7>=required;
    }
    if(found)twoStepOpenings++;
  }
  opening_bridges.sort((a,b)=>b.contact-a.contact||b.destination-a.destination||a.word.localeCompare(b.word));
  const bridges=opening_bridges.length;
  return {settings:{start,target,threshold,mode:game.mode,launch_min,launch_max,rules:game.rules,plural_rescue:game.plural_rescue,plural_tolerance:game.plural_tolerance,...(game.finish_mode==='range'?{finish_mode:'range'}:{}),...(game.word_model?{word_model:game.word_model}:{}),...(game.headwind?{headwind:game.headwind}:{})},start,target,connection:baseline,separation_degrees:Math.acos(Math.max(-1,Math.min(1,baseline)))*180/Math.PI,direct_hole_in_one:direct,playable:!direct&&openings>0,openings,green_bridges:bridges,opening_bridges,green_threshold:threshold,two_step_openings:twoStepOpenings,difficulty:bridges>=8?'Gentle':bridges>0||twoStepOpenings>=3?'Moderate':'Challenging',estimate:true};
}
