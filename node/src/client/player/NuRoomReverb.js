/**
 * NuRoomReverb: Nu module in charge of room reverb where players 
 * emit bursts when the acoustical wave passes them by
 **/

import NuBaseModule from './NuBaseModule'
import * as soundworks from 'soundworks/client';

const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuRoomReverb extends NuBaseModule {
  constructor(playerExperience) {
    super(playerExperience, 'nuRoomReverb');

    // local attributes
    this.irMap = new Map();
    this.srcSet = new Set();
    this.params = {};

    // binding
    this.rawSocketCallback = this.rawSocketCallback.bind(this);
    this.emitAtPos = this.emitAtPos.bind(this);
    this.reset = this.reset.bind(this);

    // setup socket reveive callbacks (receiving raw audio data)
    this.e.rawSocket.receive('nuRoomReverb', this.rawSocketCallback );
  }

  /*
   * callback when websocket event (msg containing new IR sent by server) is received
   */
  rawSocketCallback(interleavedIrArray) {

    // extract header
    let emitterId = interleavedIrArray[0];
    let minTime = interleavedIrArray[1];
    // exctract data
    interleavedIrArray = interleavedIrArray.slice(2, interleavedIrArray.length);

    // de-interleave + get max delay for IR buffer size
    let irTime = [],
      irGain = [],
      irDuration = 0.0;
    for (let i = 0; i < interleavedIrArray.length / 2; i++) {
      irTime[i] = interleavedIrArray[2 * i] - minTime;
      irGain[i] = interleavedIrArray[2 * i + 1];
      irDuration = Math.max(irDuration, irTime[i]);
    }

    // store IR
    let ir = { times: irTime, gains: irGain, duration: irDuration };
    this.irMap.set(emitterId, ir);

    // feedback user that IR has been loaded
    this.e.renderer.blink([0, 100, 0]);
  }


  /*
   * message callback: play sound convolved with IR
   */
  emitAtPos(args) {
    let irId = args.shift();
    let syncStartTime = args.shift();

    // check if designated audioFile exists in loader
    if (this.e.loader.data[this.params.audioFileId] == undefined) {
      console.warn('required audio file id', this.params.audioFileId, 'not in client index, actual content:', this.e.loader.options.files);
      return;
    }

    // check if IR not available yet: slightly flash red otherwise
    if (!this.irMap.has(irId)) {
      this.e.renderer.blink([160, 0, 0]);
      console.warn('IR', irId, 'not yet defined in client, need to update propagation');
      return;
    }

    // init
    let ir = this.irMap.get(irId);

    // create empty sound src
    let src = audioContext.createBufferSource();
    let inputBuffer = this.e.loader.data[this.params.audioFileId];
    let outputDuration = ir.duration + inputBuffer.duration + 1;
    let outputBuffer = audioContext.createBuffer(1, Math.max(outputDuration * audioContext.sampleRate, 512), audioContext.sampleRate);

    // fill sound source with delayed audio buffer version (tap delay line mecanism)
    let inputData = inputBuffer.getChannelData(0);
    let outputData = outputBuffer.getChannelData(0);
    ir.times.forEach((tapTime, index) => {

      // get tap time and gain
      let tapGain = ir.gains[index];
      let tapdelayInSample = Math.floor(tapTime * audioContext.sampleRate);

      // get input start point based on time since propagation started
      let offsetTimeInSamples = Math.floor(this.params.timeBound * tapdelayInSample);
      if (this.params.loop) offsetTimeInSamples %= inputBuffer.length;

      // if end of audio input not reached yet
      if (offsetTimeInSamples < inputBuffer.length) {

        // eventually read only a chunk of input buffer
        let numSamplesToFill = inputBuffer.length - offsetTimeInSamples;
        numSamplesToFill = Math.floor(numSamplesToFill * this.params.perc);

        // if reading speed acc with time passed
        let readSpeed = 1 + this.params.accSlope * tapTime;
        numSamplesToFill = Math.floor(numSamplesToFill / readSpeed);

        // copy tap to output buffer
        for (let i = 0; i < numSamplesToFill; i++)
          outputData[tapdelayInSample + i] += (tapGain * inputData[offsetTimeInSamples + Math.round(i * readSpeed)]);
      }

    });

    // normalize output buffer
    let maxOutputValue = 0.0;
    for (let i = 0; i < outputBuffer.length; i++) {
      maxOutputValue = Math.max(Math.abs(outputData[i]), maxOutputValue);
    }
    let normFactor = Math.max.apply(null, ir.gains) / Math.max(maxOutputValue, 1.0);
    // console.log('max:', maxOutputValue, 'norm:', normFactor);

    // replace audio source buffer with created output buffer
    src.buffer = outputBuffer;

    // create master gain (shared param, controlled from conductor)
    let gain = audioContext.createGain();
    gain.gain.value = normFactor * this.params.masterGain;

    // connect graph
    src.connect(gain);
    gain.connect( this.e.nuOutput.in );

    // play sound if rendez-vous time is in the future (else report bug)
    let now = this.e.sync.getSyncTime()
    if (syncStartTime > now) {
      let audioContextStartTime = audioContext.currentTime + syncStartTime - now;
      src.start(audioContextStartTime);
      // console.log('play scheduled in:', Math.round((syncStartTime - now) * 1000) / 1000, 'sec', 'at:', syncStartTime);
    } else {
      console.warn('no sound played, I received the instruction to play to late');
      this.e.renderer.blink([250, 0, 0]);
    }

    // setup screen color = f(amplitude) callback
    this.e.renderer.enable();

    // save source for eventual global reset
    this.srcSet.add(src);

    // timeout callback, runs when we finished playing
    setTimeout(() => {
      // disable visual feeback
      this.e.renderer.disable();
      // remove source from set
      this.srcSet.delete(src);
    }, (syncStartTime - now + src.buffer.duration) * 1000);

  }

  // stop all audio sources
  reset(){
    this.srcSet.forEach( (src) => {
      // stop source
      src.stop(); 
      // remove associated visual feedback
      this.e.renderer.disable();
    });
  }

}