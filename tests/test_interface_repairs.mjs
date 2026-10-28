import assert from 'node:assert/strict';import fs from 'node:fs';
import {typingCourseWidth} from '../static/typing-layout.mjs';import {courseStyle,pinPlacement,bunkerPoints,greenContains} from '../static/course-appearance.mjs';import {mapLayout} from '../static/map.mjs';import {waypointLayout,waypointLandscape,waypointBunkers,waypointLake} from '../static/waypoint-map.mjs';import {courseTrees,clearOfCartPath} from '../static/course-art.mjs';
const css=fs.readFileSync('static/style.css','utf8'),html=fs.readFileSync('static/index.html','utf8');
assert.ok(html.includes('<body class="personal-daily">'),'first paint uses final personal header');assert.ok(!html.includes('personal-hole-bests'),'no result link in entry area');assert.match(css,/margin:16px auto 12px/);assert.match(css,/personal-daily\.typing \.mission\{padding:0 2px;margin-top:0;margin-bottom:8px/);assert.match(css,/width:26px;height:27px/);
assert.equal(typingCourseWidth(354,220,700,430),354);assert.ok(typingCourseWidth(354,220-32,700,430)<354,'the removed 32px header overhead caused a real shrink');
const treeVariants=new Set(),sandVariants=new Set(),lakeVariants=new Set(),pathVariants=new Set(),rotations=[];
for(const narrow of [true,false])for(let i=0;i<18;i++){
 const seed='daily-variety-'+i,style=courseStyle(seed),state={waypoint:{turn:i%2?'up':'down'}},d=waypointLayout(mapLayout(narrow),state,pinPlacement(seed),style);
 assert.deepEqual(style,courseStyle(seed));assert.ok(Math.abs(style.rotation)<=1.4);rotations.push(style.rotation);
 const art=waypointLandscape(state,d,style),lake=waypointLake(d,style),trees=courseTrees(d,style,lake),sand=waypointBunkers(d,style);assert.ok(!art.includes('NaN')&&!trees.includes('NaN'));assert.equal(trees,courseTrees(d,style,lake));
 treeVariants.add(trees);sandVariants.add(JSON.stringify(sand));lakeVariants.add(JSON.stringify(lake.outline));pathVariants.add(d.cartPath.path);
 for(const m of trees.matchAll(/data-course-tree="true" transform="translate\(([-\d.]+),([-\d.]+)\)"/g))assert.ok(clearOfCartPath({x:+m[1],y:+m[2],r:0},d));
 for(const b of sand.slice(1))for(const p of bunkerPoints(b,2)){const a=b.angle*Math.PI/180,x=b.x*d.width+p.x*Math.cos(a)-p.y*Math.sin(a),y=b.y+p.x*Math.sin(a)+p.y*Math.cos(a);assert.equal(greenContains({x,y:d.reflectY?430-y:y},d),false);}
}
assert.equal(treeVariants.size,36);assert.equal(sandVariants.size,36);assert.equal(lakeVariants.size,36);assert.equal(pathVariants.size,36);assert.ok(Math.min(...rotations)<-.5&&Math.max(...rotations)>.5);
console.log('Interface repair passed: compact keyboard budget, centred borderless first-paint header, smaller counter, no entry-area results link, 36 deterministic varied terrains, path and greenside clearances.');
