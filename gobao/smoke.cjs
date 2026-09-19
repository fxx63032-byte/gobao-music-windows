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
  const waitFor=async(code)=>{
    for(let i=0;i<100;i++) {
      if(await run(code)) return;
      await new Promise(r=>setTimeout(r,100));
    }
    throw new Error('Timed out waiting for: '+code);
  };

  await waitFor('!!document.getElementById("gobao-background-library") && document.querySelectorAll("#gobao-background-quick-grid [data-gobao-background]").length===4');
  assert.equal(await run('typeof gobaoSelectBackground'),'function');
  await run('dismissSplash({instant:true})');

  const placement=await run(`(()=>{
    const grid=document.getElementById('gobao-background-quick-grid');
    const group=grid.closest('section.fx-console-group');
    return {
      cards:grid.querySelectorAll('[data-gobao-background]').length,
      commonPage:!!grid.closest('#fx-console-page-home'),
      groupOpen:!!(group&&group.classList.contains('open')),
      firstGroup:!!(group&&group.parentElement&&group.parentElement.firstElementChild===group)
    };
  })()`);
  assert.deepEqual(placement,{cards:4,commonPage:true,groupOpen:true,firstGroup:true});

  assert.equal(await run('gobaoDisableAutomaticLoginPrompts()'),true);
  assert.equal(await run('maybeRunStartupLoginGuide("qa")'),false);
  const evidence=path.resolve(__dirname,'../verification');
  fs.mkdirSync(evidence,{recursive:true});
  const login=await run(`(async()=>{
    await showLoginModal({provider:'qishui',source:'qa-other-entry'});
    await new Promise(r=>setTimeout(r,650));
    const modal=document.getElementById('login-modal');
    const gate=document.getElementById('login-easter-egg-gate');
    const visible=id=>getComputedStyle(document.getElementById(id)).display!=='none';
    const result={
      open:modal.classList.contains('show'),
      locked:modal.classList.contains('login-easter-egg-locked'),
      gateHidden:getComputedStyle(gate).display==='none'&&gate.getAttribute('aria-hidden')==='true',
      graphVisible:visible('login-node-graph'),
      neteaseVisible:visible('login-provider-netease'),
      qqVisible:visible('login-provider-qq'),
      qishuiHidden:!visible('login-provider-qishui'),
      provider:loginProvider,
      accountIcon:!!document.querySelector('#user-btn .gobao-account-icon'),
      compactEyes:!!document.querySelector('#user-btn .login-easter-eyes')
    };
    return result;
  })()`);
  assert.deepEqual(login,{open:true,locked:false,gateHidden:true,graphVisible:true,neteaseVisible:true,qqVisible:true,qishuiHidden:true,provider:'netease',accountIcon:true,compactEyes:false});
  fs.writeFileSync(path.join(evidence,'direct-login-without-eye-gate.png'),(await win.webContents.capturePage()).toPNG());
  await run('closeLoginModal()');
  await new Promise(r=>setTimeout(r,700));

  await run('applyDiyMode(true,{save:false,toast:false,animate:false});toggleFxPanel(true);setFxPanelTab("home")');
  await new Promise(r=>setTimeout(r,500));
  const visibleLibrary=await run(`(()=>{
    const panel=document.getElementById('fx-panel');
    const cards=Array.from(document.querySelectorAll('#gobao-background-quick-grid [data-gobao-background]'));
    const previews=Array.from(document.querySelectorAll('#gobao-background-quick-grid .gobao-background-preview'));
    return {panel:panel.classList.contains('show')||panel.classList.contains('peek'),cards:cards.filter(card=>card.getBoundingClientRect().height>0&&getComputedStyle(card).display!=='none').length,landscapePreviews:previews.filter(preview=>preview.getBoundingClientRect().width/Math.max(1,preview.getBoundingClientRect().height)>1.7).length};
  })()`);
  assert.deepEqual(visibleLibrary,{panel:true,cards:4,landscapePreviews:4});
  fs.writeFileSync(path.join(evidence,'dynamic-backgrounds-in-diy.png'),(await win.webContents.capturePage()).toPNG());

  await run('document.getElementById("gobao-library-open").click()');
  assert.equal(await run('gobaoLibraryDialog.open'),true);
  assert.equal(await run('document.querySelectorAll("#gobao-background-library [data-gobao-background]").length'),4);
  await run('gobaoLibraryDialog.close()');

  const results=[];
  for(let i=0;i<4;i++) {
    const result=await run(`(async()=>{
      document.querySelectorAll('#gobao-background-quick-grid [data-gobao-background]')[${i}].click();
      const video=document.getElementById('custom-bg-video');
      const backdrop=document.getElementById('gobao-background-backdrop');
      const start=performance.now();
      while(performance.now()-start<12000) {
        if(video.error)throw new Error('Video decode failed: '+video.error.code);
        if(backdrop&&backdrop.error)throw new Error('Backdrop decode failed: '+backdrop.error.code);
        if(video.readyState>=2 && video.currentTime>0.1 && !video.paused&&backdrop&&backdrop.readyState>=2&&!backdrop.paused)break;
        await new Promise(r=>setTimeout(r,80));
      }
      if(video.readyState<2 || video.paused || video.currentTime<=0.1 || !backdrop || backdrop.readyState<2 || backdrop.paused)throw new Error('Landscape composite did not play');
      video.currentTime=Math.max(0,video.duration-0.15);
      await new Promise(r=>setTimeout(r,800));
      const layer=document.getElementById('custom-bg').getBoundingClientRect();
      const canvasStyle=getComputedStyle(document.getElementById('canvas-container'));
      const backdropStyle=getComputedStyle(backdrop);
      return {
        index:${i},width:video.videoWidth,height:video.videoHeight,loop:video.loop,muted:video.muted,
        wrapped:video.currentTime<3,fit:getComputedStyle(video).objectFit,
        portraitSource:video.videoHeight>video.videoWidth,stageLandscape:layer.width>layer.height,
        backdropWidth:backdrop.videoWidth,backdropHeight:backdrop.videoHeight,backdropFit:backdropStyle.objectFit,
        backdropBlur:backdropStyle.filter.includes('blur'),syncDelta:Math.abs(video.currentTime-backdrop.currentTime),
        underlyingHidden:canvasStyle.visibility==='hidden'&&Number(canvasStyle.opacity)===0,
        quickSelected:document.querySelectorAll('#gobao-background-quick-grid [aria-pressed="true"]').length,
        librarySelected:document.querySelectorAll('#gobao-background-library [aria-pressed="true"]').length
      };
    })()`);
    assert.equal(result.width,1080);assert.equal(result.height,1920);
    assert.equal(result.loop,true);assert.equal(result.muted,true);assert.equal(result.wrapped,true);assert.equal(result.fit,'contain');
    assert.equal(result.portraitSource,true);assert.equal(result.stageLandscape,true);assert.equal(result.backdropWidth,1080);assert.equal(result.backdropHeight,1920);
    assert.equal(result.backdropFit,'cover');assert.equal(result.backdropBlur,true);assert.ok(result.syncDelta<0.2);assert.equal(result.underlyingHidden,true);
    assert.equal(result.quickSelected,1);assert.equal(result.librarySelected,1);
    results.push(result);
    if(i===0) fs.writeFileSync(path.join(evidence,'landscape-portrait-composite.png'),(await win.webContents.capturePage()).toPNG());
  }
  assert.equal(await run('fx.backgroundMedia.id'),'gobao:af957e69081e83aa8714f18270241ea4');

  const systemReducedMotion=await run('window.matchMedia("(prefers-reduced-motion: reduce)").matches');
  win.webContents.debugger.attach('1.3');
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});
  const audio=await run(`(()=>{window.requestAnimationFrame=()=>0;gobaoAudioGlow=0;gobaoUpdateBackgroundAudio({energy:1,beat:1},true);const active=gobaoAudioGlow;for(let i=0;i<100;i++)gobaoUpdateBackgroundAudio({energy:1,beat:1},false);return {active,paused:gobaoAudioGlow};})()`);
  assert.ok(audio.active>0);assert.ok(audio.paused<0.0001);
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'reduce'}]});
  const reduced=await run('(()=>{gobaoAudioGlow=0;gobaoUpdateBackgroundAudio({energy:1,beat:1},true);return gobaoAudioGlow;})()');
  assert.equal(reduced,0);
  await win.webContents.debugger.sendCommand('Emulation.setEmulatedMedia',{features:[{name:'prefers-reduced-motion',value:'no-preference'}]});

  await win.webContents.reload();
  await waitFor('typeof fx!=="undefined" && !!fx.backgroundMedia && !!document.getElementById("gobao-background-library")');
  assert.equal(await run('fx.backgroundMedia.id'),'gobao:af957e69081e83aa8714f18270241ea4');
  await run('document.getElementById("gobao-library-clear").click()');
  assert.equal(await run('document.body.classList.contains("gobao-background-active")'),false);
  assert.equal(await run('document.getElementById("custom-bg-video").getAttribute("src")'),null);
  assert.equal(await run('document.getElementById("gobao-background-backdrop").getAttribute("src")'),null);
  assert.notEqual(await run('getComputedStyle(document.getElementById("canvas-container")).visibility'),'hidden');
  assert.deepEqual(errors,[]);
  const report={ok:true,transport:'http',platform:process.platform,electron:process.versions.electron,placement,visibleLibrary,login,results,audio,systemReducedMotion,reducedMotion:true,persistence:true,clear:true};
  fs.writeFileSync(path.join(evidence,'dynamic-library-smoke.json'),JSON.stringify(report,null,2));
  console.log(JSON.stringify(report));
  clearTimeout(timeout);app.exit(0);
}).catch(e=>{console.error(e.stack);clearTimeout(timeout);app.exit(1);});
