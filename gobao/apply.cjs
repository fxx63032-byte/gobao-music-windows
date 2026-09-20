const fs = require('node:fs');
const path = require('node:path');
const root = path.resolve(__dirname, '..');
const app = path.join(root, 'Mineradio');
function patch(file, marker, before, after) {
  const dest = path.join(app, file);
  const text = fs.readFileSync(dest, 'utf8');
  if (text.includes(marker)) return;
  if (text.split(before).length !== 2) throw new Error('Upstream patch anchor changed: '+file);
  fs.writeFileSync(dest, text.replace(before, after));
}
fs.cpSync(path.join(__dirname, 'public'), path.join(app, 'public'), {recursive:true});
const manifest = JSON.parse(fs.readFileSync(path.join(__dirname,'public/assets/gobao/dynamic-backgrounds/manifest.json')));
fs.writeFileSync(path.join(app,'public/js/gobao-manifest.js'), 'var gobaoBackgroundManifest = '+JSON.stringify(manifest)+';\n');
patch('public/js/index-loader.js', 'js/gobao-backgrounds.js', "    'js/modules/00-state/00-core-stores.js',", "    'js/gobao-manifest.js',\n    'js/gobao-backgrounds.js',\n    'js/modules/00-state/00-core-stores.js',");
patch('public/js/modules/02-visual/06-custom-background-colorlab.js', 'gobaoNormalizeMedia(value)', 'function normalizeCustomBackgroundMedia(value) {', 'function normalizeCustomBackgroundMedia(value) {\n  var bundled = gobaoNormalizeMedia(value);\n  if (bundled) return bundled;');
patch('public/js/modules/11-main-loop.js', 'gobaoUpdateBackgroundAudio(', '  uniforms.uEnergy.value = audioEnergy;', '  uniforms.uEnergy.value = audioEnergy;\n  gobaoUpdateBackgroundAudio({bass:bass, mid:mid, treble:treble, beat:beatPulse, energy:audioEnergy}, playing);');
patch('public/index.html', 'css/gobao-backgrounds.css', '</head>', '  <link rel="stylesheet" href="css/gobao-backgrounds.css">\n</head>');
patch('public/index.html', 'gobao-library-open', '      <div class="lyric-color-row image-pick-row bg-media-row">', '      <div class="lyric-color-row"><div class="fx-color-row-label">GO宝音乐动态素材库<small>六款内置动态背景</small></div><button type="button" class="fx-mini-btn" id="gobao-library-open">打开素材库</button></div>\n      <div class="lyric-color-row image-pick-row bg-media-row">');
patch('public/index.html', 'gobao-background-quick-grid', '      <div class="preset-grid" id="preset-grid"></div>', '      <div id="gobao-background-quick-grid" class="gobao-background-quick-grid" aria-label="GO宝动态背景"></div>\n      <div class="preset-grid" id="preset-grid"></div>');
patch('public/index.html', 'gobao-account-icon', '        <span class="login-easter-eyes compact" aria-hidden="true">\n          <i class="login-easter-eye login-easter-eye-big"></i>\n          <i class="login-easter-eye login-easter-eye-small"></i>\n        </span>', '        <svg class="gobao-account-icon" width="19" height="19" fill="none" stroke="currentColor" stroke-width="1.8" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"/><path d="M5 20c.7-4 3.1-6 7-6s6.3 2 7 6"/></svg>');
patch('public/js/modules/07-fx/02-accent-background-controls.js', 'gobaoSyncBackground(media)', '  var hasVideo = !!(media && media.type === \'video\');', '  var hasVideo = !!(media && media.type === \'video\');\n  gobaoSyncBackground(media);');
patch('public/js/modules/07-fx/09-console-workspace.js', "title: 'GO宝动态背景'", "    groups: [\n      { key: 'presets',", "    groups: [\n      { key: 'gobao-backgrounds', title: 'GO宝动态背景', hint: '六款内置视频，点击立即切换', open: true, items: [\n        fxConsoleItem('gobao-background-quick-grid', 'GO宝动态背景', '视频 素材库 动态背景 MP4 宇宙', false)\n      ] },\n      { key: 'presets',");
patch('public/js/modules/07-fx/09-console-workspace.js', 'gobao-background-group-default-open', "  panel.setAttribute('data-console-layout', 'task-first-v2');\n  setFxPanelTab(fxPanelTab);", "  panel.setAttribute('data-console-layout', 'task-first-v2');\n  // gobao-background-group-default-open: 首次打开常用页即可看到六个动态背景。\n  var gobaoBackgroundGroup = fxConsoleGroups['home:gobao-backgrounds'];\n  if (gobaoBackgroundGroup) {\n    gobaoBackgroundGroup.classList.add('open');\n    var gobaoBackgroundHead = gobaoBackgroundGroup.querySelector('.fx-console-group-head');\n    if (gobaoBackgroundHead) gobaoBackgroundHead.setAttribute('aria-expanded', 'true');\n  }\n  setFxPanelTab(fxPanelTab);");
patch('public/js/modules/08-account/03-login-modal-flows.js', 'gobao-login-direct', "  var modal = document.getElementById('login-modal');\n  if (typeof setLoginEasterEggMode === 'function' &&\n      (!loginEasterEggState || !loginEasterEggState.ready || !loginEasterEggState.unlocked)) {\n    setLoginEasterEggMode(true);\n  }\n  openGsapModal(modal);\n  var unlocked = typeof prepareLoginEasterEggGate === 'function'\n    ? await prepareLoginEasterEggGate()\n    : true;\n  if (!unlocked) return;\n  resumeLoginModalAfterGate();", "  var modal = document.getElementById('login-modal');\n  // gobao-login-direct: GO宝正式版不使用上游大小眼彩蛋门禁。\n  if (typeof setLoginEasterEggMode === 'function') setLoginEasterEggMode(false);\n  if (typeof gobaoPrepareLoginModal === 'function') gobaoPrepareLoginModal(modal);\n  openGsapModal(modal);\n  resumeLoginModalAfterGate();");
patch('public/js/modules/08-account/03-login-modal-flows.js', 'gobao-login-provider-fallback', "  loginProvider = opts.provider ? normalizeLoginProviderKey(opts.provider) : 'netease';", "  loginProvider = opts.provider ? normalizeLoginProviderKey(opts.provider) : 'netease';\n  // gobao-login-provider-fallback: 汽水登录入口不进入 GO宝正式界面，保留其曲库 Provider 实现。\n  if (loginProvider === 'qishui') loginProvider = 'netease';");
patch('public/js/modules/08-account/02-login-status.js', 'gobao-logged-out-account-icon', "    btn.classList.add('logged-out', 'login-eye-avatar');\n    btn.title = '登录账号';\n    btn.innerHTML = typeof loginEasterEggEyeMarkup === 'function'\n      ? loginEasterEggEyeMarkup(true)\n      : '<span class=\"login-word\">登录</span>';", "    // gobao-logged-out-account-icon: 使用普通账号图标，不再把大小眼彩蛋放回顶部按钮。\n    btn.classList.add('logged-out');\n    btn.title = '登录账号';\n    btn.innerHTML = '<svg class=\"gobao-account-icon\" width=\"19\" height=\"19\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"1.8\" viewBox=\"0 0 24 24\" aria-hidden=\"true\"><circle cx=\"12\" cy=\"8\" r=\"3.5\"/><path d=\"M5 20c.7-4 3.1-6 7-6s6.3 2 7 6\"/></svg>';");
patch('public/js/modules/08-account/05-startup-login-guide.js', 'gobaoDisableAutomaticLoginPrompts()', 'function maybeRunStartupLoginGuide(source) {', 'function maybeRunStartupLoginGuide(source) {\n  if (typeof gobaoDisableAutomaticLoginPrompts === \'function\' && gobaoDisableAutomaticLoginPrompts()) return false;');

