/** Downward corrections happen before paint; upward returns wait for stable layout. */
export function createHoleScroller({snapshot,scroll,frame,cancelFrame,now,reducedMotion}){
 let pending=null;
 function cancel(){if(pending){cancelFrame(pending.frame);pending=null;}}
 function to(target){
  cancel();const job={target,started:now(),stableSince:now(),last:null,frame:null};pending=job;
  const correctDownward=()=>{
   const current=snapshot(job.target);
   if(current.targetY>current.currentY+.5)scroll(job.target,'instant');
   return snapshot(job.target);
  };
  // Removing the fixed keyboard layout can expose the title. Correct that in
  // this same task, then guard against Safari's remaining keyboard-close shifts.
  correctDownward();
  const tick=()=>{
   if(pending!==job)return;
   const current=correctDownward(),stamp=JSON.stringify(current.geometry);
   if(stamp!==job.last){job.last=stamp;job.stableSince=now();}
   if((!current.keyboardClosing&&now()-job.stableSince>=80)||now()-job.started>=800){
    pending=null;
    if(Math.abs(current.targetY-current.currentY)>.5)scroll(job.target,reducedMotion()||current.targetY>=current.currentY?'instant':'smooth');
    return;
   }
   job.frame=frame(tick);
  };
  job.frame=frame(tick);
 }
 return {to,cancel};
}
