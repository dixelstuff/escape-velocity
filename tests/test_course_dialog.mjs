import assert from 'node:assert/strict';
import {openCourseDialog} from '../static/course-dialog.mjs';
const calls=[],body={style:{position:'',top:'',left:'',width:''}},root={style:{overflow:''}};
globalThis.document={body,documentElement:root};globalThis.window={scrollX:0,scrollY:560,scrollTo:value=>calls.push(value)};
function dialog(){const handlers={},heading={focus:options=>calls.push(['heading',options])};return {heading,open:false,querySelector:()=>heading,addEventListener:(type,fn)=>handlers[type]=fn,showModal(){this.open=true;},close(){this.open=false;handlers.close();}};}
const first=dialog(),second=dialog();openCourseDialog(first);
assert.equal(first.heading.tabIndex,-1);assert.equal(first.heading.autofocus,true);assert.equal(body.style.position,'fixed');assert.equal(body.style.top,'-560px');assert.equal(root.style.overflow,'hidden');
assert.deepEqual(calls[0],['heading',{preventScroll:true}]);openCourseDialog(first);assert.equal(calls.length,1,'opening the same dialog twice is a no-op');
openCourseDialog(second);first.close();assert.equal(body.style.position,'fixed','a second open modal retains the lock');assert.equal(root.style.overflow,'hidden');
second.close();assert.equal(body.style.position,'');assert.equal(body.style.top,'');assert.equal(root.style.overflow,'');assert.deepEqual(calls.at(-1),{left:0,top:560,behavior:'instant'});
window.scrollY=200;openCourseDialog(first);first.close();assert.deepEqual(calls.at(-1),{left:0,top:200,behavior:'instant'},'reopening captures the current page position');
delete globalThis.document;delete globalThis.window;
console.log('Course dialogs passed: neutral heading focus, no automatic button focus, shared background lock, stacked modal handover and exact scroll restoration.');
