const { app, BrowserWindow, ipcMain, dialog, protocol, net, globalShortcut, screen } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');
const { TmeMusicCloudProvider } = require('./providers/tme-music-cloud-provider');
const { TunedGlobalProvider } = require('./providers/tuned-global-provider');

protocol.registerSchemesAsPrivileged([{
  scheme: 'gobao-audio',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true }
}]);

let mainWindow;
let desktopModeEnabled = false;
let normalWindowState = null;
const preparedTracks = new Map();

const AUDIO_EXTS = new Set(['mp3','wav','flac','m4a','aac','ogg','opus','wma','webm','mp4','ape','ac3','aiff','m4b']);
const PROTECTED_EXTS = new Set(['qmc0','qmc2','qmc3','qmcflac','qmcogg','ncm','kgm','vpr','mflac']);
const IMAGE_EXTS = new Set(['jpg','jpeg','png','webp']);

const providers = {
  tme: new TmeMusicCloudProvider({
    baseUrl: process.env.GOBAO_TME_BASE_URL || '',
    appId: process.env.GOBAO_TME_APP_ID || '',
    apiKey: process.env.GOBAO_TME_API_KEY || '',
    searchPath: process.env.GOBAO_TME_SEARCH_PATH || '',
    trackPath: process.env.GOBAO_TME_TRACK_PATH || '',
    lyricsPath: process.env.GOBAO_TME_LYRICS_PATH || '',
    playbackPath: process.env.GOBAO_TME_PLAYBACK_PATH || '',
    appIdHeader: process.env.GOBAO_TME_APP_ID_HEADER || '',
    apiKeyHeader: process.env.GOBAO_TME_API_KEY_HEADER || '',
    authScheme: process.env.GOBAO_TME_AUTH_SCHEME || ''
  }),
  tuned: new TunedGlobalProvider({
    baseUrl: process.env.GOBAO_TUNED_BASE_URL || '',
    storeId: process.env.GOBAO_TUNED_STORE_ID || '',
    country: process.env.GOBAO_TUNED_COUNTRY || '',
    searchPath: process.env.GOBAO_TUNED_SEARCH_PATH || '',
    trackPath: process.env.GOBAO_TUNED_TRACK_PATH || '',
    lyricsPath: process.env.GOBAO_TUNED_LYRICS_PATH || '',
    streamPathTemplate: process.env.GOBAO_TUNED_STREAM_PATH_TEMPLATE || ''
  })
};

function safeProvider(name) {
  if (name === 'tme') return providers.tme;
  if (name === 'tuned') return providers.tuned;
  throw new Error('UNKNOWN_PROVIDER');
}

function workerwScriptPath() {
  const packaged = path.join(process.resourcesPath || '', 'workerw.ps1');
  const dev = path.join(__dirname, 'scripts', 'workerw.ps1');
  return fs.existsSync(packaged) ? packaged : dev;
}

function nativeWindowHandleString(win) {
  const handle = win.getNativeWindowHandle();
  if (handle.length >= 8) return handle.readBigUInt64LE(0).toString();
  return String(handle.readUInt32LE(0));
}

function runWorkerW(mode) {
  return new Promise((resolve) => {
    if (process.platform !== 'win32') {
      resolve({ ok: false, error: 'WINDOWS_ONLY' });
      return;
    }
    const script = workerwScriptPath();
    if (!fs.existsSync(script)) {
      resolve({ ok: false, error: 'WORKERW_HELPER_MISSING' });
      return;
    }
    const hwnd = nativeWindowHandleString(mainWindow);
    const child = spawn('powershell.exe', [
      '-NoProfile', '-ExecutionPolicy', 'Bypass',
      '-File', script,
      '-Mode', mode,
      '-Hwnd', hwnd
    ], { windowsHide: true });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', d => { stdout += d.toString(); });
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', () => resolve({ ok: false, error: 'WORKERW_PROCESS_FAILED' }));
    child.on('close', code => {
      const line = stdout.trim().split(/\r?\n/).filter(Boolean).pop();
      let payload = null;
      try { payload = line ? JSON.parse(line) : null; } catch (_e) {}
      resolve(payload || { ok: code === 0, error: code === 0 ? null : (stderr.trim() || 'WORKERW_FAILED') });
    });
  });
}

