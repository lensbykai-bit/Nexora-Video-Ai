const $ = (id) => document.getElementById(id);

const setStatus = (id, message, ok = false) => {
  const el = $(id);
  el.textContent = message;
  el.classList.remove('muted');
  el.style.color = ok ? '#5be5cf' : '#c9d1e2';
};

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

let currentJob = null;
let selectedLocalFile = null;
let transcriptText = '';
let transcriptId = null;
let lastVoiceUrl = null;

async function generateVoiceAudio(text) {
  const response = await fetch('/api/voice', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text, voice: $('voiceSelect').value })
  });

  if (!response.ok) {
    let message = 'Voice generation failed.';
    try {
      const data = await response.json();
      message = data.error || message;
    } catch {}
    throw new Error(message);
  }

  const blob = await response.blob();
  if (lastVoiceUrl) URL.revokeObjectURL(lastVoiceUrl);
  lastVoiceUrl = URL.createObjectURL(blob);
  return lastVoiceUrl;
}

async function pollTranscript(id) {
  for (let attempt = 0; attempt < 120; attempt += 1) {
    const response = await fetch(`/api/transcript-status?id=${encodeURIComponent(id)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to read transcription status.');

    const transcript = data.transcript;
    if (transcript.status === 'completed') {
      transcriptText = transcript.text || '';
      return transcript;
    }
    if (transcript.status === 'error') {
      throw new Error(transcript.error || 'Transcription failed.');
    }

    setStatus('subtitleStatus', `Transcribing… ${transcript.status || 'processing'}`);
    await sleep(3000);
  }

  throw new Error('Transcription is taking longer than expected. Try again shortly.');
}

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
    transcriptText = '';
    transcriptId = null;
    setStatus('sourceStatus', `Job ${currentJob.id.slice(0, 8)} created. Video source accepted.`, true);
    setStatus('subtitleStatus', 'Ready to create subtitles.', true);
    setStatus('voiceStatus', 'Voice provider ready when configured.', true);
    setStatus('exportStatus', 'Backend job created. Renderer stage is next.', true);
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
  transcriptText = '';
  transcriptId = null;
  const localUrl = URL.createObjectURL(file);
  const preview = $('previewBox');
  preview.innerHTML = `<video controls playsinline style="width:100%;max-height:420px;border-radius:18px;background:#000" src="${localUrl}"></video>`;
  setStatus('sourceStatus', `Selected local file: ${file.name}. Local preview ready.`, true);
  setStatus('subtitleStatus', 'Direct local-file upload for cloud transcription is the next step.');
});

$('subtitleBtn').addEventListener('click', async () => {
  const mediaUrl = $('videoLink').value.trim();
  if (!currentJob || !mediaUrl) {
    return setStatus('subtitleStatus', 'Import a public video URL first.');
  }

  $('subtitleBtn').disabled = true;
  setStatus('subtitleStatus', 'Starting transcription…');

  try {
    const response = await fetch('/api/transcribe', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        mediaUrl,
        sourceLanguage: $('sourceLanguage').value
      })
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Unable to start transcription.');

    transcriptId = data.transcript.id;
    setStatus('subtitleStatus', `Transcription ${transcriptId.slice(0, 8)} queued…`);
    const result = await pollTranscript(transcriptId);

    const preview = transcriptText.length > 180 ? `${transcriptText.slice(0, 180)}…` : transcriptText;
    setStatus('subtitleStatus', `Subtitles ready${result.language ? ` (${result.language})` : ''}: ${preview || 'No speech detected.'}`, true);
    setStatus('voiceStatus', transcriptText ? 'Transcript ready for AI voice generation.' : 'No transcript text available.');
  } catch (error) {
    setStatus('subtitleStatus', error.message || 'Subtitle generation failed.');
  } finally {
    $('subtitleBtn').disabled = false;
  }
});

$('voicePreview').addEventListener('click', async () => {
  const previewText = transcriptText
    ? transcriptText.slice(0, 220)
    : 'Welcome to Nexora Video AI. This is a preview of the selected licensed AI voice.';

  $('voicePreview').disabled = true;
  setStatus('voiceStatus', 'Generating voice preview…');
  try {
    const url = await generateVoiceAudio(previewText);
    const audio = new Audio(url);
    await audio.play();
    setStatus('voiceStatus', `Playing ${$('voiceSelect').value} preview.`, true);
  } catch (error) {
    setStatus('voiceStatus', error.message || 'Voice preview failed.');
  } finally {
    $('voicePreview').disabled = false;
  }
});

$('generateVoice').addEventListener('click', async () => {
  if (!transcriptText) return setStatus('voiceStatus', 'Create subtitles first so there is text to voice.');

  $('generateVoice').disabled = true;
  setStatus('voiceStatus', 'Generating AI voice from transcript…');
  try {
    await generateVoiceAudio(transcriptText.slice(0, 4000));
    setStatus('voiceStatus', `Voice generated for ${$('targetLanguage').value}.`, true);
  } catch (error) {
    setStatus('voiceStatus', error.message || 'Voice generation failed.');
  } finally {
    $('generateVoice').disabled = false;
  }
});

$('exportBtn').addEventListener('click', () => {
  if (!currentJob && !selectedLocalFile) return setStatus('exportStatus', 'Create/import a video job first.');
  if (!transcriptText && !lastVoiceUrl) return setStatus('exportStatus', 'Create subtitles and voice before export.');
  setStatus('exportStatus', `Export prepared: ${$('quality').value} ${$('format').value}. Final video renderer connection is next.`, true);
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
