import * as soundworks from 'soundworks/client';
import * as soundworksCordova from 'soundworks-cordova/client';

import PlayerRenderer from './PlayerRenderer';
import NuRoomReverb from './NuRoomReverb';
import NuGroups from './NuGroups';

// import AudioSynthSwoosher from './utils';

const audioContext = soundworks.audioContext;
const client = soundworks.client;
// const ButtonView = soundworks.ButtonView;

const viewTemplate = `
  <canvas id='main-canvas' class="background"></canvas>
  <div class="foreground">

    <div class="section-top flex-middle">
      <p class="big">ID: <%= clientIndex %> </p>
    </div>

    <div class="section-center flex-middle">
      <p class="small" id="logValues"></p>
    </div>

    <div class="section-bottom flex-center">
      <p class="small soft-blink"><%= subtitle %></p>
    </div>
    
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
  constructor(assetsDomain, audioFiles, beaconUUID) {
    super();

    // require services
    this.platform = this.require('platform', { features: ['web-audio'] });
    this.params = this.require('shared-params');
    this.sharedConfig = this.require('shared-config');
    this.sync = this.require('sync');
    this.checkin = this.require('checkin', { showDialog: false });
    this.loader = this.require('loader', {
      assetsDomain: assetsDomain,
      files: audioFiles,
    });
    this.motionInput = this.require('motion-input', {
      descriptors: ['accelerationIncludingGravity']
    });

    // binding
    // this.initBeacon = this.initBeacon.bind(this);
    // this.beaconCallback = this.beaconCallback.bind(this);
    // this.updateBkgColor = this.updateBkgColor.bind(this);

    // local attributes
    this.status = 0; // counter of number of current sources being played
    this.propagParams = {};
    // this.audioAnalyser = new AudioAnalyser();
    // this.audioSynthSwoosher = new AudioSynthSwoosher({ duration: 1.0, gain: 0.4 });
    // this.beaconMap = new Map();
  }

  init() {
    // init view (GUI)
    this.viewTemplate = viewTemplate;
    this.viewContent = { subtitle: `in the forest, at night`, clientIndex: client.index };
    this.viewCtor = soundworks.CanvasView;
    this.viewOptions = { preservePixelRatio: true };
    this.view = this.createView();
    this.renderer = new PlayerRenderer();
    this.view.addRenderer(this.renderer);
  }

  start() {
    super.start();

    if (!this.hasStarted) {
      this.init();
      // this.initBeacon();
    }

    this.show();

    // init client position in room
    let coordinates = this.sharedConfig.get('setup.coordinates');
    this.coordinates = coordinates[client.index];
    this.send('coordinates', this.coordinates);

    // param listeners
    this.params.addParamListener('masterGain', (value) => this.propagParams.masterGain = value);
    this.params.addParamListener('reloadPlayers', () => { window.location.reload(true);
      console.log('RELOAD') });

    // init Nu modules
    this.nuRoomReverb = new NuRoomReverb(this);
    this.nuGroups = new NuGroups(this);

    // // create touch event, used to send the first message
    // const surface = new soundworks.TouchSurface(this.view.$el);
    // surface.addListener('touchstart', (id, normX, normY) => {
    //   // only if propagation has not already started
    //   if (this.status == 0) {
    //     // special status state for the emitter, to avoid potential 'double sending' scenarii when shaking the device too lively
    //     this.status = -1;        
    //     this.triggerSound();
    //   }
    // });

    // // setup motion input listeners
    // if (this.motionInput.isAvailable('accelerationIncludingGravity')) {
    //   this.motionInput.addListener('accelerationIncludingGravity', (data) => {
    //     const mag = Math.sqrt(data[0] * data[0] + data[1] * data[1] + data[2] * data[2]);
    //     if( (mag > 50) && (this.status == 0) ){
    //       // special status state for the emitter, to avoid potential 'double sending' scenarii when shaking the device too lively
    //       this.status = -1;          
    //       this.triggerSound();
    //     }
    //   });
    // }

  }


  // /*
  //  * Change GUI background color based on current amplitude of sound being played
  //  */
  // updateBkgColor() {
  //   if (this.status >= 1) {
  //     console.log('hk');
  //     // call me once, I'll call myself over and over
  //     requestAnimationFrame(this.updateBkgColor);
  //     // change background color based on current amplitude
  //     let amp = 200 * this.audioAnalyser.getAmplitude();
  //     let rgb = [amp, 50 + amp, 50 + amp];
  //     this.renderer.setBkgColor(rgb);
  //   }
  // }


  // -------------------------------------------------------------------------------------------
  // BEACON-RELATED METHODS
  // -------------------------------------------------------------------------------------------

  // /*
  //  * Init beacon service
  //  */
  // initBeacon() {

  //   // initialize ibeacon service
  //   if (this.beacon) {
  //     this.beacon.addListener(this.beaconCallback);
  //     this.beacon.txPower = -55; // fake calibration (in dB)
  //     this.beacon.major = 0;
  //     this.beacon.minor = client.index;
  //     this.beacon.restartAdvertising();
  //   }

  //   // INIT FAKE BEACON (for computer based debug)
  //   else {
  //     this.beacon = { major: 0, minor: client.index };
  //     this.beacon.rssiToDist = function() {
  //       return 0.01 + 0.1 * Math.random() };
  //     this.beacon.restartAdvertising = function() {};
  //     window.setInterval(() => {
  //       var pluginResult = { beacons: [] };
  //       for (let i = 0; i < 5; i++) {
  //         if (i != client.index) {
  //           var beacon = { major: 0, minor: i, rssi: -45 - i * 5, proximity: 'fake, nearby', };
  //           pluginResult.beacons.push(beacon);
  //         }
  //       }
  //       this.beaconCallback(pluginResult);
  //     }, 1000);
  //   }
  // }

  // /*
  //  * callback that runs every time a beacon scan occurs:
  //  * store a list of neighboring beacons
  //  */
  // beaconCallback(pluginResult) {
  //     // loop over beacons to fill simplified beacon Map
  //     let beaconMap = new Map();
  //     pluginResult.beacons.forEach((beacon) => {
  //       let id = beacon.minor;
  //       let dist = this.beacon.rssiToDist(beacon.rssi)
  //       beaconMap.set(id, dist);
  //     });
  //     this.beaconMap = beaconMap;

  //     // upload beacon to server
  //     // this.send('beaconMap', beaconMap);

  //     // log beacons on screen
  //     var log = 'Closeby Beacons: </br></br>';
  //     pluginResult.beacons.forEach((beacon) => {
  //       log += beacon.major + '.' + beacon.minor + ' dist: ' + Math.round(this.beacon.rssiToDist(beacon.rssi) * 100, 2) / 100 + 'm' + '</br>' +
  //         '(' + beacon.proximity + ')' + '</br></br>';
  //     });
  //     // diplay beacon list on screen
  //     document.getElementById('logValues').innerHTML = log;

  //   }
  //   // -------------------------------------------------------------------------------------------  

}