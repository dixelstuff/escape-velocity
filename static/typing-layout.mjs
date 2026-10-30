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

/** Compare visual-viewport heights with each other, never with layout height. */
export function keyboardRestingHeight(viewport,fallbackHeight){
 return Number.isFinite(viewport?.height)&&viewport.height>0?viewport.height:fallbackHeight;
}

/** Ignore tiny keyboard-fit shortfalls in the bottom padding instead of
 * moving the input row or scaling the map. Larger shortfalls still scale the
 * course uniformly. The map/input gap stays identical to the resting view.
 */
export function typingCourseFit(maxWidth,availableHeight,viewWidth,viewHeight,gap=19,minimumGap=13,border=2){
 if(!(maxWidth>0&&viewWidth>0&&viewHeight>0))return {width:0,gap};
 const fullHeight=(maxWidth-border)*viewHeight/viewWidth+border;
 const shortage=Math.max(0,fullHeight-availableHeight),budget=Math.max(0,gap-minimumGap);
 if(shortage<=budget)return {width:maxWidth,gap};
 return {width:typingCourseWidth(maxWidth,availableHeight,viewWidth,viewHeight,border),gap};
}
