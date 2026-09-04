const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const https = require('https');

let mainWindow;
let currentVideoPath = null;

const configPath = () => path.join(app.getPath('userData'), 'nexora-config.json');

function readConfig() {
  try { return JSON.parse(fs.readFileSync(configPath(), 'utf8')); }
  catch { return {}; }
}

function writeConfig(next) {
  fs.mkdirSync(path.dirname(configPath()), { recursive: true });
  fs.writeFileSync(configPath(), JSON.stringify(next, null, 2), 'utf8');
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1600,
    height: 980,
    minWidth: 1180,
    minHeight: 760,
    backgroundColor: '#070912',
    title: 'Nexora Dub.Ai Plus',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, '..', 'app', 'index.html'));
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

function sendAnalysisStatus(message) {
  try { mainWindow?.webContents.send('analysis:status', String(message)); } catch {}
}

function mimeFor(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  return ({
    '.mp4': 'video/mp4',
    '.m4v': 'video/mp4',
    '.mov': 'video/quicktime',
    '.avi': 'video/avi',
    '.webm': 'video/webm',
    '.wmv': 'video/wmv',
    '.mpg': 'video/mpeg',
    '.mpeg': 'video/mpeg',
    '.3gp': 'video/3gpp',
    '.mkv': 'video/x-matroska'
  })[ext] || 'video/mp4';
}

function sleep(ms) { return new Promise(resolve => setTimeout(resolve, ms)); }

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const text = await response.text();
  let data;
  try { data = text ? JSON.parse(text) : {}; }
  catch { data = { raw: text }; }
  if (!response.ok) {
    const detail = data?.error?.message || data?.raw || `${response.status} ${response.statusText}`;
    throw new Error(detail);
  }
  return { response, data };
}

function uploadBytes(uploadUrl, filePath, size, mimeType) {
  return new Promise((resolve, reject) => {
    const u = new URL(uploadUrl);
    const req = https.request({
      protocol: u.protocol,
      hostname: u.hostname,
      port: u.port || 443,
      path: `${u.pathname}${u.search}`,
      method: 'POST',
      headers: {
        'Content-Length': size,
        'Content-Type': mimeType,
        'X-Goog-Upload-Offset': '0',
        'X-Goog-Upload-Command': 'upload, finalize'
      }
    }, res => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', chunk => { body += chunk; });
      res.on('end', () => {
        if ((res.statusCode || 500) >= 400) return reject(new Error(body || `Upload failed (${res.statusCode})`));
        try { resolve(JSON.parse(body)); }
        catch { reject(new Error('Gemini returned an invalid upload response.')); }
      });
    });
    req.on('error', reject);
    const stream = fs.createReadStream(filePath);
    stream.on('error', reject);
    stream.pipe(req);
  });
}

async function uploadVideoToGemini(filePath, apiKey) {
  const stat = fs.statSync(filePath);
  const mimeType = mimeFor(filePath);
  sendAnalysisStatus(`Uploading video to Gemini… ${Math.max(1, Math.round(stat.size / 1024 / 1024))} MB`);

  const start = await fetch(`https://generativelanguage.googleapis.com/upload/v1beta/files`, {
    method: 'POST',
    headers: {
      'x-goog-api-key': apiKey,
      'X-Goog-Upload-Protocol': 'resumable',
      'X-Goog-Upload-Command': 'start',
      'X-Goog-Upload-Header-Content-Length': String(stat.size),
      'X-Goog-Upload-Header-Content-Type': mimeType,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({ file: { display_name: path.basename(filePath) } })
  });
  if (!start.ok) throw new Error(`Gemini upload start failed: ${await start.text()}`);
  const uploadUrl = start.headers.get('x-goog-upload-url');
  if (!uploadUrl) throw new Error('Gemini did not return an upload URL.');

  const info = await uploadBytes(uploadUrl, filePath, stat.size, mimeType);
  let file = info.file || info;
  if (!file?.name) throw new Error('Gemini upload did not return a file name.');

  for (let i = 0; i < 120; i++) {
    const { data } = await fetchJson(`https://generativelanguage.googleapis.com/v1beta/${file.name}`, {
      headers: { 'x-goog-api-key': apiKey }
    });
    file = data;
    const state = String(file.state || '').toUpperCase();
    if (state === 'ACTIVE' || !state) break;
    if (state === 'FAILED') throw new Error('Gemini could not process this video file.');
    sendAnalysisStatus('Gemini is processing the video…');
    await sleep(3000);
  }
  if (!file.uri) throw new Error('Video processing timed out before Gemini returned a usable file URI.');
  return { file, mimeType };
}

async function deleteGeminiFile(fileName, apiKey) {
  if (!fileName) return;
  try {
    await fetch(`https://generativelanguage.googleapis.com/v1beta/${fileName}`, {
      method: 'DELETE',
      headers: { 'x-goog-api-key': apiKey }
    });
  } catch {}
}

function cleanJsonText(raw) {
  return String(raw || '')
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();
}

ipcMain.handle('pick-video', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v', 'wmv', 'mpg', 'mpeg', '3gp'] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  currentVideoPath = result.filePaths[0];
  const stat = fs.statSync(currentVideoPath);
  return {
    path: currentVideoPath,
    name: path.basename(currentVideoPath),
    size: stat.size,
    mimeType: mimeFor(currentVideoPath)
  };
});

