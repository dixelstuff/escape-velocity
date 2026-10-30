/** Curated spelling equivalence, not stemming, plural rescue, or fuzzy matching. */
export const SPELLING_EQUIVALENCE='uk-us-v1';
const pairs=[];
const add=(us,uk)=>pairs.push([us,uk]);
const nouns=`color colour
favor favour
flavor flavour
honor honour
humor humour
labor labour
neighbor neighbour
behavior behaviour
rumor rumour
harbor harbour
odor odour
vapor vapour
savior saviour
splendor splendour
candor candour
rigor rigour
rancor rancour
demeanor demeanour
armor armour
center centre
theater theatre
fiber fibre
caliber calibre
liter litre
kilometer kilometre
centimeter centimetre
millimeter millimetre
luster lustre
scepter sceptre
specter spectre
saber sabre
goiter goitre
mold mould
jeweler jeweller
jewelry jewellery
aluminum aluminium
artifact artefact
airplane aeroplane
gray grey
pajama pyjama
pajamas pyjamas
mustache moustache
donut doughnut
omelet omelette
sulfur sulphur
estrogen oestrogen
esophagus oesophagus
fetus foetus
maneuver manoeuvre
plow plough
skeptic sceptic
anesthesia anaesthesia
anesthetic anaesthetic
edema oedema
hemoglobin haemoglobin
leukemia leukaemia
encyclopedia encyclopaedia
diarrhea diarrhoea
feces faeces
pediatric paediatric
pediatrics paediatrics
orthopedic orthopaedic
orthopedics orthopaedics
gynecology gynaecology
gynecologist gynaecologist`.split('\n').map(row=>row.split(' '));
for(const [us,uk] of nouns){add(us,uk);if(!us.endsWith('s'))add(us+'s',uk+'s');}
for(const [us,uk]of `meager meagre
somber sombre
sizable sizeable
aging ageing
cozy cosy
cozier cosier
coziest cosiest
coziness cosiness
cozily cosily
molt moult
molts moults
molted moulted
molting moulting`.split('\n').map(row=>row.split(' ')))add(us,uk);
for(const [us,uk]of nouns.filter(([us])=>['color','favor','flavor','honor','humor','labor','neighbor','harbor','armor','center','gray','mold','maneuver','plow'].includes(us))){
 const stem=w=>w.endsWith('e')?w.slice(0,-1):w;
 add(us+(us.endsWith('e')?'d':'ed'),uk+(uk.endsWith('e')?'d':'ed'));add(stem(us)+'ing',stem(uk)+'ing');
}
for(const [us,uk,forms]of [
 ['color','colour',['ful','fully','less','lessness','ation','ations']],
 ['favor','favour',['able','ably','ite','ites','itism']],
 ['honor','honour',['able','ably']],
 ['odor','odour',['less']],['humor','humour',['less']],['flavor','flavour',['less']],['armor','armour',['er','ers']],['labor','labour',['er','ers']],['neighbor','neighbour',['hood','hoods','ly']],['behavior','behaviour',['al','ally','ist','ists','ism']],
 ['skeptic','sceptic',['al','ally','ism']],['sulfur','sulphur',['ic','ous']],
 ['anesthetic','anaesthetic',['s']],['pediatric','paediatric',['ian','ians']],
 ['travel','travel',['ed','ing','er','ers']],['cancel','cancel',['ed','ing']],
 ['label','label',['ed','ing','er','ers']],['model','model',['ed','ing','er','ers']],
 ['marvel','marvel',['ed','ing','ous','ously']],['jewel','jewel',['ed']],
 ['fuel','fuel',['ed','ing']],['dial','dial',['ed','ing']],
 ['counsel','counsel',['ed','ing','or','ors']],['equal','equal',['ed','ing']],['signal','signal',['ed','ing']],
 ['fulfill','fulfil',['','s','ment','ments']],['enroll','enrol',['','s','ment','ments']],
 ['skillful','skilful',['','ly']],['willful','wilful',['','ly']],
 ['installment','instalment',['','s']],['fulfillment','fulfilment',['','s']],
 ['defense','defence',['','s']],['offense','offence',['','s']],['pretense','pretence',['','s']]
])for(const suffix of forms)add(us+suffix,uk+(us===uk?'l':'')+suffix);
const verbs=`organize recognise realize recognize apologize authorize categorize characterize civilize colonize criticize emphasize fertilize generalize harmonize humanize idealize initialize legalize localize maximize memorize minimize mobilize modernize normalize optimize organize patronize personalize polarize popularize prioritize publicize rationalize reorganize scrutinize socialize specialize standardize sterilize summarize symbolize sympathize synchronize terrorize utilize visualize`.split(' ').filter(w=>w.endsWith('ize'));
for(const us of new Set(verbs)){
 const uk=us.slice(0,-3)+'ise';add(us,uk);for(const suffix of ['s','d'])add(us+suffix,uk+suffix);add(us.slice(0,-1)+'ing',uk.slice(0,-1)+'ing');
 for(const suffix of ['er','ers','ation','ations','ational','able'])add(us.slice(0,-1)+suffix,uk.slice(0,-1)+suffix);
}
for(const [us,uk]of [['analyze','analyse'],['paralyze','paralyse'],['catalyze','catalyse']]){add(us,uk);add(us+'s',uk+'s');add(us+'d',uk+'d');add(us.slice(0,-1)+'ing',uk.slice(0,-1)+'ing');}
// Sense-changing pairs (e.g. check/cheque, tire/tyre, story/storey, curb/kerb,
// meter/metre and draft/draught) are intentionally not interchangeable.
export const spellingPairs=Object.freeze(pairs.map(p=>Object.freeze(p)));
const identities=new Map(spellingPairs.flatMap(([us,uk])=>[[us,us],[uk,us]]));
export const spellingIdentity=word=>identities.get(word)??word;
export const stateSpelling=(state,word)=>state?.spelling_equivalence===SPELLING_EQUIVALENCE?spellingIdentity(word):word;
const models=new WeakMap();
export function spellingResolver(e){
 if(models.has(e))return models.get(e);
 const aliases=new Map();
 for(const [us,uk]of spellingPairs){const canonical=e.index.has(us)?us:e.index.has(uk)?uk:null;if(canonical){aliases.set(us,canonical);aliases.set(uk,canonical);}}
 const resolve=word=>aliases.get(word)??word;const index={get:word=>e.index.get(resolve(word)),has:word=>e.index.has(resolve(word)),size:e.index.size};
 for(const key of ['keys','values','entries','forEach',Symbol.iterator])index[key]=e.index[key].bind(e.index);
 const model=Object.create(e);Object.assign(model,{index,spelling_equivalence:SPELLING_EQUIVALENCE,resolveSpelling:resolve,cosine:(a,b)=>e.cosine(resolve(a),resolve(b)),hub:w=>e.hub?.(resolve(w))??0});
 const result={resolve,model,aliases};models.set(e,result);models.set(model,result);return result;
}
export function canonicalSpellingState(state,e){
 const out=structuredClone(state);if(state.spelling_equivalence!==SPELLING_EQUIVALENCE)return out;
 const {resolve}=spellingResolver(e),wordKeys=new Set(['start','current','target','final_target','leg_start','word','origin','leg_target','scoring_word']);
 function visit(value,key){if(typeof value==='string')return wordKeys.has(key)||key==='route'||key==='golden_paths'?resolve(value):value;if(Array.isArray(value))return value.map(v=>visit(v,key));if(value&&typeof value==='object')for(const k of Object.keys(value))value[k]=visit(value[k],k);return value;}
 return visit(out);
}
