// All the game's sound, made in code with Web Audio (no audio files): the red car's engine note
// following its speed and gears, road and gravel under the tyres, the brake squeal, thumps on landing
// after a crest and on crashes, footsteps on stone, a short tension sting when Heat rises, and UI ticks.
// Mood: "Tuscan Noir" (Hitoshi's pick): plucked strings and a low bowed drone, wooden ticks; a quiet
// bed of it plays on the title, the case file and the chase cards, never while driving or walking.
// Nothing starts before the first tap or key (phone autoplay rules), and it stays silent and harmless
// when Web Audio is missing. Mute lives on the pause screen and is remembered on the phone.
// Budget: live nodes are counted, and a one-shot that would go over MAX_NODES is skipped.

export const MAX_NODES = 64;
const KEY = 'sas-muted';
const BED = [45, 52, 57, 60, 59, 52, 57, 64, 62, 53, 57, 60, 59, 52, 56, 59]; // the bed's arpeggio (MIDI notes), an original figure
const STEP = 60 / 84 / 2; // eighth notes at 84 bpm
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const GEARS = [0, 9, 17, 25, 33, 45]; // m/s where each gear ends: a small four-cylinder's shifts

const store = { get() { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }, set(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* private mode */ } } };

export function makeAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  const stats = { state: 'off', nodes: 0, peak: 0, skipped: 0, engineHz: 0, squeal: 0, rumble: 0, played: { step: 0, land: 0, crash: 0, sting: 0, tick: 0 } };
  const a = { stats, muted: store.get(), ctx: null };
  let bed = null, master = null, chaseBus = null, eng = null, noise = null, plucks = null, paused = false, lastCrashes = 0, lastWalked = 0;

  const live = (k) => { stats.nodes += k; stats.peak = Math.max(stats.peak, stats.nodes); };

  function build() {
    if (a.ctx || !AC) return;
    const ctx = a.ctx = new AC();
    // One noise buffer and two plucked-string notes, made once.
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    { const d = noise.getChannelData(0); let s = 7; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; } }
    plucks = [41.2, 82.4].map((f) => pluckBuffer(ctx, f));
    const comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.8; master.connect(comp);
    chaseBus = ctx.createGain(); chaseBus.gain.value = 0; chaseBus.connect(master);
    // The engine: a buzzy saw and a square an octave down, through a filter that opens with speed.
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), f = ctx.createBiquadFilter(), g = ctx.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; o2.detune.value = -8; f.type = 'lowpass'; f.Q.value = 2; g.gain.value = 0.12;
    o1.connect(f); o2.connect(f); f.connect(g); g.connect(chaseBus);
    // The tyres: a looped noise, low for road and gravel, a narrow band for the brake squeal.
    const n = ctx.createBufferSource(); n.buffer = noise; n.loop = true;
    const rf = ctx.createBiquadFilter(), rg = ctx.createGain(), sf = ctx.createBiquadFilter(), sg = ctx.createGain();
    rf.type = 'lowpass'; rf.frequency.value = 320; rg.gain.value = 0; sf.type = 'bandpass'; sf.frequency.value = 2700; sf.Q.value = 9; sg.gain.value = 0;
    n.connect(rf); rf.connect(rg); rg.connect(chaseBus); n.connect(sf); sf.connect(sg); sg.connect(chaseBus);
    o1.start(); o2.start(); n.start();
    eng = { o1, o2, f, g, rg, sg };
    live(13); // compressor, master, bus, 2 oscillators, filter, gain, noise, 2 filters, 2 gains, destination
    ctx.onstatechange = () => { stats.state = ctx.state; };
    stats.state = ctx.state;
  }

  // Karplus-Strong plucked string, computed into a buffer once.
  function pluckBuffer(ctx, f) {
    const n = Math.ceil(ctx.sampleRate * 1.6), b = ctx.createBuffer(1, n, ctx.sampleRate), d = b.getChannelData(0);
    const p = Math.round(ctx.sampleRate / f), line = new Float32Array(p); let s = 11;
    for (let i = 0; i < p; i++) { s = (s * 16807) % 2147483647; line[i] = s / 1073741823.5 - 1; }
    for (let i = 0, idx = 0; i < n; i++, idx = (idx + 1) % p) { const cur = line[idx]; line[idx] = 0.996 * (0.9 * cur + 0.05 * (cur + line[(idx + 1) % p])); d[i] = cur; }
    return b;
  }

  // One-shot voices: each counts its nodes until its source ends, and is skipped over the budget.
  function voice(k) {
    if (!a.ctx || a.muted || a.ctx.state !== 'running') return null;
    if (stats.nodes + k > MAX_NODES) { stats.skipped++; return null; }
    live(k); return a.ctx.currentTime;
  }
  const done = (src, k) => { src.onended = () => live(-k); };
  function env(g, t, att, peak, dec) { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + att); g.gain.exponentialRampToValueAtTime(0.0001, t + att + dec); }
  function hit(out, type, freq, q, att, dec, peak, delay = 0) { // filtered noise burst: 3 nodes
    const t = voice(3); if (t === null) return false;
    const s = a.ctx.createBufferSource(), f = a.ctx.createBiquadFilter(), g = a.ctx.createGain();
    s.buffer = noise; f.type = type; f.frequency.value = freq; f.Q.value = q; env(g, t + delay, att, peak, dec);
    s.connect(f); f.connect(g); g.connect(out); s.start(t + delay, Math.random() * 1.5); s.stop(t + delay + att + dec + 0.05); done(s, 3);
    return true;
  }
  function tone(out, type, from, to, att, dec, peak, delay = 0) { // a pitched blip or thud: 2 nodes
    const t = voice(2); if (t === null) return false;
    const o = a.ctx.createOscillator(), g = a.ctx.createGain(); o.type = type;
    o.frequency.setValueAtTime(from, t + delay); if (to !== from) o.frequency.exponentialRampToValueAtTime(to, t + delay + att + dec);
    env(g, t + delay, att, peak, dec); o.connect(g); g.connect(out); o.start(t + delay); o.stop(t + delay + att + dec + 0.05); done(o, 2);
    return true;
  }
  function pluck(out, k, peak, delay = 0) { // 2 nodes
    const t = voice(2); if (t === null) return false;
    const s = a.ctx.createBufferSource(), g = a.ctx.createGain(); s.buffer = plucks[k]; g.gain.value = peak;
    s.connect(g); g.connect(out); s.start(t + delay); done(s, 2); return true;
  }

  // The quiet bed: a drone and an echoing plucked arpeggio, built the first time it is wanted and
  // scheduled a little ahead from each frame.
  function buildBed() {
    const ctx = a.ctx, out = ctx.createGain(), dl = ctx.createDelay(1), lp = ctx.createBiquadFilter(), fb = ctx.createGain(), wet = ctx.createGain();
    out.gain.value = 0; out.connect(master); dl.delayTime.value = 0.36; lp.frequency.value = 2500; fb.gain.value = 0.3; wet.gain.value = 0.35;
    dl.connect(lp); lp.connect(fb); fb.connect(dl); lp.connect(wet); wet.connect(out);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), lfo = ctx.createOscillator(), lg = ctx.createGain(), df = ctx.createBiquadFilter(), dg = ctx.createGain();
    o1.type = o2.type = 'sawtooth'; o1.frequency.value = mtof(33); o2.frequency.value = mtof(45); lfo.frequency.value = 5; lg.gain.value = 3; df.frequency.value = 500; dg.gain.value = 0.035;
    lfo.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune); o1.connect(df); o2.connect(df); df.connect(dg); dg.connect(out);
    o1.start(); o2.start(); lfo.start(); live(11);
    const notes = {}; for (const m of new Set(BED)) notes[m] = pluckBuffer(ctx, mtof(m));
    bed = { out, dl, notes, i: 0, next: 0, on: false };
  }
  a.bed = (on) => {
    if (!a.ctx || a.muted || a.ctx.state !== 'running') return;
    on = on && !paused; stats.bed = on;
    if (!bed) { if (!on) return; buildBed(); }
    const t = a.ctx.currentTime;
    if (on !== bed.on) { bed.on = on; bed.out.gain.setTargetAtTime(on ? 0.5 : 0, t, on ? 0.6 : 0.15); if (on) bed.next = Math.max(bed.next, t + 0.05); }
    if (!on) return;
    if (bed.next < t) bed.next = t + 0.05; // after a long frame (loading the chase), skip the missed notes instead of catching up
    while (bed.next < t + 0.2) { // a pluck every eighth note, accent on each beat, some go through the echo
      const st = voice(2); if (st === null) { bed.next += STEP; continue; }
      const s = a.ctx.createBufferSource(), g = a.ctx.createGain(), at = Math.max(bed.next, st);
      s.buffer = bed.notes[BED[bed.i % BED.length]]; g.gain.setValueAtTime(bed.i % 4 ? 0.18 : 0.3, at); g.gain.setTargetAtTime(0.0001, at + 1.1, 0.1);
      s.connect(g); g.connect(bed.out); g.connect(bed.dl); s.start(at); s.stop(at + 1.5); done(s, 2);
      bed.i++; bed.next += STEP;
    }
  };

  // The first tap or key anywhere starts sound (when not muted).
  a.unlock = () => {
    if (a.muted) return;
    build();
    if (a.ctx && a.ctx.state === 'suspended' && !document.hidden) a.ctx.resume().catch(() => {});
  };

  a.setMuted = (on) => {
    a.muted = !!on; store.set(a.muted);
    if (a.muted) { if (a.ctx && a.ctx.state === 'running') a.ctx.suspend().catch(() => {}); }
    else a.unlock();
    return a.muted;
  };

  a.pause = (on) => {
    paused = on;
    if (chaseBus) chaseBus.gain.setTargetAtTime(0, a.ctx.currentTime, 0.05);
  };

  // Each frame of the chase (null when not driving): engine, tyres, brake, landings and crashes.
  a.chase = (c) => {
    if (!a.ctx || a.muted) return;
    const t = a.ctx.currentTime, p = c && c.status === 'driving' && !paused ? c.player : null;
    const count = c && c.status === 'count'; // engine idling through 3-2-1
    chaseBus.gain.setTargetAtTime(p || count ? 1 : 0, t, p || count ? 0.08 : 0.25);
    if (!p) { if (count) setEngine(0, t); eng.rg.gain.setTargetAtTime(0, t, 0.05); eng.sg.gain.setTargetAtTime(0, t, 0.03); stats.squeal = stats.rumble = 0; return; }
    setEngine(p.v, t, c.brake, p.air > 0.05);
    const off = Math.abs(p.d) > 3.6, v = Math.min(1, p.v / 35);
    stats.rumble = p.air > 0.05 ? 0 : (off ? 0.35 : 0.06) * v;
    stats.squeal = c.brake && p.v > 6 && p.air <= 0.05 ? 0.06 + 0.06 * v : 0;
    eng.rg.gain.setTargetAtTime(stats.rumble, t, 0.06);
    eng.sg.gain.setTargetAtTime(stats.squeal, t, 0.04);
    if (p.landed) { const k = Math.min(1, p.airTime / 0.6); tone(master, 'sine', 90, 34, 0.004, 0.32, 0.25 + 0.4 * k); hit(master, 'lowpass', 420, 1, 0.003, 0.18, 0.2 + 0.3 * k); stats.played.land++; }
    if (p.crashes !== lastCrashes) { if (p.crashes > lastCrashes) { hit(master, 'bandpass', 900, 0.8, 0.003, 0.45, 0.6); tone(master, 'sine', 70, 30, 0.004, 0.4, 0.5); stats.played.crash++; } lastCrashes = p.crashes; }
  };
  function setEngine(v, t, brake = false, flying = false) {
    let gear = 1; while (gear < GEARS.length - 1 && v > GEARS[gear]) gear++;
    const lo = GEARS[gear - 1], hi = GEARS[gear], r = Math.min(1, Math.max(0, (v - lo) / (hi - lo)));
    const hz = (flying ? 1.12 : 1) * (38 + gear * 4 + r * 95); // revs climb through each gear, drop at a shift, flare in the air
    stats.engineHz = hz;
    eng.o1.frequency.setTargetAtTime(hz, t, 0.04); eng.o2.frequency.setTargetAtTime(hz / 2, t, 0.04);
    eng.f.frequency.setTargetAtTime(280 + v * 28 + (brake ? -120 : 0), t, 0.06);
    eng.g.gain.setTargetAtTime(brake ? 0.07 : 0.12, t, 0.08);
  }

  // On foot: a heel on stone every stride, quicker and harder when running.
  a.walk = (agent) => {
    const stride = agent.running ? 1.3 : 0.8;
    if (agent.walked - lastWalked < stride) { if (agent.walked < lastWalked) lastWalked = agent.walked; return; }
    lastWalked = agent.walked;
    if (paused || !agent.walking) return;
    if (hit(master, 'bandpass', (agent.running ? 1500 : 1200) * (0.9 + Math.random() * 0.2), 3, 0.002, agent.running ? 0.06 : 0.05, agent.running ? 0.3 : 0.2)) stats.played.step++;
  };

  // Heat rose: low strings swelling into a sharp plucked pair and a low thud.
  a.sting = () => {
    if (!a.ctx) return;
    for (const f of [82.4, 87.3, 123.5]) tone(master, 'sawtooth', f, f, 0.35, 0.7, 0.05);
    pluck(master, 0, 0.5, 0.35); pluck(master, 1, 0.35, 0.35); tone(master, 'sine', 50, 40, 0.005, 0.5, 0.35, 0.35);
    stats.played.sting++;
  };

  // Buttons: a short wooden click.
  a.tick = () => { if (a.ctx && hit(master, 'bandpass', 1800, 8, 0.001, 0.05, 0.7)) stats.played.tick++; };

  for (const ev of ['pointerdown', 'keydown']) addEventListener(ev, a.unlock, { capture: true });
  document.addEventListener('visibilitychange', () => { if (!a.ctx || a.muted) return; if (document.hidden) a.ctx.suspend().catch(() => {}); else a.ctx.resume().catch(() => {}); });
  return a;
}
