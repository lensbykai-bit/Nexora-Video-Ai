module.exports = function handler(req, res) {
  res.status(200).json({
    ok: true,
    service: 'Nexora Video AI',
    version: '1.3.0',
    capabilities: {
      transcriptionConfigured: Boolean(process.env.ASSEMBLYAI_API_KEY),
      voiceConfigured: Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_ADAM_VOICE_ID),
      blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
      translationConfigured: Boolean(process.env.TRANSLATION_API_URL && process.env.TRANSLATION_API_KEY),
      renderConfigured: Boolean(process.env.RENDER_API_URL && process.env.RENDER_API_KEY)
    },
    timestamp: new Date().toISOString()
  });
};
