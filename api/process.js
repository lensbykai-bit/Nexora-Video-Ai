const crypto = require('crypto');

const allowedLanguages = new Set([
  'English','Khmer','Chinese','French','Spanish','German','Russian',
  'Japanese','Korean','Thai','Vietnamese','Indonesian'
]);

function isSafeHttpUrl(value) {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' || url.protocol === 'http:';
  } catch {
    return false;
  }
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { videoUrl, sourceLanguage = 'auto', targetLanguage = 'English', voice = 'Adam — English · Deep / Firm', keepMusic = true, separateTracks = true } = req.body || {};

  if (!videoUrl || !isSafeHttpUrl(videoUrl)) {
    return res.status(400).json({ ok: false, error: 'Please provide a valid http/https video URL.' });
  }

  if (sourceLanguage !== 'auto' && !allowedLanguages.has(sourceLanguage)) {
    return res.status(400).json({ ok: false, error: 'Unsupported source language.' });
  }

  if (!allowedLanguages.has(targetLanguage)) {
    return res.status(400).json({ ok: false, error: 'Unsupported target language.' });
  }

  const jobId = crypto.randomUUID();

  // v1.1 establishes the secure backend contract. Provider adapters for
  // transcription, translation, licensed TTS and final rendering plug in here.
  return res.status(202).json({
    ok: true,
    job: {
      id: jobId,
      status: 'accepted',
      sourceLanguage,
      targetLanguage,
      voice,
      keepMusic: Boolean(keepMusic),
      separateTracks: Boolean(separateTracks),
      stages: [
        { id: 'import', label: 'Import video', status: 'ready' },
        { id: 'transcribe', label: 'Create subtitles', status: 'waiting-provider' },
        { id: 'translate', label: 'Translate', status: 'waiting-provider' },
        { id: 'voice', label: 'Generate licensed AI voice', status: 'waiting-provider' },
        { id: 'render', label: 'Render MP4', status: 'waiting-provider' }
      ]
    }
  });
};
