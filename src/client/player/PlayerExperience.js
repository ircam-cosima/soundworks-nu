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

/* Description: Reproducing flutter echo: each device constantly computes flutter IRs
with neighboring beacons (point à point). when a device emits (launches), all devices
will play the corresponding (local) flutter based on computed IR.
*/

export default class PlayerExperience extends soundworks.Experience {

  constructor(standalone, assetsDomain, beaconUUID, audioFiles) {
    // disable socket connection - use for standalone application
    super(!standalone);

    // SERVICES
    // beacon only work in cordova mode since it needs access right to BLE
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
    this.onBeaconSetup = this.onBeaconSetup.bind(this);
    this.onSoundLaunched = this.onSoundLaunched.bind(this);
    this.updateIRs = this.updateIRs.bind(this);
    this.getIrTaps = this.getIrTaps.bind(this);
    this.playFlutter = this.playFlutter.bind(this);
    this.updateBkgColor = this.updateBkgColor.bind(this);

    // LOCAL ATTRIBUTES
    this.irBuffers = [];
    this.propagParams = {};
    this.networkDelay = 2.0;
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

    // bind callbacks to server messages
    this.receive('player:beaconSetup', this.onBeaconSetup);
    this.receive('player:soundLaunched', this.onSoundLaunched);

    // add local beacon info on screen
    if (this.beacon) {
      document.getElementById('localInfo').innerHTML = 'local iBeacon ID: ' + this.beacon.major + '.' + this.beacon.minor;
    }

    // create touch event
    const surface = new soundworks.TouchSurface(this.view.$el);
    surface.addListener('touchstart', (id, normX, normY) => {
      // decide on when to play the sound (now + delay network transmission)
      let time = this.sync.getSyncTime() + this.networkDelay;
      this.send('server:soundLaunch', (time));
      // setup "play bounces between me and the other clients"
      this.beaconList.forEach((beacon) => {
        this.playFlutter(beacon.minor, time );
      });
    });

    // DEBUG (for non-cordova runs)
    if (!this.beacon)
    {
      this.beacon = {major:0, minor: 0};
      this.beacon.restartAdvertising = function(){};
      this.beacon.rssiToDist = function(){return 1.0 + Math.random()};
      this.beaconList = [];
      window.setInterval(() => {
        var pluginResult = { beacons : [] };
        for (let i = 0; i < 1; i++) {
          var beacon = {
            major: 0,
            minor: i,
            rssi: -45 - i * 5,
            proximity : 'fake beacon',
          };
          pluginResult.beacons.push(beacon);
        }
        this.beaconCallback(pluginResult);
      }, 1000);
    }

  }


  beaconCallback(pluginResult) {
    // get beacon list
    pluginResult.beacons.forEach((beacon) => {
      this.beaconList[beacon.minor] = beacon;
    });

    // diplay beacon list on screen
    var log = '';
    this.beaconList.forEach((beacon) => {
      log += 'iBeacon maj.min: ' + beacon.major + '.' + beacon.minor + '</br>' +
             'rssi: ' + beacon.rssi + 'dB ~ dist: ' +
             Math.round( this.beacon.rssiToDist(beacon.rssi)*100, 2 ) / 100 + 'm' + '</br>' +
             '(' + beacon.proximity + ')' + '</br></br>';
    });
    document.getElementById('logValues').innerHTML = log;

    // compute flutter IR for each me <-> beacon pair
    this.beaconList.forEach((beacon) => {
        this.updateIRs(beacon);
    });
    // TODO: - clear buffer if beacon is no longer in range
    //       - optimize (unique forEach loop), so far kept for clarity since beacon update is scarce (~every sec)

  }


  updateIRs(beacon) {
    // get array of arrays, where each of the latter is [time, gain] of a tap
    var irTaps = this.getIrTaps(
      this.beacon.rssiToDist(beacon.rssi),
      this.propagParams.speed,
      this.propagParams.gain,
      this.propagParams.txGain,
      this.propagParams.rxMinGain,
      this.propagParams.rxMaxTime
      );

    // transform array of taps to IR
    var irDuration = irTaps[irTaps.length-1][0];
    var audioSampleRate = audioContext.sampleRate;
    var ir = new Float32Array(Math.ceil(irDuration * audioSampleRate));
    for(let s = 0; s < irTaps.length; ++s) {
        ir[Math.floor(irTaps[s][0] * audioSampleRate)] = irTaps[s][1];
    }

    // transform IR to buffer, store it
    var irBuffer = audioContext.createBuffer(1, ir.length, audioContext.sampleRate);
    irBuffer.getChannelData(0).set(ir);
    this.irBuffers[beacon.minor] = irBuffer;
  }


