import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {DailyGame} from '../static/daily-game.mjs';
import {dailyManifest} from '../static/daily-manifest.mjs';
import {mountDailyUI} from '../static/daily-ui.mjs';

// Exercise the real archive and extra custom definitions without browser storage.
const game=new DailyGame({getItem:()=>null},dailyManifest);
game.data.customHoles=Array.from({length:100},(_,i)=>({id:`custom-test-${i}`,date:`custom-test-${i}`,settings:{start:'test',waypoint:{word:'middle'},target:'goal'}}));
game.data.selected=game.data.customHoles.at(-1).date;
const nodes=new Map();globalThis.document={getElementById(id){if(!nodes.has(id))nodes.set(id,{writes:0,html:'',set innerHTML(s){this.html=s;this.writes++;},get innerHTML(){return this.html;},addEventListener(){},setAttribute(){}});return nodes.get(id);}};
let scans=0;const available=game.available.bind(game);game.available=()=>{scans++;return available();};
let navigated;const ui=mountDailyUI(game,{onNavigate:day=>navigated=day,onToday(){}});
ui.render();assert.ok(scans<10,`Rendering must use a bounded number of archive scans, got ${scans}`);
const picker=nodes.get('personal-hole-picker'),last=game.data.customHoles.at(-1);
assert.equal(picker.value,last.date);assert.equal(nodes.get('hole-number').textContent,`#${available().length}`);
assert.equal(nodes.get('header-next-hole').disabled,true);
scans=0;ui.render();assert.ok(scans<10);assert.equal(picker.writes,1,'A shot/save refresh must preserve existing option nodes');
// Navigation updates selection without replacing every option.
game.data.selected=available()[0].date;ui.render();assert.equal(picker.writes,1);assert.equal(picker.value,game.data.selected);assert.equal(nodes.get('header-prev-hole').disabled,true);
picker.value=last.date;picker.onchange();assert.equal(navigated,last.date);
// Definition changes, including refreshed data from another tab, must stay visible.
game.data.customHoles=structuredClone(game.data.customHoles);game.data.customHoles.at(-1).settings.start='changed';ui.render();assert.equal(picker.writes,2);assert.match(picker.innerHTML,/CHANGED/);
game.data.customHoles.reverse();game.data.selected=last.date;ui.render();assert.equal(picker.writes,3);assert.equal(nodes.get('hole-number').textContent,`#${available().length-99}`);
game.data.customHoles=[];game.data.selected=available()[0].date;ui.render();assert.equal(picker.writes,4);assert.ok(!picker.innerHTML.includes('custom-test-'));

// A late selected hole used to recompute selected() for every preceding hole.
const app=fs.readFileSync(new URL('../static/app.js',import.meta.url),'utf8');
const adjacentSource=app.match(/function adjacentDaily\(offset\)\{[^\n]+\}/)?.[0];assert.ok(adjacentSource);
game.data.selected=available().at(-2).date;scans=0;
const adjacent=vm.runInNewContext(`(${adjacentSource})`,{daily:game});
assert.equal(adjacent(1).id,available().at(-1).id);assert.ok(scans<10,`Adjacent navigation must avoid per-hole scans, got ${scans}`);
assert.equal(adjacent(-1).id,available().at(-3).id);
console.log('Admin UI work passed: bounded archive scans, stable picker nodes, navigation and refreshed/custom/reordered definitions.');
