import {greenContains} from './course-appearance.mjs?v=golf-v175';
/** Presentation-only motion. Scoring and shot counts never depend on animation. */
const ease=t=>t*t*(3-2*t);
export function shotMotion(kind,a,b,time,{tee=false,landingFraction=.9}={}){
 const t=Math.max(0,Math.min(1,time)),distance=Math.hypot(b.x-a.x,b.y-a.y);
 let u=kind==='putt'?1-(1-t)**2:kind==='chip'?1-(1-t)**1.6:ease(t);
 let lift=0;
 if(kind==='flight'){
  const height=65+Math.abs(b.y-a.y)/2+(tee?Math.min(95,Math.max(0,(distance-100)*.16)):0);
  lift=2*u*(1-u)*height;
 }
 if(kind==='golden'){
  const landing=Math.max(.45,Math.min(.98,landingFraction)),flightEnd=1000/1850;
  const touchdown={x:a.x+(b.x-a.x)*landing,y:a.y+(b.y-a.y)*landing};
  if(t<=flightEnd){
   // The opening is exactly the same one-second flight as an ordinary shot.
   const flight=shotMotion('flight',a,touchdown,t/flightEnd,{tee});
   u=distance?Math.hypot(flight.x-a.x,flight.y-a.y)/distance:0;
   lift=flight.lift;
  }else{
   const run=(t-flightEnd)/(1-flightEnd);
   u=landing+(1-landing)*(1-(1-run)**1.6);
   if(run<.38)lift=Math.min(10,3+distance*.009)*Math.sin(Math.PI*run/.38);
  }
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

/** Draw the actual visible flight, bounce and roll instead of a straight chord. */
export function shotTrail(kind,a,b,options={}){
 return Array.from({length:121},(_,i)=>{
  const pose=shotMotion(kind,a,b,i/120,options);
  return `${i?'L':'M'} ${pose.x},${pose.y-pose.lift}`;
 }).join(' ');
}
