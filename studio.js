const $ = (id) => document.getElementById(id);

let currentPlan = localStorage.getItem('nexoraPlan') === 'plus' ? 'plus' : 'free';
let videoUrl = '';
let objectUrl = '';
let transcriptId = '';
let voiceUrl = '';
let selectedVoice = '';
let busy = false;

const allVoices = [
  { id: 'Khmer Male — Natural', name: 'Sovann', meta: 'Khmer · Male · Natural', free: true, icon: 'ស' },
  { id: 'Adam — English · Deep / Firm', name: 'Adam', meta: 'English · Deep · Firm', free: true, icon: 'A' },
  { id: 'Khmer Female — Natural', name: 'Dara', meta: 'Khmer · Female · Warm', free: false, icon: 'ដ' },
  { id: 'Emma — English · Clear / Warm', name: 'Emma', meta: 'English · Clear · Warm', free: false, icon: 'E' },
  { id: 'Multilingual Male — Neutral', name: 'Nexora Male', meta: 'Multilingual · Neutral', free: false, icon: 'N' },
  { id: 'Multilingual Female — Neutral', name: 'Nexora Female', meta: 'Multilingual · Neutral', free: false, icon: 'N+' }
];

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
const normalizeUrl = (value = '') => value.trim().replace(/\/+$/, '');
const isAndroidShell = () => ['localhost', '127.0.0.1'].includes(location.hostname);

function backendBase() {
  const saved = normalizeUrl(localStorage.getItem('nexoraBackendUrl') || '');
  if (saved) return saved;
  if (!isAndroidShell() && /^https?:$/.test(location.protocol)) return normalizeUrl(location.origin);
  return '';
}

function api(path) {
  return `${backendBase()}${path}`;
}

function setStatus(text, type = '') {
  const el = $('statusLine');
  el.textContent = text;
  el.className = `status ${type}`.trim();
}

function requireBackend() {
  if (backendBase()) return true;
  $('backendUrl').value = '';
  $('backendDialog').showModal();
  setStatus('សូមភ្ជាប់ Backend URL ជាមុនសិន។', 'err');
  return false;
}

function setBusy(value) {
  busy = value;
  document.body.classList.toggle('busy', value);
}

function updateButtons() {
  const hasVideo = Boolean(videoUrl);
  const hasOriginal = Boolean($('originalText').value.trim());
  const hasTranslation = Boolean($('translatedText').value.trim());
  $('transcribeBtn').disabled = busy || !hasVideo;
  $('translateBtn').disabled = busy || !hasOriginal;
  $('voiceBtn').disabled = busy || !hasTranslation;
  $('exportBtn').disabled = busy || !hasVideo || !voiceUrl || !hasTranslation;
}

function renderVoices() {
  const list = $('voiceList');
  list.innerHTML = '';
  const available = currentPlan === 'plus' ? allVoices : allVoices.filter((voice) => voice.free);
  if (!available.some((voice) => voice.id === selectedVoice)) selectedVoice = available[0]?.id || '';

  for (const voice of allVoices) {
    const locked = currentPlan === 'free' && !voice.free;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = `voice-option ${voice.id === selectedVoice ? 'selected' : ''}`;
    button.disabled = locked;
    button.innerHTML = `<span class="voice-avatar">${voice.icon}</span><span><b>${voice.name}</b><small>${voice.meta}</small></span>${locked ? '<span class="lock">PLUS</span>' : ''}`;
    if (!locked) {
      button.addEventListener('click', () => {
        selectedVoice = voice.id;
        voiceUrl = '';
        $('voicePreview').removeAttribute('src');
        renderVoices();
        updateButtons();
      });
    }
    list.appendChild(button);
  }
}

function applyPlan(plan) {
  currentPlan = plan === 'plus' ? 'plus' : 'free';
  localStorage.setItem('nexoraPlan', currentPlan);
  $('app').dataset.plan = currentPlan;
  document.querySelectorAll('[data-plan-choice]').forEach((button) => button.classList.toggle('active', button.dataset.planChoice === currentPlan));
  const plus = currentPlan === 'plus';
  $('planName').textContent = plus ? 'Plus' : 'Free';
  $('planBadge').textContent = plus ? 'PLUS PREMIUM' : 'FREE';
  $('modeBadge').textContent = plus ? 'PLUS MODE' : 'FREE MODE';
  $('qualityBadge').textContent = plus ? '1080p' : '720p';
  $('heroTitle').textContent = plus ? 'បកប្រែ និងសម្រាយសម្លេងវីដេអូដោយ AI' : 'បកប្រែវីដេអូ និង Subtitle';
  $('heroText').textContent = plus ? 'Premium AI Voices, Dubbing, Timeline និង Export គុណភាពខ្ពស់។' : 'ចាប់ផ្តើមបកប្រែវីដេអូបានលឿន សាមញ្ញ និងងាយប្រើ។';
  $('voiceAccessBadge').textContent = plus ? 'PREMIUM' : 'LIMITED';
  $('lockedNote').style.display = plus ? 'none' : 'block';
  $('exportHint').textContent = plus ? 'Plus plan exports up to 1080p in this APK prototype.' : 'Free plan exports up to 720p.';
  $('exportBtn').textContent = plus ? 'Export 1080p' : 'Export 720p';
  renderVoices();
  updateButtons();
}

