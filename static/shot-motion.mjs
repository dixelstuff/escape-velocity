/** Presentation-only motion. Scoring and shot counts never depend on animation. */
const ease=t=>t*t*(3-2*t);
export function shotMotion(kind,a,b,time){
 const t=Math.max(0,Math.min(1,time)),distance=Math.hypot(b.x-a.x,b.y-a.y);
 const u=kind==='putt'?1-(1-t)**2:kind==='chip'?1-(1-t)**1.6:ease(t);
 let lift=0;
 if(kind==='flight')lift=2*u*(1-u)*(65+Math.abs(b.y-a.y)/2);
 if(kind==='chip'){
  const height=Math.min(48,18+.08*distance);
  if(t<.55)lift=height*Math.sin(Math.PI*t/.55);
  else if(t<.73)lift=.28*height*Math.sin(Math.PI*(t-.55)/.18);
  else if(t<.85)lift=.11*height*Math.sin(Math.PI*(t-.73)/.12);
 }
 const finishing=kind==='putt'||kind==='chip';
 const scale=finishing?1-ease(Math.max(0,(t-.93)/.07)):1;
 return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,lift:Math.max(0,lift),scale,
  rotation:(kind==='putt'?distance/16*180/Math.PI:distance*1.1)*u,
  shadowScale:(1-.4*Math.min(1,lift/65))*scale,shadowOpacity:.2-.1*Math.min(1,lift/65)};
}
