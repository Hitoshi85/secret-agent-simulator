// All the game's sound, made in code with Web Audio (no audio files): the red car as a soft hybrid (an
// electric whine following its speed, a quiet petrol hum under load), road and gravel under the tyres,
// tyre scrub on hard braking, thumps on landing after a crest and on crashes, footsteps on stone, a short
// piano sting when Heat rises, and UI ticks. Slow piano jazz plays all the time (Hitoshi's pick,
// 2026-11-21), softer under the car and on foot in Florence so the engine and footsteps come through.
// Nothing starts before the first tap or key (phone autoplay rules), and it stays silent and harmless
// when Web Audio is missing. Mute lives on the pause screen and is remembered on the phone.
// Budget: live nodes are counted, and a one-shot that would go over MAX_NODES is skipped.

export const MAX_NODES = 96;
const KEY = 'sas-muted';
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
// The red car: a small four-cylinder, five gears. rpm = speed (m/s) x ratio; it shifts up near the
// redline and down when the revs sag. A four-stroke four fires twice a revolution: firing Hz = rpm / 30.
const RATIO = [0, 260, 165, 120, 95, 78], IDLE = 850, SHIFT_UP = 6300, SHIFT_DOWN = 2600;
// The car as a hybrid heard from the cabin: a soft, smooth petrol hum (low gain, dark, barely driven)
// and an electric motor whine whose pitch follows the wheels.
const V = { gain: 0.07, tone: 0.5, grit: 0.8, cabin: 900, wind: 0.5, whine: 0.018 };

const store = { get() { try { return localStorage.getItem(KEY) === '1'; } catch { return false; } }, set(v) { try { localStorage.setItem(KEY, v ? '1' : '0'); } catch { /* private mode */ } } };