async function uploadVideo(file) {
  if (!requireBackend()) throw new Error('Backend URL is required.');
  const { upload } = await import('https://esm.sh/@vercel/blob@2/client');
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
  const result = await upload(`videos/${Date.now()}-${safeName}`, file, {
    access: 'public',
    handleUploadUrl: api('/api/upload'),
    multipart: true,
    contentType: file.type || 'video/mp4',
    onUploadProgress: ({ percentage }) => setStatus(`Uploading… ${Math.round(percentage)}%`)
  });
  return result.url;
}

async function transcribeVideo() {
  const response = await fetch(api('/api/transcribe'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ mediaUrl: videoUrl, sourceLanguage: $('sourceLanguage').value })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Unable to start subtitle extraction.');
  transcriptId = data.transcript?.id || '';
  if (!transcriptId) throw new Error('Transcription job ID was not returned.');

  for (let i = 0; i < 90; i += 1) {
    setStatus(`AI កំពុងសម្រាយ Subtitle… ${i + 1}`);
    await sleep(3000);
    const statusResponse = await fetch(api(`/api/transcript-status?id=${encodeURIComponent(transcriptId)}`));
    const statusData = await statusResponse.json().catch(() => ({}));
    if (!statusResponse.ok) continue;
    const transcript = statusData.transcript || {};
    if (transcript.status === 'completed') return transcript.text || '';
    if (transcript.status === 'error') throw new Error(transcript.error || 'Subtitle extraction failed.');
  }
  throw new Error('Subtitle extraction is taking longer than expected.');
}

async function translateText() {
  const text = $('originalText').value.trim();
  if (!text) throw new Error('No original subtitle to translate.');
  const response = await fetch(api('/api/translate'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, targetLanguage: $('targetLanguage').value })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Translation failed.');
  return data.translatedText || '';
}

async function generateVoice() {
  const text = $('translatedText').value.trim();
  if (!text) throw new Error('Translate subtitle first.');
  const response = await fetch(api('/api/voice'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: text.slice(0, 4000), voice: selectedVoice, persist: true })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Voice generation failed.');
  if (!data.audioUrl) throw new Error('Voice URL was not returned.');
  return data.audioUrl;
}

async function exportVideo() {
  const response = await fetch(api('/api/render'), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      videoUrl,
      voiceUrl,
      subtitles: $('translatedText').value.trim(),
      quality: currentPlan === 'plus' ? '1080p' : '720p',
      keepMusic: true,
      separateTracks: currentPlan === 'plus'
    })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || 'Export failed.');
  const render = data.render || {};
  const directUrl = render.outputUrl || render.url || render.downloadUrl;
  if (directUrl) return directUrl;
  const id = render.id || render.jobId;
  if (!id) throw new Error('Render job ID was not returned.');

  for (let i = 0; i < 90; i += 1) {
    setStatus(`Rendering video… ${i + 1}`);
    await sleep(4000);
    const statusResponse = await fetch(api(`/api/render-status?id=${encodeURIComponent(id)}`));
    const statusData = await statusResponse.json().catch(() => ({}));
    if (!statusResponse.ok) continue;
    const result = statusData.render || {};
    const url = result.outputUrl || result.url || result.downloadUrl;
    if (url) return url;
    const state = String(result.status || result.state || '').toLowerCase();
    if (['failed', 'error', 'cancelled'].includes(state)) throw new Error(result.error || 'Render failed.');
  }
  throw new Error('Render is still processing.');
}

document.querySelectorAll('[data-plan-choice]').forEach((button) => button.addEventListener('click', () => applyPlan(button.dataset.planChoice)));

$('backendBtn').addEventListener('click', () => {
  $('backendUrl').value = backendBase();
  $('backendDialog').showModal();
});

