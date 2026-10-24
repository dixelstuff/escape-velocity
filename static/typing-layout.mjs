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

/** Hold one compact layout through keyboard animation; never change input focus. */
export function createKeyboardLayoutManager({snapshot,pin=()=>{},apply,release,frame,cancelFrame,now}){
 let active=false,pinned=false,pinnedTop=null,applied='',pending=null;
 function notify(){
  if(pending)return;
  const job={started:now(),last:'',stableSince:now(),id:null};pending=job;
  const tick=()=>{
   if(pending!==job)return;
   const s=snapshot(),stamp=JSON.stringify([s.focused,s.enabled,s.height,s.top,s.restingHeight]);
   if(stamp!==job.last){job.last=stamp;job.stableSince=now();}
   const stable=now()-job.stableSince>=80,shrink=s.restingHeight-s.height;
   const open=s.enabled&&s.focused&&shrink>=((active||pinned)?60:100);
   // Pin before the settling delay so native keyboard panning cannot move the
   // hole down the page. Defer the actual compact map sizing until stable.
   if(open&&!active&&(!pinned||pinnedTop!==s.top)){pinned=true;pinnedTop=s.top;pin({height:s.restingHeight,top:s.top});}
   if(open&&stable){
    const layout=JSON.stringify([s.height,s.top]);
    if(layout!==applied||!active){active=true;applied=layout;apply({height:s.height,top:s.top});}
    pending=null;return;
   }
   if(!open&&((shrink<60&&stable)||!s.enabled||now()-job.started>=800)){
    if(active||pinned){active=false;pinned=false;pinnedTop=null;applied='';release();}
    pending=null;return;
   }
   // No keyboard has appeared: keep native focus without entering a fixed view.
   if(!active&&!pinned&&stable&&!open){pending=null;return;}
   job.id=frame(tick);
  };
  job.id=frame(tick);
 }
 return {notify,cancel(){if(pending){cancelFrame(pending.id);pending=null;}}};
}
