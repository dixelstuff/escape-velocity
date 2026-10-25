import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
import {completedCourseLift,completedCardOverlap} from '../static/result-presentation.mjs';
for(const scale of [.4,.6,1,1.6])for(const top of [0,10,25,50,100]){
 const lift=completedCourseLift(true,top,scale);
 assert.ok(lift>=0&&lift<=24);assert.ok(lift<=Math.max(0,top*scale-10),'high labels retain ten pixels of clearance');assert.equal(completedCourseLift(false,top,scale),0);
}
for(const bottom of [40,150,250,400,450]){const overlap=completedCardOverlap(238,bottom,.55,24);assert.ok(overlap>=0&&overlap<=158);assert.ok(238-overlap>=Math.min(238,bottom*.55-24+24),'card never covers the route');}
assert.equal(completedCourseLift(true,100,.5),24);assert.equal(completedCourseLift(true,25,.5),2.5);
const app=readFileSync(new URL('../static/app.js',import.meta.url),'utf8');
const classes=new Set(),attributes=new Set(),frame={},panel={hidden:true,parentElement:frame},bag={hidden:true},scrim={hidden:true},map={setAttribute(){},querySelectorAll:()=>[],toggleAttribute:(name,on)=>on?attributes.add(name):attributes.delete(name)};
const ctx={$:id=>({'hole-attempt-log':panel,'golf-bag-menu':bag,'map-scrim':scrim,map}[id]),document:{querySelector:selector=>selector==='.hole-play-area'?frame:{classList:{toggle:(name,on)=>on?classes.add(name):classes.delete(name)}}}};
runInNewContext(app.slice(app.indexOf('function syncMapOverlay()'),app.indexOf("$('map-scrim').addEventListener")),ctx);
ctx.syncMapOverlay();assert.equal(scrim.hidden,true);assert.equal(attributes.has('inert'),false);
bag.hidden=false;ctx.syncMapOverlay();assert.equal(scrim.hidden,false);assert.equal(attributes.has('inert'),true);assert.equal(classes.has('bag-open'),true);
bag.hidden=true;panel.hidden=false;ctx.syncMapOverlay();assert.equal(classes.has('hole-panel-overlay'),true);assert.equal(scrim.hidden,false);
panel.parentElement={};ctx.syncMapOverlay();assert.equal(classes.has('hole-panel-overlay'),false);assert.equal(scrim.hidden,true,'a panel outside the hole frame does not dim play');assert.equal(attributes.has('inert'),false);
// Card navigation preserves its completed page-top scroll through the actual hole change.
let anchors=0,news=0;
const nav={newGame:async()=>{news++;return true;},anchorCourseHole(){anchors++;}};
runInNewContext(app.slice(app.indexOf('async function playFromResult('),app.indexOf('function retryCourseHole()')),nav);
await nav.playFromResult({}, {preserveScroll:true});assert.equal(anchors,0);assert.equal(news,1);
await nav.playFromResult({}, {sameHole:true});assert.equal(anchors,1,'ordinary within-hole navigation still uses its existing anchor');
console.log('Overlay presentation passed: bounded scene lift, readable top clearance, backdrop/input isolation, card/frame isolation, and preserved page-top navigation.');

// Backdrop gestures are consumed, so they cannot activate a lie underneath.
const handlers={},dismissals=[];
const backCtx={$:()=>({addEventListener:(type,fn)=>handlers[type]=fn}),document:{querySelector:()=>({classList:{contains:()=>true}})},setBag:value=>dismissals.push(['bag',value]),setHoleLog:value=>dismissals.push(['panel',value])};
runInNewContext(app.slice(app.indexOf("$('map-scrim').addEventListener"),app.indexOf('function setBag(open)')),backCtx);
let prevented=0,stopped=0;const gesture={preventDefault(){prevented++;},stopPropagation(){stopped++;}};
handlers.pointerdown(gesture);handlers.click(gesture);assert.equal(prevented,2);assert.equal(stopped,2);assert.deepEqual(dismissals,[['bag',false],['panel',false]]);
console.log('Backdrop dismissal passed: no pointer or click bubbles through to a previous lie.');

// Help consumes the pointer before native form/input focus; keyboard activation stays available.
const helpEvents={},helpButton={addEventListener:(type,handler)=>helpEvents[type]=handler},helpCalls=[];
const helpCtx={busy:false,state:{},$:()=>helpButton,leaveWordEntry:()=>helpCalls.push('leave-entry'),setHoleLog:(open,options)=>helpCalls.push([open,options.mode])};
runInNewContext(app.slice(app.indexOf('function openShotHelp(){'),app.indexOf("$('bag-best-route').onclick=")),helpCtx);
let helpPrevented=0,helpStopped=0;const helpGesture={button:0,isPrimary:true,preventDefault(){helpPrevented++;},stopPropagation(){helpStopped++;}};
helpEvents.pointerdown(helpGesture);assert.equal(helpPrevented,1);assert.equal(helpStopped,1);assert.deepEqual(helpCalls,['leave-entry',[true,'tips']]);
helpButton.onclick({...helpGesture,detail:1});assert.equal(helpCalls.length,2,'a generated click must not open the card a second time');
helpButton.onclick({...helpGesture,detail:0});assert.equal(helpCalls.length,4,'keyboard activation opens the same overlay');
helpCtx.busy=true;helpEvents.pointerdown(helpGesture);assert.equal(helpCalls.length,4,'help cannot interrupt an in-flight shot');
console.log('Guidance help passed: consumed pointer focus, one open per tap, keyboard access and no in-flight interruption.');

const {holePanelHeight,resultContext}=await import('../static/result-presentation.mjs');
assert.equal(holePanelHeight(240,110,844,22),240,'a short log does not extend the map');
assert.equal(holePanelHeight(240,340,844,22),384,'only the space needed for a medium log is revealed');
assert.equal(holePanelHeight(240,1200,844,22),844*.64,'long help/log content is capped before internal scrolling');
assert.equal(holePanelHeight(700,1200,844,22),700,'a large existing map never shrinks to the overlay cap');
assert.equal(resultContext(true,true),'just-now');assert.equal(resultContext(false,true),'review');assert.equal(resultContext(true,false),'review');assert.equal(resultContext(false,true,true),'round');
console.log('Result context and card sizing passed: latest-result moment, compact return review, no unnecessary expansion and bounded tall cards.');

const rollingUI=readFileSync(new URL('../static/rolling-ui.mjs',import.meta.url),'utf8');let submitBannerHandler,submissionsOpened=0;
runInNewContext(rollingUI.split('\n').find(line=>line.includes("banner.addEventListener('click'")),{banner:{addEventListener(type,fn){submitBannerHandler=fn;}},onSubmit(){submissionsOpened++;}});
submitBannerHandler({target:{closest:selector=>selector==='#rolling-submit-now'?{}:null}});assert.equal(submissionsOpened,1,'completed-course banner uses the normal submit action');
