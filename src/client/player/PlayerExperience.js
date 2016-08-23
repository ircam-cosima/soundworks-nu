import * as soundworks from 'soundworks/client';

import Beacon from '../../shared/client/services/Beacon';

import PlayerRenderer from './PlayerRenderer';
import AudioAnalyser from './AudioAnalyser';

const audioContext = soundworks.audioContext;

const viewTemplate = `
  <canvas id='main-canvas' class="background"></canvas>
  <div class="foreground">
    <div class="section-center flex-middle">
    <p class="small" id="logValues"></p>
    </div>

    <div class="section-top flex-middle">
    <p class="small" id="localInfo"></p>
    </div>

    <div class="section-bottom flex-center">
      <p class="small soft-blink"><%= title %></p>
    </div>
    <hr>
  </div>
`;

/* Description:
Reproducing propagation in a forest, where every connected cellphone represents
a tree. After emission of a first message by a cellphone in the network, the
message propagates, each node re-emitting a message that all its neighbors will
catch when it receives one. With the message propagates a (gain, time) tuple,
respectively decreasing / increasing as the message path lengthen (hence the
'propagation'). Gathering the various tuples received, the cellphones generate
an IR at propagation's end, used to play an 'echoic' sound in the final stage
of the experiment.
*/

export default class PlayerExperience extends soundworks.Experience {

  constructor(standalone, assetsDomain, beaconUUID, audioFiles) {
    // disable socket connection - use for standalone application
    super(!standalone);

    // SERVICES
    // beacon only work in cordova mode since it needs access right to BLE (bluetooth)
    if (window.cordova) this.beacon = this.require('beacon', { uuid: beaconUUID });
    this.platform = this.require('platform', { features: ['web-audio'] });
    this.params = this.require('shared-params');
    this.sync = this.require('sync');
    this.loader = this.require('loader', {
      assetsDomain: assetsDomain,
      files: audioFiles,
    });

    // BINDING
    this.beaconCallback = this.beaconCallback.bind(this);
    this.reset = this.reset.bind(this);
    this.updateBkgColor = this.updateBkgColor.bind(this);
    this.onBeaconSetup = this.onBeaconSetup.bind(this);
    this.onEmitDown = this.onEmitDown.bind(this);
    this.onComputeIrDown = this.onComputeIrDown.bind(this);
    this.onStartPlayingDown = this.onStartPlayingDown.bind(this);

    // LOCAL ATTRIBUTES
    this.irTaps = [];
    this.propagParams = {};
    this.initEmitTime = -1.0;
    this.irBuffer = undefined;
  }

  init() {
    // initialize the view
    this.viewTemplate = viewTemplate;
    this.viewContent = { title: `Scanning iBeacons...` };
    this.viewCtor = soundworks.CanvasView;
    this.viewOptions = { preservePixelRatio: true };
    this.view = this.createView();

    // initialize beacon service
    if (this.beacon) {
      this.beaconList = []; // neighboring beacon list
      this.beacon.addListener(this.beaconCallback); // add callback, invoked whenever beacon scan is executed
      // this.beacon.txPower = -55; // fake calibration in dB (see beacon service for detail)
    }
  }


