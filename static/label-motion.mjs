/** Install the first pose synchronously: SVG/WAAPI must not paint the new box
 * for a frame before its movement from the old box begins. */
export function animateLabelBody(body,dx,dy){
 if(Math.hypot(dx,dy)<.25)return Promise.resolve();
 const start=`translate(${dx}px,${dy}px)`;body.style.transform=start;
 let motion;
 try{motion=body.animate([{transform:start},{transform:'translate(0px,0px)'}],{duration:360,easing:'cubic-bezier(.2,.8,.2,1)',fill:'both'});}
 catch{body.style.transform='';return Promise.resolve();}
 return Promise.resolve(motion.finished).catch(()=>{}).then(()=>{body.style.transform='';motion.cancel();});
}
