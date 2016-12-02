import * as soundworks from 'soundworks/client';
import * as soundworksCordova from 'soundworks-cordova/client';

import NuRenderer from './NuRenderer';
import NuRoomReverb from './NuRoomReverb';
import NuGroups from './NuGroups';
import NuPath from './NuPath';
import NuLoop from './NuLoop';
import NuTemplate from './NuTemplate';
import NuGrain from './NuGrain';
import NuSpy from './NuSpy';

import * as utils from './utils';
const audioContext = soundworks.audioContext;
const client = soundworks.client;

const viewTemplate = `
  <canvas id='main-canvas' class="background"></canvas>
  <div class="foreground">

    <div class="section-top flex-middle">
      <p id="text1" class="big">  </p>
    </div>

    <div class="section-center flex-middle">
      <p id="text2" class="small"> </p>
    </div>

    <div class="section-bottom flex-center">
      <p id="text3" class="small soft-blink"> </p>
    </div>
    
  </div>
`;


/* Description:
...
*/

export default class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain, audioFiles, beaconUUID) {
    super();

    // soundworks services
    this.platform = this.require('platform', { features: ['web-audio'] });
    this.params = this.require('shared-params');
    this.sharedConfig = this.require('shared-config');
    this.sync = this.require('sync');
    this.checkin = this.require('checkin', { showDialog: false });
    this.scheduler = this.require('scheduler', { lookahead: 0.050 });
    this.loader = this.require('loader', {
      assetsDomain: assetsDomain,
      files: audioFiles,
    });
    this.motionInput = this.require('motion-input', {
      descriptors: ['accelerationIncludingGravity', 'deviceorientation', 'energy']
    });

    // binding
    // ...

    // local attributes
    this.propagParams = {};
  }

  init() {
    // init view (GUI)
    this.viewTemplate = viewTemplate;
    this.viewContent = {};
    this.viewCtor = soundworks.CanvasView;
    this.viewOptions = { preservePixelRatio: true };
    this.view = this.createView();
    this.renderer = new NuRenderer(this);
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

    // init Nu modules
    this.nuRoomReverb = new NuRoomReverb(this);
    this.nuGroups = new NuGroups(this);
    this.nuPath = new NuPath(this);
    this.nuLoop = new NuLoop(this);
    this.nuTemplate = new NuTemplate(this);
    this.nuGrain = new NuGrain(this);
    this.nuSpy = new NuSpy(this);

    // init Nu Main
    this.receive('nuMain', (args) => {
      console.log('nuMain:', args);
      let paramName = args.shift();

      if( paramName === 'reload' )
        window.location.reload(true)
    });

    // disable text selection, magnifier, and screen move on swipe on ios
    document.getElementsByTagName("body")[0].addEventListener("touchstart",
    function(e) { e.returnValue = false });

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