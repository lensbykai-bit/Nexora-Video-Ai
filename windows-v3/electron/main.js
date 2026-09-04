const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const fs = require('fs');
const path = require('path');

let mainWindow;

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

ipcMain.handle('pick-video', async () => {
  const result = await dialog.showOpenDialog(mainWindow, {
    properties: ['openFile'],
    filters: [{ name: 'Video', extensions: ['mp4', 'mov', 'mkv', 'webm', 'avi', 'm4v'] }]
  });
  if (result.canceled || !result.filePaths[0]) return null;
  return result.filePaths[0];
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
  return { ok: true, model: cfg.model, hasApiKey: Boolean(cfg.apiKey) };
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

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(cfg.apiKey)}`;
  const response = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contents: [{ parts: [{ text: prompt }] }], generationConfig: { temperature: 0.2 } })
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Gemini API ${response.status}: ${body.slice(0, 400)}`);
  }
  const data = await response.json();
  const raw = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/```\s*$/i, '').trim();
  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed) || parsed.length !== texts.length) throw new Error('Translation response format was invalid.');
  return parsed.map(v => String(v));
});
