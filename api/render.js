module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const { videoUrl, voiceUrl, subtitles, quality = '1080p', keepMusic = true, separateTracks = true } = req.body || {};
  if (!videoUrl) return res.status(400).json({ ok: false, error: 'Video URL is required.' });
  if (!voiceUrl) return res.status(400).json({ ok: false, error: 'Generated voice URL is required.' });

  const apiUrl = process.env.RENDER_API_URL;
  const apiKey = process.env.RENDER_API_KEY;
  if (!apiUrl || !apiKey) return res.status(503).json({ ok: false, error: 'Video renderer is not configured yet.' });

  try {
    const response = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({ videoUrl, voiceUrl, subtitles, quality, keepMusic, separateTracks, format: 'mp4' })
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ ok: false, error: data.error || 'Renderer failed.' });
    return res.status(202).json({ ok: true, render: data });
  } catch {
    return res.status(502).json({ ok: false, error: 'Unable to reach video renderer.' });
  }
};
