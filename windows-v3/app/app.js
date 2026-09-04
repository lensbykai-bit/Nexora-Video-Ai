const video = document.getElementById('video');
const emptyState = document.getElementById('emptyState');
const openVideoBtn = document.getElementById('openVideoBtn');
const importSrtBtn = document.getElementById('importSrtBtn');
const analyzeVideoBtn = document.getElementById('analyzeVideoBtn');
const translateBtn = document.getElementById('translateBtn');
const subtitleList = document.getElementById('subtitleList');
const subtitleOverlay = document.getElementById('subtitleOverlay');
const sourceTrack = document.getElementById('sourceTrack');
const targetTrack = document.getElementById('targetTrack');
const progressFill = document.getElementById('progressFill');
const playhead = document.getElementById('playhead');
const timeReadout = document.getElementById('timeReadout');
const projectName = document.getElementById('projectName');
const clipLabel = document.getElementById('clipLabel');
const toast = document.getElementById('toast');
const settingsDialog = document.getElementById('settingsDialog');
const modelStatus = document.getElementById('modelStatus');

let subtitles = [];
let selectedVoice = 'Sovann';
let currentVideoPath = null;
let currentVideoName = 'Untitled Movie';

function notify(message, isError = false) {
  toast.textContent = message;
  toast.classList.toggle('error', isError);
  toast.classList.add('show');
  clearTimeout(notify.t);
  notify.t = setTimeout(() => toast.classList.remove('show'), 4200);
}

function pad(n) { return String(Math.floor(n)).padStart(2, '0'); }
function fmt(sec) {
  if (!Number.isFinite(sec)) return '00:00';
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = Math.floor(sec % 60);
  return h ? `${pad(h)}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}
function srtTime(sec) {
  const ms = Math.max(0, Math.round(sec * 1000));
  const h = Math.floor(ms / 3600000);
  const m = Math.floor((ms % 3600000) / 60000);
  const s = Math.floor((ms % 60000) / 1000);
  const milli = ms % 1000;
  return `${pad(h)}:${pad(m)}:${pad(s)},${String(milli).padStart(3, '0')}`;
}

function parseSrt(text) {
  const normalized = text.replace(/\r/g, '').trim();
  if (!normalized) return [];
  const blocks = normalized.split(/\n{2,}/);
  const rows = [];
  for (const block of blocks) {
    const lines = block.split('\n');
    const timeIndex = lines.findIndex(line => line.includes('-->'));
    if (timeIndex < 0) continue;
    const [a, b] = lines[timeIndex].split('-->').map(v => v.trim());
    const toSec = t => {
      const p = t.replace(',', '.').split(':').map(Number);
      return p.length === 3 ? p[0] * 3600 + p[1] * 60 + p[2] : 0;
    };
    const source = lines.slice(timeIndex + 1).join(' ').trim();
    if (source) rows.push({ start: toSec(a), end: toSec(b), source, target: '' });
  }
  return rows;
}

function toSrt() {
  return subtitles.map((s, i) => `${i + 1}\n${srtTime(s.start)} --> ${srtTime(s.end)}\n${s.target || s.source}`).join('\n\n');
}

function renderSubtitles() {
  subtitleList.innerHTML = '';
  sourceTrack.innerHTML = '';
  targetTrack.innerHTML = '';

  if (!subtitles.length) {
    const empty = document.createElement('div');
    empty.style.cssText = 'padding:22px 12px;color:#7f89a7;text-align:center;font-size:12px;line-height:1.7';
    empty.innerHTML = currentVideoPath
      ? 'No subtitles yet.<br><b style="color:#cfd5ef">Click “Auto Subtitle + Translate Video”.</b>'
      : 'Open a video first.';
    subtitleList.appendChild(empty);
    return;
  }

  subtitles.forEach((s, i) => {
    const row = document.createElement('div');
    row.className = 'subtitle-row';
    row.innerHTML = `
      <div class="idx">${i + 1}<br><small>${fmt(s.start)}</small></div>
      <div class="subtitle-cell source" contenteditable="true" data-i="${i}" data-field="source"></div>
      <div class="subtitle-cell target" contenteditable="true" data-i="${i}" data-field="target"></div>`;
    row.querySelector('.source').textContent = s.source;
    row.querySelector('.target').textContent = s.target;
    subtitleList.appendChild(row);

    const a = document.createElement('div');
    a.className = 'clip'; a.textContent = s.source; sourceTrack.appendChild(a);
    const b = document.createElement('div');
    b.className = 'clip'; b.textContent = s.target || '…'; targetTrack.appendChild(b);
  });

  document.querySelectorAll('.subtitle-cell').forEach(el => {
    el.addEventListener('input', e => {
      const idx = Number(e.currentTarget.dataset.i);
      const field = e.currentTarget.dataset.field;
      subtitles[idx][field] = e.currentTarget.textContent.trim();
      renderTracksOnly();
      updateOverlay();
    });
  });
}

function renderTracksOnly() {
  sourceTrack.innerHTML = '';
  targetTrack.innerHTML = '';
  subtitles.forEach(s => {
    const a = document.createElement('div');
    a.className = 'clip'; a.textContent = s.source; sourceTrack.appendChild(a);
    const b = document.createElement('div');
    b.className = 'clip'; b.textContent = s.target || '…'; targetTrack.appendChild(b);
  });
}

function updateOverlay() {
  const t = video.currentTime || 0;
  const current = subtitles.find(s => t >= s.start && t <= s.end);
  subtitleOverlay.textContent = current ? (current.target || current.source) : '';
}

async function openSettings() {
  const cfg = await window.nexora.getConfig();
  document.getElementById('apiKey').value = '';
  document.getElementById('apiKey').placeholder = cfg.hasApiKey ? 'API key saved — enter a new one to replace it' : 'Paste your Gemini API key';
  document.getElementById('modelName').value = cfg.model || 'gemini-2.5-flash';
  settingsDialog.showModal();
}

async function loadVideo() {
  try {
    const info = await window.nexora.pickVideo();
    if (!info) return;
    currentVideoPath = typeof info === 'string' ? info : info.path;
    currentVideoName = typeof info === 'string' ? currentVideoPath.split(/[\\/]/).pop() : info.name;
    const normalized = currentVideoPath.replace(/\\/g, '/');
    video.src = `file:///${encodeURI(normalized)}`;
    video.style.display = 'block';
    emptyState.style.display = 'none';
    projectName.textContent = currentVideoName.replace(/\.[^.]+$/, '');
    clipLabel.textContent = currentVideoName;
    subtitles = [];
    renderSubtitles();
    subtitleOverlay.textContent = '';
    notify('Video loaded. Now click Auto Subtitle + Translate Video.');
  } catch (err) { notify(err.message || String(err), true); }
}

