import assert from 'node:assert/strict';
import {typingCourseWidth} from '../static/typing-layout.mjs';
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
