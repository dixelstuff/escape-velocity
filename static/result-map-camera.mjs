/** Animate the shared camera with composited transforms, without redrawing
 * the route SVG and the large scenery image on every animation frame. */
export const RESULT_MAP_DURATION=260;
export function createResultMapCamera(svg,card,{reduced=false,createLayer=()=>card.ownerDocument.createElement('div')}={}){
 let current=null,showing=false,running=null;
 function stop(){
  const old=running;running=null;
  if(old){for(const animation of old.animations)animation.cancel();old.layer.remove();card.classList.remove('result-camera-moving');}
 }
 function backdrop(camera,{worldWidth,frameWidth,backdropPadding=0}){
  const scale=frameWidth/camera.width;
  card.style.backgroundSize=`${(worldWidth+2*backdropPadding)*scale}px auto`;
  card.style.backgroundPosition=`${-(camera.x+backdropPadding)*scale}px ${-camera.y*scale}px`;
 }
 function paint(camera,{frameWidth,frameHeight,...dimensions}){
  current={...camera};const scale=frameWidth/camera.width;
  svg.setAttribute('viewBox',`${camera.x} ${camera.y} ${camera.width} ${frameHeight/scale}`);
  backdrop(camera,{...dimensions,frameWidth});
 }
 return {
  remember(camera,dimensions){stop();current={...camera};showing=false;if(dimensions)backdrop(camera,dimensions);},
  show(camera,dimensions){
   if(showing&&running&&['x','y','width'].every(k=>current[k]===camera[k])){paint(camera,dimensions);return;}
   const animate=!showing&&!!current&&!reduced&&typeof svg.animate==='function',from=current;
   stop();showing=true;paint(camera,dimensions);
   if(!animate)return;
   const scale=dimensions.frameWidth/from.width,ratio=camera.width/from.width,tx=(camera.x-from.x)*scale,ty=(camera.y-from.y)*scale;
   const inset=Math.ceil(Math.max(64,Math.abs(tx),Math.abs(ty))+32),layer=createLayer(),[backgroundX,backgroundY]=card.style.backgroundPosition.split(' ').map(parseFloat);
   layer.className='result-map-scenery';layer.setAttribute('aria-hidden','true');
   Object.assign(layer.style,{inset:`${-inset}px`,backgroundImage:card.style.backgroundImage,backgroundSize:card.style.backgroundSize,backgroundPosition:`${backgroundX+inset}px ${backgroundY+inset}px`,transformOrigin:`${inset}px ${inset}px`});
   card.prepend(layer);card.classList.add('result-camera-moving');
   const keyframes=[{transform:`matrix(${ratio},0,0,${ratio},${tx},${ty})`},{transform:'matrix(1,0,0,1,0,0)'}],timing={duration:RESULT_MAP_DURATION,easing:'cubic-bezier(.2,.7,.2,1)'};
   const active={layer,animations:[svg.animate(keyframes,{...timing,composite:'replace'}),layer.animate(keyframes,timing)]};running=active;
   const finish=()=>{if(running===active)stop();};
   void Promise.all(active.animations.map(animation=>animation.finished)).then(finish,finish);
  }
 };
}