  start() {
    // constructor
    super.start();
    if (!this.hasStarted) { this.init(); }
    this.show();

    // local attributes
    this.renderer = new PlayerRenderer();
    this.view.addRenderer(this.renderer);
    this.audioAnalyser = new AudioAnalyser();

    // shared parameters binding
    this.params.addParamListener('masterGain', (value) => this.propagParams.masterGain = value);
    this.params.addParamListener('propagationSpeed', (value) => this.propagParams.speed = value);
    this.params.addParamListener('propagationGain', (value) => this.propagParams.gain = value);
    this.params.addParamListener('emitterGain', (value) => this.propagParams.txGain = value);
    this.params.addParamListener('thresholdReceiveGain', (value) => this.propagParams.rxMinGain = value);
    this.params.addParamListener('thresholdReceiveTime', (value) => this.propagParams.rxMaxTime = value);
    this.params.addParamListener('reset', () => { this.reset(); });

    // bind callbacks to server messages
    this.receive('player:beaconSetup', this.onBeaconSetup);
    this.receive('player:emitDown', this.onEmitDown);
    this.receive('player:computeIrDown', this.onComputeIrDown);
    this.receive('player:startPlayingDown', this.onStartPlayingDown);


    // add local beacon info on screen
    if (this.beacon) {
      document.getElementById('localInfo').innerHTML = 'local iBeacon ID: ' + this.beacon.major + '.' + this.beacon.minor;
    }

    // create touch event, used to send the first message
    const surface = new soundworks.TouchSurface(this.view.$el);
    surface.addListener('touchstart', (id, normX, normY) => {
      // only if propagation has not already started
      if (this.initEmitTime < 0) {
        // set first tap time / gain
        let time = this.sync.getSyncTime();
        let gain = this.propagParams.txGain;
        this.initEmitTime = time;
        // add tap to local IR
        this.irTaps.push([0.0, gain]);
        // broadcast tap
        this.send('player:emitUp', time, gain);
        // set background color for status feedback
        this.renderer.setBkgColor([255, 128, 0]);
      }
    });

    // DEBUG (for non-cordova runs, e.g. on laptop)
    if (!this.beacon)
    {
      this.beacon = {major:0, minor: 0};
      this.beacon.restartAdvertising = function(){};
      this.beacon.rssiToDist = function(){return 3 + 1*Math.random()};
      this.beaconList = [];
      window.setInterval(() => {
        var pluginResult = { beacons : [] };
        for (let i = 0; i < 4; i++) {
          var beacon = {
            major: 0,
            minor: i,
            rssi: -45 - i * 5,
            proximity : 'fake/debug beacon',
          };
          pluginResult.beacons.push(beacon);
        }
        this.beaconCallback(pluginResult);
      }, 1000);
    }

  }

  /*
  * callback that runs every time a beacon scan occurs:
  * store a list of neighboring beacons
  */
  beaconCallback(pluginResult) {
    // get beacon list
    pluginResult.beacons.forEach((beacon) => {
      // add time of last update to beacon for latter "remove beacons not seen for long" mechanism
      beacon.lastUpdated = audioContext.currentTime;
      this.beaconList[beacon.minor] = beacon;
    });

    // remove beacons not seen for a long time
    this.beaconList.forEach((beacon, beaconIndexInList) => {
      if ((audioContext.currentTime - beacon.lastUpdated) > 3.0) {
        delete this.beaconList[beaconIndexInList];
      }
    });

    // display beacon list on screen
    var log = '';
    this.beaconList.forEach((beacon) => {
      log += 'iBeacon maj.min: ' + beacon.major + '.' + beacon.minor + '</br>' +
             'rssi: ' + beacon.rssi + 'dB ~ dist: ' +
             Math.round( this.beacon.rssiToDist(beacon.rssi)*100, 2 ) / 100 + 'm' + '</br>' +
             '(' + beacon.proximity + ')' + '</br></br>';
    });
    document.getElementById('logValues').innerHTML = log;

    // Note: various loops kept separate for clarity's sake,
    // since beacon update is scarce (~every sec)
  }


  /*
  * message callback: re-define local beacon parameters from server
  * (enforce unique id)
  */
  onBeaconSetup(beaconInfo) {
    console.log('server defined new beacon setup:', beaconInfo);
    if (this.beacon) {
      // change local beacon info
      this.beacon.major = beaconInfo.major;
      this.beacon.minor = beaconInfo.minor;
      this.beacon.restartAdvertising();
      // add local beacon info on screen
      document.getElementById('localInfo').innerHTML = 'local iBeacon ID: ' + this.beacon.major + '.' + this.beacon.minor;
      this.reset();
    }
  }

  /*
  * message callback: run when I receive a message from another node in the network,
  * store and re-emit if said node is in my neighborhood
  */
  onEmitDown(beaconID, departureTime, departureGain) {

    // if emitter beacon in my neighborhood
    if ( this.beaconList[beaconID] !== undefined ) {

      // if original (first) message: store emission time zero
      // warning: first emitter doesn't go there (its zero time is setup at touch event)
      if( this.initEmitTime < 0 ) {
        this.initEmitTime = departureTime;
        // set background color for status feedback
        this.renderer.setBkgColor([255, 128, 0]);
      }

      // get tap time and gain
      let distFromEmitter = this.beacon.rssiToDist(this.beaconList[beaconID].rssi);
      let arrivalTime = departureTime + (distFromEmitter / this.propagParams.speed);
      let arrivalGain = departureGain * Math.pow(this.propagParams.gain, distFromEmitter);

      // DEBUG: to avoid exponential increase of exchanged packet number
      arrivalGain = Math.min(arrivalGain, departureGain * 0.9);

      // check if valid tap: below time and gain threshold
      if( ( (arrivalTime - this.initEmitTime) < this.propagParams.rxMaxTime) && (arrivalGain > this.propagParams.rxMinGain) )
      {
        // add tap to local IR
        this.irTaps.push([arrivalTime - this.initEmitTime, arrivalGain]);
        // send new emit message
        this.send('player:emitUp', arrivalTime, arrivalGain);
      }
    }
  }

