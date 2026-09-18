import { chromium } from 'playwright';

function makeSilentWavDataUri(seconds=2, sampleRate=8000) {
  const samples = Math.floor(seconds * sampleRate);
  const dataSize = samples * 2;
  const buf = Buffer.alloc(44 + dataSize);
  buf.write('RIFF',0);
  buf.writeUInt32LE(36+dataSize,4);
  buf.write('WAVE',8);
  buf.write('fmt ',12);
  buf.writeUInt32LE(16,16);
  buf.writeUInt16LE(1,20);
  buf.writeUInt16LE(1,22);
  buf.writeUInt32LE(sampleRate,24);
  buf.writeUInt32LE(sampleRate*2,28);
  buf.writeUInt16LE(2,32);
  buf.writeUInt16LE(16,34);
  buf.write('data',36);
  buf.writeUInt32LE(dataSize,40);
  return 'data:audio/wav;base64,'+buf.toString('base64');
}

const wavA=makeSilentWavDataUri(2.2,8000);
const wavB=makeSilentWavDataUri(2.2,8000);

const browser=await chromium.launch({
  headless:true,
  args:['--autoplay-policy=no-user-gesture-required','--disable-gpu']
});
const context=await browser.newContext({viewport:{width:1440,height:900}});
await context.addInitScript(({wavA,wavB})=>{
  window.__smokeWavA=wavA;
  window.__smokeWavB=wavB;
  window.goBaoDesktop={
    chooseMusic:async()=>({canceled:false,ok:true,track:{title:'Smoke A',playbackUrl:wavA}}),
    prepareMusicPath:async(path)=>({ok:true,track:{title:path.includes('B')?'Smoke B':'Smoke A',playbackUrl:path.includes('B')?wavB:wavA}}),
    chooseMusicFolder:async()=>({canceled:false,ok:true,root:'C:\\Smoke',tracks:[
      {title:'Smoke A',path:'C:\\Smoke\\A.wav',ext:'wav'},
      {title:'Smoke B',path:'C:\\Smoke\\B.wav',ext:'wav'}
    ]}),
    chooseLyrics:async()=>({canceled:false,ok:true,content:['[00:00.00]第一行','[00:01.00]第二行'].join(String.fromCharCode(10))}),
    chooseCover:async()=>({canceled:false,ok:true,dataUrl:'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='}),
    chooseWallpaperFolder:async()=>({canceled:false,ok:true,items:[]}),
    toggleDesktopMode:async()=>({enabled:true,mode:'workerw'}),
    toggleFullscreen:async()=>true,
    providerStatus:async()=>({
      tme:{configured:false,searchConfigured:false},
      tuned:{configured:true,searchConfigured:true}
    }),
    providerSearch:async(name,q)=>({provider:name,query:q,results:[{id:1,title:'Smoke Result'}]}),
    providerLyrics:async()=>null,
    providerPlayback:async()=>null
  };
},{wavA,wavB});

const page=await context.newPage();
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{if(m.type()==='error')errors.push('console: '+m.text());});

await page.goto('http://127.0.0.1:4184/',{waitUntil:'networkidle'});
await page.waitForFunction(()=>window.GoBaoPlayer && window.GoBaoControls);

await page.click('[data-feature="library"]');
await page.click('#scanMusicBtn');
await page.waitForFunction(()=>document.querySelectorAll('#libraryList .libRow').length===2);

await page.click('[data-feature="lyrics"]');
await page.click('#chooseLyricsBtn');
await page.waitForFunction(()=>document.querySelectorAll('#lyricsLines .lyricLine').length===2);
await page.locator('#lyricOffset').evaluate(el=>{
  el.value='1.5';
  el.dispatchEvent(new Event('input',{bubbles:true}));
});
await page.waitForFunction(()=>document.querySelector('#lyricOffsetOut')?.textContent==='+1.5s');

await page.click('[data-feature="player"]');
await page.click('#chooseCoverBtn');
await page.waitForFunction(()=>document.querySelector('#coverStatus')?.textContent==='自定义封面');

await page.click('[data-feature="providers"]');
await page.click('#providerRefreshBtn');
await page.waitForFunction(()=>document.querySelector('#tunedProviderState')?.textContent.includes('已配置'));
await page.fill('#providerSearchInput','Smoke');
await page.click('#providerSearchBtn');
await page.waitForFunction(()=>document.querySelector('#providerSearchResults')?.textContent.includes('Smoke Result'));

const deckResult=await page.evaluate(async({wavA,wavB})=>{
  const p=window.GoBaoPlayer;
  await p.loadAsCurrent(wavA,{title:'Deck A'});
  await p.playActive();
  await p.prepareDeck(p.inactiveDeck(),wavB);
  const target=p.inactiveDeck();
  await p.crossfadeToPrepared(target,.55);
  return {
    active:p.activeDeck(),
    aPaused:p.deckAudio('A').paused,
    bPaused:p.deckAudio('B').paused
  };
},{wavA,wavB});

if(deckResult.active!=='B') throw new Error('Crossfade did not switch active deck to B');
if(!deckResult.aPaused) throw new Error('Deck A should be paused after crossfade');
if(deckResult.bPaused) throw new Error('Deck B should still be playing after crossfade');

if(errors.length) throw new Error('Renderer errors:\n'+errors.join('\n'));
console.log('GOBAO_V04_SMOKE_OK',deckResult);
await browser.close();
