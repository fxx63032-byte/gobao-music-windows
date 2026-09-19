const { app, BrowserWindow, ipcMain, dialog, protocol, net } = require('electron');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const { spawn } = require('child_process');
const { pathToFileURL } = require('url');

app.setName('GO宝音乐');

protocol.registerSchemesAsPrivileged([{
  scheme: 'gobao-audio',
  privileges: { standard: true, secure: true, supportFetchAPI: true, corsEnabled: true, stream: true }
}]);

let mainWindow;
const preparedTracks = new Map();

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
    title: 'GO宝音乐',
    icon: path.join(__dirname, 'build', 'icon.ico'),
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
      title: 'GO宝音乐 · 导入本地音乐',
      properties: ['openFile'],
      filters: [
        { name: '音乐文件', extensions: ['mp3','wav','flac','m4a','aac','ogg','opus','wma','webm','mp4','ape','ac3','aiff'] },
        { name: '所有文件', extensions: ['*'] }
      ]
    });
    if (result.canceled || !result.filePaths[0]) return { canceled: true };
    const source = result.filePaths[0];
    const ext = path.extname(source).toLowerCase().replace(/^\./, '');
    const protectedExts = new Set(['qmc0','qmc2','qmc3','qmcflac','qmcogg','ncm','kgm','vpr','mflac']);
    if (protectedExts.has(ext)) {
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

  ipcMain.handle('app:fullscreen', () => {
    if (!mainWindow) return false;
    mainWindow.setFullScreen(!mainWindow.isFullScreen());
    return mainWindow.isFullScreen();
  });

  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