openVideoBtn.addEventListener('click', loadVideo);
document.getElementById('previewBtn').addEventListener('click', () => video.paused ? video.play() : video.pause());
document.getElementById('playBtn').addEventListener('click', () => video.paused ? video.play() : video.pause());

video.addEventListener('timeupdate', () => {
  const p = video.duration ? video.currentTime / video.duration : 0;
  progressFill.style.width = `${p * 100}%`;
  playhead.style.left = `calc(145px + (100% - 155px) * ${p})`;
  timeReadout.textContent = `${fmt(video.currentTime)} / ${fmt(video.duration)}`;
  updateOverlay();
});

video.addEventListener('loadedmetadata', () => {
  timeReadout.textContent = `00:00 / ${fmt(video.duration)}`;
});

importSrtBtn.addEventListener('click', async () => {
  try {
    const file = await window.nexora.pickSrt();
    if (!file) return;
    const parsed = parseSrt(file.text);
    if (!parsed.length) throw new Error('No valid subtitle blocks were found.');
    subtitles = parsed;
    renderSubtitles();
    notify(`Imported ${parsed.length} subtitle lines`);
  } catch (err) { notify(err.message || String(err), true); }
});

analyzeVideoBtn.addEventListener('click', async () => {
  if (!currentVideoPath) return notify('Open a video first.', true);
  try {
    const cfg = await window.nexora.getConfig();
    if (!cfg.hasApiKey) {
      notify('Add your Gemini API key in Settings first.', true);
      await openSettings();
      return;
    }

    analyzeVideoBtn.disabled = true;
    const old = analyzeVideoBtn.textContent;
    analyzeVideoBtn.textContent = 'Analyzing video…';
    const result = await window.nexora.analyzeVideo({
      filePath: currentVideoPath,
      targetLanguage: document.getElementById('targetLanguage').value
    });
    subtitles = Array.isArray(result?.subtitles) ? result.subtitles : [];
    renderSubtitles();
    updateOverlay();

    const detected = String(result?.detectedLanguage || 'Auto Detect');
    const sourceSelect = document.getElementById('sourceLanguage');
    const match = Array.from(sourceSelect.options).find(o => o.value.toLowerCase() === detected.toLowerCase() || o.text.toLowerCase() === detected.toLowerCase());
    if (match) sourceSelect.value = match.value;

    notify(`Ready — ${subtitles.length} real subtitle lines created and translated.`);
    analyzeVideoBtn.textContent = old;
  } catch (err) {
    notify(err.message || String(err), true);
    analyzeVideoBtn.textContent = '✦ Auto Subtitle + Translate Video';
  } finally {
    analyzeVideoBtn.disabled = false;
  }
});