async function enterDesktopMode() {
  if (!mainWindow) return { enabled: false, mode: 'none', error: 'NO_WINDOW' };
  if (desktopModeEnabled) return { enabled: true, mode: 'workerw' };
  normalWindowState = { bounds: mainWindow.getBounds(), maximized: mainWindow.isMaximized() };

  if (process.platform !== 'win32') {
    mainWindow.setFullScreen(true);
    desktopModeEnabled = true;
    return { enabled: true, mode: 'fullscreen-fallback' };
  }

  const display = screen.getPrimaryDisplay();
  mainWindow.setFullScreen(true);
  mainWindow.setBounds(display.bounds);
  mainWindow.setSkipTaskbar(true);
  mainWindow.setAlwaysOnTop(false);

  const attached = await runWorkerW('attach');
  if (!attached.ok) {
    mainWindow.setSkipTaskbar(false);
    mainWindow.setFullScreen(false);
    if (normalWindowState?.bounds) mainWindow.setBounds(normalWindowState.bounds);
    return { enabled: false, mode: 'none', error: attached.error || 'WORKERW_ATTACH_FAILED' };
  }

  desktopModeEnabled = true;
  return { enabled: true, mode: 'workerw', worker: attached.worker || null };
}

async function exitDesktopMode() {
  if (!mainWindow || !desktopModeEnabled) return { enabled: false, mode: 'none' };
  if (process.platform === 'win32') await runWorkerW('detach');
  desktopModeEnabled = false;
  mainWindow.setSkipTaskbar(false);
  mainWindow.setFocusable(true);
  mainWindow.setIgnoreMouseEvents(false);
  mainWindow.setFullScreen(false);
  if (normalWindowState?.bounds) mainWindow.setBounds(normalWindowState.bounds);
  if (normalWindowState?.maximized) mainWindow.maximize();
  return { enabled: false, mode: 'none' };
}

function ffmpegPath() {
  const name = process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg';
  const packaged = path.join(process.resourcesPath || '', 'bin', name);
  const dev = path.join(__dirname, 'vendor', 'ffmpeg', 'bin', name);
  if (fs.existsSync(packaged)) return packaged;
  if (fs.existsSync(dev)) return dev;
  if (process.env.GOBAO_FFMPEG && fs.existsSync(process.env.GOBAO_FFMPEG)) return process.env.GOBAO_FFMPEG;
  if (process.platform !== 'win32' && fs.existsSync('/usr/bin/ffmpeg')) return '/usr/bin/ffmpeg';
  return dev;
}

function cacheDir() {
  const dir = path.join(app.getPath('temp'), 'GoBaoMusicCache');
  fs.mkdirSync(dir, { recursive: true });
  return dir;
}

function fileCacheKey(input) {
  const stat = fs.statSync(input);
  return crypto.createHash('sha1')
    .update(`${input}|${stat.size}|${stat.mtimeMs}`)
    .digest('hex');
}

function runFfmpeg(input, output) {
  return new Promise((resolve, reject) => {
    const bin = ffmpegPath();
    if (!fs.existsSync(bin)) {
      reject(new Error('FFMPEG_NOT_BUNDLED'));
      return;
    }
    const args = [
      '-y', '-hide_banner', '-loglevel', 'error',
      '-i', input,
      '-vn',
      '-ac', '2',
      '-ar', '48000',
      '-c:a', 'pcm_s16le',
      output
    ];
    const child = spawn(bin, args, { windowsHide: true });
    let stderr = '';
    child.stderr.on('data', d => { stderr += d.toString(); });
    child.on('error', reject);
    child.on('close', code => {
      if (code === 0 && fs.existsSync(output)) resolve(output);
      else reject(new Error(stderr || `FFmpeg exit ${code}`));
    });
  });
}

async function prepareTrack(input) {
  const key = fileCacheKey(input);
  const output = path.join(cacheDir(), `${key}.wav`);
  if (!fs.existsSync(output)) await runFfmpeg(input, output);
  preparedTracks.set(key, output);
  return {
    title: path.basename(input, path.extname(input)),
    sourcePath: input,
    preparedPath: output,
    playbackToken: key,
    playbackUrl: `gobao-audio://track/${key}`
  };
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1450,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    backgroundColor: '#05040a',
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true
    }
  });
  mainWindow.loadFile(path.join(__dirname, 'renderer', 'index.html'));
}

