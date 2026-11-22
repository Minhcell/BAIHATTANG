/* ===== Bộ soạn nhạc & hòa âm (Web Audio, chạy offline) ===== */
(function (G) {
  'use strict';
  const SR = 32000; // tần số lấy mẫu: đủ hay, render nhanh trên điện thoại

  // Thể loại giống ForeverSongs (+ Bolero)
  const STYLES = {
    ballad:   { label: 'Ballad Việt', icon: '🌙', bpm: 72,  mode: 'maj', key: 0, prog: [0, 4, 5, 3], progC: [3, 4, 2, 5], progB: [5, 3, 0, 4], acc: 'arp',   dr: 'soft',   grad: ['#3a1c71', '#d76d77'] },
    pop:      { label: 'Pop Việt',    icon: '☀️', bpm: 108, mode: 'maj', key: 7, prog: [5, 3, 0, 4], progC: [0, 4, 5, 3], progB: [3, 4, 5, 4], acc: 'strum', dr: 'pop',    grad: ['#f857a6', '#ff9a44'] },
    acoustic: { label: 'Acoustic',    icon: '🎸', bpm: 88,  mode: 'maj', key: 2, prog: [0, 5, 3, 4], progC: [3, 0, 4, 5], progB: [5, 4, 3, 4], acc: 'pick',  dr: 'cajon',  grad: ['#8e5a2b', '#e0a96d'] },
    indie:    { label: 'Indie Việt',  icon: '🌿', bpm: 96,  mode: 'maj', key: 4, prog: [0, 2, 5, 3], progC: [3, 0, 4, 5], progB: [5, 2, 3, 4], acc: 'indie', dr: 'indie',  grad: ['#134e5e', '#71b280'] },
    lofi:     { label: 'Lofi chill',  icon: '☕', bpm: 78,  mode: 'maj', key: 5, prog: [1, 4, 0, 5], progC: [3, 2, 1, 4], progB: [5, 1, 3, 4], acc: 'keys',  dr: 'lofi',  sev: true, swing: 0.1, grad: ['#355c7d', '#6c5b7b'] },
    rnb:      { label: 'R&B',         icon: '🎷', bpm: 70,  mode: 'maj', key: 3, prog: [3, 2, 1, 4], progC: [0, 5, 3, 4], progB: [5, 2, 3, 4], acc: 'keys',  dr: 'rnb',   sev: true, swing: 0.08, grad: ['#41295a', '#2f0743'] },
    edm:      { label: 'EDM / Remix', icon: '⚡', bpm: 124, mode: 'min', key: 2, prog: [0, 5, 2, 6], progC: [5, 6, 0, 0], progB: [5, 6, 2, 4], acc: 'edm',   dr: 'edm',    grad: ['#0f0c29', '#e91e63'] },
    kids:     { label: 'Nhạc thiếu nhi', icon: '🎈', bpm: 120, mode: 'maj', key: 0, prog: [0, 3, 4, 0], progC: [3, 0, 4, 0], progB: [5, 3, 4, 4], acc: 'kids', dr: 'kids',  grad: ['#11998e', '#f9d423'] },
    rock:     { label: 'Rock Việt',   icon: '🤘', bpm: 128, mode: 'maj', key: 4, prog: [0, 4, 5, 3], progC: [3, 4, 0, 4], progB: [5, 3, 4, 4], acc: 'rock',  dr: 'rock',   grad: ['#232526', '#b21f1f'] },
    popen:    { label: 'Pop (tiếng Anh)', icon: '🌎', bpm: 104, mode: 'maj', key: 9, prog: [0, 4, 5, 3], progC: [3, 0, 4, 5], progB: [5, 3, 0, 4], acc: 'strum', dr: 'pop', lang: 'en', grad: ['#4568dc', '#b06ab3'] },
    bolero:   { label: 'Bolero',      icon: '🌹', bpm: 66,  mode: 'min', key: 9, prog: [0, 3, 4, 0], progC: [5, 3, 4, 0], progB: [2, 6, 0, 4], acc: 'bolero', dr: 'bolero', grad: ['#4b134f', '#c94b4b'] }
  };

  const VOICES = {
    auto:  { label: 'Chọn giúp tôi', oct: 0, kind: 'voice', auto: true },
    nam:   { label: 'Giọng nam', oct: -12, kind: 'voice' },
    nu:    { label: 'Giọng nữ', oct: 0,   kind: 'voice' },
    sao:   { label: 'Sáo trúc', oct: 12, kind: 'flute' },
    piano: { label: 'Piano', oct: 0, kind: 'piano' }
  };

  const MAJ = [0, 2, 4, 5, 7, 9, 11], MIN = [0, 2, 3, 5, 7, 8, 10], HMIN = [0, 2, 3, 5, 7, 8, 11];

  // ---------- Phân tích âm tiết tiếng Việt ----------
  function toneOf(s) {
    const d = s.normalize('NFD');
    if (d.indexOf('́') >= 0) return 'sac';
    if (d.indexOf('̀') >= 0) return 'huyen';
    if (d.indexOf('̉') >= 0) return 'hoi';
    if (d.indexOf('̃') >= 0) return 'nga';
    if (d.indexOf('̣') >= 0) return 'nang';
    return 'ngang';
  }
  const FORM = { a: [800, 1300], ă: [750, 1300], â: [620, 1350], e: [600, 1900], ê: [450, 2100], i: [300, 2300], y: [300, 2300], o: [560, 900], ô: [450, 800], ơ: [500, 1350], u: [330, 800], ư: [360, 1350] };
  const OPEN = 'aăâeoơêôưuiy';
  function vowelOf(s) {
    let d = s.toLowerCase().normalize('NFD').replace(/[̣̀́̃̉]/g, '').normalize('NFC');
    d = d.replace(/[^a-zăâđêôơư]/g, '').replace(/^(ngh|ng|nh|ch|gh|gi(?=[aăâeêoôơuư])|kh|ph|qu|th|tr|[bcdđghklmnpqrstvx])/, '');
    let best = 'ơ', bi = 99;
    for (const ch of d) { const k = OPEN.indexOf(ch); if (k >= 0 && k < bi) { bi = k; best = ch; } }
    return best;
  }
  function syllables(line) { return line.replace(/[.,!?;:…"“”()]/g, ' ').split(/\s+/).filter(Boolean); }

  // ---------- Lập kế hoạch bài hát ----------
  function plan(sections, styleId, voiceId, seed) {
    const st = STYLES[styleId] || STYLES.ballad, vc = VOICES[voiceId] || VOICES.nu;
    const r = G.Lyrics.rng((seed || 1) * 7 + 13);
    const spb = 60 / st.bpm, bar = 4 * spb;
    const tonicMel = 60 + st.key - (st.key > 5 ? 12 : 0) + vc.oct; // C4..F4 (nữ)
    const scaleFor = c => st.mode === 'min' ? (c === 4 ? HMIN : MIN) : MAJ;
    const bars = [];   // {t, chord, sec, intensity}
    const lines = [];  // {text, sec, notes:[{t,dur,midi,syl,vowel}]}
    const melCache = {};
    const introBars = st.bpm >= 100 ? 4 : 2;
    let b = 0;
    for (let i = 0; i < introBars; i++) bars.push({ t: (b++) * bar, chord: st.prog[i % 4], sec: 'intro' });

    // tách câu quá dài
    const secs = sections.map(s => {
      const ls = [];
      s.lines.forEach(l => {
        const w = syllables(l);
        if (w.length > 14) { const h = Math.ceil(w.length / 2); ls.push(w.slice(0, h).join(' ')); ls.push(w.slice(h).join(' ')); }
        else if (w.length) ls.push(l);
      });
      return { type: s.type, label: s.label, lines: ls };
    });
    const lastChorus = secs.map(s => s.type).lastIndexOf('chorus');

    secs.forEach((s, si) => {
      const prog = s.type === 'chorus' ? st.progC : s.type === 'bridge' ? st.progB : st.prog;
      s.lines.forEach((text, k) => {
        let c0 = prog[(2 * k) % 4], c1 = prog[(2 * k + 1) % 4];
        const isLast = k === s.lines.length - 1;
        if (isLast && (s.type === 'outro' || (si === lastChorus && si === secs.length - 1))) { c0 = 4; c1 = 0; }
        if (isLast && s.type === 'chorus') c1 = (si === lastChorus) ? 0 : c1;
        const t0 = b * bar;
        bars.push({ t: t0, chord: c0, sec: s.type }, { t: t0 + bar, chord: c1, sec: s.type });
        b += 2;
        const key = s.type + '|' + text + '|' + c0 + c1;
        let mel = melCache[key];
        if (!mel) mel = melCache[key] = melody(syllables(text), [c0, c1], s.type, r, st, scaleFor, isLast && si === lastChorus);
        lines.push({
          text, sec: s.type, label: s.label, secIndex: si,
          notes: mel.map(n => ({ t: t0 + n.b * spb, dur: n.d * spb, midi: tonicMel + n.semi, syl: n.syl, vowel: n.vowel }))
        });
      });
    });
    for (let i = 0; i < 2; i++) bars.push({ t: (b++) * bar, chord: 0, sec: 'end' });
    const duration = b * bar + 3.0;
    return { st, vc, spb, bar, bars, lines, duration, styleId, voiceId };
  }

  // Giai điệu cho 1 câu (2 ô nhịp), bám theo thanh điệu tiếng Việt
  function melody(syls, chords, type, r, st, scaleFor, finalCadence) {
    const n = syls.length;
    if (!n) return [];
    // nhịp: đơn vị móc đơn (0.5 phách), 16 ô cho 2 ô nhịp
    const s0 = type === 'chorus' ? (n <= 8 ? 0 : 0) : (n <= 7 ? 1 : 0);
    const avail = 15 - s0;
    let durs;
    if (n >= avail) durs = new Array(n).fill(avail / n);
    else {
      durs = new Array(n).fill(1);
      let extra = avail - n;
      const last = Math.min(extra, n <= 5 ? 5 : 3); durs[n - 1] += last; extra -= last;
      const mid = Math.floor(n / 2) - 1;
      const spots = [mid, Math.max(0, mid - 2), Math.min(n - 2, mid + 2)].filter(x => x >= 0 && x < n - 1);
      let k = 0;
      while (extra > 0 && spots.length) { durs[spots[k % spots.length]] += 1; extra--; k++; }
      if (extra > 0) durs[n - 1] += extra;
    }
    // độ cao
    const chordDegs = c => [c, c + 2, c + 4].concat(st.sev ? [c + 6] : []);
    const nearestChord = (d, c, prefer) => {
      let best = d, bd = 99;
      const base = prefer ? [c, c + 2] : chordDegs(c);
      for (let o = -14; o <= 14; o += 7) for (const x of base) { const dd = Math.abs(x + o - d); if (dd < bd) { bd = dd; best = x + o; } }
      return best;
    };
    const lo = type === 'chorus' ? 1 : -3, hi = type === 'chorus' ? 10 : 7;
    let d = type === 'chorus' ? 4 + Math.floor(r() * 3) : type === 'bridge' ? 3 + Math.floor(r() * 2) : 1 + Math.floor(r() * 3);
    d = nearestChord(d, chords[0]);
    const out = [];
    let slot = s0, same = 0;
    for (let i = 0; i < n; i++) {
      const tn = toneOf(syls[i]);
      if (i > 0) {
        let dl;
        switch (tn) {
          case 'sac': dl = r() < 0.6 ? 1 : 2; break;
          case 'nga': dl = 1; break;
          case 'huyen': dl = -1; break;
          case 'hoi': dl = r() < 0.5 ? -1 : 0; break;
          case 'nang': dl = -2; break;
          default: dl = r() < 0.45 ? 0 : (r() < 0.5 ? 1 : -1);
        }
        d += dl;
      }
      const beat = slot / 2;
      const c = beat < 4 ? chords[0] : chords[1];
      if (slot % 4 === 0 && r() < 0.7) d = nearestChord(d, c);
      if (i === n - 1) { d = finalCadence ? Math.round(d / 7) * 7 : nearestChord(d, c, true); while (d < lo) d += 7; while (d > hi) d -= 7; }
      if (d > hi) d -= (d - hi > 2 ? 7 : 2);
      if (d < lo) d += (lo - d > 2 ? 7 : 2);
      if (out.length && out[out.length - 1].deg === d) { if (++same >= 2) { d += (d > (lo + hi) / 2 ? -1 : 1); same = 0; } } else same = 0;
      const sc = scaleFor(c);
      const semi = sc[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
      out.push({ b: beat, d: durs[i] / 2, deg: d, semi, syl: syls[i], vowel: vowelOf(syls[i]) });
      slot += durs[i];
    }
    return out;
  }

  // ---------- Nhạc cụ ----------
  function mtof(m) { return 440 * Math.pow(2, (m - 69) / 12); }

  // tạo sẵn 1 lần: nhiễu trắng & âm vang (dùng lại cho mọi đoạn)
  let NOISE = null, IR = null;
  const DIST = (() => { const c = new Float32Array(1024); for (let i = 0; i < 1024; i++) { const x = i / 512 - 1; c[i] = Math.tanh(x * 6) * 0.6; } return c; })();
  function prep() {
    if (NOISE) return;
    NOISE = new Float32Array(SR * 2); for (let i = 0; i < NOISE.length; i++) NOISE[i] = Math.random() * 2 - 1;
    const irLen = Math.floor(SR * 2.4); IR = [new Float32Array(irLen), new Float32Array(irLen)];
    for (let c = 0; c < 2; c++) for (let i = 0; i < irLen; i++) IR[c][i] = (Math.random() * 2 - 1) * Math.pow(1 - i / irLen, 3.2);
  }
  function impulse(ctx) { const b = ctx.createBuffer(2, IR[0].length, SR); b.getChannelData(0).set(IR[0]); b.getChannelData(1).set(IR[1]); return b; }
  function Synth(ctx, P) {
    prep();
    const noise = ctx.createBuffer(1, SR * 2, SR);
    noise.getChannelData(0).set(NOISE);

    // bus & hiệu ứng
    // kênh 0-1: tiếng khô; kênh 2-3: gửi sang âm vang (xử lý 1 lần cho cả bài)
    const merger = ctx.createChannelMerger(4); merger.connect(ctx.destination);
    const master = ctx.createGain(); master.gain.value = 0.8;
    const sp1 = ctx.createChannelSplitter(2); master.connect(sp1); sp1.connect(merger, 0, 0); sp1.connect(merger, 1, 1);
    const revIn = ctx.createGain(); revIn.gain.value = 0.35 * 0.8;
    const sp2 = ctx.createChannelSplitter(2); revIn.connect(sp2); sp2.connect(merger, 0, 2); sp2.connect(merger, 1, 3);

    function chan(gain, pan, send) {
      const g = ctx.createGain(); g.gain.value = gain;
      let node = g;
      if (ctx.createStereoPanner && pan) { const p = ctx.createStereoPanner(); p.pan.value = pan; g.connect(p); node = p; }
      node.connect(master);
      if (send) { const s = ctx.createGain(); s.gain.value = send; node.connect(s); s.connect(revIn); }
      return g;
    }
    const bus = {
      voice: chan(2.2, 0, 0.5), keys: chan(0.55, -0.18, 0.4), gtr: chan(0.5, 0.25, 0.3), pad: chan(0.35, 0, 0.6),
      bass: chan(0.75, 0, 0), drum: chan(0.6, 0, 0.12), hat: chan(0.25, 0.3, 0.05), fx: chan(0.5, 0, 0.3)
    };

    function env(g, t, a, peak, dec, sus, end) {
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(peak, t + a);
      g.gain.exponentialRampToValueAtTime(Math.max(peak * sus, 0.0002), t + a + dec);
      g.gain.exponentialRampToValueAtTime(0.0001, end);
    }
    function osc(type, f, t, end, det) {
      const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; if (det) o.detune.value = det;
      o.start(t); o.stop(end + 0.05); return o;
    }
    function noiseSrc(t, end) { const s = ctx.createBufferSource(); s.buffer = noise; s.loop = true; s.start(t, Math.random() * 1.5); s.stop(end + 0.05); return s; }

    const I = {
      piano(t, m, dur, v, out) {
        const f = mtof(m), end = t + dur + 0.6, g = ctx.createGain();
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = Math.min(5000, f * 6);
        osc('triangle', f, t, end).connect(g); const o2 = osc('sine', f * 2, t, end); const g2 = ctx.createGain(); g2.gain.value = 0.35; o2.connect(g2); g2.connect(g);
        env(g, t, 0.006, v, 0.5, 0.35, end); g.connect(lp); lp.connect(out || bus.keys);
      },
      epiano(t, m, dur, v) {
        const f = mtof(m), end = t + dur + 0.5, g = ctx.createGain();
        osc('sine', f, t, end).connect(g);
        const o2 = osc('sine', f * 3.01, t, t + 0.4), g2 = ctx.createGain(); g2.gain.setValueAtTime(v * 0.25, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); o2.connect(g2); g2.connect(g);
        env(g, t, 0.01, v, 1.2, 0.4, end); g.connect(bus.keys);
      },
      pluck(t, m, dur, v) {
        const f = mtof(m), end = t + Math.min(dur, 1.6) + 0.5, g = ctx.createGain(), lp = ctx.createBiquadFilter();
        lp.type = 'lowpass'; lp.Q.value = 1; lp.frequency.setValueAtTime(Math.min(6000, f * 10), t); lp.frequency.exponentialRampToValueAtTime(Math.max(300, f * 1.5), t + 0.5);
        osc('sawtooth', f, t, end).connect(lp); lp.connect(g); env(g, t, 0.003, v, 0.9, 0.3, end); g.connect(bus.gtr);
      },
      saw(t, m, dur, v) { // supersaw stab
        const f = mtof(m), end = t + dur + 0.15, g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3200;
        [-14, 0, 14].forEach(dt => osc('sawtooth', f, t, end, dt).connect(lp)); lp.connect(g); env(g, t, 0.005, v, 0.15, 0.4, end); g.connect(bus.gtr);
      },
      power(t, m, dur, v) { // guitar điện méo tiếng
        const end = t + dur + 0.1, g = ctx.createGain(), ws = ctx.createWaveShaper(), lp = ctx.createBiquadFilter();
        ws.curve = DIST; lp.type = 'lowpass'; lp.frequency.value = 2600;
        [m, m + 7, m + 12].forEach((x, i) => osc('sawtooth', mtof(x), t, end, i * 4).connect(ws));
        ws.connect(lp); lp.connect(g); env(g, t, 0.004, v, 0.2, 0.7, end); g.connect(bus.gtr);
      },
      bell(t, m, dur, v) {
        const f = mtof(m), end = t + 1.2, g = ctx.createGain();
        osc('sine', f, t, end).connect(g); const o2 = osc('sine', f * 3.5, t, t + 0.3), g2 = ctx.createGain(); g2.gain.value = 0.2; o2.connect(g2); g2.connect(g);
        env(g, t, 0.003, v, 0.8, 0.1, end); g.connect(bus.keys);
      },
      pad(t, ms, dur, v) {
        const end = t + dur + 0.6, g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 1400;
        ms.forEach(m => { osc('sawtooth', mtof(m), t, end, -8).connect(lp); osc('sawtooth', mtof(m), t, end, 8).connect(lp); });
        lp.connect(g); g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(v, t + 0.5); g.gain.setValueAtTime(v, t + dur); g.gain.linearRampToValueAtTime(0.0001, end);
        g.connect(bus.pad);
      },
      bass(t, m, dur, v, kind) {
        const f = mtof(m), end = t + dur + 0.08, g = ctx.createGain(), lp = ctx.createBiquadFilter(); lp.type = 'lowpass';
        lp.frequency.value = kind === 'edm' ? 500 : 700;
        osc(kind === 'edm' ? 'sawtooth' : 'triangle', f, t, end).connect(lp); osc('sine', f, t, end).connect(lp);
        lp.connect(g); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.01); g.gain.setValueAtTime(v * 0.8, t + Math.max(0.02, dur - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, end);
        g.connect(bus.bass);
      },
      kick(t, v) {
        const o = ctx.createOscillator(), g = ctx.createGain(); o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
        o.start(t); o.stop(t + 0.4); o.connect(g); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.35); g.connect(bus.drum);
      },
      snare(t, v, soft) {
        const s = noiseSrc(t, t + 0.25), hp = ctx.createBiquadFilter(); hp.type = soft ? 'bandpass' : 'highpass'; hp.frequency.value = soft ? 1800 : 1400;
        const g = ctx.createGain(); s.connect(hp); hp.connect(g); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (soft ? 0.12 : 0.2)); g.connect(bus.drum);
        const o = osc('triangle', 190, t, t + 0.1), g2 = ctx.createGain(); o.connect(g2); g2.gain.setValueAtTime(v * 0.6, t); g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); g2.connect(bus.drum);
      },
      clap(t, v) {
        const s = noiseSrc(t, t + 0.3), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1200; bp.Q.value = 1.2;
        const g = ctx.createGain(); s.connect(bp); bp.connect(g);
        g.gain.setValueAtTime(0.0001, t); [0, 0.012, 0.024].forEach(o => { g.gain.setValueAtTime(v, t + o); g.gain.exponentialRampToValueAtTime(v * 0.2, t + o + 0.01); });
        g.gain.setValueAtTime(v, t + 0.036); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.22); g.connect(bus.drum);
      },
      hat(t, v, open) {
        const s = noiseSrc(t, t + 0.3), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 7000;
        const g = ctx.createGain(); s.connect(hp); hp.connect(g); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + (open ? 0.25 : 0.045)); g.connect(bus.hat);
      },
      shaker(t, v) {
        const s = noiseSrc(t, t + 0.1), hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4500;
        const g = ctx.createGain(); s.connect(hp); hp.connect(g); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08); g.connect(bus.hat);
      },
      rim(t, v) {
        const o = osc('square', 1700, t, t + 0.04), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1700; bp.Q.value = 4;
        const g = ctx.createGain(); o.connect(bp); bp.connect(g); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.035); g.connect(bus.drum);
      },
      vinyl(t, end) {
        const s = noiseSrc(t, end), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 3000; bp.Q.value = 0.7;
        const g = ctx.createGain(); g.gain.value = 0.012; s.connect(bp); bp.connect(g); g.connect(bus.fx);
      }
    };

    // Giọng hát ảo: dao động răng cưa qua bộ lọc formant theo nguyên âm
    function voiceLine(notes, male, peak) {
      if (!notes.length) return;
      const t0 = notes[0].t - 0.05, tEnd = notes[notes.length - 1].t + notes[notes.length - 1].dur + 0.35;
      const o1 = osc('sawtooth', mtof(notes[0].midi), t0, tEnd), o2 = osc('sawtooth', mtof(notes[0].midi), t0, tEnd, 7);
      const lfo = osc('sine', 5.3, t0, tEnd), lg = ctx.createGain();
      lfo.connect(lg); lg.connect(o1.detune); lg.connect(o2.detune);
      lg.gain.setValueAtTime(0, t0);
      const amp = ctx.createGain(); amp.gain.setValueAtTime(0.0001, t0);
      o1.connect(amp); o2.connect(amp);
      const k = male ? 0.82 : 1;
      const mk = (type, f, q, g) => { const b = ctx.createBiquadFilter(); b.type = type; b.frequency.value = f; b.Q.value = q; const gg = ctx.createGain(); gg.gain.value = g; amp.connect(b); b.connect(gg); gg.connect(bus.voice); return b; };
      const f1 = mk('bandpass', 700, 5, 2.2), f2 = mk('bandpass', 1300, 7, 1.4);
      mk('bandpass', male ? 2500 : 2900, 6, 0.6); mk('lowpass', 400, 0.7, 0.25);
      notes.forEach((n, i) => {
        const f = mtof(n.midi), fm = FORM[n.vowel] || FORM['ơ'];
        if (i === 0) { o1.frequency.setValueAtTime(f, t0); o2.frequency.setValueAtTime(f, t0); }
        else { o1.frequency.setTargetAtTime(f, n.t - 0.015, 0.025); o2.frequency.setTargetAtTime(f, n.t - 0.015, 0.025); }
        f1.frequency.setTargetAtTime(fm[0] * k, n.t, 0.03); f2.frequency.setTargetAtTime(fm[1] * k, n.t, 0.03);
        amp.gain.setTargetAtTime(peak, n.t, 0.02);
        const next = notes[i + 1];
        const gapEnd = n.t + n.dur;
        const legato = next && next.t - gapEnd < 0.05;
        amp.gain.setTargetAtTime(legato ? peak * 0.35 : 0.0001, Math.max(n.t + 0.04, gapEnd - (legato ? 0.06 : 0.04)), legato ? 0.02 : 0.05);
        if (n.dur > 0.45) { lg.gain.setTargetAtTime(28, n.t + 0.25, 0.15); lg.gain.setTargetAtTime(4, gapEnd - 0.05, 0.05); }
      });
    }
    function fluteLine(notes) {
      notes.forEach(n => {
        const f = mtof(n.midi), end = n.t + n.dur + 0.08, g = ctx.createGain();
        const o = osc('sine', f, n.t, end), o2 = osc('triangle', f, n.t, end), g2 = ctx.createGain(); g2.gain.value = 0.3; o.connect(g); o2.connect(g2); g2.connect(g);
        const lfo = osc('sine', 5, n.t, end), lg = ctx.createGain(); lg.gain.setValueAtTime(0, n.t); lg.gain.linearRampToValueAtTime(n.dur > 0.4 ? 22 : 4, n.t + Math.min(0.5, n.dur)); lfo.connect(lg); lg.connect(o.detune); lg.connect(o2.detune);
        const ns = noiseSrc(n.t, n.t + 0.1), bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = f * 2; bp.Q.value = 3; const ng = ctx.createGain();
        ng.gain.setValueAtTime(0.05, n.t); ng.gain.exponentialRampToValueAtTime(0.0001, n.t + 0.09); ns.connect(bp); bp.connect(ng); ng.connect(bus.voice);
        g.gain.setValueAtTime(0.0001, n.t); g.gain.exponentialRampToValueAtTime(0.21, n.t + 0.04); g.gain.setValueAtTime(0.18, Math.max(n.t + 0.05, end - 0.08)); g.gain.exponentialRampToValueAtTime(0.0001, end);
        g.connect(bus.voice);
      });
    }
    return { I, bus, voiceLine, fluteLine, P };
  }

  // ---------- Hòa âm theo phong cách ----------
  function accompany(S, pl) {
    const { I } = S, st = pl.st, spb = pl.spb, sw = (st.swing || 0) * spb;
    const keyRoot = 48 + st.key;
    const scale = c => st.mode === 'min' ? (c === 4 ? HMIN : MIN) : MAJ;
    const degM = (d, c) => keyRoot + scale(c)[((d % 7) + 7) % 7] + 12 * Math.floor(d / 7);
    const chordM = c => {
      const ds = [c, c + 2, c + 4].concat(st.sev ? [c + 6] : []);
      return ds.map(d => { let m = degM(d, c); while (m < 53) m += 12; while (m > 67) m -= 12; return m; }).sort((a, b) => a - b);
    };
    const bassM = c => { let m = degM(c, c) - 12; while (m < 36) m += 12; while (m > 47) m -= 12; return m; };
    const off = x => x % 1 === 0.5 ? sw : 0;
    const T = (bt, x) => bt + x * spb + off(x);
    if (st.dr === 'lofi') I.vinyl(0, pl.duration - 1);

    pl.bars.forEach((bar, bi) => {
      const sec = bar.sec, bt = bar.t, c = bar.chord;
      const ch = chordM(c), bs = bassM(c);
      const full = sec === 'chorus', light = sec === 'intro' || sec === 'verse' || sec === 'outro';
      if (sec === 'end') {
        if (bi === pl.bars.length - 2) {
          ch.forEach((m, i) => (st.acc === 'strum' || st.acc === 'pick' || st.acc === 'bolero') ? I.pluck(bt + i * 0.03, m, 3 * spb, 0.2) : I.piano(bt + i * 0.02, m, 6 * spb, 0.22));
          I.bass(bt, bs, 6 * spb, 0.5, st.acc); if (st.acc !== 'arp') I.piano(bt, ch[0] + 12, 6 * spb, 0.12);
          I.pad(bt, ch, 7 * spb, 0.06);
        }
        return;
      }
      if (full || sec === 'bridge') I.pad(bt, ch, 4 * spb, full ? 0.07 : 0.05);

      switch (st.acc) {
        case 'arp': {
          const notes = [bs + 12].concat(ch, [ch[0] + 12]);
          const pat = [0, 2, 3, 4, 3, 2, 1, 2];
          pat.forEach((p, i) => I.piano(T(bt, i * 0.5), notes[p] || notes[0], 1.6 * spb, i === 0 ? 0.3 : 0.2));
          I.bass(bt, bs, 3.8 * spb, full ? 0.55 : 0.4);
          break;
        }
        case 'strum': {
          const hits = light ? [0, 1.5, 2, 3] : [0, 0.5, 1.5, 2, 2.5, 3, 3.5];
          hits.forEach(x => ch.concat([ch[0] + 12]).forEach((m, i) => I.pluck(T(bt, x) + i * 0.011, m, 0.45 * spb, x % 1 ? 0.11 : 0.16)));
          [[0, 1.4], [1.5, 0.45], [2, 0.9], [3, 0.45], [3.5, 0.45]].forEach(([x, d]) => I.bass(T(bt, x), bs, d * spb, 0.5));
          break;
        }
        case 'bolero': {
          I.bass(bt, bs, 1.4 * spb, 0.55); I.bass(T(bt, 1.5), bs + 7 > 47 ? bs - 5 : bs + 7, 0.45 * spb, 0.4); I.bass(T(bt, 2), bs + 7 > 47 ? bs - 5 : bs + 7, 1.4 * spb, 0.45);
          [1, 1.5, 3, 3.5].forEach(x => ch.forEach((m, i) => I.pluck(T(bt, x) + i * 0.012, m, 0.4 * spb, x % 1 ? 0.1 : 0.14)));
          if (!light) [0, 2].forEach(x => I.piano(T(bt, x), ch[ch.length - 1] + 12, 1.5 * spb, 0.08));
          break;
        }
        case 'keys': {
          [[0, 2.2], [2.5, 1.4]].forEach(([x, d]) => ch.forEach(m => I.epiano(T(bt, x), m, d * spb, 0.16)));
          I.bass(bt, bs, 1.8 * spb, 0.5); I.bass(T(bt, 2.5), bs, 1.2 * spb, 0.42);
          break;
        }
        case 'edm': {
          if (sec !== 'intro') [0.5, 1.5, 2.5, 3.5].forEach(x => ch.forEach(m => I.saw(T(bt, x), m + 12, 0.3 * spb, full ? 0.09 : 0.06)));
          else ch.forEach(m => I.saw(bt, m + 12, 3.5 * spb, 0.05));
          if (sec !== 'bridge') [0.5, 1.5, 2.5, 3.5].forEach(x => I.bass(T(bt, x), bs, 0.4 * spb, 0.55, 'edm'));
          if (full) [0, 0.75, 1.5, 2.25, 3, 3.5].forEach((x, i) => I.pluck(T(bt, x), ch[i % ch.length] + 12, 0.25 * spb, 0.07));
          break;
        }
        case 'pick': {
          const seq = [[0, bs + 12], [0.5, ch[1]], [1, ch[2]], [1.5, ch[0] + 12], [2, ch[0]], [2.5, ch[1]], [3, ch[2]], [3.5, ch[1]]];
          seq.forEach(([x, m]) => I.pluck(T(bt, x), m, 1.2 * spb, x === 0 ? 0.2 : 0.13));
          I.bass(bt, bs, 1.8 * spb, 0.42); I.bass(T(bt, 2), bs, 1.8 * spb, 0.38);
          break;
        }
        case 'indie': {
          const seq = [ch[0] + 12, ch[1] + 12, ch[2] + 12, ch[1] + 12];
          for (let i = 0; i < 8; i++) I.pluck(T(bt, i * 0.5), seq[i % 4], 0.9 * spb, i % 2 ? 0.09 : 0.13);
          if (!light) [0, 2].forEach(x => ch.forEach(m => I.pluck(T(bt, x) + 0.01, m, 1.8 * spb, 0.06)));
          [[0, 1.4], [1.5, 0.45], [2, 1.9]].forEach(([x, d]) => I.bass(T(bt, x), bs, d * spb, 0.48));
          break;
        }
        case 'rock': {
          const root = bs + 12;
          if (light) { I.power(bt, root, 1.9 * spb, 0.12); I.power(T(bt, 2), root, 1.9 * spb, 0.12); }
          else for (let i = 0; i < 8; i++) I.power(T(bt, i * 0.5), root, 0.45 * spb, i % 2 ? 0.1 : 0.14);
          for (let i = 0; i < 8; i++) I.bass(T(bt, i * 0.5), bs, 0.45 * spb, 0.5);
          break;
        }
        case 'kids': {
          I.bass(bt, bs, 0.9 * spb, 0.5); I.bass(T(bt, 2), bs + 7 > 47 ? bs - 5 : bs + 7, 0.9 * spb, 0.45);
          [1, 3].forEach(x => ch.forEach(m => I.bell(T(bt, x), m + 12, 0.8 * spb, 0.1)));
          if (full) [0.5, 1.5, 2.5, 3.5].forEach((x, i) => I.bell(T(bt, x), ch[i % ch.length] + 24, 0.4 * spb, 0.05));
          break;
        }
      }

      // trống
      if (sec === 'intro' && st.dr !== 'edm' && st.dr !== 'kids') { if (st.dr === 'bolero' || st.dr === 'cajon') for (let x = 0; x < 4; x += 0.5) I.shaker(T(bt, x), 0.12); return; }
      switch (st.dr) {
        case 'soft':
          if (full || sec === 'bridge') { I.kick(bt, 0.55); I.kick(T(bt, 2.5), 0.4); I.snare(T(bt, 1), 0.25, true); I.snare(T(bt, 3), 0.25, true); for (let x = 0; x < 4; x += 0.5) I.hat(T(bt, x), 0.1); }
          else { I.kick(bt, 0.35); for (let x = 1; x < 4; x += 1) I.shaker(T(bt, x), 0.08); }
          break;
        case 'pop':
          I.kick(bt, 0.75); I.kick(T(bt, 2), 0.7); if (!light) I.kick(T(bt, 1.5), 0.45);
          I.snare(T(bt, 1), light ? 0.3 : 0.45); I.snare(T(bt, 3), light ? 0.3 : 0.45);
          for (let x = 0; x < 4; x += 0.5) I.hat(T(bt, x), x % 1 ? 0.12 : 0.18);
          if (full && bi % 8 === 7) I.hat(T(bt, 3.5), 0.2, true);
          break;
        case 'bolero':
          I.kick(bt, 0.35); I.kick(T(bt, 2), 0.25);
          [0, 1.5, 2, 3].forEach(x => I.rim(T(bt, x), light ? 0.12 : 0.18));
          for (let x = 0; x < 4; x += 0.5) I.shaker(T(bt, x), x % 1 ? 0.06 : 0.1);
          break;
        case 'lofi':
          I.kick(bt, 0.6); I.kick(T(bt, 1.75), 0.35); I.kick(T(bt, 2.5), 0.5);
          I.snare(T(bt, 1), 0.3, true); I.snare(T(bt, 3), 0.3, true);
          for (let x = 0; x < 4; x += 0.5) I.hat(T(bt, x), x % 1 ? 0.07 : 0.11);
          break;
        case 'edm':
          if (sec !== 'bridge') for (let x = 0; x < 4; x++) I.kick(T(bt, x), sec === 'intro' ? 0.5 : 0.85);
          if (sec !== 'intro') { I.clap(T(bt, 1), 0.4); I.clap(T(bt, 3), 0.4); }
          for (let x = 0.5; x < 4; x += 1) I.hat(T(bt, x), full ? 0.2 : 0.14, full);
          if (sec === 'bridge' && bi % 2 === 1) for (let x = 0; x < 4; x += 0.25) I.snare(T(bt, x), 0.06 + x * 0.04, true);
          break;
        case 'cajon':
          I.kick(bt, 0.45); I.kick(T(bt, 2.5), 0.35); I.snare(T(bt, 1), light ? 0.2 : 0.3, true); I.snare(T(bt, 3), light ? 0.2 : 0.3, true);
          for (let x = 0; x < 4; x += 0.5) I.shaker(T(bt, x), x % 1 ? 0.06 : 0.1);
          break;
        case 'indie':
          I.kick(bt, 0.55); I.kick(T(bt, 2.5), 0.45); I.snare(T(bt, 1), light ? 0.22 : 0.35); I.snare(T(bt, 3), light ? 0.22 : 0.35);
          for (let x = 0; x < 4; x += 0.5) I.hat(T(bt, x), x % 1 ? 0.08 : 0.12);
          break;
        case 'rnb':
          I.kick(bt, 0.6); I.kick(T(bt, 0.75), 0.35); I.kick(T(bt, 2.5), 0.5);
          I.clap(T(bt, 1), 0.3); I.clap(T(bt, 3), 0.3);
          for (let x = 0; x < 4; x += 0.25) I.hat(T(bt, x), x % 0.5 ? 0.05 : 0.09);
          break;
        case 'rock':
          I.kick(bt, 0.85); I.kick(T(bt, 2), 0.8); if (!light) I.kick(T(bt, 2.5), 0.6);
          I.snare(T(bt, 1), 0.55); I.snare(T(bt, 3), 0.55);
          for (let x = 0; x < 4; x += 0.5) I.hat(T(bt, x), full ? 0.18 : 0.12, full && x % 1 === 0);
          break;
        case 'kids':
          I.kick(bt, 0.6); I.kick(T(bt, 2), 0.55); I.snare(T(bt, 1), 0.35); I.snare(T(bt, 3), 0.35);
          if (full) { I.clap(T(bt, 3), 0.25); } for (let x = 0; x < 4; x += 0.5) I.hat(T(bt, x), 0.1);
          break;
      }
    });
  }

  // ---------- Render ----------
  // Ghi lại mọi nốt nhạc trước, rồi render từng đoạn ngắn (song song) và ghép lại.
  // Cách này nhanh hơn rất nhiều so với render cả bài trong 1 lần.
  const DUR = {
    piano: a => a[2] + 0.7, epiano: a => a[2] + 0.6, pluck: a => Math.min(a[2], 1.6) + 0.6, saw: a => a[2] + 0.2, bell: () => 1.3, power: a => a[2] + 0.15,
    pad: a => a[2] + 0.7, bass: a => a[2] + 0.15, kick: () => 0.45, snare: () => 0.3, clap: () => 0.3, hat: () => 0.3, shaker: () => 0.12, rim: () => 0.06
  };
  function recorder(rec) {
    const I = {};
    Object.keys(DUR).forEach(k => { I[k] = function () { const a = Array.prototype.slice.call(arguments); rec.push({ s: a[0], e: a[0] + DUR[k](a), k, a }); }; });
    I.vinyl = function () {};
    return {
      I, bus: { voice: 'voice' },
      voiceLine(notes, male, peak) { if (notes.length) rec.push({ s: notes[0].t - 0.05, e: notes[notes.length - 1].t + notes[notes.length - 1].dur + 0.4, k: 'voiceLine', a: [notes, male, peak] }); },
      fluteLine(notes) { if (notes.length) rec.push({ s: notes[0].t, e: notes[notes.length - 1].t + notes[notes.length - 1].dur + 0.2, k: 'fluteLine', a: [notes] }); }
    };
  }
  function replay(S, ev, off) {
    const a = ev.a.slice();
    if (ev.k === 'voiceLine' || ev.k === 'fluteLine') {
      a[0] = a[0].map(n => Object.assign({}, n, { t: n.t - off }));
      S[ev.k].apply(null, a);
    } else {
      a[0] -= off;
      if (a[a.length - 1] === 'voice') a[a.length - 1] = S.bus.voice;
      S.I[ev.k].apply(null, a);
    }
  }

  async function render(pl, onProgress) {
    const rec = [];
    const R = recorder(rec);
    if (pl.only !== 'voice') accompany(R, pl);
    const male = pl.vc.oct < 0;
    if (pl.only !== 'acc') pl.lines.forEach(l => {
      if (pl.vc.kind === 'voice') R.voiceLine(l.notes, male, male ? 0.38 : 0.3);
      else if (pl.vc.kind === 'flute') R.fluteLine(l.notes);
      else l.notes.forEach(n => R.I.piano(n.t, n.midi + 12, n.dur, 0.42, 'voice'));
    });
    const total = Math.ceil(pl.duration * SR);
    const out = [new Float32Array(total), new Float32Array(total)], wet = [new Float32Array(total), new Float32Array(total)];
    const CH = 6, TAIL = 0.05, nCh = Math.ceil(pl.duration / CH);
    const buckets = Array.from({ length: nCh }, () => []);
    rec.forEach(ev => { const k = Math.max(0, Math.min(nCh - 1, Math.floor(ev.s / CH))); buckets[k].push(ev); });
    let done = 0;
    const OAC = G.OfflineAudioContext || G.webkitOfflineAudioContext;
    async function one(k) {
      const off = k * CH, evs = buckets[k];
      let endT = (k + 1) * CH;
      evs.forEach(e => { if (e.e > endT) endT = e.e; });
      endT = Math.min(endT + TAIL, pl.duration);
      const len = Math.max(128, Math.ceil((endT - off) * SR));
      const ctx = new OAC(4, len, SR);
      const S = Synth(ctx, pl);
      if (pl.st.dr === 'lofi') S.I.vinyl(0, Math.min(CH, pl.duration - off) + 0.02);
      evs.forEach(ev => replay(S, ev, off));
      const b = await ctx.startRendering();
      const o0 = Math.round(off * SR);
      for (let c = 0; c < 4; c++) {
        const d = b.getChannelData(c), o = c < 2 ? out[c] : wet[c - 2], n = Math.min(d.length, total - o0);
        for (let i = 0; i < n; i++) o[o0 + i] += d[i];
      }
      done++; if (onProgress) onProgress(done / nCh * 0.85);
    }
    const order = []; for (let k = 0; k < nCh; k++) order.push(k);
    const PAR = Math.max(2, Math.min(4, (navigator.hardwareConcurrency || 4) - 1));
    await Promise.all(Array.from({ length: PAR }, async () => { while (order.length) await one(order.shift()); }));
    // âm vang cho cả bài trong 1 lần (Freeverb viết bằng JS, nhanh)
    await new Promise(r => setTimeout(r, 0));
    freeverb(wet, out);
    if (onProgress) onProgress(0.97);
    if (!pl.raw) master(out);
    let buf;
    try { buf = new AudioBuffer({ length: total, numberOfChannels: 2, sampleRate: SR }); }
    catch (e) { buf = new OAC(2, 128, SR).createBuffer(2, total, SR); }
    buf.getChannelData(0).set(out[0]); buf.getChannelData(1).set(out[1]);
    if (onProgress) onProgress(1);
    return buf;
  }

  function freeverb(wet, out) {
    const sc = SR / 44100, room = 0.83, damp = 0.25, n = wet[0].length;
    const CB = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617], AP = [556, 441, 341, 225];
    let sIn = 0, sOut = 0;
    for (let c = 0; c < 2; c++) {
      const spread = c ? 23 : 0;
      const combs = CB.map(d => ({ b: new Float32Array(Math.round((d + spread) * sc)), i: 0, f: 0 }));
      const aps = AP.map(d => ({ b: new Float32Array(Math.round((d + spread) * sc)), i: 0 }));
      const x = wet[c], y = new Float32Array(n);
      for (let k = 0; k < n; k++) {
        const inp = x[k] * 0.03; sIn += x[k] * x[k];
        let acc = 0;
        for (let j = 0; j < 8; j++) {
          const cb = combs[j], o = cb.b[cb.i];
          cb.f = o * (1 - damp) + cb.f * damp;
          cb.b[cb.i] = inp + cb.f * room;
          if (++cb.i >= cb.b.length) cb.i = 0;
          acc += o;
        }
        for (let j = 0; j < 4; j++) {
          const ap = aps[j], bo = ap.b[ap.i];
          ap.b[ap.i] = acc + bo * 0.5;
          acc = bo - acc;
          if (++ap.i >= ap.b.length) ap.i = 0;
        }
        y[k] = acc; sOut += acc * acc;
      }
      wet[c] = y;
    }
    const g = sOut > 0 ? Math.sqrt(sIn / sOut) * 0.9 : 0;
    for (let c = 0; c < 2; c++) { const y = wet[c], o = out[c]; for (let k = 0; k < n; k++) o[k] += y[k] * g; }
  }

  // chuẩn hóa âm lượng + giới hạn mềm + fade cuối bài
  function master(out) {
    let peak = 0, sum = 0; const n = out[0].length;
    for (let c = 0; c < 2; c++) { const d = out[c]; for (let i = 0; i < n; i++) { const a = d[i] < 0 ? -d[i] : d[i]; if (a > peak) peak = a; sum += d[i] * d[i]; } }
    if (peak < 1e-5) return;
    const rms = Math.sqrt(sum / (2 * n));
    const g = Math.min(0.2 / rms, 1.6 / peak);
    const fadeN = Math.floor(SR * 2.5);
    for (let c = 0; c < 2; c++) {
      const d = out[c];
      for (let i = 0; i < n; i++) {
        let x = d[i] * g; const a = x < 0 ? -x : x;
        if (a > 0.7) x = (x < 0 ? -1 : 1) * (0.7 + 0.29 * Math.tanh((a - 0.7) / 0.29));
        d[i] = x;
      }
      for (let i = 0; i < fadeN && i < n; i++) d[n - 1 - i] *= i / fadeN;
    }
  }

  // ---------- Xuất file ----------
  function toWav(buf) {
    const ch = buf.numberOfChannels, n = buf.length, bytes = n * ch * 2;
    const out = new DataView(new ArrayBuffer(44 + bytes));
    const ws = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
    ws(0, 'RIFF'); out.setUint32(4, 36 + bytes, true); ws(8, 'WAVE'); ws(12, 'fmt '); out.setUint32(16, 16, true);
    out.setUint16(20, 1, true); out.setUint16(22, ch, true); out.setUint32(24, buf.sampleRate, true); out.setUint32(28, buf.sampleRate * ch * 2, true);
    out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); ws(36, 'data'); out.setUint32(40, bytes, true);
    const data = []; for (let c = 0; c < ch; c++) data.push(buf.getChannelData(c));
    let o = 44;
    for (let i = 0; i < n; i++) for (let c = 0; c < ch; c++) { let s = Math.max(-1, Math.min(1, data[c][i])); out.setInt16(o, s < 0 ? s * 0x8000 : s * 0x7FFF, true); o += 2; }
    return new Uint8Array(out.buffer);
  }

  async function toMp3(buf, kbps, onProgress) {
    const enc = new lamejs.Mp3Encoder(2, buf.sampleRate, kbps || 128);
    const L = buf.getChannelData(0), R = buf.numberOfChannels > 1 ? buf.getChannelData(1) : L;
    const n = L.length, block = 1152, chunks = [];
    const l16 = new Int16Array(block), r16 = new Int16Array(block);
    let lastYield = performance.now();
    for (let i = 0; i < n; i += block) {
      const m = Math.min(block, n - i);
      const lb = m === block ? l16 : new Int16Array(m), rb = m === block ? r16 : new Int16Array(m);
      for (let j = 0; j < m; j++) { let a = L[i + j], b = R[i + j]; a = a < -1 ? -1 : a > 1 ? 1 : a; b = b < -1 ? -1 : b > 1 ? 1 : b; lb[j] = a * 32767; rb[j] = b * 32767; }
      const d = enc.encodeBuffer(lb, rb); if (d.length) chunks.push(new Uint8Array(d));
      if (performance.now() - lastYield > 60) { if (onProgress) onProgress(i / n); await new Promise(r => setTimeout(r, 0)); lastYield = performance.now(); }
    }
    const e = enc.flush(); if (e.length) chunks.push(new Uint8Array(e));
    let total = 0; chunks.forEach(c => total += c.length);
    const out = new Uint8Array(total); let o = 0; chunks.forEach(c => { out.set(c, o); o += c.length; });
    if (onProgress) onProgress(1);
    return out;
  }

  G.Music = { STYLES, VOICES, plan, render, toWav, toMp3, syllables, toneOf, vowelOf, SR };
})(window);
