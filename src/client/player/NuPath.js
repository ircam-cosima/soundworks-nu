/**
 * NuPath: Nu module that simulates "lightning" (kind of..) 
 **/

import * as soundworks from 'soundworks/client';
const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuPath {
  constructor(soundworksClient) {

    // local attributes
    this.soundworksClient = soundworksClient;
    this.irMap = new Map();
    this.params = {};

    // binding
    this.onWebSocketOpen = this.onWebSocketOpen.bind(this);
    this.onWebSocketEvent = this.onWebSocketEvent.bind(this);
    this.startPath = this.startPath.bind(this);

    // setup receive callbacks
    this.soundworksClient.receive('nuPath', (args) => {
  		console.log(args);
  		let paramName = args.shift();
  		// update param
  		this.params[paramName] = args.length == 1 ? args[0] : args;
    });

    // setup receive callbacks
    this.soundworksClient.receive('nuPathInternal_initParam', (params) => {
        // set all local parameters based on server's 
        // (for late arrivals, if OSC client alreay defined some earlier)
        Object.keys(params).forEach( (key) => { 
        	this.params[key] = params[key];
        });
    });    

    // setup receive callbacks
    this.soundworksClient.receive('nuPathInternal_startPath', this.startPath);   

    // init websocket (used to receive IR)
    let port = 8081;
    let urlTmp = client.socket.socket.io.uri;
    let host = urlTmp.split('/')[2].split(':')[0];
    let url = "ws://" + host + ":" + port;
    console.log('connecting websocket to', url);
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = this.onWebSocketOpen;
    this.ws.onmessage = this.onWebSocketEvent;

  }

  // send client index (at websocket opening) to associate socket / index in server
  onWebSocketOpen() {
    this.ws.send(client.index, { binary: false, mask: true }, (error) => { console.log('websocket error:', error); });
  }

  /*
   * callback when websocket event (msg containing new IR sent by server) is received
   */
  onWebSocketEvent(event) {
    // decode 
    let interleavedIrArray = new Float32Array(event.data);

    // extract header
    let pathId = interleavedIrArray[0];
    let minTime = interleavedIrArray[1];
    interleavedIrArray = interleavedIrArray.slice(2, interleavedIrArray.length);
    console.log('pathId', pathId, 'minTime', minTime, 'ir', interleavedIrArray);

    // de-interleave + get max delay for IR buffer size
    let irTime = [0.0], // init at zero to handle scenarii where IR array is empty
      irGain = [0.0],
      irDuration = 0.0;
    for (let i = 0; i < interleavedIrArray.length / 2; i++) {
      irTime[i] = interleavedIrArray[2 * i] - minTime;
      irGain[i] = interleavedIrArray[2 * i + 1];
      irDuration = Math.max(irDuration, irTime[i]);
    }

    // store ir
    let ir = { times: irTime, gains: irGain, duration: irDuration };
    this.irMap.set(pathId, ir);

    // feedback user that IR has been loaded 
    this.soundworksClient.renderer.blink([0, 100, 0]);
  }

  /*
   * message callback: play sound
   */
  startPath(irId, syncStartTime) {

    // check if designated audioFile exists in loader
    if (this.soundworksClient.loader.buffers[this.params.audioFileId] == undefined) {
      console.warn('required audio file id', this.params.audioFileId, 'not in client index, actual content:', this.soundworksClient.loader.options.files);
      return;
    }

    // check if IR not available yet: slightly flash red otherwise
    if (!this.irMap.has(irId)) {
      this.soundworksClient.renderer.blink([160, 0, 0]);
      console.warn('IR', irId, 'not yet defined in client, need to update propagation');
      return;
    }

    // init
    let ir = this.irMap.get(irId);

    // create empty sound src
    let src = audioContext.createBufferSource();
    let inputBuffer = this.soundworksClient.loader.buffers[this.params.audioFileId];
    let outputDuration = ir.duration + inputBuffer.duration + 1;
    let outputBuffer = audioContext.createBuffer(1, Math.max(outputDuration * audioContext.sampleRate, 512), audioContext.sampleRate);

    // this.controlParams = {audioFileId: 0, segment: {perc: 1, loop: true, accSlope: 0, timeBound: 0} };


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
    console.log('max:', maxOutputValue, 'norm:', normFactor);

    // replace audio source buffer with created output buffer
    src.buffer = outputBuffer;

    // create master gain (shared param, controlled from conductor)
    let gain = audioContext.createGain();
    gain.gain.value = normFactor * this.params.masterGain;

    // connect graph
    src.connect(gain);
    gain.connect(audioContext.destination);

    // play sound if rendez-vous time is in the future (else report bug)
    let now = this.soundworksClient.sync.getSyncTime()
    if (syncStartTime > now) {
      let audioContextStartTime = audioContext.currentTime + syncStartTime - now;
      src.start(audioContextStartTime);
      console.log('play scheduled in:', Math.round((syncStartTime - now) * 1000) / 1000, 'sec', 'at:', syncStartTime);
    } else {
      console.warn('no sound played, I received the instruction to play to late');
      this.soundworksClient.renderer.blink([250, 0, 0]);
    }

    // setup screen color = f(amplitude) callback
    gain.connect(this.soundworksClient.renderer.audioAnalyser.in);
    this.soundworksClient.renderer.enable();

    // timeout callback, runs when we finished playing
    setTimeout(() => {
      this.soundworksClient.renderer.disable();
    }, (syncStartTime - now + src.buffer.duration) * 1000);

  }

}