export function makeAudio() {
  const AC = window.AudioContext || window.webkitAudioContext;
  const stats = { state: 'off', nodes: 0, peak: 0, skipped: 0, engineHz: 0, squeal: 0, rumble: 0, played: { step: 0, land: 0, crash: 0, sting: 0, tick: 0 } };
  const a = { stats, muted: store.get(), ctx: null };
  let bed = null, master = null, comp = null, eng = null, rpm = IDLE, gear = 1, cut = 0, noise = null, paused = false, lastCrashes = 0, lastWalked = 0;

  const live = (k) => { stats.nodes += k; stats.peak = Math.max(stats.peak, stats.nodes); };

  function build() {
    if (a.ctx || !AC) return;
    const ctx = a.ctx = new AC();
    // One noise buffer, made once.
    noise = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    { const d = noise.getChannelData(0); let s = 7; for (let i = 0; i < d.length; i++) { s = (s * 16807) % 2147483647; d[i] = s / 1073741823.5 - 1; } }
    comp = ctx.createDynamicsCompressor(); comp.threshold.value = -14; comp.ratio.value = 4; comp.connect(ctx.destination);
    master = ctx.createGain(); master.gain.value = 0.5; // quiet overall (Hitoshi: tone it all down)
    master.connect(comp);
    live(3); // compressor, master, destination
    ctx.onstatechange = () => { stats.state = ctx.state; };
    stats.state = ctx.state;
  }

  // The car, built when a drive starts and stopped when it ends (nothing runs on foot). The engine is a
  // harmonic-rich firing tone plus combustion noise pulsed at the firing rate, through exhaust
  // resonances and a little saturation; under it, tyre roar, wind, gravel and tyre scrub from one
  // looped noise, all heard through the cabin (a low-pass). Over it, the electric motor's whine.
  function engineWave(ctx) {
    const n = 40, re = new Float32Array(n), im = new Float32Array(n);
    for (let k = 1; k < n; k++) im[k] = Math.pow(k, -0.75 / V.tone) * (k % 2 ? 1 : 0.7) * (1 + 0.25 * Math.sin(k * 2.3));
    return ctx.createPeriodicWave(re, im);
  }
  function shaper(ctx, amt) {
    const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 511.5 - 1; c[i] = Math.tanh(x * amt) / Math.tanh(amt); }
    const w = ctx.createWaveShaper(); w.curve = c; w.oversample = 'none'; return w;
  }
  function startCar() {
    const ctx = a.ctx, bus = ctx.createGain(); bus.gain.value = 0;
    const cab = ctx.createBiquadFilter(); cab.type = 'lowpass'; cab.frequency.value = V.cabin || 16000; cab.Q.value = 0.5;
    bus.connect(cab); cab.connect(master);
    const wave = engineWave(ctx);
    const o1 = ctx.createOscillator(), o2 = ctx.createOscillator(), g2 = ctx.createGain(); o1.setPeriodicWave(wave); o2.setPeriodicWave(wave); g2.gain.value = 0.35; // o2: half order, the uneven lope
    const n = ctx.createBufferSource(); n.buffer = noise; n.loop = true;
    const cf = ctx.createBiquadFilter(), am = ctx.createGain(), amOsc = ctx.createOscillator(), amDepth = ctx.createGain();
    cf.type = 'bandpass'; cf.frequency.value = 900; cf.Q.value = 0.8; am.gain.value = 0.15; amOsc.type = 'sawtooth'; amDepth.gain.value = 0.15;
    amOsc.connect(amDepth); amDepth.connect(am.gain); n.connect(cf); cf.connect(am); // combustion noise, pulsed with each firing
    const mix = ctx.createGain(), ex1 = ctx.createBiquadFilter(), ex2 = ctx.createBiquadFilter(), sat = shaper(ctx, V.grit), lp = ctx.createBiquadFilter(), g = ctx.createGain();
    ex1.type = 'peaking'; ex1.frequency.value = 140; ex1.Q.value = 1.2; ex1.gain.value = 6; ex2.type = 'peaking'; ex2.frequency.value = 620; ex2.Q.value = 2; ex2.gain.value = 5;
    lp.type = 'lowpass'; lp.Q.value = 0.7; g.gain.value = 0;
    o1.connect(mix); o2.connect(g2); g2.connect(mix); am.connect(mix); mix.connect(ex1); ex1.connect(ex2); ex2.connect(sat); sat.connect(lp); lp.connect(g); g.connect(bus);
    const roar = ctx.createBiquadFilter(), rg = ctx.createGain(), wind = ctx.createBiquadFilter(), wg = ctx.createGain(), grav = ctx.createBiquadFilter(), gg = ctx.createGain(), scrub = ctx.createBiquadFilter(), sg = ctx.createGain();
    roar.type = 'lowpass'; roar.frequency.value = 450; rg.gain.value = 0; wind.type = 'bandpass'; wind.frequency.value = 1100; wind.Q.value = 0.4; wg.gain.value = 0;
    grav.type = 'bandpass'; grav.frequency.value = 2200; grav.Q.value = 0.6; gg.gain.value = 0; scrub.type = 'bandpass'; scrub.frequency.value = 1300; scrub.Q.value = 1.5; sg.gain.value = 0;
    for (const [f, gn] of [[roar, rg], [wind, wg], [grav, gg], [scrub, sg]]) { n.connect(f); f.connect(gn); gn.connect(bus); }
    const mo = ctx.createOscillator(), mo2 = ctx.createOscillator(), mg = ctx.createGain(), mg2 = ctx.createGain(); // the motor: a sine and a fainter inverter tone 3 times up
    mo.type = mo2.type = 'sine'; mg.gain.value = 0; mg2.gain.value = 0.3; mo.connect(mg); mo2.connect(mg2); mg2.connect(mg); mg.connect(bus);
    o1.start(); o2.start(); amOsc.start(); n.start(); mo.start(); mo2.start(); live(CAR_NODES);
    eng = { bus, o1, o2, amOsc, n, lp, g, cf, rg, wg, gg, sg, mo, mo2, mg };
    rpm = IDLE; gear = 1; cut = 0;
  }
  const CAR_NODES = 33;
  function stopCar() {
    const e = eng, t = a.ctx.currentTime; eng = null; stats.squeal = stats.rumble = 0;
    e.bus.gain.setTargetAtTime(0, t, 0.1);
    for (const o of [e.o1, e.o2, e.amOsc, e.n, e.mo, e.mo2]) o.stop(t + 0.5);
    e.o1.onended = () => { e.bus.disconnect(); live(-CAR_NODES); };
  }
  // Revs from speed and gear; throttle 1 when driving on, 0 when braking or flying (wheels spin up).
  function setEngine(speed, t, dt, throttle, flying, v = 0) {
    const want = flying ? Math.min(7000, rpm + 2500 * dt * 4) : Math.max(IDLE, speed * RATIO[gear]);
    if (!flying && want > SHIFT_UP && gear < 5) { gear++; cut = 0.16; } // shift up: a short lift as the clutch goes in
    else if (!flying && want < SHIFT_DOWN && gear > 1) gear--;
    rpm += ((flying ? want : Math.max(IDLE, speed * RATIO[gear])) - rpm) * Math.min(1, dt * (cut > 0 ? 4 : 12));
    cut = Math.max(0, cut - dt);
    const load = cut > 0 ? 0.1 : throttle, hz = rpm / 30, k = (rpm - IDLE) / (7000 - IDLE);
    stats.engineHz = hz; stats.rpm = Math.round(rpm); stats.gear = gear;
    eng.o1.frequency.setTargetAtTime(hz, t, 0.03); eng.o2.frequency.setTargetAtTime(hz / 2, t, 0.03); eng.amOsc.frequency.setTargetAtTime(hz, t, 0.03);
    eng.cf.frequency.setTargetAtTime(600 + 1800 * k, t, 0.05);
    eng.lp.frequency.setTargetAtTime((350 + 2600 * k * (0.45 + 0.55 * load)) * V.tone, t, 0.05);
    eng.g.gain.setTargetAtTime(V.gain * (0.25 + 0.5 * k) * (0.3 + 0.7 * load), t, 0.08); // a hybrid: the petrol hum mostly comes in under load
    const mhz = 90 + v * 22; // the motor turns with the wheels
    eng.mo.frequency.setTargetAtTime(mhz, t, 0.05); eng.mo2.frequency.setTargetAtTime(mhz * 3, t, 0.05);
    eng.mg.gain.setTargetAtTime(V.whine * (0.3 + 0.7 * Math.min(1, v / 25)) * (0.5 + 0.5 * throttle), t, 0.1);
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


  // Struck sounds, computed once into buffers and cached: a soft felt piano note (slightly inharmonic
  // partials, each fading at its own rate, a touch of hammer).
  const cache = {};
  function piano(m) {
    const key = 'p' + m; if (cache[key]) return cache[key];
    const ctx = a.ctx, sr = ctx.sampleRate, len = Math.ceil(sr * 2.5), b = ctx.createBuffer(1, len, sr), d = b.getChannelData(0), f = mtof(m);
    for (let n = 1; n <= 10; n++) { // each partial by recurrence (no sin or exp per sample: a note takes a few ms, not tens)
      const fn = f * n * Math.sqrt(1 + 0.0004 * n * n); if (fn > sr / 2.5) break;
      const amp = Math.pow(n, -1.3) * (m > 72 ? Math.pow(0.7, n) : 1), d1 = 1.2 + 0.9 * n + f / 300, w = 2 * Math.PI * fn / sr;
      const c2 = 2 * Math.cos(w), r1 = Math.exp(-d1 / sr), r2 = Math.exp(-0.6 / sr);
      let s0 = 0, s1 = Math.sin(w), e1 = 0.7 * amp, e2 = 0.3 * amp;
      for (let i = 0; i < len; i++) { d[i] += s0 * (e1 + e2); const s2 = c2 * s1 - s0; s0 = s1; s1 = s2; e1 *= r1; e2 *= r2; }
    }
    let s = 3; for (let i = 0; i < sr * 0.006; i++) { s = (s * 16807) % 2147483647; d[i] += (s / 1073741823.5 - 1) * 0.08 * (1 - i / (sr * 0.006)); }
    for (let i = 0; i < 200; i++) d[i] *= i / 200;
    return (cache[key] = b);
  }
  function play(buf, out, at, peak, len) { // 2 nodes
    const st = voice(2); if (st === null) return false;
    const s = a.ctx.createBufferSource(), g = a.ctx.createGain(); at = Math.max(at, st);
    s.buffer = buf; g.gain.setValueAtTime(peak, at); if (len) g.gain.setTargetAtTime(0.0001, at + len, 0.15);
    s.connect(g); g.connect(out); s.start(at); s.stop(at + (len ? len + 0.8 : buf.duration)); done(s, 2); return true;
  }

  // The bed: slow piano jazz, a slow, swung, original turnaround on felt piano with a walking bass.
  // It plays all the time, softer under the car and in Florence. Scheduled a little ahead from each
  // frame; its notes stop when it fades out.
  const JAZZ = [ // bars of [bass, chord voicing] in F: Fmaj9, D7b9, Gm9, C13, Am7, D7, Gm9, C7sus (original voicings)
    [41, [57, 60, 64, 67]], [38, [54, 60, 63, 66]], [43, [58, 62, 65, 69]], [36, [58, 62, 64, 69]],
    [45, [55, 60, 64, 67]], [38, [54, 57, 60, 64]], [43, [58, 62, 65, 69]], [36, [58, 60, 65, 67]]];
  const SCALE = [65, 67, 69, 72, 74, 77, 79]; // melody notes, F major pentatonic plus G
  const BAR = 4 * 60 / 62; // 62 bpm
  // Every note the bed and the sting can play, made a few per frame before the bed starts, so no frame
  // stalls on making them (a long frame there once broke the street's double tap).
  const NOTES = [...new Set([...JAZZ.flatMap(([bass, chord]) => [bass, bass + 7, bass - 1, bass + 1, ...chord]), ...SCALE, 40, 46, 51, 52])];
  const warm = () => { let made = 0; for (const m of NOTES) { if (cache['p' + m]) continue; if (made++ >= 2) return false; piano(m); } return true; };
  function startBed() {
    const ctx = a.ctx, out = ctx.createGain(), t = ctx.currentTime; out.gain.value = 0; out.connect(master);
    out.gain.setTargetAtTime(1, t, 0.8);
    const nodes = [out], srcs = [];
    live(nodes.length + srcs.length);
    bed = { out, nodes, srcs, next: t + 0.1, bar: bed ? bed.bar : 0, level: 1 };
  }
  function stopBed() {
    const b = bed, t = a.ctx.currentTime; bed = { bar: b.bar, off: true };
    b.out.gain.setTargetAtTime(0, t, 0.25);
    const k = b.nodes.length + b.srcs.length;
    setTimeout(() => { for (const s of b.srcs) try { s.stop(); } catch { /* already stopped */ } b.out.disconnect(); live(-k); }, 1500);
  }
  function scheduleBed(t) {
    while (bed.next < t + 0.3) { // one bar of jazz: rolled chord, bass on 1 and 3 (a walk-up on 4), a few melody notes, swung
      const at = bed.next, [bass, chord] = JAZZ[bed.bar % JAZZ.length], nextBass = JAZZ[(bed.bar + 1) % JAZZ.length][0], beat = BAR / 4;
      chord.forEach((m, i) => play(piano(m), bed.out, at + i * 0.03, 0.05, BAR * 0.9));
      play(piano(bass), bed.out, at, 0.09, beat * 1.8); play(piano(bass + 7), bed.out, at + 2 * beat, 0.06, beat * 1.5);
      play(piano(nextBass + (nextBass > bass ? -1 : 1)), bed.out, at + 3 * beat, 0.06, beat * 0.9);
      if (bed.bar % 2 === 0) for (let k = 0, x = Math.floor(Math.random() * 4); k < 3; k++) {
        x = Math.max(0, Math.min(SCALE.length - 1, x + (Math.random() < 0.5 ? -1 : 1)));
        play(piano(SCALE[x]), bed.out, at + beat * (1 + k * 0.66 + (k % 2 ? 0.12 : 0)), 0.045, beat * 1.2);
      }
      bed.bar++; bed.next += BAR;
    }
  }
  a.bed = (on, level = 1) => {
    if (!a.ctx || a.muted || a.ctx.state !== 'running') return;
    on = on && !paused; stats.bed = on;
    const playing = bed && !bed.off;
    if (on && !playing && !warm()) return; // the notes are still being made
    if (on && !playing) startBed(); else if (!on && playing) stopBed();
    if (!on) return;
    const t = a.ctx.currentTime;
    stats.bedLevel = level;
    if (bed.level !== level) { bed.level = level; bed.out.gain.setTargetAtTime(level, t, 0.8); }
    if (bed.next < t) bed.next = t + 0.05; // after a long frame (loading the chase), skip the missed notes instead of catching up
    scheduleBed(t);
  };

  // iPhone: Web Audio is muted by the silent switch unless the page asks to play like media. Safari
  // 16.4+ has navigator.audioSession; older iOS needs a silent HTML <audio> playing alongside.
  let media = null;
  function playThroughSilentSwitch() {
    const s = navigator.audioSession;
    if (s) { if (s.type !== 'playback') try { s.type = 'playback'; } catch { /* not allowed */ } return; }
    if (!/iP(hone|ad|od)/.test(navigator.userAgent) && !(navigator.maxTouchPoints > 1 && /Macintosh/.test(navigator.userAgent))) return;
    if (!media) { media = new Audio(silentWav()); media.loop = true; media.setAttribute('playsinline', ''); }
    if (media.paused) media.play().catch(() => {});
  }
  function silentWav() { // a quarter second of silence, 8 kHz mono, as a data URI
    const n = 2000, b = new Uint8Array(44 + n), v = new DataView(b.buffer), w = (o, t) => { for (let i = 0; i < t.length; i++) b[o + i] = t.charCodeAt(i); };
    w(0, 'RIFF'); v.setUint32(4, 36 + n, true); w(8, 'WAVEfmt '); v.setUint32(16, 16, true); v.setUint16(20, 1, true); v.setUint16(22, 1, true);
    v.setUint32(24, 8000, true); v.setUint32(28, 8000, true); v.setUint16(32, 1, true); v.setUint16(34, 8, true); w(36, 'data'); v.setUint32(40, n, true); b.fill(128, 44);
    let s = ''; for (const c of b) s += String.fromCharCode(c);
    return 'data:audio/wav;base64,' + btoa(s);
  }

  a.unlock = () => {
    if (a.muted || document.hidden) return;
    playThroughSilentSwitch();
    build();
    if (!a.ctx || a.ctx.state === 'running') return;
    a.ctx.resume().catch(() => {}); // suspended, or 'interrupted' after a call on iPhone
    const s = a.ctx.createBufferSource(); s.buffer = a.ctx.createBuffer(1, 1, a.ctx.sampleRate); s.connect(a.ctx.destination); s.start(); // a silent sound inside the tap wakes older iOS
  };

  a.setMuted = (on) => {
    a.muted = !!on; store.set(a.muted);
    if (a.muted) { if (a.ctx && a.ctx.state === 'running') a.ctx.suspend().catch(() => {}); if (media) media.pause(); }
    else a.unlock();
    return a.muted;
  };

  a.pause = (on) => {
    paused = on;
    if (eng) eng.bus.gain.setTargetAtTime(0, a.ctx.currentTime, 0.05);
  };

  // Each frame of the chase (null when not driving): engine, tyres, wind, landings and crashes.
  let lastT = 0;
  a.chase = (c) => {
    if (!a.ctx || a.muted) return;
    const t = a.ctx.currentTime, p = c && c.status === 'driving' && !paused ? c.player : null;
    const count = c && c.status === 'count'; // engine idling through 3-2-1
    const dt = Math.min(0.1, Math.max(1 / 120, t - lastT || 1 / 60)); lastT = t;
    if (!p && !count) { if (eng) stopCar(); return; }
    if (!eng) startCar();
    eng.bus.gain.setTargetAtTime(1, t, 0.08);
    if (!p) { setEngine(0, t, dt, 0.2, false); for (const gn of [eng.rg, eng.wg, eng.gg, eng.sg]) gn.gain.setTargetAtTime(0, t, 0.05); stats.squeal = stats.rumble = 0; return; }
    const flying = p.air > 0.05, off = Math.abs(p.d) > 3.6, v = Math.min(1, p.v / 39);
    setEngine(p.v, t, dt, c.brake ? 0 : 1, flying, v);
    stats.rumble = flying ? 0 : (off ? 0.12 : 0.07) * (0.2 + v);
    stats.squeal = c.brake && p.v > 8 && !flying ? 0.04 + 0.05 * v : 0; // tyre scrub under hard braking, not a squeal
    eng.rg.gain.setTargetAtTime(stats.rumble, t, 0.08);
    eng.wg.gain.setTargetAtTime(0.06 * V.wind * v * v, t, 0.2);
    eng.gg.gain.setTargetAtTime(off && !flying ? 0.08 + 0.1 * v : 0, t, 0.05);
    eng.sg.gain.setTargetAtTime(stats.squeal, t, 0.04);
    if (off && !flying && Math.random() < dt * 25 * v) hit(master, 'bandpass', 2500 + Math.random() * 2000, 4, 0.001, 0.02, 0.06 + 0.08 * Math.random()); // stones on the sills
    if (p.landed) { const k = Math.min(1, p.airTime / 0.6); tone(master, 'sine', 90, 34, 0.004, 0.32, 0.25 + 0.4 * k); hit(master, 'lowpass', 420, 1, 0.003, 0.18, 0.2 + 0.3 * k); stats.played.land++; }
    if (p.crashes !== lastCrashes) { if (p.crashes > lastCrashes) { hit(master, 'bandpass', 900, 0.8, 0.003, 0.45, 0.6); tone(master, 'sine', 70, 30, 0.004, 0.4, 0.5); stats.played.crash++; } lastCrashes = p.crashes; }
  };
  // On foot: a heel on stone every stride, quicker and harder when running.
  a.walk = (agent) => {
    const stride = (agent.running ? 1.3 : 0.8) * (agent.speedScale || 1); // the same footfall rate at any speed
    if (agent.walked - lastWalked < stride) { if (agent.walked < lastWalked) lastWalked = agent.walked; return; }
    lastWalked = agent.walked;
    if (paused || !agent.walking) return;
    if (hit(master, 'bandpass', (agent.running ? 1500 : 1200) * (0.9 + Math.random() * 0.2), 3, 0.002, agent.running ? 0.05 : 0.04, agent.running ? 0.14 : 0.09)) stats.played.step++; // soft heels on stone
  };

  // Heat rose: a short, soft, dark piano cluster; and a quiet button tick.
  a.sting = () => {
    if (!a.ctx) return;
    const t = a.ctx.currentTime;
    for (const [m, d] of [[40, 0], [46, 0.02], [51, 0.04], [52, 0.05]]) play(piano(m), master, t + d, 0.12, 1.6);
    stats.played.sting++;
  };
  a.tick = () => { if (a.ctx && tone(master, 'sine', 1400, 1100, 0.002, 0.03, 0.05)) stats.played.tick++; };

  // A touch pointerdown is not a user activation (Chrome's autoplay rule, and iOS Safari wants touchend or click), so listen to all of them; unlock is idempotent.
  // For tests: how loud the game is right now (RMS of what reaches the speakers, after the compressor), read through an analyser made on first use.
  let probe = null, probeData = null;
  a.out = () => comp; // for tests and recordings: the final mix, exactly what goes to the speakers
  a.level = () => {
    if (!a.ctx || !comp) return 0;
    if (!probe) { probe = a.ctx.createAnalyser(); probe.fftSize = 2048; probeData = new Float32Array(probe.fftSize); comp.connect(probe); live(1); }
    probe.getFloatTimeDomainData(probeData);
    let sum = 0; for (const x of probeData) sum += x * x;
    return Math.sqrt(sum / probeData.length);
  };

  for (const ev of ['pointerdown', 'pointerup', 'touchend', 'click', 'keydown']) addEventListener(ev, a.unlock, { capture: true });
  document.addEventListener('visibilitychange', () => { if (!a.ctx || a.muted) return; if (document.hidden) { a.ctx.suspend().catch(() => {}); if (media) media.pause(); } else a.ctx.resume().catch(() => {}); }); // the silent <audio> restarts on the next tap
  return a;
}
