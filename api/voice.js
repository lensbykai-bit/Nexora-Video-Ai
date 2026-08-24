const { put } = require('@vercel/blob');
const MAX_TEXT_LENGTH = 4000;

function getVoiceId(preset) {
  const map = {
    'Adam — English · Deep / Firm': process.env.ELEVENLABS_ADAM_VOICE_ID,
    'Emma — English · Clear / Warm': process.env.ELEVENLABS_EMMA_VOICE_ID,
    'Khmer Male — Natural': process.env.ELEVENLABS_KHMER_MALE_VOICE_ID,
    'Khmer Female — Natural': process.env.ELEVENLABS_KHMER_FEMALE_VOICE_ID,
    'Multilingual Male — Neutral': process.env.ELEVENLABS_MULTI_MALE_VOICE_ID,
    'Multilingual Female — Neutral': process.env.ELEVENLABS_MULTI_FEMALE_VOICE_ID
  };
  return map[preset] || null;
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed' });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) return res.status(503).json({ ok: false, error: 'Voice provider is not configured yet.' });

  const { text, voice = 'Adam — English · Deep / Firm', persist = false } = req.body || {};
  if (!text || typeof text !== 'string') return res.status(400).json({ ok: false, error: 'Text is required.' });

  const cleanText = text.trim();
  if (!cleanText || cleanText.length > MAX_TEXT_LENGTH) return res.status(400).json({ ok: false, error: `Text must be between 1 and ${MAX_TEXT_LENGTH} characters.` });

  const voiceId = getVoiceId(voice);
  if (!voiceId) return res.status(400).json({ ok: false, error: 'Selected voice is not configured.' });

  try {
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${encodeURIComponent(voiceId)}?output_format=mp3_44100_128`, {
      method: 'POST',
      headers: { 'xi-api-key': apiKey, 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: cleanText, model_id: process.env.ELEVENLABS_MODEL_ID || 'eleven_multilingual_v2' })
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => '');
      console.error('ElevenLabs TTS error', response.status, detail.slice(0, 300));
      return res.status(502).json({ ok: false, error: 'Voice generation failed.' });
    }

    const audio = Buffer.from(await response.arrayBuffer());
    if (persist) {
      if (!process.env.BLOB_READ_WRITE_TOKEN) return res.status(503).json({ ok: false, error: 'Blob storage is not configured yet.' });
      const blob = await put(`voices/${Date.now()}-${Math.random().toString(36).slice(2)}.mp3`, audio, { access: 'public', contentType: 'audio/mpeg' });
      return res.status(200).json({ ok: true, audioUrl: blob.url });
    }

    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Cache-Control', 'no-store');
    return res.status(200).send(audio);
  } catch (error) {
    console.error('Voice provider connection error', error);
    return res.status(502).json({ ok: false, error: 'Unable to reach voice provider.' });
  }
};
