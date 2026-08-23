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

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: 'Transcription provider is not configured yet.' });
  }

  const { mediaUrl, sourceLanguage = 'auto' } = req.body || {};
  if (!mediaUrl || !isSafeHttpUrl(mediaUrl)) {
    return res.status(400).json({ ok: false, error: 'A valid public media URL is required.' });
  }

  const payload = { audio_url: mediaUrl };
  if (sourceLanguage === 'auto') {
    payload.language_detection = true;
  }

  try {
    const response = await fetch('https://api.assemblyai.com/v2/transcript', {
      method: 'POST',
      headers: {
        authorization: apiKey,
        'content-type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error('AssemblyAI submit error', response.status, data);
      return res.status(502).json({ ok: false, error: 'Unable to start transcription.' });
    }

    return res.status(202).json({
      ok: true,
      transcript: {
        id: data.id,
        status: data.status || 'queued'
      }
    });
  } catch (error) {
    console.error('AssemblyAI connection error', error);
    return res.status(502).json({ ok: false, error: 'Unable to reach transcription provider.' });
  }
};
