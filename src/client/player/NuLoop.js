/**
 * NuLoop: Nu module for drum machine
 **/

import * as soundworks from 'soundworks/client';
const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuLoop {
  constructor(soundworksClient) {

    // local attributes
    this.soundworksClient = soundworksClient;
    this.params = {};
    let audioBuffers = this.soundworksClient.loader.buffers;
    this.synth = new SampleSynth(audioBuffers, this.soundworksClient.renderer.audioAnalyser);
    // this.looper = new Looper(this.soundworksClient.scheduler, this.synth, this.params, audioBuffers.length);
    this.loops = new Matrix(audioBuffers.length, this.params.divisions);

    // binding
    this.updateNumDivisions = this.updateNumDivisions.bind(this);
    this.setTrackSlot = this.setTrackSlot.bind(this);
    this.start = this.start.bind(this);
    // this.advanceLoop = this.advanceLoop.bind(this);
    this.remove = this.remove.bind(this);
    this.removeAll = this.removeAll.bind(this);
    this.updateNumDivisions = this.updateNumDivisions.bind(this);
    this.getSlotTime = this.getSlotTime.bind(this);
    this.divisions = this.divisions.bind(this);

    // setup receive callbacks
    this.soundworksClient.receive('nuLoop', (args) => {
      console.log(args);

      let functionName = args.shift();
      this[functionName]( Number(args[0]), Number(args[1]), Number(args[2]), Number(args[3]) );
    });    

    // setup receive callbacks
    this.soundworksClient.receive('nuLoopInternal_initParam', (params) => {
        // set all local parameters based on server's 
        // (for late arrivals, if OSC client alreay defined some earlier)
        Object.keys(params).forEach( (key) => { 
          this.params[key] = params[key];
        });
        // update loops  
        this.updateNumDivisions();
    });

  }

  divisions(value){
    this.params.divisions = value;
    this.updateNumDivisions();
  }

  period(value){
    this.params.period = Math.round(value * 10) / 10;
    // shut down all loops
    // this.removeAll();
  }

  jitter(value){
    this.params.jitter = value;
  }

  jitterMemory(value){
    this.params.jitterMemory = value;
  }


  // update loop maps size
  updateNumDivisions(){
    // shut down all loops
    this.removeAll();
    // resize loop map
    let numTracks = this.soundworksClient.loader.buffers.length;
    this.loops = new Matrix(numTracks, this.params.divisions);
  }

  setTrackSlot(playerId, trackId, slotId, onOff){
    // discard packets not concerning current user
    if( playerId !== client.index && playerId !== -1 ) return;
    // check valid trackId
    if( trackId >= this.soundworksClient.loader.buffers.length || trackId < 0) {
      console.warn('required track id', trackId, 'not in client index, actual content:', this.soundworksClient.loader.options.files);
      return;
    }
    // check valid slotId
    if( slotId >= this.params.divisions || slotId < 0) {
      console.warn('required slot id', slotId, 'is not available in current setup (should be in [ 0,', this.params.divisions - 1, ']');
      return;
    }

    // add event (sound) in loop
    if( onOff ){
      // discard start already started source
      if( this.loops.mat[trackId][slotId] !== undefined ) { return; }
      
      // start new loop event
      let slotTime = this.getSlotTime(this.soundworksClient.scheduler.syncTime, slotId);
      this.start(slotTime, {trackId: trackId, slotId: slotId}, true);

      // enable visual feedback (add +1 to its stack)
      this.soundworksClient.renderer.enable();
    }
    // remove event from loop
    else{
      // this.looper.stop(time, soundParams, true);
      this.remove(trackId, slotId);
      // disable visual feedback (add -1 to its stack)
      this.soundworksClient.renderer.disable();
    }

  }

  // compute event time in loop
  getSlotTime(currentTime, slotId){
    let currentTimeInMeasure = currentTime % this.params.period;
    let measureStartTime = currentTime - currentTimeInMeasure;
    let slotTime = slotId * ( this.params.period / this.params.divisions );
    // console.log('current time', currentTime, 'measure start time', measureStartTime, 'slot time', measureStartTime + slotTime, 'slot id', slotId, this.params);
    return measureStartTime + slotTime;
  }

  // start new loop
  start(time, soundParams) {
    const loop = new Loop(this, soundParams); // create new loop

    this.loops.mat[soundParams.trackId][soundParams.slotId] = loop; // add loop to set
    this.soundworksClient.scheduler.add(loop, time); // add loop to scheduler
  }  

  // called each loop (in scheduler)
  advanceLoop(time, loop) {
    const soundParams = loop.soundParams;
    const params = this.params;

    // trigger sound
    const duration = this.synth.trigger(this.soundworksClient.scheduler.audioTime, soundParams);

    // add jitter
    let jitter = this.params.jitter * // jitter gain in [0:1]
                 Math.random() *  // random value in [0:1[
                 ( this.params.period / this.params.divisions); // normalization (jitter never goes beyond other time slots)

    if( !this.params.jitterMemory ){
      // get absolute time for current loop
      time = this.getSlotTime(time, loop.soundParams.slotId);
    }
    // console.log('time', time, 'perdiod', this.params.period, 'jitter', jitter, 'next time:', time + this.params.period + jitter);

    // return next time
    return time + this.params.period + jitter;
  }  

  // remove loop by index
  remove(trackId, slotId) {

    let loop = this.loops.mat[trackId][slotId];
    // check for valid loop
    if( loop === undefined ) { return; }
    this.soundworksClient.scheduler.remove(loop); // remove loop from scheduler
    this.loops.mat[trackId][slotId] = undefined; // delete loop from set
  }

  // remove all loops (for clear in conductor)
  removeAll() {
    // remove all loops from scheduler
    let loop;
    for( let i = 0; i < this.loops.i; i++ ){
      for( let j = 0; j < this.loops.j; j++ ){
        loop = this.loops.mat[i][j];
        if( loop !== undefined ){ 
          this.soundworksClient.scheduler.remove(loop);
          // notify renderer
          this.soundworksClient.renderer.disable();
        }
      }
    }
    this.loops.clear(); // clear set
  }

}


// loop corresponding to a single drop
class Loop extends soundworks.audio.TimeEngine {
  constructor(looper, soundParams) {
    super();

    this.looper = looper;
    this.soundParams = soundParams; // drop parameters
  }

  advanceTime(time) {
    return this.looper.advanceLoop(time, this); // just call daddy
  }
}

class Matrix{
  constructor(i, j){
    this.i = i;
    this.j = j;
    this.mat = [];
    this.init();
  }

  clear(){
    this.init();
  }

  init(){
    for (let ii = 0; ii < this.i; ii++) {
      this.mat[ii] = [];
      for (let jj = 0; jj < this.j; jj++) {
        this.mat[ii][jj] = undefined;
      }
    }    
  }

}

class SampleSynth {
  constructor(audioBuffers, audioAnalyser) {
    this.audioBuffers = audioBuffers;
    this.output = audioContext.createGain();
    this.output.connect(audioContext.destination);
    this.output.connect(audioAnalyser.in);
    this.output.gain.value = 1;
  }

  trigger(time, params) {
    const audioBuffers = this.audioBuffers;
    let duration = 0;

    if (audioBuffers && audioBuffers.length > 0) {
      const b1 = audioBuffers[params.trackId];

      duration += b1.duration;

      const s1 = audioContext.createBufferSource();
      s1.buffer = b1;
      s1.connect(this.output);
      s1.start(time);
    }

    return duration;
  }
}
