module.exports = function handler(req, res) {
  const capabilities = {
    transcriptionConfigured: Boolean(process.env.ASSEMBLYAI_API_KEY),
    voiceConfigured: Boolean(process.env.ELEVENLABS_API_KEY && process.env.ELEVENLABS_ADAM_VOICE_ID),
    blobConfigured: Boolean(process.env.BLOB_READ_WRITE_TOKEN),
    translationConfigured: Boolean(process.env.TRANSLATION_API_URL && process.env.TRANSLATION_API_KEY),
    renderConfigured: Boolean(process.env.RENDER_API_URL && process.env.RENDER_API_KEY),
    renderStatusConfigured: Boolean(process.env.RENDER_STATUS_API_URL || process.env.RENDER_API_URL)
  };
  res.status(200).json({
    ok: true,
    service: 'Nexora Video AI',
    version: '1.5.0',
    readyForFullPipeline: capabilities.transcriptionConfigured && capabilities.voiceConfigured && capabilities.blobConfigured && capabilities.translationConfigured && capabilities.renderConfigured,
    capabilities,
    timestamp: new Date().toISOString()
  });
};
