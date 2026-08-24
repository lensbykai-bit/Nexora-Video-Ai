const allowedLanguages = new Set(['English','Khmer','Chinese','French','Spanish','German','Russian','Japanese','Korean','Thai','Vietnamese','Indonesian']);

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { text, targetLanguage = 'English' } = req.body || {};
  if (!text || typeof text !== 'string') return res.status(400).json({ ok: false, error: 'Transcript text is required.' });
  if (!allowedLanguages.has(targetLanguage)) return res.status(400).json({ ok: false, error: 'Unsupported target language.' });

  const apiUrl = process.env.TRANSLATION_API_URL;
  const apiKey = process.env.TRANSLATION_API_KEY;
  if (!apiUrl || !apiKey) {
    return res.status(503).json({ ok: false, error: 'Translation provider is not configured yet.' });
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ text, targetLanguage })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ ok: false, error: data.error || 'Translation provider failed.' });

    const translatedText = data.translatedText || data.translation || data.text;
    if (!translatedText) return res.status(502).json({ ok: false, error: 'Translation provider returned no translated text.' });
    return res.status(200).json({ ok: true, translatedText, targetLanguage });
  } catch {
    return res.status(502).json({ ok: false, error: 'Unable to reach translation provider.' });
  }
};
