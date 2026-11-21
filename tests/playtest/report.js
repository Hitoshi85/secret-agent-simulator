// Sums up the playtester's runs (tests/playtest/run.js) per mode and persona, checks Hitoshi's pacing
// targets (report only: met or missed, nothing fails) and writes the Markdown summary.

// Pacing targets Hitoshi chose on 2026-11-21 (REQUIREMENTS.md R23). Enforcing them is a later task.
const TARGETS = [
  { id: 'length', label: 'Case length, novice, median', want: '10–15 min', modes: ['dossier', 'compass'], value: (s) => s.novice.medianTime / 60, ok: (v) => v >= 10 && v <= 15, show: (v) => `${v.toFixed(1)} min` },
  { id: 'dead', label: 'Longest stretch with nothing new, novice, median', want: '45 s or less', modes: ['dossier', 'compass'], value: (s) => s.novice.medianNoInfo, ok: (v) => v <= 45, show: (v) => `${Math.round(v)} s` },
  { id: 'chase', label: 'Chase cleared within 2 tries, novice', want: '80% of seeds or more', modes: ['chase'], value: (s) => s.novice.within2, ok: (v) => v >= 80, show: (v) => `${Math.round(v)}%` },
  { id: 'firstTry', label: 'Seal questions right first try, novice', want: '60–80%', modes: ['compass'], value: (s) => s.novice.firstTry, ok: (v) => v >= 60 && v <= 80, show: (v) => `${Math.round(v)}%` },
];

const median = (a) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y), m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2; };
const pct = (a, q) => { if (!a.length) return 0; const s = [...a].sort((x, y) => x - y); return s[Math.min(s.length - 1, Math.floor(q * s.length))]; };
const mean = (a) => (a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0);
const r1 = (x) => Math.round(x * 10) / 10;

function summarise(runs) {
  const out = {};
  for (const run of runs) ((out[run.mode] ||= {})[run.persona] ||= []).push(run);
  for (const [mode, byPersona] of Object.entries(out)) for (const [persona, list] of Object.entries(byPersona)) {
    const times = list.map((r) => r.t), worst = list.reduce((a, b) => (b.longestNoInfo > a.longestNoInfo ? b : a), list[0]);
    const s = { runs: list.length, won: r1(100 * list.filter((r) => r.result === 'won').length / list.length), medianTime: r1(median(times)), p90Time: r1(pct(times, 0.9)),
      medianNoInfo: r1(median(list.map((r) => r.longestNoInfo))), worstNoInfo: { s: worst.longestNoInfo, seed: worst.seed, between: worst.longestNoInfoBetween } };
    if (mode === 'dossier') Object.assign(s, { wrongAccusations: r1(mean(list.map((r) => r.wrong))), clues: r1(mean(list.map((r) => r.clues))) });
    if (mode === 'compass') {
      const first = list.reduce((a, r) => a + r.first, 0), right = list.reduce((a, r) => a + r.firstRight, 0);
      Object.assign(s, { wrongAnswers: r1(mean(list.map((r) => r.wrong))), heat: r1(mean(list.map((r) => r.heat))), seals: r1(mean(list.map((r) => r.seals))), firstTry: first ? r1(100 * right / first) : 0 });
    }
    if (mode === 'chase') Object.assign(s, { retries: r1(mean(list.map((r) => r.retries))), within2: r1(100 * list.filter((r) => r.result === 'won' && r.tries <= 2).length / list.length),
      lowestSight: r1(median(list.map((r) => r.lowestSight)) * 100) / 100, crashes: r1(mean(list.flatMap((r) => r.perTry.map((p) => p.crashes)))) });
    byPersona[persona] = s;
  }
  out.targets = [];
  for (const T of TARGETS) for (const mode of T.modes) {
    if (!out[mode] || !out[mode].novice) continue;
    const v = T.value(out[mode]);
    out.targets.push({ id: T.id, mode, label: T.label, want: T.want, value: r1(v), shown: T.show(v), met: T.ok(v) });
  }
  return out;
}

const NAMES = { dossier: 'Case 01, The Dossier', compass: 'Case 02, The Compass Ledger', chase: 'The car chase' };
const mmss = (t) => `${Math.floor(t / 60)}:${String(Math.round(t % 60)).padStart(2, '0')}`;

function markdown(report) {
  const S = report.summary, L = [];
  L.push(`## AI playtest · ${report.commit}`, '', `${report.seeds} seeds per persona, ${report.seconds} s to run. Report only: nothing here fails the build. Times are simulated game time plus each persona's modelled reading and thinking time.`, '');
  if (S.targets.length) {
    L.push('### Pacing targets (report only)', '', '| Target | Mode | Want | Novice | |', '| --- | --- | --- | --- | --- |');
    for (const t of S.targets) L.push(`| ${t.label} | ${NAMES[t.mode]} | ${t.want} | ${t.shown} | ${t.met ? 'met' : '**missed**'} |`);
    L.push('');
  }
  for (const mode of ['dossier', 'compass', 'chase']) {
    const m = S[mode]; if (!m) continue;
    L.push(`### ${NAMES[mode]}`, '');
    if (mode === 'chase') {
      L.push('| Persona | Won | Cleared in ≤2 tries | Retries | Median time | Lowest In Sight | Longest out of sight (median / worst) | Crashes per try |', '| --- | --- | --- | --- | --- | --- | --- | --- |');
      for (const [p, s] of Object.entries(m)) L.push(`| ${p} | ${s.won}% | ${s.within2}% | ${s.retries} | ${mmss(s.medianTime)} | ${Math.round(s.lowestSight * 100)}% | ${s.medianNoInfo} s / ${s.worstNoInfo.s} s (seed ${s.worstNoInfo.seed}) | ${s.crashes} |`);
    } else {
      const extra = mode === 'dossier' ? ['Wrong accusations', 'Clues found'] : ['Wrong answers', 'First try right', 'Seals broken'];
      L.push(`| Persona | Won | Median time | 90th pct | Longest with nothing new (median / worst) | ${extra.join(' | ')} |`, `| --- | --- | --- | --- | --- | ${extra.map(() => '---').join(' | ')} |`);
      for (const [p, s] of Object.entries(m)) {
        const cols = mode === 'dossier' ? [s.wrongAccusations, `${s.clues} of 5`] : [s.wrongAnswers, `${s.firstTry}%`, `${s.seals} of 6`];
        L.push(`| ${p} | ${s.won}% | ${mmss(s.medianTime)} | ${mmss(s.p90Time)} | ${s.medianNoInfo} s / ${s.worstNoInfo.s} s (seed ${s.worstNoInfo.seed}, ${s.worstNoInfo.between.join(' to ')}) | ${cols.join(' | ')} |`);
      }
    }
    L.push('');
  }
  if (report.problems.length) L.push('### Problems', '', ...report.problems.slice(0, 20).map((p) => `- ${p}`), '');
  return L.join('\n');
}

// Runs in the page before the game loads: the game's Math.random, seeded per run (window.__reseed)
// so a seed always deals the same case, questions, traffic and road.
const SEEDED = () => {
  let s = 1;
  Math.random = () => { s = (s + 0x6D2B79F5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  window.__reseed = (n) => { s = n >>> 0; };
};

module.exports = { summarise, markdown, TARGETS, SEEDED };
