/** One pending anchor per action; wait for keyboard/layout changes before scrolling. */
export function createHoleScroller({snapshot,scroll,frame,cancelFrame,now,reducedMotion}){
 let pending=null;
 function cancel(){if(pending){cancelFrame(pending.frame);pending=null;}}
 function to(target){
  cancel();const job={target,started:now(),stableSince:now(),last:null,frame:null};pending=job;
  const tick=()=>{
   if(pending!==job)return;
   const current=snapshot(),stamp=JSON.stringify(current.geometry);
   if(stamp!==job.last){job.last=stamp;job.stableSince=now();}
   if((!current.keyboardClosing&&now()-job.stableSince>=80)||now()-job.started>=800){
    pending=null;scroll(job.target,reducedMotion()?'instant':'smooth');return;
   }
   job.frame=frame(tick);
  };
  job.frame=frame(tick);
 }
 return {to,cancel};
}
