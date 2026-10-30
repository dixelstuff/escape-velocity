/** Fixed teaching examples, checked against the production shot engine. */
export const SHOT_EXAMPLES=[
 {ball:'cat',played:'fur',target:'coat',hit:true},
 {ball:'cat',played:'jacket',target:'coat',hit:false}
];
export const DISTANCE_EXAMPLES=[
 {ball:'pen',played:'paper',target:'library',hit:true,landing:.35,caption:'Shorter hit. PAPER connects to PEN, but its link to LIBRARY takes the ball only part of the way.'},
 {ball:'pen',played:'book',target:'library',hit:true,landing:.78,caption:'Longer hit. BOOK connects more strongly to LIBRARY, and its link to PEN is strong enough for this longer shot.'},
 {ball:'pen',played:'shelf',target:'library',hit:false,landing:.68,caption:'Miss. SHELF relates to LIBRARY, but its link to PEN is too weak to hit the ball.'}
];
function distanceExamples(){return `<figure class="help-example help-shot-comparison"><div class="help-distance-roles"><span>BALL WORD</span><span>TARGET WORD</span></div>${DISTANCE_EXAMPLES.map(x=>`<div class="help-distance-option${x.hit?'':' help-distance-miss'}"><div class="help-distance-row" style="--landing:${x.landing}"><span class="help-distance-origin">${x.ball.toUpperCase()}</span><span class="help-distance-lane" aria-hidden="true"><span class="help-distance-flight"></span><span class="help-distance-played">${x.played.toUpperCase()}</span><span class="help-distance-mark">${x.hit?'●':'×'}</span></span><span class="help-distance-target">${x.target.toUpperCase()}</span></div><p>${x.caption}</p></div>`).join('')}<figcaption>Each shot starts from PEN and aims for LIBRARY.</figcaption></figure>`;}
const teachingBall='<svg class="help-ball" viewBox="0 0 20 20" aria-hidden="true"><circle cx="10" cy="10" r="8"/><path d="M7 7h.1m5-1h.1m-3 5h.1m5 1h.1m-7 2h.1"/></svg>';
const teachingHand='<svg class="help-hand" viewBox="0 0 24 24" aria-hidden="true"><g transform="rotate(180 12 12)"><path d="M9 12V4a2 2 0 0 1 4 0v6l1-1a2 2 0 0 1 3 1 2 2 0 0 1 3 2v4c0 4-3 6-6 6h-2c-2 0-3-1-4-3l-4-5a2 2 0 0 1 3-2l2 2"/></g></svg>';
function retryExample(){return `<figure class="help-example help-retry-example">${[2,1].map((active,row)=>`<div class="help-retry-step"><span class="help-retry-step-title">${row?'Continue from PAPER':'Tap PAPER'}</span><div class="help-retry-chain">${['PEN','PAPER','BOOK'].map((word,i)=>`${i?'<span class="help-retry-arrow" aria-hidden="true">→</span>':''}<span class="help-retry-lie${i===active?' help-lie-active':''}${row&&i>active?' help-lie-ahead':''}"><span class="help-retry-marker">${i===active?teachingBall:!row&&i===1?teachingHand:''}</span><span class="help-retry-word">${word}</span></span>`).join('')}</div></div>`).join('')}<figcaption>The ball returns to PAPER, which becomes your ball word. Try a different next word from there.</figcaption></figure>`;}
function example({ball,played,target,hit}){
 const word=(role,text)=>`<div class="help-word"><span>${role}</span><strong>${text.toUpperCase()}</strong></div>`;
 const line=miss=>`<svg viewBox="0 0 28 24" aria-hidden="true" class="help-link${miss?' help-link-miss':''}">${miss?'<path d="M1 12h5m16 0h5M10 8l8 8m0-8-8 8"/>':'<path d="M1 12h24m-6-5 6 5-6 5"/>'}</svg>`;
 return `<figure class="help-example"><div class="help-diagram">${word('BALL WORD',ball)}${line(!hit)}${word('YOUR WORD',played)}${line(false)}${word('TARGET WORD',target)}</div><figcaption>${hit?'<strong>Hit.</strong> FUR connects to CAT and COAT, so the ball advances.':'<strong>Miss.</strong> JACKET connects to COAT, but its link to CAT is too weak for this shot.'}</figcaption></figure>`;
}
export function howToPlay(){
 return `<li class="bag-tip help-intro"><p>Find a word path from tee to flag!</p></li>
<li class="bag-tip"><h3>Hitting the ball</h3><p>The <strong>ball word</strong> is where you are. The word you play must connect with it strongly enough to hit.</p>${SHOT_EXAMPLES.map(example).join('')}</li>
<li class="bag-tip"><h3>Gaining distance</h3><p>The more strongly your played word relates to the <strong>target word</strong>, the further your ball will travel when it hits.</p>
${distanceExamples()}
<p>The longer the shot you are trying to hit, the stronger the connection to the ball word needs to be — otherwise it will be a miss! A smaller step can work with a weaker link and be useful as a set up shot.</p></li>
<li class="bag-tip"><h3>Negotiate the dogleg</h3><p>The dogleg word is your first target. Land inside its shaded area to switch your target to the flag.</p><p>You can play the dogleg word itself, or another word that lands in the area and sets you up for the flag.</p></li>
<li class="bag-tip"><h3>Tap a word to restart from there</h3><p>Tap any earlier word you’ve landed on to try a different route from that lie. Tap the tee word to start over.</p>
${retryExample()}<p>There are no attempt or stroke limits. Keep exploring, even after you’ve holed out.</p></li>
<li class="bag-tip"><h3>Your scores</h3><p>All holes are Par 5. Your <strong>fewest strokes</strong> and <strong>highest cleverness</strong> are saved.</p><p>Cleverness rewards interesting word connections and efficient routes, so your aim is not only the fewest strokes but also to show your cleverness!</p></li>`;
}
