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
patch('public/index.html', 'gobao-library-open', '      <div class="lyric-color-row image-pick-row bg-media-row">', '      <div class="lyric-color-row"><div class="fx-color-row-label">GO宝音乐动态素材库<small>四款内置动态背景</small></div><button type="button" class="fx-mini-btn" id="gobao-library-open">打开素材库</button></div>\n      <div class="lyric-color-row image-pick-row bg-media-row">');
patch('public/js/modules/07-fx/02-accent-background-controls.js', 'gobaoSyncBackground(media)', '  var hasVideo = !!(media && media.type === \'video\');', '  var hasVideo = !!(media && media.type === \'video\');\n  gobaoSyncBackground(media);');
console.log('GO宝 dynamic library applied to pinned Mineradio.');

patch('server.js', "'.mp4': 'video/mp4'", 'const MIME = {', "const MIME = {\n  '.mp4': 'video/mp4',");
