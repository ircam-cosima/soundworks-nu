/**
 * NuGrain: Granular synthesis
 **/

// had to add to package.json for this specific module:
// "waves-lfo": "wavesjs/lfo#v0.2.0",
// "typedarray-methods": "^1.0.0", (safary missng Float32Array methods used in wavejs)

// required because Safari doesn't implement float32Array.fill, used in old version of 
// waves-lfo
require('typedarray');
require('typedarray-methods');

import * as soundworks from 'soundworks/client';
const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuGrain {
  constructor(soundworksClient) {

    // local attributes
    this.soundworksClient = soundworksClient;
    this.params = {'energy': 0, 'override': 1.0};
    this.audioBuffer = undefined;
    this.segments = undefined;
    this.localEnergy = 0;
    this.setIntervalListener = undefined;
    this.motionInputCallbackAdded = false;

    // binding
    this.onPlayState = this.onPlayState.bind(this);
    this.motionInputEnergyCallback = this.motionInputEnergyCallback.bind(this);
    this.setEnergyCallback = this.setEnergyCallback.bind(this);

    // setup receive callbacks
    this.soundworksClient.receive('nuGrain', (args) => {
      // console.log(args);
      let name = args.shift();
      // convert singleton array if need be
      args = (args.length == 1) ? args[0] : args
      if( this.params[name] !== undefined )
        this.params[name] = args; // parameter set
      else
        this[name](args); // function call
    });


    // create audio analyser
    this.analyzer = new Analyzer({
      frameDuration: 0.020,
      framePeriod: 0.005,
    });

    // create and configure synthetizer
    this.synth = new Synthesizer(this.soundworksClient.scheduler, this.soundworksClient.renderer.audioAnalyser);

    this.synth.setBeatCallback((delay, index, energy = 1) => {
      const intensity = Math.min(1, 10 * energy);
    });

    // somehow adding / removing it on the fly doesn't launch it.. to check? (symptom: removing it before adding it doesn't add it)
    this.soundworksClient.motionInput.addListener('energy', this.motionInputEnergyCallback);

  }

  motionInputEnergyCallback(energy){
    this.localEnergy = energy;
  }

  // had to use a a setInterval callback rather than only the motion input to be able to use the module on non-smartphone devices)
  setEnergyCallback(){
  // allow to control the amount of local / vs global energy
      let summedEnergy = this.params.override * this.params.energy + 
                  ( 1 - this.params.override) * this.localEnergy;
      this.synth.setShakeEnergy(summedEnergy);    
  }

  enable(value){

    window.clearInterval(this.setIntervalListener);

    // notify no sound loaded
    if( value && this.audioBuffer === undefined ){
      console.warn('no sound loaded, can t start the synth');
    }
    // enable module
    if( value && this.audioBuffer !== undefined ){
      // add motion input listener (avoid adding it twice)
      if( this.motionInputCallbackAdded ){ return; }
      // this.soundworksClient.motionInput.addListener('energy', this.motionInputEnergyCallback);
      this.setIntervalListener = window.setInterval( this.setEnergyCallback, 100);
      this.synth.start();
      // enable visual feedback
      // this.soundworksClient.renderer.enable();
      this.motionInputCallbackAdded = true;
    }
    // disable module
    else{
      // remove motion input listener
      // this.soundworksClient.motionInput.removeListener('energy', this.motionInputEnergyCallback);      
      this.synth.stop();
      this.motionInputCallbackAdded = false;
    }
  }

  audioFileId(fileId){

    // reset locals
    this.audioBuffer = undefined;
    this.segments = undefined;

    // load new
    const audioBuffer = this.soundworksClient.loader.buffers[fileId];
    this.analyzer.process(audioBuffer).then((values) => {
      const [audioBuffer, segments] = values;
      this.audioBuffer = audioBuffer;
      this.segments = segments;
      this.onPlayState(audioBuffer, segments);
    });  
  }

  onPlayState(audioBuffer, segments) {
    // if (segments.length === 1){
    //   console.warn('NuGrain does not accept 1-sized segments, new audio buffer discarded');
    //   // visual feedback of error on players
    //   this.soundworksClient.renderer.blink([160, 0, 0], 0.4);
    //   // return this.changeState('record');
    //   return
    // }
    this.synth.setBuffers(audioBuffer, segments);
  }

  gain(value){
    this.synth.master.gain.value = value;
  }

  randomVar(value){
    this.synth.engine.randomVar = value;
  }

  reloadEngine(){
    // stop synth
    let wasRunning = false
    if( this.synth.isRunning ){
      this.synth.stop();
      // disable visual feedback
      this.soundworksClient.renderer.disable();      
      wasRunning = true;
    }
    // get new engine with new parameters
    this.synth.getNewEngine();
    // init new engine
    if( this.audioBuffer !== undefined ) // warning: will not work if this.segment.length <= 1: need a proper way to check in synth itself?
      this.synth.setBuffers(this.audioBuffer, this.segments);
    // restart engine if required
    if( wasRunning ){
      this.synth.start();
      // enable visual feedback
      // this.soundworksClient.renderer.enable();      
    }
  }

  engineParams(args){
    this.synth.engineOptions[args[0]] = args[1];
  }

}



