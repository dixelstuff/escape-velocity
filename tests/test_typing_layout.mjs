import assert from 'node:assert/strict';
import {typingCourseWidth,stableTypingViewport,shouldReturnHoleHeader} from '../static/typing-layout.mjs';
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
