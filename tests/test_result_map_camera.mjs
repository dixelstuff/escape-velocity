import assert from 'node:assert/strict';
import {createResultMapCamera} from '../static/result-map-camera.mjs';
let view='',id=0;const frames=new Map(),card={style:{}},svg={setAttribute:(key,value)=>view=value};
const camera=createResultMapCamera(svg,card,{requestFrame:fn=>{frames.set(++id,fn);return id;},cancelFrame:key=>frames.delete(key)});
const dimensions={worldWidth:700,frameWidth:354,frameHeight:200};
function aligned(){const [x,y,width,height]=view.split(' ').map(Number),scale=parseFloat(card.style.backgroundSize)/700,[bx,by]=card.style.backgroundPosition.split(' ').map(parseFloat);for(const [wx,wy]of [[0,0],[400,230],[700,430]]){assert.ok(Math.abs((wx-x)*354/width-(wx*scale+bx))<1e-8);assert.ok(Math.abs((wy-y)*200/height-(wy*scale+by))<1e-8);}}
function tick(time){const [key,fn]=frames.entries().next().value;frames.delete(key);fn(time);aligned();}
camera.remember({x:0,y:0,width:700});camera.show({x:-100,y:-80,width:900},dimensions);aligned();assert.equal(view.split(' ')[2],'700','upper map begins from the playing camera');tick(0);tick(100);const interim=view;assert.notEqual(interim.split(' ')[2],'700');assert.notEqual(interim.split(' ')[2],'900');tick(225);
camera.show({x:-100,y:-80,width:900},dimensions);assert.equal(frames.size,1,'results rerender must retain one animation');aligned();tick(450);assert.equal(view,'-100 -80 900 '+200/(354/900));assert.equal(frames.size,0);
camera.remember({x:0,y:0,width:700});camera.show({x:0,y:20,width:1000},dimensions);assert.equal(frames.size,1);camera.remember({x:0,y:0,width:700});assert.equal(frames.size,0,'returning to play cancels the old camera animation');
camera.remember({x:0,y:0,width:700});camera.show({x:0,y:30,width:700},dimensions);tick(1000);tick(1225);assert.equal(view.split(' ')[2],'700');assert.ok(Number(view.split(' ')[1])>0&&Number(view.split(' ')[1])<30);tick(1450);
const quiet=createResultMapCamera(svg,card,{reduced:true,cancelFrame(){},requestFrame(){throw Error('reduced-motion view must not animate');}});quiet.remember({x:0,y:0,width:700});quiet.show({x:-100,y:-80,width:900},dimensions);aligned();assert.equal(view.split(' ')[2],'900');
console.log('Shared results camera passed: SVG/background alignment at every frame, visible upper-map animation, one transition across rerenders, cancellation on return and reduced-motion support.');
