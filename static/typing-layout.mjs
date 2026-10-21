/** Scale the whole course uniformly into keyboard space; never grow on focus. */
export function typingCourseWidth(maxWidth,availableHeight,viewWidth,viewHeight,border=2){
 if(!(maxWidth>0&&viewWidth>0&&viewHeight>0))return 0;
 return Math.max(0,Math.min(maxWidth,border+Math.max(0,availableHeight-border)*viewWidth/viewHeight));
}
