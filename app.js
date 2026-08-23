const $ = (id) => document.getElementById(id);

const setStatus = (id, message, ok = false) => {
  const el = $(id);
  el.textContent = message;
  el.classList.remove('muted');
  el.style.color = ok ? '#5be5cf' : '#c9d1e2';
};

$('pasteBtn').addEventListener('click', async () => {
  try {
    const text = await navigator.clipboard.readText();
    $('videoLink').value = text;
  } catch {
    setStatus('sourceStatus', 'Clipboard permission unavailable. Paste the link manually.');
  }
});

$('importBtn').addEventListener('click', () => {
  const link = $('videoLink').value.trim();
  if (!link) return setStatus('sourceStatus', 'Please paste a video link first.');
  setStatus('sourceStatus', 'Video link added. Backend import will be connected next.', true);
});

$('videoFile').addEventListener('change', (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  setStatus('sourceStatus', `Selected: ${file.name}`, true);
});

$('subtitleBtn').addEventListener('click', () => {
  const target = $('targetLanguage').value;
  setStatus('subtitleStatus', `Subtitle workflow ready for ${target}. AI transcription API connection is next.`, true);
});

$('voicePreview').addEventListener('click', () => {
  setStatus('voiceStatus', `Selected voice: ${$('voiceSelect').value}. Preview API is not connected yet.`);
});

$('generateVoice').addEventListener('click', () => {
  setStatus('voiceStatus', `Voice generation workflow prepared for ${$('targetLanguage').value}.`, true);
});

$('exportBtn').addEventListener('click', () => {
  setStatus('exportStatus', `Export target: ${$('quality').value} ${$('format').value}. Video processing backend is the next build stage.`, true);
});
