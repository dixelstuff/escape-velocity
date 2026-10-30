import assert from 'node:assert/strict';
import {createResultMapCamera,RESULT_MAP_DURATION} from '../static/result-map-camera.mjs';
let view='',writes=0;const animations=[],layers=[],classes=new Set(),card={style:{backgroundImage:'url(scene.svg)'},classList:{add:v=>classes.add(v),remove:v=>classes.delete(v)},prepend:layer=>layers.push(layer)};
function animate(keyframes,timing){let finish;const a={keyframes,timing,finished:new Promise(resolve=>finish=resolve),finish:()=>finish(),cancel(){this.cancelled=true;}};animations.push(a);return a;}
const svg={setAttribute:(key,value)=>{view=value;writes++;},animate};
const createLayer=()=>({style:{},setAttribute(){},animate,remove(){this.removed=true;}});
const camera=createResultMapCamera(svg,card,{createLayer}),dimensions={worldWidth:700,frameWidth:354,frameHeight:200};
camera.remember({x:0,y:0,width:700});camera.show({x:-100,y:-80,width:900},dimensions);
assert.equal(view,'-100 -80 900 '+200/(354/900));assert.equal(RESULT_MAP_DURATION,260);assert.equal(animations.length,2);assert.deepEqual(animations[0].keyframes,animations[1].keyframes);assert.equal(animations[0].timing.duration,260);assert.equal(animations[1].timing.duration,260);assert.ok(classes.has('result-camera-moving'));
assert.equal(layers[0].style.backgroundImage,'url(scene.svg)');assert.equal(layers[0].style.backgroundSize,card.style.backgroundSize);
const matrix=animations[0].keyframes[0].transform.match(/[-\d.]+/g).map(Number),[ratio,,,scale,tx,ty]=matrix;
for(const t of [0,.25,.5,.75,1])for(const [wx,wy]of [[0,0],[400,230],[700,430]]){
 const r=ratio+(1-ratio)*t,x=tx*(1-t),y=ty*(1-t),finalScale=354/900;
 const svgX=((wx+100)*finalScale)*r+x,svgY=((wy+80)*finalScale)*r+y;
 // The scenery's transform origin is the same card origin after overscan.
 const inset=parseFloat(layers[0].style.transformOrigin),[bx,by]=layers[0].style.backgroundPosition.split(' ').map(parseFloat);
 const sceneryX=(wx*finalScale+bx-inset)*r+x,sceneryY=(wy*finalScale+by-inset)*r+y;
 assert.ok(Math.abs(svgX-sceneryX)<1e-8);assert.ok(Math.abs(svgY-sceneryY)<1e-8);
}
assert.equal(writes,1,'SVG camera is written once, rather than repainted in a JavaScript frame loop');camera.show({x:-100,y:-80,width:900},dimensions);assert.equal(animations.length,2,'rerenders keep a single shared transition');
animations.forEach(a=>a.finish());await new Promise(resolve=>setImmediate(resolve));assert.ok(layers[0].removed);assert.ok(!classes.has('result-camera-moving'));
camera.remember({x:0,y:0,width:700});camera.show({x:0,y:30,width:700},dimensions);assert.equal(animations.length,4);camera.remember({x:0,y:0,width:700});assert.ok(animations.slice(2).every(a=>a.cancelled));assert.ok(layers[1].removed);
const quiet=createResultMapCamera(svg,card,{reduced:true,createLayer(){throw Error('reduced motion must not create an animation layer');}});quiet.remember({x:0,y:0,width:700});quiet.show({x:-100,y:-80,width:900},dimensions);assert.equal(animations.length,4);
const fallback=createResultMapCamera({setAttribute:()=>{}},card);fallback.remember({x:0,y:0,width:700});fallback.show({x:0,y:30,width:700},dimensions);assert.equal(animations.length,4);
console.log('Quick results camera passed: matched 260ms composited transforms, aligned SVG/scenery throughout, no per-frame SVG writes, single transition, cleanup, cancellation and reduced-motion/fallback support.');

const padded={...dimensions,backdropPadding:700};
quiet.remember({x:0,y:0,width:700},padded);assert.equal(card.style.backgroundSize,'1062px auto');assert.ok(Math.abs(parseFloat(card.style.backgroundPosition)+354)<1e-8);
for(const width of [700,1000,1400]){const x=(700-width)/2;quiet.show({x,y:20,width},padded);const imageWidth=parseFloat(card.style.backgroundSize),[left,top]=card.style.backgroundPosition.split(' ').map(parseFloat),scale=imageWidth/2100;assert.ok(left<=0&&left+imageWidth>=354,'padded scenery covers both sides at every supported zoom');assert.ok(top+2600*scale>600,'scenery extends behind the whole card');const worldX=350;assert.ok(Math.abs((worldX-x)*354/width-((worldX+700)*scale+left))<1e-8,'padding must not change the camera alignment');}
console.log('Zoomed-out scenery coverage passed: padded horizontal and vertical bounds, unchanged scale/alignment and normal-view restoration.');