patch('server.js', 'gobao-qq-login-hotfix-backend',
  "  '/api/qq/login/cookie',\n  '/api/kugou/login/cookie',",
  "  // gobao-qq-login-hotfix-backend: QQ 官方窗口取得的会话保存不再依赖旧彩蛋状态。\n  '/api/kugou/login/cookie',");
patch('desktop/main.js', 'gobao-qq-login-hotfix-ipc',
  "ipcMain.handle('qq-music-open-login', async (event, options) => {\n  if (!loginEasterEggGate.isUnlocked()) return loginEasterEggLockedResult();\n  return openQQMusicLoginWindow(getSenderWindow(event), options || {});\n});",
  "ipcMain.handle('qq-music-open-login', async (event, options) => {\n  // gobao-qq-login-hotfix-ipc: 仅移除 QQ 登录旧彩蛋门禁，保留可信主窗口校验。\n  if (!isTrustedMainWindowIpc(event)) return { ok: false, error: 'UNTRUSTED_SENDER' };\n  return openQQMusicLoginWindow(getSenderWindow(event), options || {});\n});");
patch('public/js/modules/08-account/03-login-modal-flows.js', 'GO宝音乐弹出的 QQ 音乐官方网页登录窗口',
  "    ? '打开 <b>QQ 音乐官方网页登录窗口</b> 扫码，成功后会自动同步账号会话。'",
  "    ? '打开 <b>GO宝音乐弹出的 QQ 音乐官方网页登录窗口</b> 扫码，成功后会自动同步账号会话；不会读取你另外打开的 QQ音乐 Windows 客户端。'");


patch('public/js/modules/05-playback/11-provider-fallback.js', 'gobao-restricted-no-auto-queue-scan',
  'var SOURCE_FALLBACK_MAX_QUEUE_ADVANCES = 2;',
  '// gobao-restricted-no-auto-queue-scan: 受限歌曲只尝试当前歌曲的可用替代音源，不再自动扫描/推进整条队列。\\nvar SOURCE_FALLBACK_MAX_QUEUE_ADVANCES = 0;');

patch('public/js/modules/05-playback/14-player-controls.js', 'gobao-restricted-manual-retry-cooldown',
  "    if ((!audio || !audio.src) && playQueue.length && currentIdx >= 0) {\\n      await playQueueAt(currentIdx, { manual: true });\\n      return;\\n    }",
  "    if ((!audio || !audio.src) && playQueue.length && currentIdx >= 0) {\\n      // gobao-restricted-manual-retry-cooldown: 终止态后短时间内点击播放不再立刻触发整套换源链。\\n      if (typeof isQueueItemRecentlyPlaybackFailed === 'function' && isQueueItemRecentlyPlaybackFailed(currentIdx)) {\\n        if (typeof showSourceFallbackNotice === 'function') showSourceFallbackNotice('当前歌曲暂不可播放', '已停止自动重试，避免反复换源导致卡顿。请选择其他歌曲，或稍后再试。');\\n        return;\\n      }\\n      await playQueueAt(currentIdx, { manual: true });\\n      return;\\n    }");

console.log('GO宝 dynamic library applied to pinned Mineradio.');

patch('server.js', "'.mp4': 'video/mp4'", 'const MIME = {', "const MIME = {\n  '.mp4': 'video/mp4',");
