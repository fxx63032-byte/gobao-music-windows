const {app,BrowserWindow} = require('electron');
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
app.setPath('userData',fs.mkdtempSync(path.join(os.tmpdir(),'gobao-media-qa-')));
app.commandLine.appendSwitch('autoplay-policy','no-user-gesture-required');
const timeout=setTimeout(()=>{console.error('Media smoke timeout');app.exit(1);},90000);
app.whenReady().then(async()=>{
  const win = new BrowserWindow({show:false,width:1280,height:800,webPreferences:{nodeIntegration:false,contextIsolation:true,backgroundThrottling:false,offscreen:true}});
  const errors=[];
  win.webContents.on('console-message',(_e,details)=>{if (/SyntaxError|ReferenceError/.test(details.message)) errors.push(details.message);});
  process.env.PORT='0';
  process.env.HOST='127.0.0.1';
  const server=require('../Mineradio/server.js');
  if(!server.listening) await new Promise(resolve=>server.once('listening',resolve));
  const origin='http://127.0.0.1:'+server.address().port;
  const probe=await fetch(origin+'/assets/gobao/dynamic-backgrounds/9932a0694a6812706edf2ca73f2f08b1.mp4');
  assert.equal(probe.headers.get('content-type'),'video/mp4');
  await probe.body.cancel();
  await win.loadURL(origin);
  const run=code=>win.webContents.executeJavaScript(code,true);
  for(let i=0;i<100;i++) { if(await run('!!document.getElementById("gobao-background-library")'))break; await new Promise(r=>setTimeout(r,100)); }
  assert.equal(await run('typeof gobaoSelectBackground'), 'function');
  await run('document.getElementById("gobao-library-open").click()');
  assert.equal(await run('gobaoLibraryDialog.open'),true);
  await run('dismissSplash({instant:true})');
  const results=[];
  for(let i=0;i<4;i++) {
    const result=await run(`(async()=>{
      document.querySelectorAll('[data-gobao-background]')[${i}].click();
      const video=document.getElementById('custom-bg-video');
      const start=performance.now();
      while(performance.now()-start<12000) {
        if(video.error)throw new Error('Video decode failed: '+video.error.code);
        if(video.readyState>=2 && video.currentTime>0.1 && !video.paused)break;
        await new Promise(r=>setTimeout(r,80));
      }
      if(video.readyState<2 || video.paused || video.currentTime<=0.1)throw new Error('Video did not play');
      video.currentTime=Math.max(0,video.duration-0.15);
      await new Promise(r=>setTimeout(r,800));
      return {index:${i},width:video.videoWidth,height:video.videoHeight,loop:video.loop,muted:video.muted,wrapped:video.currentTime<3,fit:getComputedStyle(video).objectFit,selected:document.querySelectorAll('[aria-pressed="true"][data-gobao-background]').length};
    })()`);
    assert.equal(result.width,1080);assert.equal(result.height,1920);
    assert.equal(result.loop,true);assert.equal(result.muted,true);assert.equal(result.wrapped,true);assert.equal(result.fit,'contain');assert.equal(result.selected,1);
    results.push(result);
  }
  await run(`document.querySelectorAll('[data-gobao-background]').forEach(b=>b.click())`);
  assert.equal(await run('fx.backgroundMedia.id'),'gobao:af957e69081e83aa8714f18270241ea4');
  const systemReducedMotion=await run('window.matchMedia("(prefers-reduced-motion: reduce)").matches');
  win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  const audio=await run(`(()=>{window.requestAnimationFrame=()=>0;gobaoAudioGlow=0;gobaoUpdateBackgroundAudio({energy:1,beat:1},true);const active=gobaoAudioGlow;for(let i=0;i<100;i++)gobaoUpdateBackgroundAudio({energy:1,beat:1},false);return {active,paused:gobaoAudioGlow};})()`);
  assert.ok(audio.active>0);assert.ok(audio.paused<0.0001);
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const reduced=await run('(()=>{gobaoAudioGlow=0;gobaoUpdateBackgroundAudio({energy:1,beat:1},true);return gobaoAudioGlow;})()');
  assert.equal(reduced,0);
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia', {features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  const evidence=path.resolve(__dirname,'../verification');fs.mkdirSync(evidence,{recursive:true});
  fs.writeFileSync(path.join(evidence,'dynamic-library.png'),(await win.webContents.capturePage()).toPNG());
  await win.webContents.reload();
  await new Promise(resolve=>win.webContents.once('did-finish-load',resolve));
  for(let i=0;i<100;i++) { if(await run('typeof fx!=="undefined" && !!fx.backgroundMedia'))break;await new Promise(r=>setTimeout(r,100)); }
  assert.equal(await run('fx.backgroundMedia.id'),'gobao:af957e69081e83aa8714f18270241ea4');
  await run('document.getElementById("gobao-library-clear").click()');
  assert.equal(await run('document.body.classList.contains("gobao-background-active")'),false);
  assert.equal(await run('document.getElementById("custom-bg-video").getAttribute("src")'),null);
  assert.deepEqual(errors,[]);
  const report={ok:true,transport:"http",platform:process.platform,electron:process.versions.electron,results,audio,systemReducedMotion,reducedMotion:true,persistence:true,clear:true};
  fs.writeFileSync(path.join(evidence,'dynamic-library-smoke.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));clearTimeout(timeout);app.exit(0);
}).catch(e=>{console.error(e.stack);clearTimeout(timeout);app.exit(1);});
