const fs=require('fs');
const os=require('os');
const path=require('path');
const {spawnSync}=require('child_process');
const root=path.resolve(__dirname,'..');
const candidates=process.platform==='win32'
  ? [path.join(root,'vendor','ffmpeg','bin','ffmpeg.exe')]
  : [process.env.GOBAO_FFMPEG,'/usr/bin/ffmpeg',path.join(root,'vendor','ffmpeg','bin','ffmpeg')].filter(Boolean);
const ffmpeg=candidates.find(p=>fs.existsSync(p));
if(!ffmpeg) throw new Error('FFmpeg not found. Candidates: '+candidates.join(', '));
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'gobao-audio-selftest-'));
const mp3=path.join(dir,'selftest.mp3');
const wav=path.join(dir,'selftest-prepared.wav');
function run(args){const r=spawnSync(ffmpeg,args,{encoding:'utf8',windowsHide:true});if(r.status!==0) throw new Error(r.stderr||`ffmpeg exit ${r.status}`);}
try{
  run(['-y','-hide_banner','-loglevel','error','-f','lavfi','-i','sine=frequency=440:sample_rate=48000','-t','3','-c:a','libmp3lame','-b:a','128k',mp3]);
  run(['-y','-hide_banner','-loglevel','error','-i',mp3,'-vn','-ac','2','-ar','48000','-c:a','pcm_s16le',wav]);
  const b=fs.readFileSync(wav);
  if(b.length<1000||b.subarray(0,4).toString()!=='RIFF'||b.subarray(8,12).toString()!=='WAVE') throw new Error('Invalid WAV output');
  console.log(JSON.stringify({ok:true,ffmpeg:path.basename(ffmpeg),bytes:b.length,header:'RIFF/WAVE'}));
}finally{fs.rmSync(dir,{recursive:true,force:true});}
