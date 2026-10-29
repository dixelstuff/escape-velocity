import assert from 'node:assert/strict';
import {completedMapView} from '../static/result-presentation.mjs';
import {bestRouteCard} from '../static/best-route-card.mjs';
import {readFileSync} from 'node:fs';import {runInNewContext} from 'node:vm';
for(const narrow of [true,false])for(const width of [284,354,614,1020])for(const [top,bottom] of [[10,400],[100,300],[-20,480],[180,210]]){
 const v=completedMapView(640,width,top,bottom,narrow),above=(top-v.y)*v.scale,below=(v.y+v.viewHeight-bottom)*v.scale;
 assert.equal(v.height,narrow?200:320);assert.ok(Math.abs(above-below)<1e-8);assert.ok(above>=16-1e-8);assert.ok(v.width>=640-1e-8);assert.ok(Math.abs(v.width/v.viewHeight-width/v.height)<1e-8,'SVG fills its frame without stretching the artwork');
}
const best={journeyId:'one',strokes:3,cleverness:80,route:['tee','bridge','flag']};let card=bestRouteCard({bestStrokes:best});assert.equal(card.title,'Your best route');assert.ok(!card.html.includes('Your best route'));assert.ok(!card.html.includes('<h3>'));assert.match(card.html,/TEE → BRIDGE → FLAG/);assert.match(card.html,/Cleverness 80\/100/);
card=bestRouteCard({bestStrokes:best,bestCleverness:{journeyId:'two',strokes:4,score:90,route:['tee','<escape>','flag']}});assert.equal(card.title,'Your best routes');assert.match(card.html,/<h3>Fewest strokes<\/h3>/);assert.match(card.html,/<h3>Higher Cleverness<\/h3>/);assert.match(card.html,/&lt;ESCAPE&gt;/);
const source=readFileSync(new URL('../static/app.js',import.meta.url),'utf8'),button={hidden:false,setAttribute(){}},handlers={},bestButton={addEventListener:(type,fn)=>handlers[type]=fn};let result=false,open=false,available=true,opens=0;
const ctx={simpleDaily:true,busy:false,state:{},daily:{current:()=>available?{bestStrokes:best}:{}},holeResult:()=>result,courseResult:()=>false,holePanelMode:'route',$:id=>id==='show-best-route'?Object.assign(bestButton,button):{hidden:!open},setHoleLog(){opens++;}};
runInNewContext(source.slice(source.indexOf('function renderBestRouteButton(){'),source.indexOf('function bestRouteState(){')),ctx);ctx.renderBestRouteButton();assert.equal(bestButton.hidden,false);result=true;ctx.renderBestRouteButton();assert.equal(bestButton.hidden,true);result=false;open=true;ctx.renderBestRouteButton();assert.equal(bestButton.hidden,true);open=false;available=false;ctx.renderBestRouteButton();assert.equal(bestButton.hidden,true);available=true;
const event={button:0,preventDefault(){},stopPropagation(){}};handlers.pointerdown(event);assert.equal(opens,0,'opening waits until click so hiding the trophy cannot retarget the same touch onto the backdrop');bestButton.onclick(event);assert.equal(opens,1);ctx.busy=true;bestButton.onclick(event);assert.equal(opens,1);
console.log('Completed map passed: fixed 200/320px frames, balanced padding, route fit and undistorted viewBox across 32 layouts; trophy visibility, touch sequencing, safe route text and one heading per card.');
