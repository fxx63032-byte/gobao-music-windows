import { chromium } from 'playwright';

const browser = await chromium.launch({headless:true});
const page = await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];
page.on('pageerror',e=>errors.push(String(e)));
page.on('console',m=>{ if(m.type()==='error') errors.push('console: '+m.text()); });

await page.goto('http://127.0.0.1:4173/',{waitUntil:'networkidle'});
await page.waitForSelector('#page-home.active');

const navTests=[
  ['search','#page-search.active'],
  ['aidj','#page-aidj.active'],
  ['playlists','#page-playlists.active'],
  ['charts','#page-charts.active'],
  ['library','#page-library.active'],
  ['local','#page-local.active'],
  ['downloads','#page-downloads.active'],
  ['services','#page-services.active'],
  ['home','#page-home.active']
];

for (const [name,selector] of navTests){
  await page.click('#nav [data-page="'+name+'"]');
  await page.waitForSelector(selector,{state:'visible'});
}

await page.click('#heroAI');
await page.waitForSelector('#page-aidj.active',{state:'visible'});
await page.fill('#aiPrompt','晚上开车想听有节奏但不吵的歌');
await page.click('#aiGenerate');
await page.waitForFunction(()=>document.querySelectorAll('#aiResults .trackRowItem').length>0);

await page.click('#nav [data-page="search"]');
await page.fill('#searchInput','夜');
await page.click('#searchBtn');
await page.waitForFunction(()=>document.querySelectorAll('#searchResults .trackRowItem').length>0);

await page.click('#nav [data-page="playlists"]');
await page.click('#newPlaylistTop');
await page.waitForSelector('#playlistModal.open');
await page.fill('#playlistNameInput','自动测试歌单');
await page.click('#confirmPlaylist');
await page.waitForFunction(()=>document.querySelector('#customPlaylists')?.textContent.includes('自动测试歌单'));

await page.click('#openVisualBtn');
await page.waitForSelector('#visualModal.open');
await page.click('#closeVisual');
await page.waitForFunction(()=>!document.querySelector('#visualModal').classList.contains('open'));

if(errors.length) throw new Error('Browser errors:\n'+errors.join('\n'));
console.log('GOBAO_WEB_SMOKE_OK');
await browser.close();
