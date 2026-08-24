module.exports = async function handler(req, res) {
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const id = String(req.query?.id || '').trim();
  if (!id) return res.status(400).json({ ok: false, error: 'Render job id is required.' });

  const baseUrl = process.env.RENDER_STATUS_API_URL || process.env.RENDER_API_URL;
  const apiKey = process.env.RENDER_API_KEY;
  if (!baseUrl || !apiKey) return res.status(503).json({ ok: false, error: 'Renderer status API is not configured.' });

  const url = (process.env.RENDER_STATUS_API_URL || '').includes('{id}')
    ? process.env.RENDER_STATUS_API_URL.replace('{id}', encodeURIComponent(id))
    : `${baseUrl.replace(/\/$/, '')}/${encodeURIComponent(id)}`;

  try {
    const response = await fetch(url, { headers: { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' } });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) return res.status(502).json({ ok: false, error: data.error || 'Renderer status request failed.' });
    return res.status(200).json({ ok: true, render: data });
  } catch {
    return res.status(502).json({ ok: false, error: 'Unable to reach renderer status API.' });
  }
};
