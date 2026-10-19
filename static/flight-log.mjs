/** Device-local playtest history. No guesses are sent to a server. */
export const LOG_KEY = 'escape-velocity.flight-log.v1';
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
      this.warning = 'Saved logs could not be read. New attempts will be kept for this visit; download them before leaving.';
    }
  }
  get active() { return this.data.journeys.find(j => j.id === this.data.activeId); }
  save() {
    try {
      if (!this.storage || this.unreadableRaw) throw Error('Storage unavailable');
      this.storage.setItem(LOG_KEY, JSON.stringify(this.data));
      this.warning = '';
    } catch {
      this.warning = 'This browser could not save your log. Download it before leaving this page.';
    }
  }
  begin(state, model) {
    const timestamp = this.now();
    const journey = {id:this.makeId(), startedAt:timestamp, updatedAt:timestamp, rules:state.rules??RULES_VERSION, model, completion:'arrival-zone', state:structuredClone(state), entries:[]};
    this.data.journeys.push(journey);
    this.data.activeId = journey.id;
    this.save();
    return journey;
  }
  record(word, state, event = null, error = null) {
    const journey = this.active;
    if (!journey) throw Error('No active flight log');
    const timestamp = this.now();
    journey.completion ??= 'arrival-zone';
    journey.entries.push({submittedAt:timestamp, word, origin:event?.origin ?? state.current,
      chargedAttempt:!!event, completion:journey.completion, threshold:event?.required??state.threshold, arrival_threshold:state.threshold, event:structuredClone(event), error});
    journey.state = structuredClone(state);
    journey.updatedAt = timestamp;
    this.save();
  }
  exportJSON() { return JSON.stringify(this.unreadableRaw ? {...this.data, unreadableOriginal:this.unreadableRaw} : this.data, null, 2); }
}
export function outcome(entry) {
  if (!entry.event) return `Rejected: ${entry.error}`;
  if (entry.event.won) return entry.completion==='arrival-zone'?'Arrival zone reached — journey complete':'Arrived — free final hop';
  if (entry.event.success) return 'Landed';
  return entry.event.boundary ? 'Failed launch — not enough lift' : 'Failed launch — behind starting boundary';
}
export function journeyText(journey) {
  const s = journey.state;
  const lines = ['ESCAPE VELOCITY — flight log', `${s.start.toUpperCase()} → ${s.target.toUpperCase()}`,
    `Started: ${journey.startedAt}`, `Model: ${journey.model}`, `Rules: ${journey.rules}`,
    s.mode==='distance'?`Launch requirement: ${s.launch_min}–${s.launch_max}, scaled by trip length; arrival threshold: ${s.threshold}`:`Launch / arrival threshold: ${s.threshold}`, `Result: ${s.won ? 'Completed' : 'In progress'} · ${s.attempts} attempts`, ''];
  for (const entry of journey.entries) {
    const e = entry.event;
    lines.push(`${e ? `Attempt ${e.attempt}` : 'No attempt used'}: ${entry.origin} → ${entry.word}`,
      `  ${outcome(entry)} · ${entry.submittedAt}`);
    if (e) lines.push(`  Launch cosine: ${e.launch.toFixed(6)} / required ${e.required??entry.threshold}; destination cosine: ${e.destination.toFixed(6)}; arrival zone: ${e.inside ? 'yes' : 'no'}`);
  }
  lines.push('', `Successful route: ${s.route.join(' → ')}${s.won && journey.completion!=='arrival-zone' && s.route.at(-1) !== s.target ? ` → ${s.target} (free)` : ''}`);
  if(s.won&&journey.completion==='arrival-zone')lines.push(`Finished on ${s.current}, inside the ${s.target} arrival zone.`);
  return lines.join('\n');
}