$('saveBackendBtn').addEventListener('click', (event) => {
  event.preventDefault();
  const value = normalizeUrl($('backendUrl').value);
  try {
    const parsed = new URL(value);
    if (!['https:', 'http:'].includes(parsed.protocol)) throw new Error();
    localStorage.setItem('nexoraBackendUrl', value);
    $('backendDialog').close();
    setStatus('Backend connected.', 'ok');
  } catch {
    setStatus('Backend URL មិនត្រឹមត្រូវ។', 'err');
  }
});

$('clearBackendBtn').addEventListener('click', (event) => {
  event.preventDefault();
  localStorage.removeItem('nexoraBackendUrl');
  $('backendUrl').value = '';
  setStatus('Saved backend URL cleared.');
});

$('videoFile').addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  if (objectUrl) URL.revokeObjectURL(objectUrl);
  objectUrl = URL.createObjectURL(file);
  $('viewer').innerHTML = `<video src="${objectUrl}" controls playsinline></video>`;
  videoUrl = '';
  voiceUrl = '';
  $('originalText').value = '';
  $('translatedText').value = '';
  $('voicePreview').removeAttribute('src');
  setBusy(true);
  updateButtons();
  try {
    videoUrl = await uploadVideo(file);
    setStatus('Video ready. ចុច Extract Subtitle។', 'ok');
  } catch (error) {
    setStatus(error.message, 'err');
  } finally {
    setBusy(false);
    updateButtons();
  }
});

$('transcribeBtn').addEventListener('click', async () => {
  if (!requireBackend()) return;
  setBusy(true);
  updateButtons();
  try {
    const text = await transcribeVideo();
    $('originalText').value = text;
    $('translatedText').value = '';
    voiceUrl = '';
    setStatus('Subtitle extracted. ចុច Translate។', 'ok');
  } catch (error) {
    setStatus(error.message, 'err');
  } finally {
    setBusy(false);
    updateButtons();
  }
});

$('translateBtn').addEventListener('click', async () => {
  if (!requireBackend()) return;
  setBusy(true);
  updateButtons();
  setStatus(`Translating to ${$('targetLanguage').value}…`);
  try {
    $('translatedText').value = await translateText();
    $('translatedLang').textContent = $('targetLanguage').value;
    voiceUrl = '';
    $('voicePreview').removeAttribute('src');
    setStatus('Translation ready. ជ្រើសសម្លេង AI។', 'ok');
  } catch (error) {
    setStatus(error.message, 'err');
  } finally {
    setBusy(false);
    updateButtons();
  }
});

$('voiceBtn').addEventListener('click', async () => {
  if (!requireBackend()) return;
  setBusy(true);
  updateButtons();
  setStatus('Generating AI voice…');
  try {
    voiceUrl = await generateVoice();
    $('voicePreview').src = voiceUrl;
    $('voiceWave').style.opacity = '1';
    setStatus('AI voice ready. អាច Preview និង Export បាន។', 'ok');
  } catch (error) {
    setStatus(error.message, 'err');
  } finally {
    setBusy(false);
    updateButtons();
  }
});

$('exportBtn').addEventListener('click', async () => {
  if (!requireBackend()) return;
  setBusy(true);
  updateButtons();
  setStatus('Preparing final video…');
  try {
    const url = await exportVideo();
    setStatus('Export complete.', 'ok');
    window.open(url, '_blank', 'noopener');
  } catch (error) {
    setStatus(error.message, 'err');
  } finally {
    setBusy(false);
    updateButtons();
  }
});

$('swapBtn').addEventListener('click', () => {
  const source = $('sourceLanguage');
  const target = $('targetLanguage');
  if (source.value === 'auto') return;
  const oldSource = source.value;
  const targetOptionExists = Array.from(source.options).some((option) => option.value === target.value);
  if (targetOptionExists) source.value = target.value;
  if (Array.from(target.options).some((option) => option.value === oldSource)) target.value = oldSource;
  $('translatedLang').textContent = target.value;
});

$('targetLanguage').addEventListener('change', () => {
  $('translatedLang').textContent = $('targetLanguage').value;
  voiceUrl = '';
  $('voicePreview').removeAttribute('src');
  updateButtons();
});

$('clearOriginalBtn').addEventListener('click', () => {
  $('originalText').value = '';
  $('translatedText').value = '';
  voiceUrl = '';
  $('voicePreview').removeAttribute('src');
  updateButtons();
});

$('originalText').addEventListener('input', updateButtons);
$('translatedText').addEventListener('input', () => {
  voiceUrl = '';
  $('voicePreview').removeAttribute('src');
  updateButtons();
});

applyPlan(currentPlan);
if (backendBase()) setStatus('Ready. Upload a movie or video.', 'ok');
else setStatus('Ready. Upload video; backend URL will be requested when needed.');
