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