app.whenReady().then(() => {
  protocol.handle('gobao-audio', request => {
    try {
      const url = new URL(request.url);
      const token = url.pathname.replace(/^\//, '');
      const file = preparedTracks.get(token);
      if (!file || !fs.existsSync(file)) return new Response('Not found', { status: 404 });
      return net.fetch(pathToFileURL(file).toString());
    } catch (_e) {
      return new Response('Bad request', { status: 400 });
    }
  });

  ipcMain.handle('music:choose', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导入本地音乐',
      properties: ['openFile'],
      filters: [
        { name: '音乐文件', extensions: ['mp3','wav','flac','m4a','aac','ogg','opus','wma','webm','mp4','ape','ac3','aiff'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const source = result.filePaths[0];
    const ext = path.extname(source).toLowerCase().replace(/^\./, '');
    if (PROTECTED_EXTS.has(ext)) {
      return { canceled: false, ok: false, errorCode: 'PROTECTED_FORMAT' };
    }
    try {
      const track = await prepareTrack(source);
      return { canceled: false, ok: true, track };
    } catch (error) {
      return {
        canceled: false,
        ok: false,
        errorCode: error && error.message === 'FFMPEG_NOT_BUNDLED' ? 'FFMPEG_NOT_BUNDLED' : 'DECODE_FAILED'
      };
    }
  });

  ipcMain.handle('music:prepare-path', async (_event, source) => {
    if (typeof source !== 'string' || !source || !fs.existsSync(source)) return { ok: false, errorCode: 'NOT_FOUND' };
    const ext = path.extname(source).toLowerCase().replace(/^\./, '');
    if (PROTECTED_EXTS.has(ext)) return { ok: false, errorCode: 'PROTECTED_FORMAT' };
    try {
      const track = await prepareTrack(source);
      return { ok: true, track };
    } catch (error) {
      return { ok: false, errorCode: error && error.message === 'FFMPEG_NOT_BUNDLED' ? 'FFMPEG_NOT_BUNDLED' : 'DECODE_FAILED' };
    }
  });

  ipcMain.handle('music:choose-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '扫描本地音乐文件夹',
      properties: ['openDirectory']
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const root = result.filePaths[0];
    return { canceled: false, ok: true, root, tracks: scanAudioLibrary(root) };
  });

  ipcMain.handle('lyrics:choose', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '导入 LRC 歌词',
      properties: ['openFile'],
      filters: [{ name: '歌词文件', extensions: ['lrc','txt'] }]
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    try {
      return { canceled: false, ok: true, path: result.filePaths[0], content: fs.readFileSync(result.filePaths[0], 'utf8') };
    } catch (_e) {
      return { canceled: false, ok: false };
    }
  });

  ipcMain.handle('cover:choose', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择自定义封面',
      properties: ['openFile'],
      filters: [{ name: '图片', extensions: ['jpg','jpeg','png','webp'] }]
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const file = result.filePaths[0];
    const ext = path.extname(file).toLowerCase().replace(/^\./,'');
    if (!IMAGE_EXTS.has(ext)) return { canceled: false, ok: false, errorCode: 'UNSUPPORTED_IMAGE' };
    const stat = fs.statSync(file);
    if (stat.size > 10 * 1024 * 1024) return { canceled: false, ok: false, errorCode: 'IMAGE_TOO_LARGE' };
    const mime = ext === 'png' ? 'image/png' : ext === 'webp' ? 'image/webp' : 'image/jpeg';
    const data = fs.readFileSync(file).toString('base64');
    return { canceled: false, ok: true, path: file, dataUrl: `data:${mime};base64,${data}` };
  });

  ipcMain.handle('provider:status', () => ({
    tme: providers.tme.status(),
    tuned: providers.tuned.status()
  }));

  ipcMain.handle('provider:search', async (_event, name, query, options = {}) => {
    if (typeof query !== 'string' || !query.trim() || query.length > 160) throw new Error('INVALID_QUERY');
    return safeProvider(name).search(query.trim(), options);
  });

  ipcMain.handle('provider:lyrics', async (_event, name, id, options = {}) => {
    if (id === undefined || id === null) throw new Error('INVALID_TRACK_ID');
    return safeProvider(name).getLyrics(id, options);
  });

  ipcMain.handle('provider:playback', async (_event, name, id, context = {}) => {
    if (id === undefined || id === null) throw new Error('INVALID_TRACK_ID');
    return safeProvider(name).getPlayback(id, context);
  });

  ipcMain.handle('wallpaper:choose-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择 Wallpaper Engine / 视觉素材库文件夹',
      properties: ['openDirectory']
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const root = result.filePaths[0];
    return { canceled: false, ok: true, root, items: scanWallpaperProjects(root) };
  });

  ipcMain.handle('app:desktop-mode', async () => {
    return desktopModeEnabled ? exitDesktopMode() : enterDesktopMode();
  });

  ipcMain.handle('app:fullscreen', () => {
    if (!mainWindow) return false;
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
    return mainWindow.isFullScreen();
  });

  createWindow();

  globalShortcut.register('F8', () => {
    if (desktopModeEnabled) void exitDesktopMode();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('will-quit', () => {
  globalShortcut.unregisterAll();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
