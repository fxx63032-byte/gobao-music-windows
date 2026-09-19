// GO宝 additions to the pinned GPL-3.0-only Mineradio runtime.
var gobaoBackgroundBase = 'assets/gobao/dynamic-backgrounds/';
var gobaoLibraryDialog;
var gobaoLibraryStatus;
var gobaoAudioGlow = 0;
var gobaoBackdropCanvas;
var gobaoBackdropFrameHandle = 0;
var gobaoBackdropFrameMode = '';
var gobaoBackdropSource = '';
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
function gobaoDrawBackdropFrame() {
  var primary = document.getElementById('custom-bg-video');
  var canvas = gobaoBackdropCanvas;
  if (!primary || !canvas || primary.readyState < 2 || !primary.videoWidth || !primary.videoHeight) return;
  var layer = document.getElementById('custom-bg');
  var layerWidth = layer ? layer.clientWidth : window.innerWidth;
  var layerHeight = layer ? layer.clientHeight : window.innerHeight;
  var mobile = window.matchMedia('(max-width:700px)').matches;
  var width = mobile ? 480 : 960;
  var height = Math.max(1, Math.round(width * layerHeight / Math.max(1,layerWidth)));
  if (canvas.width !== width || canvas.height !== height) { canvas.width = width; canvas.height = height; }
  var context = canvas.getContext('2d', {alpha:false});
  if (!context) return;
  var columns = mobile ? 1 : 3;
  var cellWidth = width / columns;
  var sourceRatio = primary.videoWidth / primary.videoHeight;
  var cellRatio = cellWidth / height;
  var sourceX = 0;
  var sourceY = 0;
  var sourceWidth = primary.videoWidth;
  var sourceHeight = primary.videoHeight;
  if (sourceRatio > cellRatio) {
    sourceWidth = primary.videoHeight * cellRatio;
    sourceX = (primary.videoWidth - sourceWidth) / 2;
  } else {
    sourceHeight = primary.videoWidth / cellRatio;
    sourceY = (primary.videoHeight - sourceHeight) / 2;
  }
  context.fillStyle = '#08050e';
  context.fillRect(0,0,width,height);
  for (var column=0; column<columns; column++) {
    context.drawImage(primary,sourceX,sourceY,sourceWidth,sourceHeight,column*cellWidth,0,cellWidth,height);
  }
  canvas.dataset.columns = String(columns);
  canvas.dataset.frameReady = 'true';
  canvas.dataset.frameCount = String((Number(canvas.dataset.frameCount) || 0) + 1);
}
function gobaoQueueBackdropFrame() {
  if (gobaoBackdropFrameHandle || !document.body.classList.contains('gobao-background-active')) return;
  var primary = document.getElementById('custom-bg-video');
  if (!primary) return;
  if (typeof primary.requestVideoFrameCallback === 'function') {
    gobaoBackdropFrameMode = 'video';
    gobaoBackdropFrameHandle = primary.requestVideoFrameCallback(function () {
      gobaoBackdropFrameHandle = 0;
      gobaoDrawBackdropFrame();
      gobaoQueueBackdropFrame();
    });
  } else {
    gobaoBackdropFrameMode = 'animation';
    gobaoBackdropFrameHandle = requestAnimationFrame(function () {
      gobaoBackdropFrameHandle = 0;
      gobaoDrawBackdropFrame();
      gobaoQueueBackdropFrame();
    });
  }
}
function gobaoStopBackdropFrames() {
  var primary = document.getElementById('custom-bg-video');
  if (gobaoBackdropFrameHandle) {
    if (gobaoBackdropFrameMode === 'video' && primary && typeof primary.cancelVideoFrameCallback === 'function') primary.cancelVideoFrameCallback(gobaoBackdropFrameHandle);
    else cancelAnimationFrame(gobaoBackdropFrameHandle);
  }
  gobaoBackdropFrameHandle = 0;
  gobaoBackdropFrameMode = '';
  if (gobaoBackdropCanvas) {
    var context = gobaoBackdropCanvas.getContext('2d');
    if (context) context.clearRect(0,0,gobaoBackdropCanvas.width,gobaoBackdropCanvas.height);
    gobaoBackdropCanvas.dataset.frameReady = 'false';
    gobaoBackdropCanvas.dataset.frameCount = '0';
    gobaoBackdropCanvas.dataset.columns = '0';
  }
}
function gobaoEnsureBackdropCanvas() {
  if (gobaoBackdropCanvas && gobaoBackdropCanvas.isConnected) return gobaoBackdropCanvas;
  var primary = document.getElementById('custom-bg-video');
  var layer = document.getElementById('custom-bg');
  if (!primary || !layer) return null;
  var canvas = document.createElement('canvas');
  canvas.id = 'gobao-background-backdrop';
  canvas.width = 360;
  canvas.height = 640;
  canvas.dataset.frameReady = 'false';
  canvas.dataset.frameCount = '0';
  canvas.dataset.columns = '0';
  canvas.setAttribute('aria-hidden','true');
  layer.insertBefore(canvas, primary);
  gobaoBackdropCanvas = canvas;
  ['loadeddata','playing','seeked','timeupdate'].forEach(function (eventName) {
    primary.addEventListener(eventName,function () { gobaoDrawBackdropFrame(); gobaoQueueBackdropFrame(); });
  });
  return canvas;
}
function gobaoSetBackdropMedia(bundled) {
  var backdrop = gobaoEnsureBackdropCanvas();
  if (!backdrop) return;
  if (!bundled) {
    gobaoStopBackdropFrames();
    gobaoBackdropSource = '';
    return;
  }
  if (gobaoBackdropSource !== bundled.src) {
    gobaoStopBackdropFrames();
    gobaoBackdropSource = bundled.src;
    return;
  }
  gobaoDrawBackdropFrame();
  gobaoQueueBackdropFrame();
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
  for (var tile=0; tile<3; tile++) {
    var image = document.createElement('img');
    image.src = gobaoBackgroundBase + item.poster;
    image.alt = '';
    image.width = 160;
    image.height = 284;
    preview.appendChild(image);
  }
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
  dialog.innerHTML = '<header><h2 id="gobao-library-title">动态素材库</h2><button type="button" id="gobao-library-close" aria-label="关闭素材库">关闭</button></header><p>桌面三联满屏 · 手机单画面 · 点击立即切换</p><div class="gobao-background-grid"></div><p id="gobao-library-status" role="status" aria-live="polite">播放音乐时，外围光晕随节奏变化。</p><button type="button" id="gobao-library-clear">恢复默认背景</button>';
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
    if (gobaoNormalizeMedia(customBackgroundActiveMedia())) gobaoLibraryStatus.textContent='桌面三联满屏已切换；手机端自动显示单画面。';
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
