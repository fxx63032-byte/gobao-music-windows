// GO宝 additions to the pinned GPL-3.0-only Mineradio runtime.
var gobaoBackgroundBase = 'assets/gobao/dynamic-backgrounds/';
var gobaoLibraryDialog;
var gobaoLibraryStatus;
var gobaoAudioGlow = 0;
var gobaoBackdropVideo;
var gobaoBackdropSyncTimer;
function gobaoDisableAutomaticLoginPrompts() { return true; }
function gobaoPrepareLoginModal(modal) {
  if (!modal) return;
  modal.classList.remove('login-easter-egg-locked', 'login-easter-egg-unlocking');
  var gate = document.getElementById('login-easter-egg-gate');
  if (gate) gate.setAttribute('aria-hidden', 'true');
}
function gobaoNormalizeMedia(value) {
  if (!value || value.type !== 'video') return null;
  var item = gobaoBackgroundManifest.items.find(function (item) {
    return value.id === 'gobao:' + item.id && value.src === gobaoBackgroundBase + item.file;
  });
  return item ? {type:'video', id:'gobao:'+item.id, src:gobaoBackgroundBase+item.file, name:item.name, mime:'video/mp4', size:item.bytes} : null;
}
function gobaoBackdropMatchesPrimary(primary, backdrop) {
  return !!(primary && backdrop && primary.getAttribute('src') && primary.getAttribute('src') === backdrop.getAttribute('src'));
}
function gobaoSyncBackdropPlayback(force) {
  var primary = document.getElementById('custom-bg-video');
  var backdrop = gobaoBackdropVideo;
  if (!gobaoBackdropMatchesPrimary(primary, backdrop)) return;
  backdrop.playbackRate = primary.playbackRate || 1;
  if (primary.readyState >= 1 && (force || Math.abs((backdrop.currentTime || 0) - (primary.currentTime || 0)) > 0.12)) {
    try { backdrop.currentTime = primary.currentTime || 0; } catch (_) { }
  }
  if (primary.paused) backdrop.pause();
  else {
    var play = backdrop.play();
    if (play && play.catch) play.catch(function () { });
  }
}
function gobaoEnsureBackdropVideo() {
  if (gobaoBackdropVideo && gobaoBackdropVideo.isConnected) return gobaoBackdropVideo;
  var primary = document.getElementById('custom-bg-video');
  var layer = document.getElementById('custom-bg');
  if (!primary || !layer) return null;
  var backdrop = document.createElement('video');
  backdrop.id = 'gobao-background-backdrop';
  backdrop.muted = true;
  backdrop.loop = true;
  backdrop.playsInline = true;
  backdrop.preload = 'metadata';
  backdrop.setAttribute('aria-hidden','true');
  layer.insertBefore(backdrop, primary);
  gobaoBackdropVideo = backdrop;
  ['loadedmetadata','playing','seeked','ratechange'].forEach(function (eventName) {
    primary.addEventListener(eventName,function () { gobaoSyncBackdropPlayback(true); });
  });
  primary.addEventListener('timeupdate',function () { gobaoSyncBackdropPlayback(false); });
  primary.addEventListener('pause',function () { if (gobaoBackdropVideo) gobaoBackdropVideo.pause(); });
  return backdrop;
}
function gobaoSetBackdropMedia(bundled) {
  var backdrop = gobaoEnsureBackdropVideo();
  if (!backdrop) return;
  if (!bundled) {
    if (gobaoBackdropSyncTimer) clearInterval(gobaoBackdropSyncTimer);
    gobaoBackdropSyncTimer = null;
    backdrop.pause();
    backdrop.removeAttribute('src');
    backdrop.load();
    return;
  }
  if (backdrop.getAttribute('src') !== bundled.src) {
    backdrop.setAttribute('src', bundled.src);
    backdrop.load();
  }
  backdrop.muted = true;
  backdrop.loop = true;
  if (!gobaoBackdropSyncTimer) {
    gobaoBackdropSyncTimer = setInterval(function () { gobaoSyncBackdropPlayback(false); }, 120);
  }
  var play = backdrop.play();
  if (play && play.catch) play.catch(function () { });
}
function gobaoSyncBackground(media) {
  var bundled = gobaoNormalizeMedia(media);
  document.body.classList.toggle('gobao-background-active', !!bundled);
  gobaoSetBackdropMedia(bundled);
  document.querySelectorAll('[data-gobao-background]').forEach(function (button) {
    button.setAttribute('aria-pressed', String(!!bundled && bundled.id === 'gobao:'+button.dataset.gobaoBackground));
  });
}
function gobaoUpdateBackgroundAudio(frame, isPlaying) {
  var active = document.body.classList.contains('gobao-background-active');
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  function level(v) { return Number.isFinite(v) ? Math.max(0,Math.min(1,v)) : 0; }
  var target = active && isPlaying && !reduced ? Math.min(0.35, level(frame.energy)*0.2+level(frame.beat)*0.15) : 0;
  gobaoAudioGlow += (target-gobaoAudioGlow)*0.15;
  document.documentElement.style.setProperty('--gobao-audio-glow', gobaoAudioGlow.toFixed(4));
}
async function gobaoSelectBackground(item) {
  try {
    document.body.classList.remove('home-wallpaper-preview', 'idle-guide-on');
    if (document.body.classList.contains('wallpaper-engine-active')) {
      await deactivateWallpaperEngineBackground();
      if (document.body.classList.contains('wallpaper-engine-active')) throw new Error('wallpaper active');
    }
    fx.backgroundMediaCropX = 50;
    fx.backgroundMediaCropY = 50;
    fx.backgroundMediaZoom = 1;
    fx.backgroundOpacity = 1;
    setCustomBackgroundMedia({type:'video',id:'gobao:'+item.id,src:gobaoBackgroundBase+item.file},true);
    gobaoLibraryStatus.textContent = '正在加载 '+item.name+' 横屏舞台…';
  } catch (_) {
    gobaoLibraryStatus.textContent = '背景暂时无法切换，请关闭桌面壁纸后重试。';
  }
}
function gobaoMakeBackgroundCard(item, compact) {
  var button = document.createElement('button');
  button.type = 'button';
  button.className = compact ? 'gobao-background-card compact' : 'gobao-background-card';
  button.dataset.gobaoBackground = item.id;
  button.setAttribute('aria-pressed','false');
  button.setAttribute('aria-label','切换到' + item.name);
  var preview = document.createElement('span');
  preview.className = 'gobao-background-preview';
  preview.style.setProperty('--gobao-poster','url("' + gobaoBackgroundBase + item.poster + '")');
  var image = document.createElement('img');
  image.src = gobaoBackgroundBase + item.poster;
  image.alt = '';
  image.width = 480;
  image.height = 854;
  preview.appendChild(image);
  button.appendChild(preview);
  var copy = document.createElement('span');
  copy.className = 'gobao-background-card-copy';
  var title = document.createElement('b');
  title.textContent = item.name;
  var hint = document.createElement('small');
  hint.textContent = '点击立即切换';
  copy.appendChild(title);
  copy.appendChild(hint);
  button.appendChild(copy);
  button.addEventListener('click',function () { gobaoSelectBackground(item); });
  return button;
}
function gobaoInitLibrary() {
  var open = document.getElementById('gobao-library-open');
  if (!open || gobaoLibraryDialog) return;
  var dialog = gobaoLibraryDialog = document.createElement('dialog');
  dialog.id = 'gobao-background-library';
  dialog.setAttribute('aria-labelledby','gobao-library-title');
  dialog.innerHTML = '<header><h2 id="gobao-library-title">动态素材库</h2><button type="button" id="gobao-library-close" aria-label="关闭素材库">关闭</button></header><p>横屏舞台 · 竖版主体完整保留 · 点击立即切换</p><div class="gobao-background-grid"></div><p id="gobao-library-status" role="status" aria-live="polite">播放音乐时，外围光晕随节奏变化。</p><button type="button" id="gobao-library-clear">恢复默认背景</button>';
  document.body.appendChild(dialog);
  gobaoLibraryStatus = document.getElementById('gobao-library-status');
  var grid = dialog.querySelector('.gobao-background-grid');
  var quickGrid = document.getElementById('gobao-background-quick-grid');
  gobaoBackgroundManifest.items.forEach(function (item) {
    grid.appendChild(gobaoMakeBackgroundCard(item, false));
    if (quickGrid) quickGrid.appendChild(gobaoMakeBackgroundCard(item, true));
  });
  open.addEventListener('click',function () { gobaoSyncBackground(customBackgroundActiveMedia()); dialog.showModal(); });
  document.getElementById('gobao-library-close').addEventListener('click',function () { dialog.close(); });
  document.getElementById('gobao-library-clear').addEventListener('click',function () { clearCustomBackgroundImage(); gobaoLibraryStatus.textContent='已恢复默认背景'; });
  var video = document.getElementById('custom-bg-video');
  video.addEventListener('playing',function () {
    if (gobaoNormalizeMedia(customBackgroundActiveMedia())) gobaoLibraryStatus.textContent='横屏背景已切换，竖版主体正在静音循环播放。';
  });
  video.addEventListener('error',function () {
    if (!gobaoNormalizeMedia(customBackgroundActiveMedia())) return;
    clearCustomBackgroundImage();
    gobaoLibraryStatus.textContent='这段背景暂时无法播放，已恢复默认背景。请重试或选择其他素材。';
    showToast('背景暂时无法播放，已恢复默认背景');
  });
  var halo = document.createElement('div');
  halo.id='gobao-background-halo';
  halo.setAttribute('aria-hidden','true');
  document.getElementById('custom-bg').appendChild(halo);
}
setTimeout(gobaoInitLibrary,0);
