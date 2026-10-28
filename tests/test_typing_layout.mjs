import assert from 'node:assert/strict';
import {typingCourseWidth,stableTypingViewport,shouldReturnHoleHeader,keyboardLayoutVisible,keyboardRestingHeight} from '../static/typing-layout.mjs';
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

// Regression boundary: mobile navigation uses the established header anchor;
// result rendering and text-entry focus must not invoke a page-top coordinator.
const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm');
const app=readFileSync(new URL('../static/app.js',import.meta.url),'utf8');
const anchor=app.slice(app.indexOf('function anchorCourseHole('),app.indexOf('async function navigateCourseHole('));
const headerAnchors=[],pageAnchors=[];let desktop=false;
const context={resultNavigationActive:false,leaveWordEntry:options=>{if(options.anchor&&!desktop)headerAnchors.push(options);},desktopInteraction:()=>desktop,window:{scrollTo:options=>pageAnchors.push(options)}};
runInNewContext(anchor,context);
context.anchorCourseHole();context.anchorCourseHole({sameHole:true});
assert.equal(headerAnchors.length,2);assert.equal(pageAnchors.length,0,'mobile never goes to page top when navigating or retrying a hole');
desktop=true;context.anchorCourseHole();assert.equal(pageAnchors.length,1,'desktop navigation retains its existing top-of-page behavior');
context.anchorCourseHole({sameHole:true});assert.equal(pageAnchors.length,1,'desktop same-hole retry does not scroll');
assert.equal(app.includes('createHoleScroller'),false,'the new viewport scroll coordinator is removed from the app');
assert.equal(app.includes('createKeyboardLayoutManager'),false,'post-anchor keyboard transition state machine is removed from the app');
const {createViewportDiagnostics}=await import('../static/viewport-diagnostics.mjs');
const diagnostic=createViewportDiagnostics(2);for(let i=0;i<3;i++)diagnostic.record('resize',{height:700-i});
assert.deepEqual(diagnostic.export().map(e=>e.height),[699,698]);
console.log('Mobile anchor rollback passed: header navigation only, no page-top coordinator, no new keyboard transition state machine and unchanged desktop navigation.');

// Chrome browser chrome can leave the layout viewport larger than the visible
// viewport by more than the 100px keyboard threshold even with no keyboard.
const chromeViewport={height:690,offsetTop:0,scale:1},layoutHeight=844;
const resting=keyboardRestingHeight(chromeViewport,layoutHeight);
assert.equal(resting,690,'the baseline uses the same viewport as keyboard detection');
assert.equal(keyboardLayoutVisible(true,chromeViewport,resting),false,'focus alone cannot falsely activate compact layout');
assert.equal(keyboardLayoutVisible(true,{...chromeViewport,height:390},resting),true,'actual keyboard shrink activates compact layout');
assert.equal(keyboardLayoutVisible(true,chromeViewport,resting),false,'Done exits compact mode even if the input retains native focus');
assert.equal(keyboardLayoutVisible(true,{...chromeViewport,height:650},resting),false,'browser toolbar restoration also exits compact mode');
assert.equal(keyboardRestingHeight({height:740},layoutHeight),740,'each new entry uses its current visible baseline, not a historical maximum');
assert.equal(keyboardRestingHeight(undefined,844),844);
console.log('Chrome keyboard baseline passed: layout/visual height mismatch, no premature entry, Done with retained focus and browser toolbar changes.');

{
 const frames=[],locks=[],visits=[],scrolls=[];
 const navigation={busy:false,narrow:()=>false,rounds:{canVisit:()=>true},leaveWordEntry(){},lock:value=>locks.push(value),desktopInteraction:()=>false,document:{querySelector:()=>({getBoundingClientRect:()=>({top:-520})})},scrollY:600,reduced:false,performance:{now:()=>0},window:{scrollTo:options=>scrolls.push(options)},requestAnimationFrame:fn=>frames.push(fn),navigateCourseHole:index=>visits.push(index)};
 const code=app.slice(app.indexOf('async function navigateCourseHoleFromCard('),app.indexOf('async function navigateCourseHole(index,'));
 runInNewContext(code,navigation);
 const changing=navigation.navigateCourseHoleFromCard(3);
 assert.deepEqual(locks,[true]);assert.equal(scrolls[0].behavior,'smooth');assert.equal(scrolls[0].top,0,'course-card selection returns to the Word golf title');assert.equal(visits.length,0,'do not activate the next input while native navigation is still scrolling');
 frames.shift()();assert.equal(visits.length,0);
 navigation.scrollY=0;frames.shift()();frames.shift()();await changing;
 assert.deepEqual(locks,[true,false]);assert.deepEqual(visits,[3],'selected hole becomes playable after the scroll settles');
}
console.log('Course-card navigation passed: one smooth scroll with input locked until completion.');

