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
 return `<li class="bag-tip help-intro"><p>Find a word path from tee to flag!</p></li>
<li class="bag-tip"><h3>Hitting the ball</h3><p>The <strong>ball word</strong> is where you are. The word you play must connect with it strongly enough to hit.</p>${SHOT_EXAMPLES.map(example).join('')}</li>
<li class="bag-tip"><h3>Gaining distance</h3><p>The more strongly your played word relates to the <strong>target word</strong>, the further your ball will travel when it hits.</p></li>
<li class="bag-tip"><h3>Here’s the key</h3><p><strong>The longer the shot you are trying to hit, the stronger the connection to the ball word needs to be — otherwise it will be a miss!</strong> A smaller step can work with a weaker link and be useful as a set up shot.</p></li>
<li class="bag-tip"><h3>Negotiate the dogleg</h3><p>The dogleg word is your first target. Land inside its shaded area to switch your target to the flag.</p><p>You can play the dogleg word itself, or another word that lands in the area and sets you up for the flag.</p></li>
<li class="bag-tip"><h3>Tap a word to restart from there</h3><p><strong>Tap any earlier word you’ve landed on to try a different route from that lie.</strong> Tap the tee word to start over.</p><p>There are no attempt or stroke limits. Keep exploring, even after you’ve holed out.</p></li>
<li class="bag-tip"><h3>Your scores</h3><p>All holes are Par 5. Your <strong>fewest strokes</strong> and <strong>highest cleverness</strong> are saved.</p><p>Cleverness rewards interesting word connections and efficient routes, so your aim is not only the fewest strokes but also to show your cleverness!</p></li>`;
}