//////////////////////////////////////////////////////////////////////////////////////////
// Analyzer
//////////////////////////////////////////////////////////////////////////////////////////


import { EventEmitter } from 'events';
import * as lfo from 'waves-lfo';
// import * as soundworks from 'soundworks/client';
// const audioContext = soundworks.audioContext;

export class Analyzer extends EventEmitter {
  constructor(options) {
    super();

    const frameSize = Math.floor(options.frameDuration * audioContext.sampleRate);
    const hopSize = Math.floor(options.framePeriod * audioContext.sampleRate);

    this.audioBuffer = null;

    this.framer = new lfo.operators.Framer({ frameSize, hopSize, centeredTimeTags: true });
    this.power = new lfo.operators.Magnitude({ power: true, normalize: true });
    this.segmenter = new lfo.operators.Segmenter({
      logInput: true,
      filterOrder: 5,
      threshold: 3,
      offThreshold: -Infinity,
      minInter: 0.050,
      maxDuration: Infinity,
    });

    this.dataRecorder = new lfo.sinks.DataRecorder();

    this.onProcess = new lfo.operators.Noop();
    this.onProcess.process = (time, frame, metaData) => this.emit('time', time);

    this.framer.connect(this.power);
    this.power.connect(this.segmenter);
    this.segmenter.connect(this.onProcess);
    this.segmenter.connect(this.dataRecorder);
  }

  process(audioBuffer) {
    const promisedBuffer = Promise.resolve(audioBuffer);

    const audioInBuffer = new lfo.sources.AudioInBuffer({
      buffer: audioBuffer,
      ctx: audioContext,
      useWorker: true,
    });

    audioInBuffer.connect(this.framer);
    audioInBuffer.start();
    this.dataRecorder.start();

    return Promise.all([promisedBuffer, this.dataRecorder.retrieve()]);
  }
}



//////////////////////////////////////////////////////////////////////////////////////////
// Synthtizer
//////////////////////////////////////////////////////////////////////////////////////////

// import * as soundworks from 'soundworks/client';
import { powerToDecibel, linearToDecibel, decibelTolinear } from 'soundworks/utils/math';

// const audioContext = soundworks.audioContext;
const audio = soundworks.audio;

function getIndexByLogPower(sortedArray, value, randomVar) {
  const size = sortedArray.length;
  let index = 0;

  randomVar = Math.min(Math.floor((size - 1) / 2), randomVar);

  if (size > 0) {
    var firstVal = sortedArray[randomVar].logPower;
    var lastVal = sortedArray[size - 1 - randomVar].logPower;

    if (value <= firstVal)
      index = randomVar;
    else if (value >= lastVal)
      index = size - 1 - randomVar;
    else {
      if (index < 0 || index >= size)
        index = Math.floor((size - 1) * (value - firstVal) / (lastVal - firstVal));

      while(sortedArray[index].logPower > value)
        index--;

      while(sortedArray[index + 1].logPower <= value)
        index++;

      if((value - sortedArray[index].logPower) >= (sortedArray[index + 1].logPower - value))
        index++;
    }
  }

  if (randomVar > 0)
    index += (Math.floor((2 * randomVar + 1) * Math.random()) - randomVar);

  return sortedArray[index].index;
}

class ShakerEngine extends audio.SegmentEngine {
  constructor(scheduler, options) {
    super(options);

    this.scheduler = scheduler;
    this.randomVar = 1;

    this.touchSegmentIndex = -1;
    this.shakeEnergy = -1;

    this.segmentIndicesSortedByLogPower = null;
    this.maxLogPower = 0;

    this.beatCallback = null;
  }