ipcMain.handle('pick-srt', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Subtitles', extensions: ['srt', 'vtt', 'txt'] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  const filePath = result.filePaths[0];
  return { filePath, text: fs.readFileSync(filePath, 'utf8') };
});

ipcMain.handle('save-srt', async (_, payload) => {
  const result = await dialog.showSaveDialog(mainWindow, {
    defaultPath: payload?.name || 'translated-khmer.srt',
    filters: [{ name: 'SRT Subtitle', extensions: ['srt'] }]
  });
  if (result.canceled || !result.filePath) return null;
  fs.writeFileSync(result.filePath, payload?.text || '', 'utf8');
  return result.filePath;
});

ipcMain.handle('config:get', async () => {
  const cfg = readConfig();
  return { model: cfg.model || 'gemini-2.5-flash', hasApiKey: Boolean(cfg.apiKey) };
});

ipcMain.handle('config:set', async (_, payload) => {
  const cfg = readConfig();
  if (typeof payload?.apiKey === 'string' && payload.apiKey.trim()) cfg.apiKey = payload.apiKey.trim();
  if (typeof payload?.model === 'string' && payload.model.trim()) cfg.model = payload.model.trim();
  writeConfig(cfg);
  return { ok: true, model: cfg.model || 'gemini-2.5-flash', hasApiKey: Boolean(cfg.apiKey) };
});

ipcMain.handle('analysis:video', async (_, payload) => {
  const cfg = readConfig();
  if (!cfg.apiKey) throw new Error('Please add your Gemini API key in Settings first.');
  const filePath = payload?.filePath || currentVideoPath;
  if (!filePath || !fs.existsSync(filePath)) throw new Error('Open a video first.');

  const model = payload?.model || cfg.model || 'gemini-2.5-flash';
  const targetLanguage = payload?.targetLanguage || 'Khmer';
  let uploaded;
  try {
    uploaded = await uploadVideoToGemini(filePath, cfg.apiKey);
    sendAnalysisStatus('Detecting speech, timestamps and translating…');

    const prompt = [
      'Act as a professional movie subtitle transcription engine.',
      'Analyze the ENTIRE uploaded video, especially its audio track.',
      'Detect the spoken source language automatically.',
      `Transcribe every meaningful spoken dialogue line and translate each line naturally into ${targetLanguage}.`,
      'Do not invent dialogue. Ignore music-only sections and sound effects.',
      'Use timestamps in seconds. Keep subtitle segments short and readable, normally 1 to 8 seconds.',
      'Return ONLY valid JSON in exactly this shape:',
      '{"detected_language":"Chinese","subtitles":[{"start":0.0,"end":2.5,"source":"original speech","target":"translated speech"}]}',
      'The subtitles array must be chronological and should cover all spoken dialogue in the video.'
    ].join('\n');

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const { data } = await fetchJson(endpoint, {
      method: 'POST',
      headers: {
        'x-goog-api-key': cfg.apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{
          parts: [
            { file_data: { mime_type: uploaded.file.mimeType || uploaded.mimeType, file_uri: uploaded.file.uri } },
            { text: prompt }
          ]
        }],
        generationConfig: { temperature: 0.1, responseMimeType: 'application/json' }
      })
    });

    const raw = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    const parsed = JSON.parse(cleanJsonText(raw));
    const rows = Array.isArray(parsed?.subtitles) ? parsed.subtitles : [];
    const subtitles = rows
      .map(row => ({
        start: Math.max(0, Number(row.start) || 0),
        end: Math.max(0, Number(row.end) || 0),
        source: String(row.source || '').trim(),
        target: String(row.target || '').trim()
      }))
      .filter(row => row.source && row.end > row.start)
      .sort((a, b) => a.start - b.start);

    if (!subtitles.length) throw new Error('Gemini did not find spoken dialogue in this video.');
    sendAnalysisStatus(`Done — ${subtitles.length} subtitle lines created.`);
    return { detectedLanguage: String(parsed.detected_language || 'Auto Detect'), subtitles };
  } finally {
    if (uploaded?.file?.name) deleteGeminiFile(uploaded.file.name, cfg.apiKey);
  }
});

ipcMain.handle('translate:gemini', async (_, payload) => {
  const cfg = readConfig();
  if (!cfg.apiKey) throw new Error('Please add your Gemini API key in Settings first.');
  const model = payload?.model || cfg.model || 'gemini-2.5-flash';
  const source = payload?.sourceLanguage || 'Auto Detect';
  const target = payload?.targetLanguage || 'Khmer';
  const texts = Array.isArray(payload?.texts) ? payload.texts : [];
  if (!texts.length) return [];

  const prompt = [
    'You are a professional movie subtitle translator.',
    `Translate from ${source} to ${target}.`,
    'Keep meaning, tone, names and line order. Keep each subtitle concise and natural for on-screen reading.',
    'Return ONLY valid JSON as an array of translated strings with exactly the same number of items.',
    JSON.stringify(texts)
  ].join('\n');

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
  const { data } = await fetchJson(url, {
    method: 'POST',
    headers: { 'x-goog-api-key': cfg.apiKey, 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.2, responseMimeType: 'application/json' }
    })
  });
  const raw = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  const parsed = JSON.parse(cleanJsonText(raw));
  if (!Array.isArray(parsed) || parsed.length !== texts.length) throw new Error('Translation response format was invalid.');
  return parsed.map(v => String(v));
});