{
 const fades=[],locks=[],visits=[],classes=new Set();
 const view={getBoundingClientRect:()=>({top:8}),animate:(keyframes,options)=>{let finish;const finished=new Promise(resolve=>{finish=resolve;});const animation={finished,cancel(){this.cancelled=true;}};fades.push({keyframes,options,finish,animation});return animation;}};
 const navigation={busy:false,narrow:()=>true,rounds:{canVisit:()=>true,active:{index:0}},leaveWordEntry(){},lock:value=>locks.push(value),desktopInteraction:()=>false,document:{querySelector:()=>view,body:{classList:{add:name=>classes.add(name),remove:name=>classes.delete(name)}}},scrollY:0,reduced:false,performance:{now:()=>0},window:{scrollTo(){}},navigateCourseHole:index=>visits.push(index)};
 const code=app.slice(app.indexOf('async function navigateCourseHoleFromCard('),app.indexOf('async function navigateCourseHole(index,'));
 runInNewContext(code,navigation);
 const changing=navigation.navigateCourseHoleFromCard(2);
 assert.equal(fades.length,3);assert.equal(visits.length,0,'old hole stays until its fade-out finishes');
 fades.forEach(fade=>fade.finish());await new Promise(resolve=>setImmediate(resolve));
 assert.deepEqual(visits,[2]);assert.equal(fades.length,6);assert.equal(locks.at(-1),true,'new hole stays locked until fade-in finishes');
 fades.slice(3).forEach(fade=>fade.finish());await changing;
 assert.equal(locks.at(-1),false);assert.equal(classes.size,0);assert.ok(fades.every(fade=>fade.animation.cancelled),'remove finished animation effects');
}
console.log('Course-card transition passed: fade out, replace hole, fade in, then enable input.');

const {typingCourseFit}=await import('../static/typing-layout.mjs');
for(const width of [284,324,354,394])for(const view of [[640,430],[700,430],[700,460]]){
 const natural=(width-2)*view[1]/view[0]+2;
 for(const missing of [0,.25,1,2,4,6]){const fit=typingCourseFit(width,natural-missing,...view);assert.equal(fit.width,width,'tiny shortfall must not shrink the mobile map');assert.ok(Math.abs(fit.gap-(19-missing))<1e-9);assert.ok(fit.gap>=13);assert.deepEqual(typingCourseFit(width,natural-missing,...view),fit,'repeat fit is deterministic');}
 const short=typingCourseFit(width,natural-30,...view);assert.ok(short.width<width,'genuinely short screens still fit');assert.equal(short.gap,19);
}
assert.deepEqual(typingCourseFit(0,200,640,430),{width:0,gap:19});
console.log('Tiny keyboard shortfalls preserve exact map width by spending at most 6px of input gap; small screens retain uniform scaling and repeated fits do not oscillate.');

{
 const styles=new Map(),input={},main={clientHeight:0,clientWidth:390},mission={getBoundingClientRect:()=>({height:34})},controls={getBoundingClientRect:()=>({height:78})},feedback={getBoundingClientRect:()=>({height:0})};
 const natural=(354-2)*430/700+2,overhead=10+4+34+8+78+19;main.clientHeight=natural-2+overhead;
 const css=node=>node===main?{paddingTop:'10',paddingBottom:'4',paddingLeft:'18',paddingRight:'18'}:node===mission?{marginTop:'0',marginBottom:'8'}:{marginTop:String(styles.get('--typing-controls-gap')??19),marginBottom:'0',getPropertyValue:()=> '19'};
 const nodes={word:input,map:{viewBox:{baseVal:{width:700,height:430}}}};
 const context={desktopInteraction:()=>false,keyboardLayoutVisible,stableTypingViewport,typingCourseFit,typingRestHeight:844,typingMaxWidth:354,innerHeight:844,window:{visualViewport:{height:main.clientHeight,offsetTop:0,scale:1}},document:{activeElement:input,body:{classList:{add(){},contains:()=>false}},documentElement:{style:{setProperty:(key,value)=>styles.set(key,value)}},querySelector:key=>({'main':main,'.mission':mission,'.controls':controls,'.course-feedback':feedback}[key])},$:id=>nodes[id],getComputedStyle:css,requestAnimationFrame(){},syncControlTrees(){},leaveWordEntry(){throw Error('keyboard must stay engaged');}};
 const code=app.slice(app.indexOf('function applyTypingView(){'),app.indexOf("$('launch').addEventListener('pointerdown'"));
 runInNewContext(code,context);context.applyTypingView();assert.equal(styles.get('--typing-course-width'),'354px');assert.ok(Math.abs(parseFloat(styles.get('--typing-controls-gap'))-17)<1e-9);const first=[...styles];context.applyTypingView();assert.deepEqual([...styles],first,'real fit must measure the base gap rather than its previous adjustment');
}
console.log('Integrated mobile fit passed: exact resting width, input gap absorbs two-pixel shortage, repeated visual-viewport callbacks stay stable, and the existing keyboard guard remains active.');
