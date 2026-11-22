/* ===== Bài Hát Tặng — giao diện 8 bước (theo ForeverSongs) ===== */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const L = window.Lyrics, M = window.Music, A = window.Ace;
  const LS_FORM = 'bht_form2', LS_LIB = 'bht_lib2', LS_TOKEN = 'bht_hf';
  const isApp = !!(window.Android && Android.fileBegin);

  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
  };
  // IndexedDB lưu file nhạc (localStorage quá nhỏ)
  const idb = {
    db: null,
    open() { return this.db ? Promise.resolve(this.db) : new Promise((res, rej) => { const r = indexedDB.open('bht', 1); r.onupgradeneeded = () => r.result.createObjectStore('audio'); r.onsuccess = () => res(this.db = r.result); r.onerror = () => rej(r.error); }); },
    async put(k, v) { const db = await this.open(); return new Promise((res, rej) => { const t = db.transaction('audio', 'readwrite'); t.objectStore('audio').put(v, k); t.oncomplete = res; t.onerror = () => rej(t.error); }); },
    async get(k) { const db = await this.open(); return new Promise((res, rej) => { const q = db.transaction('audio').objectStore('audio').get(k); q.onsuccess = () => res(q.result); q.onerror = () => rej(q.error); }); },
    async del(k) { const db = await this.open(); return new Promise(res => { const t = db.transaction('audio', 'readwrite'); t.objectStore('audio').delete(k); t.oncomplete = res; t.onerror = res; }); }
  };

  const f = Object.assign({ rel: '', name: '', occ: '', style: '', voice: '', traits: '', story: '', msg: '', from: '', sex: 'nam', ai: false }, store.get(LS_FORM, {}));
  const save = () => store.set(LS_FORM, f);
  let tt;
  function toast(m) { const t = $('toast'); t.textContent = m; t.classList.add('on'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('on'), 3000); }

  // ---------- Trang ----------
  let page = 'wizard';
  function show(p) {
    page = p;
    ['Wizard', 'Wait', 'Play', 'Lib'].forEach(n => $('pg' + n).classList.toggle('hide', n.toLowerCase() !== p));
    $('btnBack').style.visibility = (p === 'wizard' && step > 1) || p === 'lib' || p === 'play' ? 'visible' : 'hidden';
    if (p === 'lib') renderLib();
    window.scrollTo(0, 0);
  }

  // ---------- Các bước ----------
  let step = 1;
  const TOTAL = 8;
  function opts(el, items, cur, onPick) {
    el.innerHTML = '';
    items.forEach(it => {
      const b = document.createElement('button');
      b.className = 'opt' + (it.id === cur ? ' on' : '');
      b.innerHTML = it.html || it.label;
      b.onclick = () => { el.querySelectorAll('.opt').forEach(x => x.classList.toggle('on', x === b)); onPick(it.id); };
      el.appendChild(b);
    });
  }
  function chips(el, items, cur, onPick) {
    el.innerHTML = '';
    items.forEach(it => {
      const b = document.createElement('button');
      b.className = 'chip' + (it.id === cur ? ' on' : ''); b.textContent = it.label;
      b.onclick = () => { el.querySelectorAll('.chip').forEach(x => x.classList.toggle('on', x === b)); onPick(it.id); };
      el.appendChild(b);
    });
  }
  const styleItems = () => Object.keys(M.STYLES).map(k => ({ id: k, label: M.STYLES[k].label, html: M.STYLES[k].icon + ' ' + M.STYLES[k].label }));
  const VOICES = [{ id: 'nam', label: 'Giọng nam' }, { id: 'nu', label: 'Giọng nữ' }, { id: 'auto', label: 'Chọn giúp tôi' }];

  function initWizard() {
    opts($('relGrid'), L.RELATIONS, f.rel, v => { f.rel = v; save(); setTimeout(next, 180); });
    opts($('occGrid'), L.OCC_UI, f.occ, v => { f.occ = v; save(); setTimeout(next, 180); });
    opts($('styGrid'), styleItems(), f.style, v => { f.style = v; save(); validate(); });
    chips($('voiceChips'), VOICES, f.voice, v => { f.voice = v; save(); validate(); if (f.style) setTimeout(next, 220); });
    chips($('sexChips'), [{ id: 'nam', label: 'Nam' }, { id: 'nu', label: 'Nữ' }], f.sex, v => { f.sex = v; save(); });
    [['inName', 'name'], ['inTraits', 'traits'], ['inStory', 'story'], ['inMsg', 'msg'], ['inFrom', 'from']].forEach(([id, k]) => {
      $(id).value = f[k] || '';
      $(id).oninput = e => { f[k] = e.target.value; save(); validate(); };
    });
    $('inName').onkeydown = e => { if (e.key === 'Enter') next(); };
    const tg = $('tgAI'); tg.classList.toggle('on', !!f.ai);
    tg.onclick = () => { f.ai = !f.ai; tg.classList.toggle('on', f.ai); save(); };
    $('btnNext').onclick = next;
    $('btnPrev').onclick = prev;
    renderStep();
  }
  function valid(s) {
    switch (s) {
      case 1: return !!f.rel;
      case 2: return f.name.trim().length > 0;
      case 3: return !!f.occ;
      case 4: return !!f.style && !!f.voice;
      case 6: return f.story.trim().length >= 30;
      default: return true;
    }
  }
  function validate() {
    $('btnNext').disabled = !valid(step);
    if (step === 6) { const n = f.story.trim().length; $('storyErr').textContent = n < 30 ? 'Vui lòng nhập ít nhất 30 ký tự (' + n + '/30).' : ''; }
  }
  function renderStep() {
    document.querySelectorAll('.step').forEach(el => el.classList.toggle('hide', +el.dataset.s !== step));
    $('stepTxt').textContent = step === TOTAL ? 'Bước cuối cùng' : 'Bước ' + step + '/' + TOTAL;
    const pct = Math.round(step / TOTAL * 100);
    $('pctTxt').textContent = 'Đã hoàn thành ' + pct + '%';
    $('pbar').style.width = pct + '%';
    $('btnPrev').classList.toggle('hide', step === 1);
    $('btnNext').innerHTML = step === TOTAL ? '🎵 Tạo bài hát' : 'Tiếp theo →';
    $('btnBack').style.visibility = step > 1 ? 'visible' : 'hidden';
    validate();
    const focus = { 2: 'inName', 5: 'inTraits', 6: 'inStory', 7: 'inMsg' }[step];
    if (focus) setTimeout(() => { try { $(focus).focus(); } catch (e) {} }, 150);
  }
  function next() {
    if (!valid(step)) return;
    if (step === TOTAL) { createSong(); return; }
    step++; renderStep(); window.scrollTo(0, 0);
  }
  function prev() { if (step > 1) { step--; renderStep(); } }

  // ---------- Lời bài hát ----------
  function formToOpts(seed) {
    const st = M.STYLES[f.style] || M.STYLES.ballad;
    return { occasion: f.occ, relation: f.rel, sender: f.sex, name: f.name, traits: f.traits, story: f.story, message: f.msg, from: f.from, seed, lang: st.lang === 'en' ? 'en' : 'vi' };
  }
  async function aiLyrics(o) {
    const rel = L.RELATIONS.find(x => x.id === o.relation), occ = L.OCC_UI.find(x => x.id === o.occasion);
    const [T, B] = rel.pr(o.sender);
    const en = o.lang === 'en';
    const prompt = (en ? 'Write English song lyrics' : 'Bạn là nhạc sĩ Việt Nam. Viết lời một bài hát tiếng Việt tự nhiên, cảm động, có vần') +
      ' để tặng ' + rel.label.toLowerCase() + ' tên ' + o.name + ', dịp: ' + occ.label + '. Người hát xưng "' + T + '", gọi người nhận là "' + B + '". ' +
      (o.traits ? 'Tính cách người nhận: ' + o.traits + '. ' : '') + 'Kỷ niệm (phải đưa vào lời): ' + o.story + '. ' +
      (o.message ? 'Lời nhắn gửi: ' + o.message + '. ' : '') + (o.from ? 'Người tặng: ' + o.from + '. ' : '') +
      'Mỗi câu 6–10 chữ. Trả lời ĐÚNG định dạng, không giải thích:\nTên bài: ...\n[Phiên khúc 1]\n(4 câu)\n[Điệp khúc]\n(4 câu, có tên người nhận)\n[Phiên khúc 2]\n(4 câu)\n[Cầu nối]\n(2 câu)';
    const ctl = new AbortController(); const to = setTimeout(() => ctl.abort(), 25000);
    try {
      const res = await fetch('https://text.pollinations.ai/' + encodeURIComponent(prompt) + '?model=openai&seed=' + (o.seed % 100000), { signal: ctl.signal });
      if (!res.ok) throw new Error('HTTP ' + res.status);
      let txt = await res.text();
      const tm = txt.match(/tên bài\s*[:：]\s*(.+)/i);
      const i0 = txt.indexOf('['); if (i0 < 0) throw new Error('format');
      txt = txt.slice(i0).split('\n').filter(l => !/pollinations|https?:|---|sponsor/i.test(l) && l.trim().split(/\s+/).length < 22).join('\n');
      let secs = L.parse(txt);
      const ch = secs.find(s => s.type === 'chorus');
      if (secs.length < 3 || !ch) throw new Error('format');
      if (secs.filter(s => s.type === 'chorus').length === 1) {
        const v = secs.filter(s => s.type === 'verse'), br = secs.find(s => s.type === 'bridge'), out = [];
        if (v[0]) out.push(v[0]); out.push(ch); if (v[1]) { out.push(v[1]); out.push(ch); } if (br) out.push(br); out.push(ch);
        secs = out;
      }
      return { title: tm ? tm[1].replace(/[*"“”]/g, '').trim() : 'Gửi ' + o.name, sections: secs, text: L.toText(secs) };
    } finally { clearTimeout(to); }
  }

  // ---------- Tạo bài hát ----------
  let song = null, abortCtl = null;
  async function createSong() {
    const seed = (Date.now() ^ Math.floor(Math.random() * 1e9)) >>> 0;
    const o = formToOpts(seed);
    song = null;
    waitUI(1, 'Đang viết lời bài hát…', 0.03, '');
    show('wait');
    let ly = null;
    if (f.ai) { try { ly = await aiLyrics(o); } catch (e) { toast('AI viết lời chưa được, dùng lời tự soạn'); } }
    if (!ly) ly = L.compose(o);
    const rel = L.RELATIONS.find(x => x.id === f.rel), occ = L.OCC_UI.find(x => x.id === f.occ);
    song = { id: 's' + Date.now(), title: ly.title, text: ly.text, style: f.style, voice: f.voice, sex: f.sex, to: f.name.trim() || rel.label, occ: occ.label, created: Date.now(), lang: o.lang, mseed: seed };
    await sing();
  }

  function waitUI(stage, msg, p, lyr) {
    $('wTitle').textContent = song ? 'Đang sáng tác bài hát tặng ' + song.to : 'Đang sáng tác bài hát…';
    document.querySelectorAll('.st').forEach(el => { const w = +el.dataset.w; el.classList.toggle('done', w < stage); el.classList.toggle('on', w === stage); });
    if (msg != null) $('wMsg').textContent = msg;
    if (p != null) $('wBar').style.width = Math.round(p * 100) + '%';
    if (lyr != null) $('wLyr').textContent = lyr;
  }

  async function sing() {
    stop(); offset = 0; buffer = null; bytes = null;
    const sections = L.parse(song.text);
    if (!sections.length) { toast('Lời bài hát trống'); show('wizard'); return; }
    show('wait');
    waitUI(2, 'Đang kết nối phòng thu AI…', 0.08, song.title + '\n\n' + song.text);
    abortCtl = new AbortController();
    const myCtl = abortCtl;
    let lastMsg = 'Đang kết nối phòng thu AI…';
    try {
      const r = await A.generate({ sections, style: song.style, voice: song.voice, sex: song.sex, lang: song.lang, token: store.get(LS_TOKEN, '') },
        (msg, p, secs) => {
          if (myCtl.signal.aborted) return;
          if (msg != null) lastMsg = msg;
          const stage = /tải bài/i.test(lastMsg) ? 4 : /kết nối|chuẩn bị/i.test(lastMsg) ? 2 : 3;
          waitUI(stage, secs != null ? (stage === 3 && !/xếp hàng/i.test(lastMsg) ? 'AI đang thu âm giọng hát…' : lastMsg) + ' · ' + secs + ' giây' : lastMsg, p);
        }, myCtl.signal);
      if (myCtl.signal.aborted) return;
      waitUI(4, 'Đang hoàn thiện…', 0.97);
      song.aiVoice = r.voice; song.lrc = r.lrc || ''; song.mime = r.mime; song.ai = true;
      song.audioKey = 'a_' + song.id;
      await idb.put(song.audioKey, r.bytes).catch(() => {});
      bytes = r.bytes;
      buffer = await decode(r.bytes);
      saveToLib(song);
      openPlayer(true);
    } catch (e) {
      if (myCtl.signal.aborted) return;
      console.error(e);
      showFail(e);
    }
  }
  $('btnCancel').onclick = () => { if (abortCtl) abortCtl.abort(); show('wizard'); };
  let failQuota = false;
  function showFail(e) {
    failQuota = A.isQuota(e);
    $('failMsg').textContent = A.friendlyError(e);
    $('failToken').classList.toggle('hide', !failQuota);
    $('failTokenIn').value = store.get(LS_TOKEN, '');
    $('fRetry').textContent = failQuota ? '💾 Lưu mã và thử lại' : '🔄 Thử lại';
    modal('mFail', true);
  }
  $('fRetry').onclick = () => {
    if (failQuota) {
      const v = $('failTokenIn').value.trim();
      if (!/^hf_[A-Za-z0-9]{10,}$/.test(v)) { toast('Mã chưa đúng, mã phải bắt đầu bằng hf_'); return; }
      store.set(LS_TOKEN, v); A.reset();
    }
    modal('mFail', false); sing();
  };
  $('fClose').onclick = () => { modal('mFail', false); show('wizard'); };
  $('fOffline').onclick = async () => { modal('mFail', false); await offlineVersion(); };

  // bản dự phòng: giai điệu soạn trên máy (không lời hát)
  let offPlan = null;
  async function offlineVersion() {
    ov(true, 'Đang soạn giai điệu offline…');
    try {
      const secs = L.parse(song.text);
      offPlan = M.plan(secs, song.style, song.sex === 'nu' ? 'nu' : 'nam', song.mseed);
      buffer = await M.render(offPlan, p => ov(true, 'Đang hòa âm… ' + Math.round(p * 100) + '%'));
      bytes = null; song.ai = false;
      ov(false); openPlayer(true);
    } catch (e) { ov(false); toast('Lỗi: ' + e.message); show('wizard'); }
  }
  function ov(on, t) { $('ov').classList.toggle('on', on); if (t != null) $('ovT').textContent = t; }

  async function decode(u8) {
    ensureAC();
    const ab = u8.buffer.slice(u8.byteOffset, u8.byteOffset + u8.byteLength);
    return await new Promise((res, rej) => ac.decodeAudioData(ab, res, rej));
  }

  // ---------- Trình phát ----------
  let ac = null, src = null, playing = false, startAt = 0, offset = 0, raf = 0, buffer = null, bytes = null;
  const fmt = s => { s = Math.max(0, Math.floor(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
  function ensureAC() { if (!ac) ac = new (window.AudioContext || window.webkitAudioContext)(); if (ac.state === 'suspended') ac.resume(); return ac; }
  function play() {
    if (!buffer) return; ensureAC();
    if (offset >= buffer.duration - 0.1) offset = 0;
    src = ac.createBufferSource(); src.buffer = buffer; src.connect(ac.destination);
    src.onended = () => { if (playing && cur() >= buffer.duration - 0.25) { playing = false; offset = 0; ui(); } };
    src.start(0, offset); startAt = ac.currentTime - offset; playing = true; ui(); loop();
  }
  function stop() { if (src) { try { src.onended = null; src.stop(); } catch (e) {} src = null; } if (playing) offset = cur(); playing = false; cancelAnimationFrame(raf); }
  function pause() { stop(); ui(); }
  function cur() { return playing && ac ? ac.currentTime - startAt : offset; }
  function seek(t) { const was = playing; stop(); offset = Math.max(0, Math.min(buffer.duration, t)); if (was) play(); else { ui(); karaoke(offset); } }
  function loop() { cancelAnimationFrame(raf); const s = () => { if (!playing) return; const t = cur(); $('progI').style.width = (t / buffer.duration * 100) + '%'; $('tCur').textContent = fmt(t); karaoke(t); raf = requestAnimationFrame(s); }; raf = requestAnimationFrame(s); }
  function ui() {
    $('btnPlay').textContent = playing ? '❚❚' : '▶'; $('cover').classList.toggle('paused', !playing);
    if (buffer) { const t = cur(); $('progI').style.width = (t / buffer.duration * 100) + '%'; $('tCur').textContent = fmt(t); }
  }
  $('btnPlay').onclick = () => playing ? pause() : play();
  $('prog').addEventListener('pointerdown', e => { if (!buffer) return; const r = $('prog').getBoundingClientRect(); seek(Math.max(0, Math.min(1, (e.clientX - r.left) / r.width)) * buffer.duration); });

  // karaoke: theo LRC của AI, nếu không có thì chia đều theo thời lượng
  let lines = [], curLine = -1;
  function openPlayer(autoplay) {
    const st = M.STYLES[song.style] || M.STYLES.ballad;
    $('cover').style.background = 'linear-gradient(135deg,' + st.grad[0] + ',' + st.grad[1] + ')';
    const vName = song.ai ? (song.aiVoice === 'nu' ? 'Giọng nữ' : 'Giọng nam') : 'Giai điệu offline';
    $('cvTag').textContent = st.icon + ' ' + st.label + ' · ' + vName;
    $('cvTitle').textContent = song.title;
    $('cvTo').textContent = '🎁 Tặng ' + song.to + ' · ' + song.occ;
    $('tDur').textContent = fmt(buffer.duration);
    $('playNote').textContent = song.ai ? 'Bài hát do AI ACE-Step sáng tác và hát. Chưa ưng? Bấm "Hát bản khác".' : 'Bản giai điệu offline, không có giọng hát. Khi có mạng, bấm "Hát bản khác" để AI hát.';
    const box = $('lyr'); box.innerHTML = ''; lines = []; curLine = -1;
    const secs = L.parse(song.text);
    const lrc = song.ai ? A.parseLrc(song.lrc) : [];
    let all = []; secs.forEach((s, si) => s.lines.forEach(l => all.push({ text: l, label: s.label, si })));
    if (!song.ai && offPlan) all = offPlan.lines.map(l => ({ text: l.text, label: l.label, si: l.secIndex, t: l.notes.length ? l.notes[0].t : 0 }));
    else if (lrc.length) {
      let j = 0; const norm = s => s.toLowerCase().replace(/[^\p{L}\p{N} ]/gu, '').trim();
      all.forEach(a => { for (let k = j; k < lrc.length; k++) { const x = norm(lrc[k].text), y = norm(a.text); if (x === y || x.indexOf(y.slice(0, 12)) === 0) { a.t = lrc[k].t; j = k + 1; break; } } });
    }
    const D = buffer.duration, n = all.length, start = Math.min(12, D * 0.08), span = D * 0.88 - start;
    all.forEach((a, i) => { if (a.t == null) a.t = start + span * i / n; });
    let last = -1;
    all.forEach(a => {
      if (a.si !== last) { const h = document.createElement('h4'); h.textContent = a.label; box.appendChild(h); last = a.si; }
      const p = document.createElement('p'); p.textContent = a.text; p.onclick = () => seek(Math.max(0, a.t - 0.3));
      box.appendChild(p); lines.push({ p, t: a.t });
    });
    show('play'); ui();
    if (autoplay) play();
  }
  function karaoke(t) {
    let idx = -1;
    for (let i = 0; i < lines.length; i++) { if (t >= lines[i].t - 0.3) idx = i; else break; }
    if (idx === curLine) return;
    if (curLine >= 0 && lines[curLine]) lines[curLine].p.classList.remove('cur');
    curLine = idx;
    if (idx >= 0) { const e = lines[idx].p, box = $('lyr'); e.classList.add('cur'); box.scrollTop = e.offsetTop - box.offsetTop - box.clientHeight / 3; }
  }

  // ---------- Hành động ----------
  function modal(id, on) { $(id).classList.toggle('on', on); }
  const fresh = extra => { song = Object.assign({}, song, { id: 's' + Date.now(), created: Date.now(), lrc: '', audioKey: null }, extra || {}); };
  $('aEdit').onclick = () => { $('edTitle').value = song.title; $('edText').value = song.text; modal('mEdit', true); };
  $('edCancel').onclick = () => modal('mEdit', false);
  $('edOk').onclick = () => { modal('mEdit', false); fresh({ title: $('edTitle').value.trim() || song.title, text: $('edText').value }); sing(); };
  $('aAgain').onclick = () => { fresh(); sing(); };
  let pend = {};
  $('aStyle').onclick = () => {
    pend = { style: song.style, voice: song.voice };
    opts($('styGrid2'), styleItems(), pend.style, v => pend.style = v);
    chips($('voiceChips2'), VOICES, pend.voice, v => pend.voice = v);
    modal('mStyle', true);
  };
  $('stCancel').onclick = () => modal('mStyle', false);
  $('stOk').onclick = () => { modal('mStyle', false); fresh({ style: pend.style, voice: pend.voice }); sing(); };
  $('aNew').onclick = () => { stop(); ui(); step = 1; renderStep(); show('wizard'); };

  function safeName(s) { return (s || 'bai_hat').normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/đ/g, 'd').replace(/Đ/g, 'D').replace(/[^\w\- ]+/g, '').trim().replace(/\s+/g, '_').slice(0, 40) || 'bai_hat'; }
  function b64(u8) { let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); }
  function extOf(mime) { return mime === 'audio/wav' ? '.wav' : mime === 'audio/flac' ? '.flac' : '.mp3'; }
  async function sendBytes(u8, name, mime, action) {
    if (isApp) {
      Android.fileBegin(name, mime);
      const CH = 3 * 256 * 1024;
      for (let i = 0; i < u8.length; i += CH) Android.fileChunk(b64(u8.subarray(i, i + CH)));
      return action === 'share' ? Android.fileShare() : Android.fileSave();
    }
    const blob = new Blob([u8], { type: mime });
    if (action === 'share' && navigator.canShare) { const file = new File([blob], name, { type: mime }); if (navigator.canShare({ files: [file] })) { await navigator.share({ files: [file], title: song.title }); return ''; } }
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click();
    setTimeout(() => { URL.revokeObjectURL(a.href); a.remove(); }, 3000);
    return 'Đã tải ' + name;
  }
  async function exportAudio() {
    if (bytes) return { u8: bytes, mime: song.mime || 'audio/mpeg', name: safeName(song.title) + extOf(song.mime) };
    ov(true, 'Đang nén MP3…');
    const mp3 = await M.toMp3(buffer, 128, p => ov(true, 'Đang nén MP3… ' + Math.round(p * 100) + '%'));
    ov(false);
    return { u8: mp3, mime: 'audio/mpeg', name: safeName(song.title) + '.mp3' };
  }
  $('aSave').onclick = async () => { try { const x = await exportAudio(); toast(await sendBytes(x.u8, x.name, x.mime, 'save') || 'Đã lưu'); } catch (e) { ov(false); toast('Lỗi lưu: ' + e.message); } };
  $('aShare').onclick = async () => { try { const x = await exportAudio(); const m = await sendBytes(x.u8, x.name, x.mime, 'share'); if (m) toast(m); } catch (e) { ov(false); toast('Lỗi chia sẻ: ' + e.message); } };

  // ---------- Thư viện ----------
  function saveToLib(s) {
    const lib = store.get(LS_LIB, []).filter(x => x.id !== s.id);
    lib.unshift(Object.assign({}, s));
    lib.slice(40).forEach(x => x.audioKey && idb.del(x.audioKey));
    store.set(LS_LIB, lib.slice(0, 40));
  }
  function renderLib() {
    const lib = store.get(LS_LIB, []), box = $('libList'); box.innerHTML = '';
    if (!lib.length) { box.innerHTML = '<div class="empty">Chưa có bài hát nào.<br>Hãy tạo bài đầu tiên ✨</div>'; return; }
    lib.forEach(s => {
      const st = M.STYLES[s.style] || M.STYLES.ballad, d = new Date(s.created);
      const it = document.createElement('div'); it.className = 'it';
      it.innerHTML = '<div class="th" style="background:linear-gradient(135deg,' + st.grad[0] + ',' + st.grad[1] + ')">' + st.icon + '</div><div class="tx"><b></b><small></small></div><button class="del">🗑</button>';
      it.querySelector('b').textContent = s.title;
      it.querySelector('small').textContent = 'Tặng ' + s.to + ' · ' + st.label + ' · ' + d.toLocaleDateString('vi-VN');
      const open = async () => {
        try {
          const u8 = s.audioKey && await idb.get(s.audioKey);
          if (!u8) { toast('Không tìm thấy file nhạc, đang hát lại…'); song = Object.assign({}, s); sing(); return; }
          stop(); offset = 0; song = Object.assign({}, s); bytes = u8; buffer = await decode(u8); openPlayer(true);
        } catch (e) { toast('Lỗi mở bài: ' + e.message); }
      };
      it.querySelector('.tx').onclick = open; it.querySelector('.th').onclick = open;
      it.querySelector('.del').onclick = () => { if (confirm('Xóa bài "' + s.title + '"?')) { if (s.audioKey) idb.del(s.audioKey); store.set(LS_LIB, store.get(LS_LIB, []).filter(x => x.id !== s.id)); renderLib(); } };
      box.appendChild(it);
    });
  }

  // ---------- Thanh trên ----------
  $('btnLib').onclick = () => { stop(); ui(); show('lib'); };
  $('btnSet').onclick = () => { $('inToken').value = store.get(LS_TOKEN, ''); modal('mSet', true); };
  $('setCancel').onclick = () => modal('mSet', false);
  $('setOk').onclick = () => { const v = $('inToken').value.trim(); if (v && !/^hf_/.test(v)) { toast('Mã phải bắt đầu bằng hf_'); return; } store.set(LS_TOKEN, v); A.reset(); modal('mSet', false); toast(v ? 'Đã lưu mã Hugging Face' : 'Đã xóa mã'); };
  $('btnBack').onclick = () => window.handleBack();

  window.handleBack = function () {
    for (const id of ['mEdit', 'mStyle', 'mSet', 'mFail']) if ($(id).classList.contains('on')) { modal(id, false); if (id === 'mFail') show('wizard'); return true; }
    if ($('ov').classList.contains('on')) return true;
    if (page === 'wait') { if (abortCtl) abortCtl.abort(); show('wizard'); return true; }
    if (page === 'play' || page === 'lib') { stop(); ui(); show('wizard'); return true; }
    if (page === 'wizard' && step > 1) { prev(); return true; }
    return false;
  };
  document.addEventListener('visibilitychange', () => { if (document.hidden && playing) pause(); });
  window.onAppPause = () => { if (playing) pause(); };

  initWizard();
  show('wizard');
})();
