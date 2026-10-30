/** Fixed teaching examples, checked against the production shot engine. */
export const SHOT_EXAMPLES=[
 {ball:'cat',played:'fur',target:'coat',hit:true},
 {ball:'cat',played:'jacket',target:'coat',hit:false}
];
export const DISTANCE_EXAMPLE={ball:'pencil',played:'paper',target:'library'};
function example({ball,played,target,hit}){
 const word=(role,text)=>`<div class="help-word"><span>${role}</span><strong>${text.toUpperCase()}</strong></div>`;
 const line=miss=>`<svg viewBox="0 0 28 24" aria-hidden="true" class="help-link${miss?' help-link-miss':''}">${miss?'<path d="M1 12h5m16 0h5M10 8l8 8m0-8-8 8"/>':'<path d="M1 12h24m-6-5 6 5-6 5"/>'}</svg>`;
 return `<figure class="help-example"><div class="help-diagram">${word('BALL WORD',ball)}${line(!hit)}${word('YOUR WORD',played)}${line(false)}${word('TARGET WORD',target)}</div><figcaption>${hit?'<strong>Hit.</strong> FUR connects to CAT and COAT, so the ball advances.':'<strong>Miss.</strong> JACKET connects to COAT, but its link to CAT is too weak for this shot.'}</figcaption></figure>`;
}
export function howToPlay(){
 return `<li class="bag-tip help-intro"><p>Find a word path from tee to flag!</p></li>
<li class="bag-tip"><h3>Hitting the ball</h3><p>The <strong>ball word</strong> is where you are. The word you play must connect with it strongly enough to hit.</p>${SHOT_EXAMPLES.map(example).join('')}</li>
<li class="bag-tip"><h3>Gaining distance</h3><p>The more strongly your played word relates to the <strong>target word</strong>, the further your ball will travel when it hits.</p>
<figure class="help-example"><div class="help-distance" aria-label="PENCIL to PAPER: a successful shot that stops short of LIBRARY"><span class="help-distance-word">PENCIL</span><span class="help-distance-hit" aria-hidden="true">→</span><span class="help-distance-word">PAPER</span><span class="help-distance-gap" aria-hidden="true"></span><span class="help-distance-target">LIBRARY</span></div><figcaption>PAPER connects well enough to PENCIL to hit, but it stops short of LIBRARY. You need another word to get there.</figcaption></figure>
<p>The longer the shot you are trying to hit, the stronger the connection to the ball word needs to be — otherwise it will be a miss! A smaller step can work with a weaker link and be useful as a set up shot.</p></li>
<li class="bag-tip"><h3>Negotiate the dogleg</h3><p>The dogleg word is your first target. Land inside its shaded area to switch your target to the flag.</p><p>You can play the dogleg word itself, or another word that lands in the area and sets you up for the flag.</p></li>
<li class="bag-tip"><h3>Tap a word to restart from there</h3><p>Tap any earlier word you’ve landed on to try a different route from that lie. Tap the tee word to start over.</p>
<figure class="help-example"><div class="help-retry-chain" aria-label="Example: tap an earlier lie">${['PENCIL','PAPER','BOOK'].map((word,i)=>`${i?'<span aria-hidden="true">→</span>':''}<button type="button" data-help-lie="${i}" aria-pressed="${i===2}">${word}</button>`).join('')}</div><figcaption class="help-retry-caption" aria-live="polite">Try tapping PAPER. You can play a different word from there.</figcaption></figure><p>There are no attempt or stroke limits. Keep exploring, even after you’ve holed out.</p></li>
<li class="bag-tip"><h3>Your scores</h3><p>All holes are Par 5. Your <strong>fewest strokes</strong> and <strong>highest cleverness</strong> are saved.</p><p>Cleverness rewards interesting word connections and efficient routes, so your aim is not only the fewest strokes but also to show your cleverness!</p></li>`;
}

/** An isolated teaching diagram: never changes the player's actual lie. */
export function selectHelpLie(container,index){
 const buttons=[...container.querySelectorAll('[data-help-lie]')];
 for(const button of buttons){const position=Number(button.dataset.helpLie);button.setAttribute('aria-pressed',String(position===index));button.classList.toggle('help-lie-ahead',position>index);}
 const word=buttons.find(button=>Number(button.dataset.helpLie)===index)?.textContent;
 if(word)container.querySelector('.help-retry-caption').textContent=`Now playing from ${word}. Try a different next word, or tap another lie.`;
}
