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
