/** Fixed teaching examples, checked against the production shot engine. */
export const SHOT_EXAMPLES=[
 {ball:'cat',played:'fur',target:'coat',hit:true},
 {ball:'cat',played:'jacket',target:'coat',hit:false}
];
function example({ball,played,target,hit}){
 const word=(role,text)=>`<div class="help-word"><span>${role}</span><strong>${text.toUpperCase()}</strong></div>`;
 const line=miss=>`<svg viewBox="0 0 28 24" aria-hidden="true" class="help-link${miss?' help-link-miss':''}">${miss?'<path d="M1 12h5m16 0h5M10 8l8 8m0-8-8 8"/>':'<path d="M1 12h24m-6-5 6 5-6 5"/>'}</svg>`;
 return `<figure class="help-example"><div class="help-diagram">${word('BALL WORD',ball)}${line(!hit)}${word('YOUR WORD',played)}${line(false)}${word('TARGET WORD',target)}</div><figcaption>${hit?'<strong>Hit.</strong> FUR connects to CAT and COAT, so the ball advances.':'<strong>Miss.</strong> JACKET connects to COAT, but its link to CAT is too weak for this shot.'}</figcaption></figure>`;
}
export function howToPlay(){
 return `<li class="bag-tip help-intro"><p>Find a word path from the tee to the flag, via the dogleg.</p></li>
<li class="bag-tip"><h3>Connect to hit</h3><p>The <strong>ball word</strong> is where you are. Your next word must connect strongly enough to it for the shot to hit.</p>${SHOT_EXAMPLES.map(example).join('')}</li>
<li class="bag-tip"><h3>Connect to advance</h3><p>The more your word relates to the <strong>target word</strong>, the further the ball advances.</p><p>Longer shots also need a stronger link to the ball word. A shorter step can work with a weaker link and be useful as a <strong>set up shot</strong>.</p></li>
<li class="bag-tip"><h3>Reach the dogleg, then the flag</h3><p>The dogleg word is your first target. Land inside its shaded area to switch your target to the flag.</p><p>You can play the dogleg word itself, or another word that lands in the area and sets you up for the flag.</p></li>
<li class="bag-tip"><h3>Try a different route</h3><p>A miss ends that attempt. Try another word from your last lie, or <strong>tap any word you’ve landed on</strong> to restart from there. Tap the tee word to start over.</p><p>There are no attempt or stroke limits. Keep exploring, even after you’ve holed out.</p></li>
<li class="bag-tip"><h3>Your scores</h3><p>Every hole is Par 5: 3 strokes is an eagle, 4 a birdie, and 5 a par. An automatic finish adds one stroke.</p><p>Your fewest strokes and highest <strong>Cleverness</strong> are saved. They can come from different routes. Misses from earlier attempts don’t add to your completed route’s strokes.</p></li>`;
}
