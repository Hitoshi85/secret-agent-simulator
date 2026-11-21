// The session's key events, kept in memory only (no network, no storage, no analytics). The
// Feedback button adds a summary and the last few events to the prefilled GitHub issue, so a
// playtest arrives as data. game.js calls watch() after every step; it only compares a few numbers.
const MAX = 200;   // events kept; the oldest drop off
const RECENT = 10; // events shown in the feedback issue
export const URL_LIMIT = 8000; // GitHub's new-issue link stops working somewhere past this many characters

const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.floor(t % 60)).padStart(2, '0')}`;

export function makeSessionLog() {
  const log = {
    events: [], // { t: seconds played (pauses not counted), kind, text }
    t: 0,
    case: { started: false, start: 0, lastClue: null, accusations: 0 },
    chase: { retries: 0, losses: 0 },
    seen: { state: null, area: null, found: 0, heat: 0, status: null, chaseStatus: null, chase: null, c: null },
  };
  log.add = (kind, text = '') => { log.events.push({ t: log.t, kind, text }); if (log.events.length > MAX) log.events.shift(); };

  // Clues found so far and how many the case has: dossier clues, or broken seals in a seal case.
  log.found = (c) => { if (!c.seals) return c.found.length; let n = 0; for (const x of c.seals) if (x.broken) n++; return n; };
  log.total = (c) => (c.seals ? c.seals.length : c.def.clues.length);

  // Turns changes in the game's state into events. Cheap enough for every frame: it compares a
  // few numbers and allocates only when something happened.
  log.watch = ({ state, c, chase, clock }, dt = 0) => {
    const s = log.seen; log.t += dt;
    if (state.state !== s.state) { log.add('mode', state.state); s.state = state.state; if (state.state === 'playing') log.caseStarted(clock); }
    if (state.state === 'playing' && state.area && state.area !== s.area) { log.add('at', state.area); s.area = state.area; }
    if (chase && state.state === 'chase') {
      if (chase.status !== s.chaseStatus) {
        if (chase.status === 'lost') { log.chase.losses++; log.add('chase', 'lost him'); }
        else if (s.chaseStatus === 'lost' && chase.status === 'card') { log.chase.retries++; log.add('chase', 'retry'); }
        else if (chase.status === 'driving' || chase.status === 'done') log.add('chase', chase.status);
        s.chaseStatus = chase.status;
      }
    }
    if (!c) return;
    if (c !== s.c) { s.c = c; s.found = log.found(c); s.heat = c.heat; s.status = c.status; } // a new play (Again)
    const found = log.found(c);
    if (found > s.found) { log.case.lastClue = clock; log.add('clue', `${found}/${log.total(c)}`); }
    s.found = found;
    if (c.heat !== s.heat) { log.add('heat', `${c.heat}/${c.def.maxHeat}`); s.heat = c.heat; }
    if (c.status !== s.status) { log.add('case', c.status); s.status = c.status; }
  };
  log.caseStarted = (clock) => { log.case.started = true; log.case.start = clock; log.case.lastClue = null; log.case.accusations = 0; };
  log.accused = (who, result) => { log.case.accusations++; log.add('accuse', `suspect ${who + 1}: ${result}`); };

  // The lines for the feedback issue's Game context.
  log.summary = ({ state, c, chase, clock, def }) => {
    const lines = [];
    if (state.state === 'chase' && chase) lines.push(`Mode: chase, stage ${chase.stage + 1}, ${chase.status}${state.paused ? ' (paused)' : ''}`);
    else lines.push(`Mode: ${state.state === 'playing' ? 'case' : state.state}${state.paused ? ' (paused)' : ''}`);
    lines.push(`Chase: ${log.chase.retries} retries, lost him ${log.chase.losses} times`);
    if (c && log.case.started) {
      const found = log.found(c), total = log.total(c), inCase = clock - log.case.start;
      const since = log.case.lastClue === null ? `none yet (${mmss(inCase)} in)` : mmss(clock - log.case.lastClue);
      lines.push(`Case ${def.id}: ${c.status}, ${mmss(inCase)} in case`);
      lines.push(`Clues: ${found} of ${total} · Accusations: ${log.case.accusations} · Heat: ${c.heat} of ${c.def.maxHeat}`);
      lines.push(`Since last new clue: ${since}`);
    }
    return lines;
  };
  log.recent = (n = RECENT) => log.events.slice(-n).map((e) => `${mmss(e.t)} ${e.kind}${e.text ? ': ' + e.text : ''}`);
  return log;
}

// The prefilled feedback issue's link. Drops the oldest recent events, then trims the user agent,
// until the link fits GitHub's limit.
export function feedbackUrl(repo, context, recent, device) {
  const build = (ev, dev) => {
    const u = new URL(`${repo}/issues/new`);
    u.searchParams.set('template', 'feedback.yml'); u.searchParams.set('labels', 'feedback');
    u.searchParams.set('context', ev.length ? `${context.join('\n')}\n\nLast events:\n${ev.join('\n')}` : context.join('\n'));
    u.searchParams.set('device', dev);
    return u.href;
  };
  let ev = recent.slice(), dev = device, href = build(ev, dev);
  while (href.length > URL_LIMIT && ev.length) { ev.shift(); href = build(ev, dev); }
  if (href.length > URL_LIMIT) { dev = dev.slice(0, Math.max(0, dev.length - (href.length - URL_LIMIT) - 10)); href = build(ev, dev); }
  return href;
}
