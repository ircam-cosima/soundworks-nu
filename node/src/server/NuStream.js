/**
 * NuStream: live audio stream from OSC client to players
 *
 * "streaming" from OSC client to soundworks server is based on disk writing / reading. 
 * streaming from server to players is based on the rawsocket soundworks service
 **/

import NuBaseModule from './NuBaseModule'

// req audio read depts
const fs = require('fs');
var AudioContext = require('web-audio-api').AudioContext
const audioContext = new AudioContext;
const assetsPath = __dirname + '/../../public/stream/';

export default class NuStream extends NuBaseModule {
  constructor(serverExperience) {
    super(serverExperience, 'nuStream');

    // local attributes
    this.pointerToStreamInterval = undefined;
    this.packetId = 0;

    // to be saved params to send to client when connects:
    this.params = { 
      gain: 1.0,  // audio gain
      delayTime: 4.0, // time between buffer rec / buffer played on client (for sync playback)
      packetTime: 2.0, // duration of a stream packet, in sec
      startTime: 0.0, // system time at which streaming stated (order given from OSC received)
    };

    // binding
    this.streamCallback = this.streamCallback.bind(this);

    // clean stream directory (delete old 'stream' files)
    this.cleanStreamDir();
  }

  // clean all files containing "stream" in assetsPath 
  cleanStreamDir(){
    fs.readdir(assetsPath, (err, files) => {
      if( err ){ console.log('at ' +  __filename + ':'); throw err; }
      for( let file of files ){
        if( file.search('stream') < 0 ){ continue; }
        fs.unlinkSync(assetsPath + file);
      }
    });    
  }

  // enable / disable streaming module
  onOff(args){
    args.shift(); // playerId, not used, here to keep uniform the module impl.
    let value = args.shift();
    if( value ){
      // remove old files
      this.cleanStreamDir(); 
      // reset packet id
      this.packetId = 0;
      // broadcast start time for reference
      this.params.startTime = this.e.sync.getSyncTime();
      this.e.broadcast('player', null, 'nuStream', ['startTime', this.params.startTime] );
      // start streaming callback
      this.pointerToStreamInterval = setInterval( () => {
        this.streamCallback();
      }, 1000);
    }

    // remove streaming callback
    else{ clearInterval( this.pointerToStreamInterval ); }

    // notify clients of on/off status
    this.e.broadcast( 'player', null, this.moduleName, ['onOff', value] );
  }

  /** 
  * callback in charge of reading audio file from disk, 
  * broadcasting their audio content to players, and deleting 
  * said audio files once used
  **/
  streamCallback(){
    
    // read files names from disk
    fs.readdir(assetsPath, (err, files) => {

      // search for a valid 'stream' file (should be only one there)
      var fileName = undefined;
      for( let file of files ){
        if( file.search('stream') >= 0 ){
          fileName = file;
          break;
        }
      }

      // discard if nothing found
      if( fileName === undefined ){ return; }

      // read file otherwise
      fs.readFile( assetsPath + fileName, (err, buf) => {
        if (err) { throw err; }
        
        // decode file to audiobuffer
        audioContext.decodeAudioData(buf, (audioBuffer) => {
          // debug
          console.log('\nread file:', fileName, 
            'nCh', audioBuffer.numberOfChannels, 
            'sampl.', audioBuffer.sampleRate + 'Hz',
            'dur.', audioBuffer.length / audioBuffer.sampleRate + 's');
          
          // get timestamp from file name
          // let timeStamp = Number( fileName.slice(fileName.search('_') + 1, fileName.search('.wav') ) );
          
          // add packet id to array (need to create new one since Float32Array is fixed size)
          let audioArray = audioBuffer.getChannelData(0);
          var dataArray = new Float32Array( audioArray.length + 1 );
          dataArray[0] = this.packetId;
          dataArray.set(audioArray, 1);

          // send data to every clients
          this.e.clients.forEach( (client) => {
            if( client.type === 'player' ){
              this.e.rawSocket.send( client, 'nuStream', dataArray );
            }
          });

          // delete file
          fs.unlinkSync(assetsPath + fileName);
          console.log('deleting file', fileName);

          // incr. packet Id
          this.packetId += 1;          
        }, 
        (err) => { throw err; }); });

    });

  }

}

