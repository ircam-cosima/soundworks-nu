/**
 * NuStream: live audio stream from OSC client to players
 * NOT FUNCTIONAL YET
 **/

import NuBaseModule from './NuBaseModule'
import RawSocketStreamer from './RawSocketStreamer';

// req audio read depts
const fs = require('fs');
var AudioContext = require('web-audio-api').AudioContext
const audioContext = new AudioContext;
const assetsPath = __dirname + '/../public/sounds/stream/';

export default class NuStream extends NuBaseModule {
  constructor(soundworksServer) {
    super(soundworksServer, 'nuStream');

    // local attributes
    this.soundworksServer = soundworksServer;
    this.pointerToStreamInterval = undefined;

    // to be saved params to send to client when connects:
    this.params = { gain: 1.0 };

    // binding
    this.enterPlayer = this.enterPlayer.bind(this);
    this.exitPlayer = this.exitPlayer.bind(this);
    this.streamCallback = this.streamCallback.bind(this);

  }

  onOff(value){

    if( value ){
      this.pointerToStreamInterval = setInterval( () => {
        this.streamCallback();
      }, 1000);
    }

    else{ 
      clearInterval( this.pointerToStreamInterval );
    }

  }

  streamCallback(){
    
    // read files names from disk
    fs.readdir(assetsPath, (err, files) => {

      // search for a valid 'stream' file
      var fileName = undefined;
      for( let file of files ){
        if( file.search('stream') >= 0 ){
          fileName = file;
          break;
        }
      }

      // discard if nothing found
      if( fileName === undefined ){ return; }

      // otherwise read file
      fs.readFile( assetsPath + fileName, (err, buf) => {
        if (err) { throw err; }
        
        // decode file to audiobuffer
        audioContext.decodeAudioData(buf, (audioBuffer) => {
          // debug
          console.log('\nread file:', fileName);
          let timeStamp = Number( fileName.slice(fileName.search('_') + 1, fileName.search('.wav') ) );
          console.log('time stamp:', timeStamp);
          console.log('num channels:', audioBuffer.numberOfChannels);
          console.log('sample rate:', audioBuffer.sampleRate, 'Hz');
          console.log('duration:', audioBuffer.length / audioBuffer.sampleRate, 'sec \n');

          // send data to every clients
          var dataArray = audioBuffer.getChannelData(0);
          this.soundworksServer.clients.forEach( (client) => {
            this.soundworksServer.rawSocket.send( client, 'nuStream', dataArray );
          });
          // console.log(audioBuffer.getChannelData(0))
          // this.rawSocketStreamer.send( 0, audioBuffer.getChannelData(0) );
          // send audio data to clients
          // console.log( audioBuffer.getChannelData(0) )
          // this.rawSocket.send( client, fileName, interleavedData );

          // delete file
          // ...

        }, 
        (err) => { throw err; }); });

    });

  }

  enterPlayer(client){
    // send to new client information regarding current groups parameters
    Object.keys(this.params).forEach( (key) => {
      this.soundworksServer.send(client, 'nuStream', [key, this.params[key]]);
    });    
  }

  exitPlayer(client){
  }

}

