/** A small screen-space lift, limited by the highest label/flag/tee marker. */
export function completedCourseLift(complete,top,scale){
 return complete?Math.max(0,Math.min(24,top*scale-10)):0;
}

/** Place the card just after the visible route, keeping the top of the hole clear. */
export function completedCardOverlap(height,bottom,scale,lift){
 return Math.max(0,Math.min(Math.max(0,height-80),height-(bottom*scale-lift+18)));
}
