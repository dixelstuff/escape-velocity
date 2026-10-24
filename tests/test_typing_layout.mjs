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

// Regression boundary: mobile navigation uses the established header anchor;
// result rendering and text-entry focus must not invoke a page-top coordinator.
const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm');
const app=readFileSync(new URL('../static/app.js',import.meta.url),'utf8');
const anchor=app.slice(app.indexOf('function anchorCourseHole('),app.indexOf('async function navigateCourseHole('));
const headerAnchors=[],pageAnchors=[];let desktop=false;
const context={leaveWordEntry:options=>{if(options.anchor&&!desktop)headerAnchors.push(options);},desktopInteraction:()=>desktop,window:{scrollTo:options=>pageAnchors.push(options)}};
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
