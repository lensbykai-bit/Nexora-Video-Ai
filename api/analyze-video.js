module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { videoUrl, language = 'English', style = 'natural narration' } = req.body || {};
  if (!videoUrl) return res.status(400).json({ ok: false, error: 'Video URL is required.' });

  const apiUrl = process.env.VIDEO_ANALYSIS_API_URL;
  const apiKey = process.env.VIDEO_ANALYSIS_API_KEY;
  if (!apiUrl || !apiKey) {
    return res.status(503).json({ ok: false, error: 'Video analysis provider is not configured yet.' });
  }

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        videoUrl,
        language,
        style,
        task: 'Analyze this video and write a concise spoken narration script describing what the video is about and what is happening. Do not invent unsupported facts.'
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ ok: false, error: data.error || 'Video analysis provider failed.' });

    const script = data.script || data.text || data.output || data.result;
    if (!script || typeof script !== 'string') return res.status(502).json({ ok: false, error: 'Video analysis provider returned no script.' });

    return res.status(200).json({ ok: true, script: script.trim(), language });
  } catch {
    return res.status(502).json({ ok: false, error: 'Unable to reach video analysis provider.' });
  }
};
