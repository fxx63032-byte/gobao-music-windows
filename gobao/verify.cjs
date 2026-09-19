const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const root = path.resolve(__dirname,'..');
const publicRoot = path.resolve(root,process.argv[2] || 'Mineradio/public');
const relative = 'assets/gobao/dynamic-backgrounds';
const original = JSON.parse(fs.readFileSync(path.join(__dirname,'public',relative,'manifest.json')));
assert.deepEqual(JSON.parse(fs.readFileSync(path.join(publicRoot,relative,'manifest.json'))),original);
assert.equal(original.items.length,4);
for (const item of original.items) {
  const data = fs.readFileSync(path.join(publicRoot,relative,item.file));
  assert.equal(data.length,item.bytes);
  assert.equal(crypto.createHash('sha256').update(data).digest('hex'),item.sha256);
  assert.ok(fs.statSync(path.join(publicRoot,relative,item.poster)).size>0);
}
for (const file of ['js/gobao-backgrounds.js','js/gobao-manifest.js','js/index-loader.js','js/modules/02-visual/06-custom-background-colorlab.js','js/modules/11-main-loop.js']) new vm.Script(fs.readFileSync(path.join(publicRoot,file),'utf8'),{filename:file});
const context = {setTimeout(){}};
vm.createContext(context);
vm.runInContext(fs.readFileSync(path.join(publicRoot,'js/gobao-manifest.js'),'utf8')+'\n'+fs.readFileSync(path.join(publicRoot,'js/gobao-backgrounds.js'),'utf8'),context);
const item = original.items[0];
assert.ok(context.gobaoNormalizeMedia({type:'video',id:'gobao:'+item.id,src:relative+'/'+item.file}));
assert.equal(context.gobaoNormalizeMedia({type:'video',id:'gobao:'+item.id,src:'../../outside.mp4'}),null);
assert.equal(context.gobaoNormalizeMedia({type:'video',id:'gobao:'+item.id,src:'https://example.com/video.mp4'}),null);
assert.ok(fs.readFileSync(path.join(publicRoot,'index.html'),'utf8').includes('gobao-library-open'));
console.log('PASS: four MP4 hashes, posters, syntax, UI entry and local path allowlist: '+publicRoot);
