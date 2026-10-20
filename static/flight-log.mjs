/** Device-local playtest history. No guesses are sent to a server. */
export const LOG_KEY = 'escape-velocity.flight-log.v1';
export const RESET_BACKUP_KEY = 'escape-velocity.flight-log.reset-backup.v1';
export const RULES_VERSION = 'fixed-threshold-v1';
export class FlightLog {
  constructor(storage, now = () => new Date().toISOString(), makeId = () => crypto.randomUUID()) {
    this.storage = storage;
    this.now = now;
    this.makeId = makeId;
    this.warning = '';
    this.data = {version:1, activeId:null, journeys:[]};
    let raw;
    try {
      raw = storage?.getItem(LOG_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.version !== 1 || !Array.isArray(parsed.journeys) || !parsed.journeys.every(j => typeof j.id === 'string' && j.state && Array.isArray(j.entries))) throw Error('Invalid saved log');
        this.data = parsed;
      }
    } catch {
      this.unreadableRaw = raw;
      this.warning = 'Saved scorecards could not be read. New shots will be kept for this visit; download them before leaving.';
    }
    try {
      const backup=JSON.parse(storage?.getItem(RESET_BACKUP_KEY)||'null');
      if(backup?.version===1&&Array.isArray(backup.journeys)&&backup.journeys.every(j=>typeof j.id==='string'&&j.state&&Array.isArray(j.entries)))this.backup=backup;
    }catch{}
  }
  get active() { return this.data.journeys.find(j => j.id === this.data.activeId); }
  save() {
    try {
      if (!this.storage || this.unreadableRaw) throw Error('Storage unavailable');
      this.storage.setItem(LOG_KEY, JSON.stringify(this.data));
      this.warning = '';
    } catch {
      this.warning = 'This browser could not save your scorecard. Download it before leaving this page.';
    }
  }
  makeJourney(state, model) {
    const timestamp = this.now();
    return {id:this.makeId(), startedAt:timestamp, updatedAt:timestamp, rules:state.rules??RULES_VERSION, model, completion:state.automatic_shots?'holed-with-auto-finish':'arrival-zone', state:structuredClone(state), entries:[]};
  }
  begin(state, model) {
    const journey = this.makeJourney(state,model);
    this.data.journeys.push(journey);
    this.data.activeId = journey.id;
    this.save();
    return journey;
  }
  reset(state,model) {
    const journey=this.makeJourney(state,model);
    const next={version:1,activeId:journey.id,batchStartedAt:journey.startedAt,journeys:[journey]};
    const backup=JSON.parse(this.exportJSON());
    let previousBackup,wroteBackup=false;
    try {
      if(!this.storage)throw Error('Storage unavailable');
      previousBackup=this.storage.getItem(RESET_BACKUP_KEY);
      this.storage.setItem(RESET_BACKUP_KEY,JSON.stringify(backup));wroteBackup=true;
      this.storage.setItem(LOG_KEY,JSON.stringify(next));
    }catch{
      try{if(wroteBackup)this.storage.setItem(RESET_BACKUP_KEY,previousBackup||'null');}catch{}
      throw Error('Could not safely reset scorecards. Your current scorecards are unchanged. Download them first or check browser storage.');
    }
    this.data=next;this.backup=backup;this.unreadableRaw=undefined;this.warning='';
    return journey;
  }
  restorePrevious() {
    if(!this.backup?.journeys?.length)return false;
    const currentIds=new Set(this.data.journeys.map(j=>j.id));
    // Keep rounds played since the reset too; restoring must not discard new play.
    const next={...this.data,...(this.backup.unreadableOriginal?{unreadableOriginal:this.backup.unreadableOriginal}:{}),journeys:[...this.backup.journeys.filter(j=>!currentIds.has(j.id)),...this.data.journeys]};
    try{if(!this.storage)throw Error('Storage unavailable');this.storage.setItem(LOG_KEY,JSON.stringify(next));}
    catch{throw Error('Could not restore previous scorecards. Your current scorecards are unchanged.');}
    this.data=next;this.backup=null;this.warning='';
    try{this.storage.setItem(RESET_BACKUP_KEY,'null');}catch{}
    return true;
  }
  record(word, state, event = null, error = null) {
    const journey = this.active;
    if (!journey) throw Error('No active scorecard');
    const timestamp = this.now();
    journey.completion ??= 'arrival-zone';
    journey.entries.push({submittedAt:timestamp, word, origin:event?.origin ?? state.current,
      chargedAttempt:!!event, completion:journey.completion, threshold:event?.required??state.threshold, arrival_threshold:state.threshold, event:structuredClone(event), error});
    if(event?.automatic_shot){
      journey.entries.push({submittedAt:timestamp,word:event.automatic_shot.word,origin:event.automatic_shot.origin,chargedAttempt:true,completion:journey.completion,event:structuredClone(event.automatic_shot),error:null});
    }
    journey.state = structuredClone(state);
    journey.updatedAt = timestamp;
    this.save();
  }
  exportJSON() { return JSON.stringify(this.unreadableRaw ? {...this.data, unreadableOriginal:this.unreadableRaw} : this.data, null, 2); }
}
export function outcome(entry) {
  if(!entry.event)return `Unscored: ${entry.error}`;
  const e=entry.event;
  if(e.automatic)return 'Automatic finish — one shot counted';
  if(e.outcome==='backtrack')return 'Backtrack — previous lie revisited';
  if(entry.completion==='holed-with-auto-finish'&&e.won)return e.automatic_shot?'Green reached — automatic finish follows':'Holed directly';
  if(e.outcome==='water')return 'Water hazard — ball returned';
  if(e.outcome==='miss')return 'Miss — ball stayed put';
  if(e.outcome==='recovery')return 'Recovery shot — ball landed';
  if(e.won)return entry.completion==='arrival-zone'?'On the green — hole complete':'Green reached — old final tap-in';
  if(e.success)return 'Ball landed';
  if(e.forward===false)return 'Backward shot stopped — previous rules';
  return e.boundary?'Miss — not enough connection':'Outside previous course boundary';
}

