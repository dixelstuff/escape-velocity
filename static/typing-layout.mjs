/** Scale the whole course uniformly into keyboard space; never grow on focus. */
export function typingCourseWidth(maxWidth,availableHeight,viewWidth,viewHeight,border=2){
 if(!(maxWidth>0&&viewWidth>0&&viewHeight>0))return 0;
 return Math.max(0,Math.min(maxWidth,border+Math.max(0,availableHeight-border)*viewWidth/viewHeight));
}

/** Pinch zoom is not a keyboard resize: preserve the last stable map fit. */
export function stableTypingViewport(viewport,fallbackHeight){
 if(viewport&&Math.abs((viewport.scale??1)-1)>.01)return null;
 return {height:viewport?.height??fallbackHeight,top:viewport?.offsetTop??0};
}

/** Re-anchor only when the hole header has actually left the usable viewport. */
export function shouldReturnHoleHeader({top,bottom},height){return top<0||bottom>height;}

/** Focus alone does not prove that a mobile software keyboard is visible. */
export function keyboardLayoutVisible(focused,viewport,restingHeight){
 const frame=stableTypingViewport(viewport,restingHeight);
 return !!focused&&!!viewport&&!!frame&&restingHeight-frame.height>=100;
}

/** Restore synchronous focus-time opening; hold the layout during keyboard closing. */
export function createKeyboardLayoutManager({snapshot,apply,release,frame,cancelFrame,now}){
 let active=false,seenKeyboard=false,applied='',pending=null;
 function applyFrame(s){
  const key=JSON.stringify([s.height,s.top]);
  if(!active||key!==applied){active=true;applied=key;apply({height:s.height,top:s.top});}
 }
 function beginFocus(){
  const s=snapshot();if(!s.enabled||!s.focused)return;
  if(!active)seenKeyboard=false;
  if(s.restingHeight-s.height>=60)seenKeyboard=true;
  // Same order as the earlier working implementation: fix the play view in
  // the focus event, before Safari starts scrolling the original input into view.
  applyFrame(s);notify();
 }
 function notify(){
  if(pending)return;
  const job={started:now(),last:'',stableSince:now(),id:null};pending=job;
  const tick=()=>{
   if(pending!==job)return;
   const s=snapshot(),stamp=JSON.stringify([s.focused,s.enabled,s.height,s.top,s.restingHeight]);
   if(stamp!==job.last){job.last=stamp;job.stableSince=now();}
   const stable=now()-job.stableSince>=80,shrink=s.restingHeight-s.height;
   if(shrink>=60)seenKeyboard=true;
   if(s.enabled&&s.focused&&active&&(!seenKeyboard||shrink>=60)){
    applyFrame(s);pending=null;return;
   }
   if(!s.enabled||((!s.focused||seenKeyboard&&shrink<60)&&((shrink<60&&stable)||now()-job.started>=800))){
    if(active){active=false;seenKeyboard=false;applied='';release();}
    pending=null;return;
   }
   if(!active){pending=null;return;}
   job.id=frame(tick);
  };
  job.id=frame(tick);
 }
 return {beginFocus,notify,cancel(){if(pending){cancelFrame(pending.id);pending=null;}}};
}
