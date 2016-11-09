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
        // update looper params
        this.updateNumDivisions();
    });

  }

  divisions(value){
    this.params.divisions = value;
    this.updateNumDivisions();
  }

  period(value){
    this.params.period = value;
    // shut down all loops
    this.removeAll();
  }

  updateNumDivisions(){
    // eventually update loop maps size
    if( this.loops.i !== this.params.divisions ) {
      // shut down all loops
      this.removeAll();
      // resize loop map
      let numTracks = this.soundworksClient.loader.buffers.length;
      this.loops = new Matrix(numTracks, this.params.divisions);
      console.log('resize mat', this.loops.mat, this.loops.i, this.loops.j);
    }
  }

  setTrackSlot(playerId, trackId, slotId, onOff){
    // discard packets not concerning current user
    if( playerId !== client.index ){ return }
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
      // compute event time in loop
      let time = this.soundworksClient.scheduler.syncTime;
      let currentTimeInMeasure = time % this.params.period;
      let measureStartTime = time - currentTimeInMeasure;
      let slotTime = slotId * ( this.params.period / this.params.divisions );
      
      this.start(measureStartTime + slotTime, {trackId: trackId, slotId: slotId}, true);
      console.log('start track', trackId, 'on slot', slotId, ', i.e. at', slotTime, 'in meas. starting', measureStartTime);

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

    // return next time
    return time + params.period;
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
