const $ = (id) => document.getElementById(id);

const setStatus = (id, message, ok = false) => {
  const el = $(id);
  el.textContent = message;
  el.classList.remove('muted');
  el.style.color = ok ? '#5be5cf' : '#c9d1e2';
};

let currentJob = null;
let selectedLocalFile = null;

$('pasteBtn').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    $('videoLink').value = text;
  } catch {
    setStatus('sourceStatus', 'Clipboard permission unavailable. Paste the link manually.');
  }
});

$('importBtn').addEventListener('click', async () => {
  const videoUrl = $('videoLink').value.trim();
  if (!videoUrl) return setStatus('sourceStatus', 'Please paste a video link first.');

  setStatus('sourceStatus', 'Creating processing job…');
  $('importBtn').disabled = true;

  try {
    const response = await fetch('/api/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        videoUrl,
        sourceLanguage: $('sourceLanguage').value,
        targetLanguage: $('targetLanguage').value,
        voice: $('voiceSelect').value,
        keepMusic: $('keepMusic').checked,
        separateTracks: $('separateTracks').checked
      })
    });

    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to create job.');

    currentJob = data.job;
    setStatus('sourceStatus', `Job ${currentJob.id.slice(0, 8)} created. Video source accepted.`, true);
    setStatus('subtitleStatus', 'Ready for transcription and translation provider.', true);
    setStatus('voiceStatus', 'Ready for licensed AI voice provider.', true);
    setStatus('exportStatus', 'Backend job created. Renderer stage is ready for provider connection.', true);
  } catch (error) {
    setStatus('sourceStatus', error.message || 'Backend connection failed.');
  } finally {
    $('importBtn').disabled = false;
  }
});

$('videoFile').addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  selectedLocalFile = file;
  currentJob = null;
  const localUrl = URL.createObjectURL(file);
  const preview = $('previewBox');
  preview.innerHTML = `<video controls playsinline style="width:100%;max-height:420px;border-radius:18px;background:#000" src="${localUrl}"></video>`;
  setStatus('sourceStatus', `Selected local file: ${file.name}. Local preview ready.`, true);
});

$('subtitleBtn').addEventListener('click', () => {
  if (!currentJob && !selectedLocalFile) return setStatus('subtitleStatus', 'Create/import a video job first.');
  setStatus('subtitleStatus', `Target: ${$('targetLanguage').value}. Subtitle stage queued.`, true);
});

$('voicePreview').addEventListener('click', () => {
  setStatus('voiceStatus', `Selected voice: ${$('voiceSelect').value}. A licensed provider will supply the preview.`);
});

$('generateVoice').addEventListener('click', () => {
  if (!currentJob && !selectedLocalFile) return setStatus('voiceStatus', 'Create/import a video job first.');
  setStatus('voiceStatus', `Voice stage queued for ${$('targetLanguage').value}.`, true);
});

$('exportBtn').addEventListener('click', () => {
  if (!currentJob && !selectedLocalFile) return setStatus('exportStatus', 'Create/import a video job first.');
  setStatus('exportStatus', `Export queued: ${$('quality').value} ${$('format').value}.`, true);
});

fetch('/api/health')
  .then((r) => r.json())
  .then((data) => {
    if (data.ok) console.info(`${data.service} backend ${data.version} online`);
  })
  .catch(() => console.warn('Backend health check unavailable.'));

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js').catch((error) => {
      console.warn('Service worker registration failed:', error);
    });
  });
}
