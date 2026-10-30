import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import {dailyManifest} from '../static/daily-manifest.mjs';
import {DailyGame} from '../static/daily-game.mjs';
import {retiredHoleWords,isRetiredHole} from '../static/hole-retirement.mjs';
const review=JSON.parse(fs.readFileSync('reports/hole-word-review-2026-10-31/review.json'));
const requested=[['scallop','rocket','barracuda'],['tuna','trading','harmonica'],['holly','preserves','scone'],['minnow','wicket','basket'],['toothpick','throne','galleon'],['keyhole','crystals','necktie'],['wren','architectural','pagoda']];
assert.deepEqual(review.newlyRetired,requested.map(w=>w.join('|')));
assert.deepEqual(retiredHoleWords.map(w=>w.join('|')),[...review.priorRetired,...review.newlyRetired],'Only the explicitly requested seven extend the existing retirement list');
assert.equal(crypto.createHash('sha256').update(JSON.stringify(dailyManifest.holes)).digest('hex'),review.manifestSha256,'Review does not rewrite archived definitions or IDs');
assert.equal(review.inventory.length,265);assert.equal(new Set(review.inventory.map(h=>h.id)).size,265);
const memory=new Map(),storage={getItem:k=>memory.get(k)??null,setItem:(k,v)=>memory.set(k,v)},game=new DailyGame(storage,dailyManifest,{today:()=> '2026-10-31'});
assert.equal(game.available().length,243);
for(const h of dailyManifest.holes){const row=review.inventory.find(r=>r.id===h.id);assert.ok(row);assert.deepEqual(row.words,[h.settings.start,h.settings.waypoint.word,h.settings.target]);
 const removed=['removed-as-requested','previously-retired'].includes(row.disposition);assert.equal(isRetiredHole(h),removed);
 if(['shortlist','watch'].includes(row.disposition)){assert.equal(removed,false,'Recommendations are not retirement instructions');assert.equal(game.definition(h.date),h,'Flagged hole remains playable');}
}
assert.equal(review.inventory.filter(h=>h.disposition==='shortlist').length,24);
assert.equal(review.inventory.filter(h=>h.disposition==='removed-as-requested').length,7);
const keep=dailyManifest.holes.find(h=>!isRetiredHole(h)),oldId=keep.id;game.visit(keep.date);assert.equal(game.current().id,oldId);
for(const words of requested){assert.ok(isRetiredHole({start:words[0].toUpperCase(),waypoint:{word:words[1].toUpperCase()},target:words[2].toUpperCase()}));assert.throws(()=>game.addCustom({start:words[0],waypoint:{word:words[1]},target:words[2]}),/retired/);}
console.log('Word-first review passed: all 265 definitions accounted for, exactly seven authorised removals, all recommendations still playable, 243 remaining holes and unchanged archived IDs/settings.');
