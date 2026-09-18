const { app, BrowserWindow, ipcMain, dialog, protocol, net, globalShortcut } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

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

function walkFiles(root, predicate, limit = 1200) {
  const out = [];
  const stack = [root];
  while (stack.length && out.length < limit) {
    const dir = stack.pop();
    let entries = [];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch (_e) { continue; }
    for (const entry of entries) {
      if (out.length >= limit) break;
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.')) stack.push(full);
      } else if (entry.isFile() && predicate(full, entry.name)) {
        out.push(full);
      }
    }
  }
  return out;
}

function scanAudioLibrary(root) {
  return walkFiles(root, full => AUDIO_EXTS.has(path.extname(full).toLowerCase().replace(/^\./,'')), 1000)
    .map(full => ({
      title: path.basename(full, path.extname(full)),
      path: full,
      ext: path.extname(full).toLowerCase().replace(/^\./,'')
    }));
}

function scanWallpaperProjects(root) {
  return walkFiles(root, (_full, name) => name.toLowerCase() === 'project.json', 300).map(projectPath => {
    let meta = {};
    try { meta = JSON.parse(fs.readFileSync(projectPath, 'utf8')); } catch (_e) {}
    return {
      title: meta.title || meta.name || path.basename(path.dirname(projectPath)),
      type: meta.type || 'project',
      projectPath,
      root: path.dirname(projectPath)
    };
  });
}

function exitDesktopMode() {
  if (!mainWindow || !desktopModeEnabled) return false;
  desktopModeEnabled = false;
  mainWindow.setSkipTaskbar(false);
  mainWindow.setFocusable(true);
  mainWindow.setIgnoreMouseEvents(false);
  mainWindow.setFullScreen(false);
  if (normalWindowState?.bounds) mainWindow.setBounds(normalWindowState.bounds);
  if (normalWindowState?.maximized) mainWindow.maximize();
  return false;
}

function toggleDesktopMode() {
  if (!mainWindow) return false;
  if (desktopModeEnabled) return exitDesktopMode();
  normalWindowState = { bounds: mainWindow.getBounds(), maximized: mainWindow.isMaximized() };
  desktopModeEnabled = true;
  mainWindow.setSkipTaskbar(true);
  mainWindow.setAlwaysOnTop(false);
  mainWindow.setFullScreen(true);
  return true;
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

  ipcMain.handle('wallpaper:choose-folder', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: '选择 Wallpaper Engine / 视觉素材库文件夹',
      properties: ['openDirectory']
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const root = result.filePaths[0];
    return { canceled: false, ok: true, root, items: scanWallpaperProjects(root) };
  });

  ipcMain.handle('app:desktop-mode', () => {
    return { enabled: toggleDesktopMode() };
  });

  ipcMain.handle('app:fullscreen', () => {
    if (!mainWindow) return false;
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
    return mainWindow.isFullScreen();
  });

  createWindow();

  globalShortcut.register('F8', () => {
    if (desktopModeEnabled) exitDesktopMode();
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
