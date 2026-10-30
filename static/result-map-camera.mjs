/** One camera drives both the route SVG and the scenery behind its scorecard. */
export function createResultMapCamera(svg,card,{requestFrame=requestAnimationFrame,cancelFrame=cancelAnimationFrame,reduced=false}={}){
 let current=null,target=null,frame=0,showing=false;
 const stop=()=>{if(frame)cancelFrame(frame);frame=0;};
 function paint(camera,{worldWidth,frameWidth,frameHeight}){
  current={...camera};const scale=frameWidth/camera.width;
  svg.setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.width} ${frameHeight/scale}`);
  card.style.backgroundSize=`${worldWidth*scale}px auto`;
  card.style.backgroundPosition=`${-camera.x*scale}px ${-camera.y*scale}px`;
 }
 return {
  remember(camera){stop();current={...camera};target=null;showing=false;},
  show(camera,dimensions){
   if(showing&&frame&&['x','y','width'].every(k=>target[k]===camera[k])){paint(current,dimensions);return;}
   const animate=!showing&&!!current&&!reduced,from=current;stop();showing=true;target={...camera};
   if(!animate){paint(camera,dimensions);return;}
   let started=null;paint(from,dimensions);
   function tick(time){
    started??=time;const t=Math.min(1,Math.max(0,(time-started)/450)),ease=1-(1-t)**3;
    paint(Object.fromEntries(['x','y','width'].map(k=>[k,from[k]+(camera[k]-from[k])*ease])),dimensions);
    frame=t<1?requestFrame(tick):0;
   }
   frame=requestFrame(tick);
  }
 };
}
