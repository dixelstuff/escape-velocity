/** A small screen-space lift, limited by the highest label/flag/tee marker. */
export function completedCourseLift(complete,top,scale){
 return complete?Math.max(0,Math.min(24,top*scale-10)):0;
}

/** Place the card just after the visible route, keeping the top of the hole clear. */
export function completedCardOverlap(height,bottom,scale,lift){
 return Math.max(0,Math.min(Math.max(0,height-80),height-(bottom*scale-lift+24)));
}

/** Reveal only the extra course height the card needs, then scroll its contents. */
export function holePanelHeight(mapHeight,contentHeight,viewportHeight,inset=18){
 const cap=Math.max(mapHeight,Math.min(600,viewportHeight*.64));
 return Math.max(mapHeight,Math.min(contentHeight+2*inset,cap));
}
/** The latest result is a moment; later visits are a review of the recorded best. */
export function resultContext(fresh,won,round=false){return round?'round':fresh&&won?'just-now':'review';}
