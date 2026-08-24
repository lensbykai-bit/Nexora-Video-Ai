const { handleUpload } = require('@vercel/blob/client');

function originAllowed(req) {
  const configured = process.env.ALLOWED_ORIGIN;
  if (!configured) return true;
  const origin = req.headers.origin || '';
  return configured.split(',').map(v => v.trim()).filter(Boolean).includes(origin);
}

module.exports = async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!process.env.BLOB_READ_WRITE_TOKEN) {
    return res.status(503).json({ error: 'Video storage is not configured.' });
  }
  if (!originAllowed(req)) {
    return res.status(403).json({ error: 'Upload origin is not allowed.' });
  }

  try {
    const jsonResponse = await handleUpload({
      body: req.body,
      request: req,
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname || !/^uploads\//.test(pathname)) {
          throw new Error('Invalid upload path.');
        }
        return {
          allowedContentTypes: ['video/mp4', 'video/webm', 'video/quicktime', 'video/x-m4v'],
          maximumSizeInBytes: 1024 * 1024 * 1024,
          addRandomSuffix: true
        };
      },
      onUploadCompleted: async ({ blob }) => {
        console.log('Nexora video upload completed', blob.url);
      }
    });

    return res.status(200).json(jsonResponse);
  } catch (error) {
    return res.status(400).json({ error: error instanceof Error ? error.message : String(error) });
  }
};
