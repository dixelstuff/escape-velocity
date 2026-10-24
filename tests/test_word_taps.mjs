import assert from 'node:assert/strict';
import {nearestWordTarget} from '../static/word-taps.mjs';
const target=(word,left,top,width=50,height=18)=>({word,boxes:[{left,top,width,height}]});
const words=[target('first',40,80),target('second',100,80)];
assert.equal(nearestWordTarget(words,{x:38,y:72}),'first','padding accepts a near miss outside the drawn label');
assert.equal(nearestWordTarget(words,{x:103,y:89}),'second','the real label wins when enlarged targets overlap');
assert.equal(nearestWordTarget(words,{x:97,y:89}),'second','overlap chooses the nearest actual text core');
assert.equal(nearestWordTarget(words,{x:0,y:0}),null,'unrelated map taps do not select a word');
const dot={word:'lie',boxes:[{left:200,top:100,width:6,height:6}]};
assert.equal(nearestWordTarget([dot],{x:222,y:103}),'lie','tiny lie dots retain a 44-pixel finger target');
assert.equal(nearestWordTarget([dot],{x:226,y:103}),null);
for(const scale of [.4,.55,1]){
 const visible=target('scaled',40,80,60*scale,24*scale),cy=80+12*scale;
 assert.equal(nearestWordTarget([visible],{x:40+30*scale,y:cy-20}),'scaled','minimum screen hit size survives SVG shrinking');
}
console.log('Word taps passed: generous label/dot targets, nearest-core overlap selection and scale-independent finger sizing.');

const text=target('text',40,80),nearby=target('nearby',160,160);
nearby.boxes.push({left:60,top:85,width:6,height:6});
assert.equal(nearestWordTarget([text,nearby],{x:63,y:88}),'text','a visible label takes priority over another lie dot under it');

// The step-back button must preserve entry focus in scored and practice play.
const {readFileSync}=await import('node:fs'),{runInNewContext}=await import('node:vm');
const app=readFileSync(new URL('../static/app.js',import.meta.url),'utf8');
const code=app.slice(app.indexOf("$('quick-replay').addEventListener('pointerdown'"),app.indexOf("$('header-next-hole').onclick="));
for(const practice of [false,true]){
 const calls=[],button={addEventListener(type,fn){this.pointerdown=fn;}},history=[{success:true,attempt:1},{success:true,attempt:2}];
 const context={$:()=>button,busy:false,state:{challenge:{practice},history},retryTimer:0,clearTimeout(){},inCourse:()=>true,practising:()=>practice,rounds:{hole:{locked:practice},active:{finished:practice}},courseExhausted:()=>false,previousRetryThrough:()=>1,retryFromWord:(through,options)=>calls.push({through,focusEntry:options.focusEntry}),retryCourseHole:()=>{throw Error('Practice step-back must not restart the hole');}};
 runInNewContext(code,context);let prevented=false;button.pointerdown({preventDefault(){prevented=true;}});button.onclick();
 assert.equal(prevented,true,'pointerdown preserves current entry focus');
 assert.equal(calls.length,1);assert.equal(calls[0].through,1);assert.equal(calls[0].focusEntry,false,'button never requests keyboard focus');
}
console.log('Replay focus passed for scored and locked-score practice holes.');