  trigger(time) {
    // trigger touch segment
    const touchSegmentIndex = this.touchSegmentIndex;
    const now = audioContext.currentTime;

    const localTime = this.scheduler.audioTime; // this.scheduler.getLocalTime(time);

    if (touchSegmentIndex >= 0) {
      this.touchSegmentIndex = -1;

      this.segmentIndex = touchSegmentIndex;
      this.gain = 1;
      super.trigger(time);
    }

    // trigger shake segment
    let shakeEnergy = this.shakeEnergy;
    let logPower;

    if(shakeEnergy >= 0) {
      logPower = linearToDecibel(shakeEnergy) + this.maxLogPower;
    } else {
      shakeEnergy = 1;
      logPower = this.minLogPower - 3 + (this.maxLogPower - this.minLogPower + 6) * Math.random();
    }

    const shakeSegmentIndex = getIndexByLogPower(this.segmentIndicesSortedByLogPower, logPower, this.randomVar);
    const logSegmentPower = this.segmentIndicesSortedByLogPower[shakeSegmentIndex].logPower;
    const gain = decibelTolinear(logPower - logSegmentPower);

    if (this.beatCallback) {
      this.beatCallback(localTime - now, shakeSegmentIndex + 1, shakeEnergy);
    }

    this.segmentIndex = shakeSegmentIndex;
    this.gain = gain;
    return super.trigger(time);
  }
}

export class Synthesizer {
  constructor(scheduler, audioAnalyser) {
    this.soundworksScheduler = scheduler; 
    this.scheduler =  audio.getScheduler(audioContext);

    this.master = audioContext.createGain();
    this.master.connect(audioContext.destination);
    this.master.gain.value = 1;

    // connect to visual feeback analyser
    this.master.connect(audioAnalyser.in);

    this.engineOptions = {
      periodAbs: 0.150,
      periodRel: 0,
      durationAbs: 0,
      durationRel: 1,
      offsetAbs: 0.005,
      offsetRel: 0,
      attackAbs: 0.005,
      attackRel: 0,
      releaseAbs: 0.005,
      releaseRel: 0,
      resamplingVar: 200,
    };

    this.getNewEngine();

    this.touchSegmentIndex = -1;
    this.isRunning = false;
  }

  getNewEngine(){
    // disconnect old engine
    if( this.engine !== undefined )
      this.engine.disconnect(this.master)
    // create new engine
    this.engine = new ShakerEngine(this.soundworksScheduler, this.engineOptions);
    // connect new engine
    this.engine.connect(this.master);
  }

  setBeatCallback(callback) {
    this.engine.beatCallback = callback;
  }

  setTouchSegmentIndex(index) {
    this.engine.touchSegmentIndex = Math.max(0, index - 1);
  }

  setShakeEnergy(energy) {
    this.engine.shakeEnergy = energy;
  }

  setBuffers(buffer, segments) {
    // set audio buffer
    this.engine.buffer = buffer;

    // if segment is too short (len 1), duplicate unique element
    if( segments.length == 1 )
      segments.push( segments[0] );

    // set segments
    const positions = [];
    const durations = [];
    const indices = [];
    let minLogPower = Infinity;
    let maxLogPower = -Infinity;

    for(let i = 0; i < segments.length - 1; i++) {
      const segment = segments[i + 1];

      positions.push(segment.time);
      durations.push(segment.data[0]);

      const index = indices.length;
      const power = segment.data[2];
      const logPower = powerToDecibel(power);
      indices.push({ index: i, logPower: logPower });

      minLogPower = Math.min(minLogPower, logPower);
      maxLogPower = Math.max(maxLogPower, logPower);
    }

    indices.sort(function(a, b) { return a.logPower - b.logPower; });

    this.engine.positionArray = positions,
    this.engine.durationArray = durations;
    this.engine.segmentIndicesSortedByLogPower = indices;
    this.engine.minLogPower = minLogPower;
    this.engine.maxLogPower = maxLogPower;
  }

  start() {
    if(!this.isRunning) {
      this.scheduler.add(this.engine);
      // this.scheduler.add(this.engine, this.scheduler.audioTime);
      this.isRunning = true;
    }
  }

  stop() {
    if(this.isRunning) {
      this.scheduler.remove(this.engine);
      this.isRunning = false;
    }
  }
}


//////////////////////////////////////////////////////////////////////////////////////////
// Analytics
//////////////////////////////////////////////////////////////////////////////////////////
