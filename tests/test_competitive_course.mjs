import assert from 'node:assert/strict';
import {CompetitiveCourse,competitiveStatus,competitiveStandings,hypotheticalPlacement,socialPlacementText,ordinal} from '../static/competitive-course.mjs';
import {TourCourse} from '../static/tour-course.mjs';
import {tourManifest} from '../static/tour-manifest.mjs';
import {scopedStorage} from '../static/rolling-course.mjs';
const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},scope=scopedStorage(storage,'competitive-test.');
let r=new CompetitiveCourse(scope,tourManifest,tourManifest.epoch);
const state=(n,history=[{word:'test',success:false}],extra={})=>({start:r.hole.settings.start,target:r.hole.settings.target,baseline:0,threshold:.27,history,route:[r.hole.settings.start],attempts:1,won:false,challenge_failed:true,challenge:{...r.settings().challenge,attempt:n},...extra});
assert.equal(r.qualification().tour.id,'competitive');
for(let n=1;n<=24;n++)r.record(state(n),'try-'+n,.9);
assert.equal(r.needsBoundaryConsent(state(25,[])),false,'25th attempt remains Competitive');
r.record(state(25),'try-25',.9);assert.equal(r.totalAttempts(),25);assert.equal(r.qualification().tour.id,'competitive');
assert.equal(r.needsBoundaryConsent(state(25)),false,'another shot in an existing attempt does not warn');
assert.equal(r.needsBoundaryConsent(state(26,[])),true,'warn before committing the 26th attempt');
assert.equal(r.totalAttempts(),25,'opening/cancelling the warning costs nothing');
r.acknowledgeBoundary();r=new CompetitiveCourse(scope,tourManifest,r.day);assert.equal(r.needsBoundaryConsent(state(26,[])),false,'consent survives refresh');
r.record(state(26,[{word:'old',assumed:true}]),'preview',.9);assert.equal(r.totalAttempts(),25);assert.equal(r.qualification().tour.id,'competitive','no cost for an assumed route');
r.record(state(26),'try-26',.9);assert.equal(r.qualification().tour.id,'social');assert.equal(r.store.socialDays[r.day],true);
r=new CompetitiveCourse(scope,tourManifest,r.day);assert.equal(r.qualification().tour.id,'social');assert.equal(r.needsBoundaryConsent(state(27,[])),false);
// Improvements after the boundary, not a frozen 25-attempt score, determine placement.
r.record(state(27,[{word:'pearl',success:true}],{won:true,challenge_failed:false,attempts:1}),'final-improvement',.9);
r.current.index=1;r.save();r.record(state(1),'other-hole',.9);assert.equal(r.totalAttempts(),28);
const day=r.day,lockedState=state(2);assert.equal(r.submit(),true);const s=structuredClone(r.store.submissions[day]);assert.equal(s.category,'social');assert.equal('tour' in s,false);assert.equal(s.totalAttempts,28);assert.equal(s.rows[0].strokes,1);assert.equal(s.eagles,1);assert.equal(s.rows.filter(h=>h.default).length,4);
assert.equal(r.submit(),false);r.record(lockedState,'locked',.9);assert.deepEqual(r.store.submissions[day],s);
const same=new CompetitiveCourse(scope,tourManifest,day);assert.deepEqual(same.store.submissions[day],s);assert.equal(same.playable(),false);
const tomorrow=new CompetitiveCourse(scope,tourManifest,tourManifest.courses[1].date);assert.equal(tomorrow.totalAttempts(),0);assert.equal(tomorrow.qualification().tour.id,'competitive');assert.deepEqual(tomorrow.store.submissions[day],s);
const original=new TourCourse(scopedStorage(storage,'three-tour-test.'),tourManifest,day);assert.equal(original.qualification().tour.id,'pro');assert.equal(original.totalAttempts(),0,'comparison mode progress is separate');
const entries=[
 {id:'strokes',date:day,category:'competitive',total:16,eagles:0,totalAttempts:25},
 {id:'eagles',date:day,category:'competitive',total:17,eagles:3,totalAttempts:25},
 {id:'attempts',date:day,category:'competitive',total:17,eagles:2,totalAttempts:20},
 {id:'tie',date:day,category:'competitive',total:17,eagles:2,totalAttempts:20},
 {id:'last',date:day,category:'competitive',total:17,eagles:2,totalAttempts:24},
 {id:'social',date:day,category:'social',total:1,eagles:5,totalAttempts:60},
 {id:'invalid-competitive',date:day,category:'competitive',total:1,eagles:5,totalAttempts:26},
 {id:'other-date',date:'2000-01-01',category:'competitive',total:1,eagles:5,totalAttempts:1}
];
const before=structuredClone(entries),ranked=competitiveStandings(entries,day);
assert.deepEqual(ranked.map(s=>s.id),['strokes','eagles','attempts','tie','last']);assert.deepEqual(ranked.map(s=>s.rank),[1,2,3,3,5]);assert.deepEqual(entries,before);
const candidate={...s,total:17,eagles:2,totalAttempts:63};assert.deepEqual(hypotheticalPlacement(candidate,entries),{rank:6,fieldSize:5});
assert.deepEqual(hypotheticalPlacement({...candidate,eagles:4},entries),{rank:2,fieldSize:5});
assert.equal(hypotheticalPlacement({...candidate,total:16,eagles:0,totalAttempts:25},entries).rank,1,'exact ties share rank');
assert.match(socialPlacementText({...candidate,total:17,eagles:3},entries),/3rd/);
assert.match(socialPlacementText(s,[]),/No Competitive submissions/);
for(const [n,text] of [[1,'1st'],[2,'2nd'],[3,'3rd'],[11,'11th'],[12,'12th'],[13,'13th'],[21,'21st']])assert.equal(ordinal(n),text);
for(const [n,cat,left] of [[0,'competitive',25],[24,'competitive',1],[25,'competitive',0],[26,'social',Infinity],[1000,'social',Infinity]]){assert.equal(competitiveStatus(n).tour.id,cat);assert.equal(competitiveStatus(n).left,left);}
assert.equal(competitiveStatus(2,true).tour.id,'social','the Social classification is sticky');
// Submitting at 25 is still official; never double-submits and defaults are double bogey.
const official=new CompetitiveCourse(scopedStorage(storage,'official.'),tourManifest,day);r=official;
for(let n=1;n<=25;n++)r.record(state(n),'official-'+n,.9);
assert.equal(r.submit(),true);const posted=r.store.submissions[day];assert.equal(posted.category,'competitive');assert.equal(posted.totalAttempts,25);assert.equal(competitiveStandings([posted,s],day).length,1);
const zero=new CompetitiveCourse(scopedStorage(storage,'zero-competitive.'),tourManifest,day);assert.equal(zero.submit(),true);assert.equal(zero.store.submissions[day].category,'competitive');assert.equal(zero.store.submissions[day].rows.every(h=>h.strokes===h.par+2),true);
const tabs=scopedStorage(storage,'competitive-tabs.'),tabA=new CompetitiveCourse(tabs,tourManifest,day),tabB=new CompetitiveCourse(tabs,tourManifest,day);tabA.submit();assert.equal(tabB.submit(),false);
console.log('Competitive/Social passed: 25/26 boundary, no-cost previews, sticky day category, unlimited Social improvements, final-score snapshots, independent mode storage, UTC rollover, submission lock, official-only leaderboard and hypothetical tie ranking.');
