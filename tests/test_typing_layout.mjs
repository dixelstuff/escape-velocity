import assert from 'node:assert/strict';
import {typingCourseWidth,stableTypingViewport,shouldReturnHoleHeader,keyboardLayoutVisible} from '../static/typing-layout.mjs';
for(const viewport of [320,360,390,430,650])for(const available of [60,100,140,200,280,600])for(const viewHeight of [430,520]){
 const maximum=viewport-36,border=2,width=typingCourseWidth(maximum,available,640,viewHeight,border);
 const height=(width-border)*viewHeight/640+border;
 assert.ok(width<=maximum,'focusing never enlarges the course');
 assert.ok(height<=available+1e-9,'the input and helper keep their own viewport space');
 assert.ok(Math.abs((width-border)/(height-border)-640/viewHeight)<1e-9,'map and world retain one aspect ratio');
}
assert.equal(typingCourseWidth(354,600,640,430),354);
assert.equal(typingCourseWidth(0,100,640,430),0);
assert.equal(typingCourseWidth(354,0,640,430),2);
console.log('Typing layout passed: no focus enlargement, uniform aspect ratio and bounded keyboard-space sizing across phone widths and crowded map heights.');

assert.deepEqual(stableTypingViewport({height:320,offsetTop:12,scale:1},700),{height:320,top:12});
assert.equal(stableTypingViewport({height:160,offsetTop:50,scale:2},700),null,'pinching does not refit the map into a reduced zoom viewport');
assert.equal(stableTypingViewport({height:290,offsetTop:0,scale:1.1},700),null);
assert.deepEqual(stableTypingViewport(undefined,700),{height:700,top:0});

assert.equal(shouldReturnHoleHeader({top:-30,bottom:-4},640),true);
assert.equal(shouldReturnHoleHeader({top:650,bottom:690},640),true);
assert.equal(shouldReturnHoleHeader({top:64,bottom:92},640),false,'do not scroll an already visible header');
assert.equal(shouldReturnHoleHeader({top:8,bottom:36},640),false);

assert.equal(keyboardLayoutVisible(true,{height:720,scale:1},720),false,'focus with no keyboard must keep the standard view');
assert.equal(keyboardLayoutVisible(true,{height:430,scale:1},720),true);
assert.equal(keyboardLayoutVisible(false,{height:430,scale:1},720),false,'blur always leaves keyboard layout');
assert.equal(keyboardLayoutVisible(true,{height:680,scale:1},720),false,'browser toolbar changes are not a keyboard');
assert.equal(keyboardLayoutVisible(true,{height:430,scale:2},720),false,'zoom is not a keyboard');
assert.equal(keyboardLayoutVisible(true,undefined,720),false);

