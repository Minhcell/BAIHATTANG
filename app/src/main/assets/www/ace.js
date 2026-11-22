/* ===== Hát bằng AI: ACE-Step 1.5 trên Hugging Face (miễn phí) ===== */
(function (G) {
  'use strict';
  const SPACE = 'ACE-Step/Ace-Step-v1.5';

  // Mô tả phong cách gửi cho AI (tiếng Anh cho mô hình hiểu tốt nhất)
  const CAPTION = {
    ballad: 'Vietnamese ballad, emotional, soft piano, warm strings, slow tempo, heartfelt',
    pop: 'Vietnamese pop, V-pop, upbeat, catchy, bright guitar, modern drums',
    acoustic: 'acoustic, warm acoustic guitar fingerpicking, cajon, intimate, gentle',
    indie: 'Vietnamese indie, dreamy clean electric guitar, mellow, chill drums',
    lofi: 'lofi chill, jazzy electric piano, soft boom bap beat, vinyl crackle, relaxed',
    rnb: 'R&B, smooth, soulful, electric piano, groovy bass, laid-back beat',
    edm: 'EDM remix, energetic, dance, synth, four on the floor, drop, Vietnamese remix',
    kids: 'children song, cheerful, playful, xylophone, ukulele, bright and happy',
    rock: 'Vietnamese rock, distorted electric guitars, powerful drums, energetic, anthem',
    popen: 'pop, catchy, modern, upbeat, guitar and synth, radio-friendly',
    bolero: 'Vietnamese bolero, nhac vang, sentimental, classical guitar, slow rumba rhythm'
  };
  // Tự chọn giọng hợp với thể loại & người tặng
  function pickVoice(voice, style, sex) {
    if (voice === 'nam' || voice === 'nu') return voice;
    if (style === 'kids' || style === 'rnb') return 'nu';
    if (style === 'rock') return 'nam';
    return sex === 'nu' ? 'nu' : 'nam';
  }
  const VOICE_TXT = {
    nam: 'male vocal, warm expressive male singer',
    nu: 'female vocal, sweet expressive female singer'
  };

  // Lời bài hát theo định dạng của ACE-Step
  function lyricsFor(sections) {
    const tag = s => s.type === 'chorus' ? 'Chorus' : s.type === 'bridge' ? 'Bridge' : s.type === 'outro' ? 'Outro' : s.type === 'intro' ? 'Intro' : 'Verse';
    let vn = 0;
    return sections.map(s => {
      let t = tag(s);
      if (t === 'Verse') t += ' ' + (++vn);
      return '[' + t + ']\n' + s.lines.join('\n');
    }).join('\n\n');
  }
  function durationFor(sections) {
    let n = 0; sections.forEach(s => n += s.lines.length);
    return Math.max(60, Math.min(180, Math.round(n * 5 + 16)));
  }

  let client = null, clientToken = null, endpoint = null;

  async function connect(token, onStatus) {
    if (client && clientToken === (token || '')) return client;
    onStatus && onStatus('Đang kết nối phòng thu AI…');
    const opts = { events: ['data', 'status'] };
    if (token) opts.token = opts.hf_token = token;
    client = await G.GradioClient.Client.connect(SPACE, opts);
    clientToken = token || '';
    endpoint = null;
    return client;
  }

  function findEndpoint(api) {
    const eps = api.named_endpoints || {};
    if (eps['/generation_wrapper']) return '/generation_wrapper';
    // tìm hàm có cả "Lyrics" và "Audio Duration"
    for (const k of Object.keys(eps)) {
      const labels = (eps[k].parameters || []).map(p => p.label || '');
      if (labels.some(l => /^lyrics$/i.test(l)) && labels.some(l => /duration/i.test(l)) && labels.length > 20) return k;
    }
    return null;
  }

  // Gán giá trị theo nhãn tham số (chịu được khi họ đổi thứ tự)
  function buildArgs(params, v) {
    return params.map(p => {
      const l = (p.label || '').trim();
      const def = p.parameter_has_default ? p.parameter_default : null;
      if (/^song description$|caption|^prompt$/i.test(l)) return v.caption;
      if (/^lyrics$/i.test(l)) return v.lyrics;
      if (/^vocal language/i.test(l)) return Array.isArray(def) ? [v.lang] : v.lang;
      if (/audio duration/i.test(l)) return v.duration;
      if (/^batch size$/i.test(l)) return 1;
      if (/^random seed$/i.test(l)) return true;
      if (/^audio format$/i.test(l)) return 'mp3';
      if (/^(auto|get) lrc$/i.test(l)) return true;
      if (/^(auto|get) scores?$/i.test(l)) return false;
      if (/^autogen$/i.test(l)) return false;
      if (p.component === 'Radio' && def === 'custom') return 'custom';
      if (/^bpm/i.test(l)) return v.bpm || def;
      if (/^models?$/i.test(l)) return def;
      return def;
    });
  }

  const AUDIO_RE = /\.(mp3|wav|flac|ogg|m4a|opus|aac)(\?|$)/i;
  let ROOT = '';
  function toUrl(x) {
    if (!x) return null;
    if (/^(https?:|blob:|data:)/.test(x)) return x;
    return ROOT.replace(/\/$/, '') + '/gradio_api/file=' + x;
  }
  // tìm file nhạc ở mọi dạng: {url}, {path}, {value:{...}}, chuỗi đường dẫn, mảng file
  function findAudio(data, depth) {
    depth = depth || 0;
    if (data == null || depth > 5) return null;
    if (typeof data === 'string') return AUDIO_RE.test(data) && data.length < 600 ? toUrl(data) : null;
    if (Array.isArray(data)) { for (const it of data) { const u = findAudio(it, depth + 1); if (u) return u; } return null; }
    if (typeof data === 'object') {
      const u = data.url || null, pth = data.path || data.name || null;
      if (u && (AUDIO_RE.test(u) || /audio/i.test(data.mime_type || '') || AUDIO_RE.test(pth || '') || AUDIO_RE.test(data.orig_name || ''))) return toUrl(u);
      if (pth && typeof pth === 'string' && AUDIO_RE.test(pth)) return toUrl(pth);
      for (const k of Object.keys(data)) { if (k === 'meta') continue; const r = findAudio(data[k], depth + 1); if (r) return r; }
    }
    return null;
  }
  function statusText(data) {
    const out = [];
    (data || []).forEach(it => { const s = typeof it === 'string' ? it : (it && typeof it.value === 'string' ? it.value : null); if (s && /error|lỗi|❌|fail|exceed|abort|timeout/i.test(s)) out.push(s.slice(0, 300)); });
    return out.join(' | ');
  }
  function shape(v) {
    if (v == null) return '∅';
    if (typeof v === 'string') return 's' + v.length + (AUDIO_RE.test(v) ? '♪' : '');
    if (Array.isArray(v)) return '[' + v.slice(0, 3).map(shape).join(',') + (v.length > 3 ? '…' + v.length : '') + ']';
    if (typeof v === 'object') return '{' + Object.keys(v).slice(0, 6).join(',') + '}';
    return typeof v;
  }
  function findLrc(data) {
    for (const it of data || []) {
      const s = typeof it === 'string' ? it : (it && typeof it.value === 'string' ? it.value : null);
      if (s && /\[\d{1,2}:\d{2}(\.\d+)?\]/.test(s)) return s;
    }
    return '';
  }

  /**
   * Tạo bài hát. o: {sections, style, voice, sex, lang, token}
   * onStatus(text, progress0..1)
   * Trả về {bytes: Uint8Array (mp3), lrc, voice}
   */
  async function generate(o, onStatus, signal) {
    if (o.server) return generateRest(o, onStatus, signal);
    const voice = pickVoice(o.voice, o.style, o.sex);
    const lang = o.lang || 'vi';
    const st = G.Music.STYLES[o.style] || G.Music.STYLES.ballad;
    const caption = (CAPTION[o.style] || CAPTION.ballad) + ', ' + VOICE_TXT[voice] + (lang === 'vi' ? ', Vietnamese lyrics, clear Vietnamese pronunciation' : '');
    const lyrics = lyricsFor(o.sections);
    const duration = durationFor(o.sections);

    const c = await connect(o.token, t => onStatus(t, 0.05));
    if (signal && signal.aborted) throw new Error('Đã hủy');
    if (!endpoint) {
      onStatus('Đang chuẩn bị phòng thu…', 0.08);
      const api = await c.view_api();
      endpoint = findEndpoint(api);
      if (!endpoint) throw new Error('Phòng thu AI đã thay đổi, chưa tìm thấy chức năng tạo nhạc');
      endpoint = { name: endpoint, params: api.named_endpoints[endpoint].parameters };
    }
    const args = buildArgs(endpoint.params, { caption, lyrics, lang, duration, bpm: st.bpm });
    const job = c.submit(endpoint.name, args);
    if (signal) signal.addEventListener('abort', () => { try { job.cancel(); } catch (e) {} });

    let last = null, t0 = Date.now(), lastData = null, nData = 0, stats = [];
    try { ROOT = (c.config && (c.config.root || c.config.root_url)) || ''; } catch (e) {}
    if (!ROOT) ROOT = 'https://ace-step-ace-step-v1-5.hf.space';
    const tick = setInterval(() => {
      const s = Math.round((Date.now() - t0) / 1000);
      onStatus(null, Math.min(0.9, 0.15 + s / 150), s);
    }, 1000);
    try {
      for await (const ev of job) {
        if (signal && signal.aborted) throw new Error('Đã hủy');
        if (ev.type === 'status') {
          stats.push((ev.stage || '?') + (ev.original_msg ? ':' + ev.original_msg : '') + (ev.success === false ? '!' : ''));
          if (ev.stage === 'error') { const er = new Error((ev.title ? ev.title + ': ' : '') + (ev.message || 'Phòng thu AI báo lỗi')); er.quota = /quota|ZeroGPU/i.test((ev.title || '') + (ev.message || '')); throw er; }
          if (ev.queue && ev.position != null && ev.position > 0) onStatus('Đang xếp hàng: còn ' + ev.position + ' bài trước bạn' + (ev.eta ? ' (~' + Math.round(ev.eta) + ' giây)' : ''), null);
          else if (ev.stage === 'pending' || ev.stage === 'generating') onStatus('AI đang thu âm giọng hát…', null);
          if (ev.stage === 'complete' && ev.success === false) throw new Error(ev.message || 'Tạo nhạc thất bại');
        } else if (ev.type === 'data') {
          nData++; lastData = ev.data;
          if (findAudio(ev.data)) last = ev.data;
        }
      }
    } finally { clearInterval(tick); }
    const url = last && findAudio(last);
    if (!url) {
      const st = statusText(lastData);
      const er = new Error(st ? 'Phòng thu AI báo: ' + st : 'Phòng thu AI không trả về file nhạc. Vui lòng thử lại.');
      er.debug = 'Thời gian ' + Math.round((Date.now() - t0) / 1000) + 's · Trạng thái: ' + stats.slice(-6).join(' > ') + ' · Số gói dữ liệu: ' + nData +
        (lastData ? ' · Dữ liệu cuối: ' + lastData.slice(0, 12).map(shape).join(' ') : '');
      throw er;
    }
    onStatus('Đang tải bài hát về máy…', 0.93);
    let res;
    try { res = await fetch(url); } catch (e) { res = null; }
    if ((!res || res.status === 401 || res.status === 403 || res.status === 404) && o.token) res = await fetch(url, { headers: { Authorization: 'Bearer ' + o.token } });
    if (!res) throw new Error('Không tải được file nhạc từ phòng thu');
    if (!res.ok) throw new Error('Tải nhạc lỗi (' + res.status + ')');
    const bytes = new Uint8Array(await res.arrayBuffer());
    return { bytes, lrc: findLrc(last), voice, mime: /\.wav/i.test(url) ? 'audio/wav' : /\.flac/i.test(url) ? 'audio/flac' : 'audio/mpeg' };
  }

  function isQuota(e) { const m = String((e && e.message) || e || ''); return !!(e && e.quota) || /quota|ZeroGPU|exceeded|token/i.test(m); }

  // ===== Máy chủ Colab (API REST của ACE-Step) =====
  async function generateRest(o, onStatus, signal) {
    const base = o.server.replace(/\/+$/, '');
    const voice = pickVoice(o.voice, o.style, o.sex);
    const lang = o.lang || 'vi';
    const st = G.Music.STYLES[o.style] || G.Music.STYLES.ballad;
    const caption = (CAPTION[o.style] || CAPTION.ballad) + ', ' + VOICE_TXT[voice] + (lang === 'vi' ? ', Vietnamese lyrics, clear Vietnamese pronunciation' : '');
    const body = {
      prompt: caption, lyrics: lyricsFor(o.sections), vocal_language: lang, audio_duration: durationFor(o.sections),
      bpm: st.bpm, batch_size: 1, audio_format: 'mp3', thinking: true, use_random_seed: true, inference_steps: 8
    };
    const j = async (path, data) => {
      const r = await fetch(base + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data), signal });
      if (!r.ok) throw new Error('Máy chủ Colab lỗi ' + r.status + (r.status === 530 || r.status === 502 ? ' (máy chủ đã tắt, hãy chạy lại Colab và dán link mới)' : ''));
      const x = await r.json();
      if (x.code && x.code !== 200) throw new Error(x.error || ('Lỗi ' + x.code));
      return x.data;
    };
    onStatus('Đang kết nối máy chủ Colab…', 0.05);
    const t0 = Date.now();
    const rel = await j('/release_task', body);
    const id = rel && (rel.task_id || rel.job_id);
    if (!id) throw new Error('Máy chủ không nhận yêu cầu');
    onStatus(rel.queue_position > 1 ? 'Đang xếp hàng: vị trí ' + rel.queue_position : 'AI đang thu âm giọng hát…', 0.12);
    let file = null, lrc = '';
    for (;;) {
      if (signal && signal.aborted) throw new Error('Đã hủy');
      await new Promise(r => setTimeout(r, 3000));
      const q = await j('/query_result', { task_id_list: [id] });
      const it = Array.isArray(q) ? q[0] : q;
      if (!it) continue;
      let res = it.result;
      if (typeof res === 'string') { try { res = JSON.parse(res); } catch (e) { res = []; } }
      const first = Array.isArray(res) ? res[0] : res;
      const secs = Math.round((Date.now() - t0) / 1000);
      if (it.status === 2) throw new Error('Máy chủ Colab báo lỗi: ' + ((first && first.error) || it.progress_text || 'không rõ'));
      if (it.status === 1) {
        file = first && (first.file || (first.audio_paths && first.audio_paths[0]));
        lrc = (first && (first.lrc || first.lyrics_timestamps)) || '';
        break;
      }
      const pr = first && first.progress != null ? +first.progress : null;
      onStatus('AI đang thu âm giọng hát… ' + secs + ' giây', pr != null && pr > 0 ? Math.min(0.92, 0.12 + pr * 0.8) : Math.min(0.9, 0.12 + secs / 200));
      if (secs > 900) throw new Error('Quá lâu không có kết quả, vui lòng thử lại');
    }
    if (!file) throw new Error('Máy chủ Colab không trả về file nhạc');
    const url = /^https?:/.test(file) ? file : base + (file.charAt(0) === '/' ? '' : '/') + file;
    onStatus('Đang tải bài hát về máy…', 0.94);
    const r = await fetch(url, { signal });
    if (!r.ok) throw new Error('Tải nhạc lỗi (' + r.status + ')');
    return { bytes: new Uint8Array(await r.arrayBuffer()), lrc: typeof lrc === 'string' ? lrc : '', voice, mime: /\.wav/i.test(file) ? 'audio/wav' : 'audio/mpeg' };
  }

  function friendlyError(e) {
    const m = String((e && e.message) || e || '');
    if (e && e.quota || /quota|ZeroGPU|exceeded/i.test(m)) return 'Hết lượt AI miễn phí. Hugging Face yêu cầu mã (token) của tài khoản miễn phí để được dùng tiếp. Làm theo hướng dẫn bên dưới rồi bấm "Lưu mã và thử lại".';
    if (/Colab/i.test(m)) return m;
    if (/fetch|network|Failed to|connect|NetworkError|load/i.test(m)) return 'Không kết nối được phòng thu AI. Kiểm tra mạng Internet rồi thử lại.';
    if (/sleep|paused|building|starting/i.test(m)) return 'Phòng thu AI đang khởi động, vui lòng thử lại sau 1–2 phút.';
    return m || 'Lỗi không rõ';
  }

  // LRC -> danh sách [giây, câu]
  function parseLrc(s) {
    const out = [];
    (s || '').split(/\r?\n/).forEach(l => {
      const re = /\[(\d{1,2}):(\d{2}(?:\.\d+)?)\]/g; let m, times = [];
      while ((m = re.exec(l))) times.push(+m[1] * 60 + parseFloat(m[2]));
      const txt = l.replace(re, '').trim();
      if (txt && !/^\[.*\]$/.test(txt)) times.forEach(t => out.push({ t, text: txt }));
    });
    return out.sort((a, b) => a.t - b.t);
  }

  G.Ace = { generate, pickVoice, lyricsFor, friendlyError, isQuota, parseLrc, reset: () => { client = null; endpoint = null; } };
})(window);