export function journeyText(journey) {
  const s = journey.state;
  const lines = ['WORD GOLF — scorecard', `${s.start.toUpperCase()} → ${s.target.toUpperCase()}`,
    `Started: ${journey.startedAt}`, `Model: ${journey.model}`, `Rules: ${journey.rules}`,
    s.mode==='distance'?`Shot strength: ${s.launch_min}–${s.launch_max}, scaled by trip length; green threshold: ${s.threshold}`:`Shot / green threshold: ${s.threshold}`, `Result: ${s.won ? 'Completed' : 'In progress'} · ${s.attempts} shots`, ''];
  if(['distance-v3','golf-distance-v1','golf-distance-v2'].includes(s.rules))lines.push('Finishing shots measure only to the green edge.', '');
  for (const entry of journey.entries) {
    const e = entry.event;
    lines.push(`${e ? `Shot ${e.attempt}` : 'No shot used'}: ${entry.origin} → ${entry.word}`,
      `  ${outcome(entry)} · ${entry.submittedAt}`);
    if (e && !e.automatic) lines.push(`  Contact cosine: ${e.launch.toFixed(6)} / required ${e.required??entry.threshold}; destination cosine: ${e.destination.toFixed(6)}; green: ${e.inside ? 'yes' : 'no'}`);
  }
  lines.push('', `Played lies: ${s.route.join(' → ')}${s.won && !['arrival-zone','holed-with-auto-finish'].includes(journey.completion) && s.route.at(-1) !== s.target ? ` → ${s.target} (free)` : ''}`);
  if(s.won&&journey.completion==='holed-with-auto-finish')lines.push(`Holed in ${s.attempts} shots${s.automatic_shots?.length?' (includes one automatic finishing shot)':''}.`);
  if(s.won&&journey.completion==='arrival-zone')lines.push(`Finished on ${s.current}, on the ${s.target} green.`);
  return lines.join('\n');
}