if (window.nexora.onAnalysisStatus) {
  window.nexora.onAnalysisStatus(message => {
    analyzeVideoBtn.textContent = message;
    notify(message);
  });
}

document.getElementById('addSubtitleBtn').addEventListener('click', () => {
  const start = subtitles.length ? subtitles[subtitles.length - 1].end : (video.currentTime || 0);
  subtitles.push({ start, end: start + 3, source: 'New subtitle', target: '' });
  renderSubtitles();
});

document.getElementById('deleteBtn').addEventListener('click', () => {
  if (!subtitles.length) return;
  subtitles.pop(); renderSubtitles(); notify('Last subtitle removed');
});

document.getElementById('splitBtn').addEventListener('click', () => {
  if (!subtitles.length) return;
  const t = video.currentTime || 0;
  const idx = subtitles.findIndex(s => t > s.start && t < s.end);
  if (idx < 0) return notify('Move the video playhead inside a subtitle first.', true);
  const s = subtitles[idx];
  subtitles.splice(idx, 1, { ...s, end: t }, { ...s, start: t });
  renderSubtitles(); notify('Subtitle split at playhead');
});

translateBtn.addEventListener('click', async () => {
  if (!subtitles.length) return notify('Run Auto Subtitle or import an SRT first.', true);
  translateBtn.disabled = true;
  const old = translateBtn.textContent;
  translateBtn.textContent = 'Translating…';
  try {
    const translated = await window.nexora.translateGemini({
      sourceLanguage: document.getElementById('sourceLanguage').value,
      targetLanguage: document.getElementById('targetLanguage').value,
      texts: subtitles.map(s => s.source)
    });
    subtitles = subtitles.map((s, i) => ({ ...s, target: translated[i] || '' }));
    renderSubtitles();
    updateOverlay();
    notify('Translation complete');
  } catch (err) { notify(err.message || String(err), true); }
  finally { translateBtn.disabled = false; translateBtn.textContent = old; }
});

document.getElementById('exportBtn').addEventListener('click', async () => {
  if (!subtitles.length) return notify('There are no subtitles to export yet.', true);
  try {
    const safeName = (projectName.textContent || 'translated').replace(/[<>:"/\\|?*]+/g, '-');
    const saved = await window.nexora.saveSrt({ name: `${safeName}-khmer.srt`, text: toSrt() });
    if (saved) notify('Translated SRT exported successfully');
  } catch (err) { notify(err.message || String(err), true); }
});

document.getElementById('settingsBtn').addEventListener('click', openSettings);

document.getElementById('saveSettingsBtn').addEventListener('click', async () => {
  try {
    const res = await window.nexora.setConfig({
      apiKey: document.getElementById('apiKey').value,
      model: document.getElementById('modelName').value
    });
    modelStatus.textContent = res.model || 'Gemini';
    settingsDialog.close();
    notify('AI settings saved');
  } catch (err) { notify(err.message || String(err), true); }
});

document.querySelectorAll('.voice').forEach(btn => btn.addEventListener('click', () => {
  document.querySelectorAll('.voice').forEach(v => v.classList.remove('active'));
  btn.classList.add('active'); selectedVoice = btn.dataset.voice;
}));

document.getElementById('voicePreviewBtn').addEventListener('click', () => {
  const text = subtitles.find(s => s.target)?.target || subtitles[0]?.source || '';
  if (!text) return notify('Create or import subtitles first.', true);
  if (!('speechSynthesis' in window)) return notify('Voice preview is unavailable on this system.', true);
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  const voices = speechSynthesis.getVoices();
  const kh = voices.find(v => /km|khmer/i.test(`${v.lang} ${v.name}`));
  if (kh) u.voice = kh;
  u.rate = selectedVoice === 'Adam' ? 0.92 : 1;
  speechSynthesis.speak(u);
  notify(kh ? `Previewing ${selectedVoice} with a Khmer system voice` : `Previewing ${selectedVoice} with the available Windows voice`);
});

(async function init(){
  renderSubtitles();
  try {
    const cfg = await window.nexora.getConfig();
    modelStatus.textContent = cfg.model || 'Gemini';
  } catch {}
})();
