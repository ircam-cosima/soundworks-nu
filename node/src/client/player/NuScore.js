/**
 * NuScore: define sequences of sounds to play
 **/

import NuBaseModule from './NuBaseModule'
import * as soundworks from 'soundworks/client';

const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuScore extends NuBaseModule {
  constructor(playerExperience) {
    super(playerExperience, 'nuScore');

    // local attributes
    this.masterGain = audioContext.createGain();
    this.masterGain.connect(this.e.nuOutput.in);
    this.srcMap = new Map();
  }

  // set audio gain out
  gain(val){
    this.masterGain.gain.value = val;
  }

  /*
   * message callback: play sound
   */
  startScore( args ) {
    let timeSent = args.shift();
    let nuNotes = args.length/2;
    var time, name, buffer, startTime, duration;

    // define times
    var now = this.e.sync.getSyncTime();
    var syncStartTime = timeSent + this.params.delay - now;

    // loop over score samples, fill in output buffer with samples
    for (let i = 0; i < nuNotes; i++) {
      // get note params
      time = args[ 2*i ];
      name = args[ 2*i + 1 ];
      buffer = this.e.loader.data[name];

      // skip note if undefined audio buffer
      if( buffer === undefined ){ continue; }

      // create and connect source
      let src = audioContext.createBufferSource();
      src.buffer = buffer;
      src.connect( this.masterGain );

      // start source
      startTime = syncStartTime + time;
      duration = this.params.perc * buffer.duration;
      // play in future if rendez-vous time not yet reached (should be default behavior)
      if (startTime > 0){ src.start(audioContext.currentTime + startTime, 0, duration); }
      // play with advance in buffer to keep sync.
      else { src.start(audioContext.currentTime, -startTime, duration); }      

      // add src to local map for eventual reset
      this.srcMap.set(src, src);
      src.onended = () => { 
        this.srcMap.delete(src); 
        this.e.renderer.disable();
      };

      // enable visual rendering
      this.e.renderer.enable();
    }

  }

  // kill audio
  reset(){
    this.srcMap.forEach( (src) => {
      // stop source
      src.stop(); 
      // remove associated visual feedback
      this.e.renderer.disable();
    });
  }  

}