// Execute the real course-render/update functions with touch-device conditions.
// Desktop short-circuiting previously hid a scope error in this path.
const {readFileSync}=await import('node:fs');
const {runInNewContext}=await import('node:vm');
const app=readFileSync(new URL('../static/app.js',import.meta.url),'utf8');
const functionSource=(name,next)=>app.slice(app.indexOf(`function ${name}(`),app.indexOf(`function ${next}(`));
const nodes=new Map(),node=id=>{if(!nodes.has(id))nodes.set(id,{hidden:true,textContent:'',value:'',classList:{toggle(){}}});return nodes.get(id);};
const labels=[{},{}],headerScroll=[],pageScroll=[];
let desktop=false;
const hole={settings:{par:4},attempts:[]};
const context={
 $:node,document:{querySelector:selector=>selector==='.mission'?{scrollIntoView:options=>headerScroll.push(options)}:node(selector),querySelectorAll:selector=>selector.includes('scorecard-label')?labels:[]},
 window:{scrollTo:options=>pageScroll.push(options)},
 state:{current:'tee',start:'tee',target:'flag',challenge:{par:4,attempt:1},history:[]},
 config:{vocabulary:100,release:'test'},rounds:{active:{index:0,finished:false,holes:[hole]},hole},
 desktopInteraction:()=>desktop,inCourse:()=>true,practising:()=>false,roundSummary:()=>false,
 courseExhausted:()=>false,holeResult:()=>context.state.won===true,courseResult:()=>context.state.won===true,
 bestAttempt:()=>null,attemptLimit:()=>12,reviewingSubmittedHole:false,
 modelName:()=>'',bestHoleResult:()=>null,renderStrokeScore(){},renderBestRoute(){},styleResultButtonLabels(){},
 renderAttemptCounter(){},placeHoleLog(){},renderNotice(){},recordCourseState(){},map(){},telemetry(){},renderLog(){},
 renderLimitOverlay(){},leaveWordEntry(){},showChipRange:false,
 scrollHoleTo:target=>(target==='page'?pageScroll:headerScroll).push({behavior:'smooth'}),
};
context.updateArrivalSkill=()=>context.renderCourseOutcome();
runInNewContext(functionSource('renderCourseOutcome','renderCourseScorecard')+functionSource('update','renderLimitOverlay')+app.slice(app.indexOf('function anchorCourseHole('),app.indexOf('async function navigateCourseHole(')),context);
context.update();
assert.equal(pageScroll.length,0,'ordinary touch-device course rendering must not scroll or throw');
context.state.won=true;context.state.attempts=4;
context.update();assert.equal(pageScroll.length,1,'new mobile result anchors at page top');
context.update();assert.equal(pageScroll.length,1,'rerendering an existing result does not scroll again');
context.anchorCourseHole({sameHole:true});assert.equal(headerScroll.length,1,'same-hole retry keeps mobile header anchor');
context.anchorCourseHole();assert.equal(pageScroll.length,2,'different hole anchors to page top');
desktop=true;context.state.won=false;context.update();context.state.won=true;context.update();
assert.equal(pageScroll.length,2,'desktop shot results do not move the viewport');
console.log('Touch rendering regression passed: course updates, one-time result anchors, same-hole header anchors and unchanged desktop shot viewport.');

const {createHoleScroller}=await import('../static/hole-scroll.mjs');
let time=0,nextId=0,geometry=[720,0,64,240],closing=false,motionReduced=false,currentY=200;
const frames=new Map(),scrolls=[];
const coordinator=createHoleScroller({snapshot:target=>({geometry,keyboardClosing:closing,currentY,targetY:target==='page'?0:64}),scroll:(target,behavior)=>{scrolls.push({target,behavior});currentY=target==='page'?0:64;},frame:fn=>{frames.set(++nextId,fn);return nextId;},cancelFrame:id=>frames.delete(id),now:()=>time,reducedMotion:()=>motionReduced});
const advance=ms=>{for(let i=0;i<ms/20;i++){time+=20;const work=[...frames.values()];frames.clear();work.forEach(fn=>fn());}};
coordinator.to('header');advance(40);geometry=[430,0,64,200];closing=true;advance(160);
assert.equal(scrolls.length,0,'upward return waits while the keyboard is still closing');
coordinator.to('page');advance(60);closing=false;geometry=[720,0,64,240];advance(100);
assert.equal(scrolls.length,1,'one final upward scroll after keyboard and layout settle');
assert.deepEqual(scrolls[0],{target:'page',behavior:'smooth'},'upward page return remains visibly smooth');
advance(200);assert.equal(scrolls.length,1,'no delayed second jump');
coordinator.to('header');assert.deepEqual(scrolls.at(-1),{target:'header',behavior:'instant'},'downward header correction runs synchronously before the next paint');
closing=true;currentY=0;advance(20);
assert.equal(currentY,64,'Safari keyboard-close reset is corrected before the next paint');
assert.equal(scrolls.at(-1).behavior,'instant','keyboard-close correction never animates down past the title');
closing=false;advance(120);const count=scrolls.length;advance(200);assert.equal(scrolls.length,count,'settling adds no redundant correction');
currentY=200;coordinator.to('header');coordinator.cancel();advance(200);assert.equal(scrolls.length,count,'entering text cancels a pending upward return');
motionReduced=true;coordinator.to('header');advance(120);assert.deepEqual(scrolls.at(-1),{target:'header',behavior:'instant'});
console.log('Scroll coordination passed: immediate downward corrections before paint, smooth upward returns, keyboard settling, cancellation and reduced motion.');

