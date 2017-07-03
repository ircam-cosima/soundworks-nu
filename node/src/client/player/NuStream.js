/**
 * NuStream: live audio stream from OSC client to players
 **/

import NuBaseModule from './NuBaseModule'
import * as soundworks from 'soundworks/client';

const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuStream extends NuBaseModule {
  constructor(soundworksClient) {
    super(soundworksClient, 'nuStream');

    // local attributes
    this.params = {};

    // binding
    this.rawSocketCallback = this.rawSocketCallback.bind(this);

    // setup socket reveive callbacks (receiving raw audio data)
    this.soundworksClient.rawSocket.receive('nuStream', this.rawSocketCallback );

    // output gain
    this.out = audioContext.createGain();
    this.out.connect( this.soundworksClient.nuOutput.in );
  }

  // set audio gain out
  gain(val){
    this.out.gain.value = val;
  }

  /** 
  * enable / disable streaming (only thing enabled / disabled here is visual feedback, 
  * actual streaming is done automatically when receiving audio data from dedicated web-socket
  **/
  onOff(value){
    if( value ){ this.soundworksClient.renderer.enable(); }
    else{ this.soundworksClient.renderer.disable(); }
  }

  /*
   * callback executed when rawsocket data received from server (streamed audio data)
   */
  rawSocketCallback(data) {
    
    // decode 
    let packetId = Math.round( data.slice(0, 1) * 100 ) / 100; // other digit are not relevant
    let audioArray = new Float32Array(data.slice(1, data.length));

    // get start time
    const now = this.soundworksClient.sync.getSyncTime();
    let sysTime = this.params.startTime + ( packetId ) * this.params.packetTime + this.params.delayTime;
    let relOffset = sysTime - now;

    // discard data if start time passed (packet deprecated)
    if( relOffset < 0 ){ 
      this.soundworksClient.renderer.blink([100, 0, 0]); 
      return;
    }

    // create audio buffer
    let audioBuffer = audioContext.createBuffer(1, audioArray.length, 44100);
    audioBuffer.getChannelData(0).set(audioArray);

    // create audio source
    let src = audioContext.createBufferSource();
    src.buffer = audioBuffer;
    src.connect( this.out );

    // start source
    src.start(audioContext.currentTime + relOffset);

  }  

}