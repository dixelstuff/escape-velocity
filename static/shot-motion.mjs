import {greenContains} from './course-appearance.mjs?v=golf-v119';
/** Presentation-only motion. Scoring and shot counts never depend on animation. */
const ease=t=>t*t*(3-2*t);
export function shotMotion(kind,a,b,time,{tee=false,landingFraction=.9}={}){
 const t=Math.max(0,Math.min(1,time)),distance=Math.hypot(b.x-a.x,b.y-a.y);
 const u=kind==='putt'?1-(1-t)**2:kind==='chip'||kind==='golden'?1-(1-t)**1.6:ease(t);
 let lift=0;
 if(kind==='flight'){
  const height=65+Math.abs(b.y-a.y)/2+(tee?Math.min(95,Math.max(0,(distance-100)*.16)):0);
  lift=2*u*(1-u)*height;
 }
 if(kind==='golden'){
  const landingTime=1-(1-Math.max(.45,Math.min(.98,landingFraction)))**(1/1.6);
  const height=32+Math.min(90,distance*.16)+(tee?20:0);
  if(t<landingTime)lift=height*Math.sin(Math.PI*t/landingTime)**2;
 }
 if(kind==='chip'){
  const height=Math.min(48,18+.08*distance);
  if(t<.55)lift=height*Math.sin(Math.PI*t/.55);
  else if(t<.73)lift=.28*height*Math.sin(Math.PI*(t-.55)/.18);
  else if(t<.85)lift=.11*height*Math.sin(Math.PI*(t-.73)/.12);
 }
 const finishing=kind==='putt'||kind==='chip'||kind==='golden';
 const scale=finishing?1-ease(Math.max(0,(t-.93)/.07)):1;
 return {x:a.x+(b.x-a.x)*u,y:a.y+(b.y-a.y)*u,lift:Math.max(0,lift),scale,
  rotation:(kind==='putt'?distance/16*180/Math.PI:distance*1.1)*u,
  shadowScale:(1-.4*Math.min(1,lift/65))*scale,shadowOpacity:.2-.1*Math.min(1,lift/65)};
}

/** Match the finish to the surface the player actually sees under the landed ball. */
export const automaticFinishMotion=(origin,layout)=>greenContains(origin,layout)?'putt':'chip';
