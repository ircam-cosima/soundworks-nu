/**
 * NuLoop: Nu module sequencer-like (drum machine)
 **/

import NuBaseModule from './NuBaseModule'
import * as soundworks from 'soundworks/client';

const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuLoop extends NuBaseModule {
  constructor(soundworksClient) {
    super(soundworksClient, 'nuLoop');

    // local attributes
    this.params = {};
    let audioBuffers = this.soundworksClient.loader.data;
    this.synth = new SampleSynth(audioBuffers, this.soundworksClient.nuOutput.in);
    this.loops = new Matrix(audioBuffers.length, this.params.divisions);

    // binding
    this.updateNumDivisions = this.updateNumDivisions.bind(this);
    this.setTrackSlot = this.setTrackSlot.bind(this);
    this.start = this.start.bind(this);
    this.remove = this.remove.bind(this);
    this.reset = this.reset.bind(this);
    this.updateNumDivisions = this.updateNumDivisions.bind(this);
    this.getSlotTime = this.getSlotTime.bind(this);
    this.divisions = this.divisions.bind(this);
  }

  // set number of divisions in the loop
  divisions(value){
    this.params.divisions = value;
    this.updateNumDivisions();
  }

  // update loop maps size
  updateNumDivisions(){
    // shut down all loops
    this.reset();
    // resize loop map
    let numTracks = this.soundworksClient.loader.data.length;
    this.loops = new Matrix(numTracks, this.params.divisions);
  }

  // set loop period
  period(value){
    this.params.period = Math.round(value * 10) / 10;
  }

  // set general output volume
  masterGain(value){
    this.synth.output.gain.value = value;
  }

  // enable / disable a slot in the loop (a "beat")
  setTrackSlot(args){
    
    // extract parameters from args array
    let trackId = args.shift();
    let slotId = args.shift();
    let onOff = args.shift();

    // check valid trackId
    if( trackId >= this.soundworksClient.loader.data.length || trackId < 0) {
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
      // enable visual feedback
      this.soundworksClient.renderer.enable();
    }

    // remove event from loop
    else{
      // this.looper.stop(time, soundParams, true);
      this.remove(trackId, slotId);
      // disable visual feedback
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
    // create new loop
    const loop = new Loop(this, soundParams);
    // add loop to set
    this.loops.mat[soundParams.trackId][soundParams.slotId] = loop;
    // add loop to scheduler
    this.soundworksClient.scheduler.add(loop, time);
  }

  // callback: called at each loop (in scheduler)
  advanceLoop(time, loop) {
    const soundParams = loop.soundParams;
    const params = this.params;
    // trigger sound
    const duration = this.synth.trigger(this.soundworksClient.scheduler.audioTime, soundParams);
    // add jitter (randomness to beat exact time)
    let jitter = this.params.jitter * // jitter gain in [0:1]
                 Math.random() *  // random value in [0:1[
                 ( this.params.period / this.params.divisions); // normalization (jitter never goes beyond other time slots)
    // get absolute time for current loop if not required to keep track of old jitter injected previously
    // (otherwise, keep jittered time offset for current loop)
    if( !this.params.jitterMemory ){
      time = this.getSlotTime(time, loop.soundParams.slotId);
    }
    // console.log('time', time, 'period', this.params.period, 'jitter', jitter, 'next time:', time + this.params.period + jitter);
    // return next time (it's how the advanceLoop works)
    return time + this.params.period + jitter;
  }  

  // remove loop by index (both track index and time slot index)
  remove(trackId, slotId) {
    // get corresponding loop
    let loop = this.loops.mat[trackId][slotId];
    // check if loop is defined
    if( loop === undefined ) { return; }
    // remove loop from scheduler
    this.soundworksClient.scheduler.remove(loop);
    // delete loop from set
    this.loops.mat[trackId][slotId] = undefined;
  }

  // remove all loops from scheduler
  reset() {
    let loop;
    for( let i = 0; i < this.loops.i; i++ ){
      for( let j = 0; j < this.loops.j; j++ ){
        loop = this.loops.mat[i][j];
        if( loop !== undefined ){
          // remove loop
          this.soundworksClient.scheduler.remove(loop);
          // disable renderer
          this.soundworksClient.renderer.disable();
        }
      }
    }
    this.loops.clear(); // clear set
  }

}

// loop corresponding to a single audio sample
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

// rough i.j matrix like array class
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

// in charge of playing the final sample
class SampleSynth {
  constructor(audioBuffers, output) {
    this.audioBuffers = audioBuffers;
    this.output = audioContext.createGain();
    this.output.connect( output );
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
