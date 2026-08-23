module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.ASSEMBLYAI_API_KEY;
  if (!apiKey) {
    return res.status(503).json({ ok: false, error: 'Transcription provider is not configured yet.' });
  }

  const id = String(req.query?.id || '').trim();
  if (!id || !/^[a-zA-Z0-9-]+$/.test(id)) {
    return res.status(400).json({ ok: false, error: 'Invalid transcript id.' });
  }

  try {
    const response = await fetch(`https://api.assemblyai.com/v2/transcript/${encodeURIComponent(id)}`, {
      headers: { authorization: apiKey }
    });
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      return res.status(502).json({ ok: false, error: 'Unable to read transcription status.' });
    }

    return res.status(200).json({
      ok: true,
      transcript: {
        id: data.id,
        status: data.status,
        text: data.status === 'completed' ? (data.text || '') : '',
        language: data.language_code || data.language || null,
        confidence: data.confidence ?? null,
        error: data.status === 'error' ? (data.error || 'Transcription failed.') : null
      }
    });
  } catch (error) {
    console.error('AssemblyAI status error', error);
    return res.status(502).json({ ok: false, error: 'Unable to reach transcription provider.' });
  }
};