  getIrTaps(dist, speed, gainPropag, gainTx, gainThreshold, timeThreshold) {
      // get array of arrays, where each of the latter is [time, gain] of a tap
      var irTaps = [];
      var roundtripTime = dist / speed;
      var currentTime = 0.0;
      var currentGain = gainTx;
      // back and forth between me and given beacon (represented by "dist" argument)
      // record a tap at each ping on me
      while ( (currentTime < timeThreshold) && (currentGain > gainThreshold)) {
          currentTime += 2*roundtripTime;
          currentGain *= Math.pow(Math.pow(gainPropag, dist), 2);

          if (currentGain >= 1.0) { // safety
            console.error('divergent gain in getIrTaps()');
            irTaps = [[0.0,0.0]];
            break;
          }

          irTaps.push([ currentTime, currentGain ]);
      }

      if (irTaps.length === 0) {
          console.warn('propagation parameters led to void irTaps')
          irTaps = [[0.0,0.0]];
      }

      return irTaps;
  }

  playFlutter(beaconID, time) {

      // create audio source based on IR buffer
      var src = audioContext.createBufferSource();
      src.buffer = this.irBuffers[beaconID];
      // create a convolver based on audio sound
      var conv = audioContext.createConvolver();
      conv.buffer = this.loader.buffers[0];
      // create master gain
      var gain = audioContext.createGain();
      gain.gain.value = this.propagParams.masterGain;

      // Note: In order to be able to render long impulse responses, the
      // `ConvolverNode.buffer` is the original sound, while the
      // `AudioBufferSourceNode.buffer` is the actual impulse response.

      // connect graph
      src.connect(conv);
      conv.connect(gain);
      gain.connect(audioContext.destination);
      conv.connect(this.audioAnalyser.in); // for screen color = f(sound amplitude)

      var timeBeforePlayStart = (time - this.sync.getSyncTime());
      if (timeBeforePlayStart > 0) {
        var startTime = audioContext.currentTime + timeBeforePlayStart;
        src.start(startTime);
      }
      else{
        console.warn('no sound played, I received the instruction to play to late: (network delay has been underestimated). estimated:', this.networkDelay, 'sec, true:', this.networkDelay - timeBeforePlayStart, 'sec');
      }

      // start screen color update = f(amplitude) routine
      this.isPlaying = true;
      requestAnimationFrame(this.updateBkgColor);
      // that will stop when client finished playing
      setTimeout(() => {
        this.isPlaying = false;
      }, (this.networkDelay + src.buffer.duration + conv.buffer.duration) * 1000);

  }

  updateBkgColor() {
    if (this.isPlaying) { // call me once, I'll call myself over and over
      requestAnimationFrame(this.updateBkgColor);
    }
    // change background color based on current amplitude
    let amp = 200 * this.audioAnalyser.getAmplitude();
    let rgb = [amp, amp, amp];
    this.renderer.setBkgColor(rgb);
  }

  // message callback
  onBeaconSetup(beaconInfo) {
    console.log('server defined new beacon setup:', beaconInfo);
    if (this.beacon) {
      // change local beacon info
      this.beacon.major = beaconInfo.major;
      this.beacon.minor = beaconInfo.minor;
      this.beacon.restartAdvertising();
      // add local beacon info on screen
      document.getElementById('localInfo').innerHTML = 'local iBeacon ID: ' + this.beacon.major + '.' + this.beacon.minor;
    }
  }

  // message callback
  onSoundLaunched(beaconID, time) {
    console.log('received launch instruction from: ', beaconID, this.irBuffers[beaconID]);
    if ( this.irBuffers[beaconID] !== undefined ) { // if launcher in my neighborhood
      // play stored IR, with a half roud trop time delay to acount for the first "launcher to me" trip.
      let roudTripTime = this.beacon.rssiToDist(this.beaconList[beaconID].rssi) / this.propagParams.speed;
      let startTime = time + roudTripTime;
      this.playFlutter(beaconID, startTime);
    }
  }

}