const {createKeyboardLayoutManager}=await import('../static/typing-layout.mjs');
let keyboardTime=0,keyboardId=0;
const keyboardFrames=new Map(),layouts=[],pins=[],positions=[],releases=[];
const keyboardState={focused:true,enabled:true,height:720,top:0,restingHeight:720};
const keyboard=createKeyboardLayoutManager({snapshot:()=>({...keyboardState}),pin:value=>pins.push(value),position:value=>positions.push(value),apply:value=>layouts.push(value),release:()=>releases.push(keyboardTime),frame:fn=>{keyboardFrames.set(++keyboardId,fn);return keyboardId;},cancelFrame:id=>keyboardFrames.delete(id),now:()=>keyboardTime});
const keyboardAdvance=ms=>{for(let i=0;i<ms/20;i++){keyboardTime+=20;const batch=[...keyboardFrames.values()];keyboardFrames.clear();batch.forEach(fn=>fn());}};
keyboard.prepareFocus();assert.equal(pins.length,0,'native focus event must finish before the tapped input moves');
keyboardAdvance(20);assert.equal(pins.length,1,'pin on the first frame, before waiting for the keyboard animation');
assert.equal(layouts.length,0);keyboardAdvance(120);assert.equal(releases.length,0,'hold the pin while the keyboard starts opening');
for(const height of [680,590,480,410]){keyboardState.height=height;keyboard.notify();keyboardAdvance(40);}
assert.equal(layouts.length,0,'opening does not resize the map repeatedly');
keyboardState.top=45;keyboard.notify();assert.equal(positions.at(-1).top,45,'viewport top correction is immediate, not delayed by map fitting');
keyboardState.top=0;keyboard.notify();assert.equal(positions.at(-1).top,0);keyboardAdvance(120);
assert.equal(layouts.length,1);assert.equal(layouts[0].height,410);
keyboardState.focused=false;keyboard.notify();keyboardAdvance(40);
for(const height of [480,590,680,720]){keyboardState.height=height;keyboard.notify();keyboardAdvance(40);}
assert.equal(layouts.length,1,'closing preserves its working stable layout');assert.equal(releases.length,0);keyboardAdvance(100);assert.equal(releases.length,1);
keyboardState.focused=true;keyboardState.height=410;keyboard.prepareFocus();keyboardAdvance(140);
keyboardState.focused=false;keyboard.notify();keyboardAdvance(20);keyboardState.focused=true;keyboard.prepareFocus();keyboardAdvance(140);
assert.equal(releases.length,1,'switching reached words does not release the pinned view');assert.equal(pins.length,2);
console.log('Recorded opening regression passed: focus completes first, pin before keyboard animation, immediate top compensation, one settled resize and unchanged closing.');

const {createViewportDiagnostics}=await import('../static/viewport-diagnostics.mjs');
const diagnostic=createViewportDiagnostics(2);
for(let i=0;i<3;i++)diagnostic.record('resize',{height:700-i});
assert.deepEqual(diagnostic.export().map(e=>e.height),[699,698],'viewport trace remains bounded');
const diagnosticCopy=diagnostic.export();diagnosticCopy[0].height=0;
assert.equal(diagnostic.export()[0].height,699,'export cannot mutate the live trace');

// A browser smooth-scroll animation outlives its queued request. Focus must
// cancel that native animation even after the coordinator has finished its RAF.
let nativeScrollRunning=false,anchorTime=0;const anchorFrames=[];
const nativeScroll=createHoleScroller({snapshot:()=>({geometry:[720],keyboardClosing:false,currentY:200,targetY:0}),scroll:()=>{nativeScrollRunning=true;},stop:()=>{nativeScrollRunning=false;},frame:fn=>{anchorFrames.push(fn);return anchorFrames.length;},cancelFrame(){},now:()=>anchorTime,reducedMotion:()=>false});
nativeScroll.to('page');for(let i=0;i<6;i++){anchorTime+=20;anchorFrames.shift()?.();}
assert.equal(nativeScrollRunning,true,'upward navigation has started a native smooth scroll');
nativeScroll.cancel();assert.equal(nativeScrollRunning,false,'input focus stops a native scroll even with no pending RAF');
