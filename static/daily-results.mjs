/** Completed-hole reviews use durable bests, never the disposable export batch. */
export function bestResultState(record,journeys=[]){
 const best=record?.bestStrokes;
 return best?.state??journeys.find(j=>j.id===best?.journeyId)?.state??null;
}
/** Recover older compact records without adding synthetic play to the export. */
export async function recoverBestState(client,definition,best){
 const options={...definition.settings,finish_mode:'range',continuous_play:true,challenge:{id:definition.id,version:'stroke-play-v1',par:5,attempt:best.attempt??1,unlimited:true}};
 for(const span of [.12,0]){
  try{
   let {state}=await client.request('new',{...options,second_leg_finish_span:span});
   for(const word of best.route.slice(1)){if(state.won)break;state=(await client.request('submit',{word})).state;if(state.challenge_failed)break;}
   if(state.won&&state.attempts===best.strokes&&JSON.stringify(state.route)===JSON.stringify(best.route))return state;
  }catch{/* A legacy summary still deserves a results card if its geometry cannot be recovered. */}
 }
 return null;
}
