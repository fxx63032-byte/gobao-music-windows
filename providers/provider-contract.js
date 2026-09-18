class MusicProvider {
  constructor(name){ this.name=name; }
  async search(_query){ throw new Error('NOT_IMPLEMENTED'); }
  async getTrack(_id){ throw new Error('NOT_IMPLEMENTED'); }
  async getPlayback(_id,_context={}){ throw new Error('NOT_IMPLEMENTED'); }
  async getLyrics(_id){ return null; }
  async getPlaylist(_id){ return null; }
  async recommendations(_context={}){ return []; }
  async rights(_id,_context={}){ return { stream:false, download:false }; }
}
module.exports={MusicProvider};
