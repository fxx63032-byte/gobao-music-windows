const { MusicProvider } = require('./provider-contract');

class LocalMusicProvider extends MusicProvider {
  constructor(){ super('local'); }
  async search(query, tracks=[]){
    const q=String(query||'').toLowerCase();
    return tracks.filter(t=>String(t.title||'').toLowerCase().includes(q));
  }
  async getPlayback(track){
    return { type:'local', sourcePath:track.path, rights:{stream:true,download:true,offline:true} };
  }
  async rights(){ return { stream:true, download:true, offline:true, quality:['source'] }; }
}
module.exports={LocalMusicProvider};