  /*
  * message callback: run when propagation is over:
  * compute IR (transform (time, gain) array of taps to IR buffer,
  * and stand ready to play
  */
  onComputeIrDown() {
    console.log('compute IR started:', this.irTaps);

    // get max delay for IR buffer size
    let irDuration = 0.0;
    this.irTaps.forEach((timeGain, tapIndex) => {
      irDuration = Math.max(irDuration, timeGain[0]);
    });

    // create IR as float array
    var ir = new Float32Array(Math.ceil(irDuration * audioContext.sampleRate));
    for(let s = 0; s < this.irTaps.length; ++s) {
        ir[Math.floor(this.irTaps[s][0] * audioContext.sampleRate)] = this.irTaps[s][1];
    }

    // transform IR float array to web audio buffer
    this.irBuffer = audioContext.createBuffer(1, Math.max(ir.length, 512), audioContext.sampleRate);
    this.irBuffer.getChannelData(0).set(ir);

    // inform server I'm ready to play
    this.send('player:computeIrUp');
  }

  /*
  * message callback: play final sound. Run when all nodes in the network
  * have their IR ready
  */
  onStartPlayingDown(syncstartTime) {

      // Note: In order to be able to render long impulse responses, the
      // `ConvolverNode.buffer` is the original sound, while the
      // `AudioBufferSourceNode.buffer` is the actual impulse response.

      // create audio source based on IR buffer
      var src = audioContext.createBufferSource();
      src.buffer = this.irBuffer;

      // create a convolver based on audio sound
      var conv = audioContext.createConvolver();
      conv.buffer = this.loader.buffers[0];

      // create master gain (shared param, controlled from conductor)
      var gain = audioContext.createGain();
      gain.gain.value = this.propagParams.masterGain;

      // connect graph
      src.connect(conv);
      conv.connect(gain);
      gain.connect(audioContext.destination);

      // play sound if rendez-vous time is in the future (else report bug)
      if (syncstartTime > this.sync.getSyncTime()) {
        var audioContextStartTime = audioContext.currentTime + syncstartTime - this.sync.getSyncTime() ;
        src.start(audioContextStartTime);
        console.log('play scheduled in:', Math.round( (syncstartTime - this.sync.getSyncTime()) *1000)/1000, 'sec', 'at:', syncstartTime);
      }
      else {
        console.warn('no sound played, I received the instruction to play to late');
        this.renderer.setBkgColor([255, 0, 0]);
      }

      // setup screen color = f(amplitude) callback
      conv.connect(this.audioAnalyser.in);
      this.isPlaying = true;
      requestAnimationFrame(this.updateBkgColor);

      // timeout callback, runs when I finished playing
      setTimeout(() => {
        // stop background update color callback
        this.isPlaying = false;
        // inform server on playing over for global reset
        this.send('player:startPlayingUp');
        // local reset
        this.reset();
      }, ( syncstartTime - this.sync.getSyncTime() + src.buffer.duration + conv.buffer.duration) * 1000);
  }

  /*
  * Change GUI background color based on current amplitude of sound being played
  */
  updateBkgColor() {
    if (this.isPlaying) {
      // call me once, I'll call myself over and over
      requestAnimationFrame(this.updateBkgColor);
      // change background color based on current amplitude
      let amp = 200 * this.audioAnalyser.getAmplitude();
      let rgb = [amp, 50 + amp, 50 + amp];
      this.renderer.setBkgColor(rgb);
    }
  }

  /*
  * Reset, stand ready for next simulation
  */
  reset(){
    console.log('reset client');
    this.beaconList = [];
    this.irTaps = [];
    this.initEmitTime = -1.0;
    this.renderer.setBkgColor([0,0,0]);
  }

}
