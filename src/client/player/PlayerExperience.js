import * as soundworks from 'soundworks/client';

import Beacon from '../../shared/client/services/Beacon';

const audioContext = soundworks.audioContext;

const viewTemplate = `
  <canvas class="background"></canvas>
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

// this experience display neighboring iBeacons and setup the device itself as an iBeacon,
// illustrating basic use of the soundworks beacon service
export default class PlayerExperience extends soundworks.Experience {

  constructor(standalone, assetsDomain, beaconUUID) {
    // disable socket connection - use for standalone application
    super(!standalone);
    // beacon only work in cordova mode since it needs access right to BLE
    if (window.cordova) {
      this.beacon = this.require('beacon', { uuid: beaconUUID });
      this.beaconCallback = this.beaconCallback.bind(this);
    }
  }

  init() {
    // initialize the view
    this.viewTemplate = viewTemplate;
    this.viewContent = { title: `Scanning iBeacons...` };
    this.viewCtor = soundworks.CanvasView;
    this.viewOptions = { preservePixelRatio: true };
    this.view = this.createView();

    // initialize ibeacon service
    if (this.beacon) {
      // neighboring beacon list
      this.beaconList = new Map();
      // add callback, invoked whenever beacon scan is executed
      this.beacon.addListener(this.beaconCallback);
      // fake calibration
      this.beacon.txPower = -55; // in dB (see beacon service for detail)
    }
  }


  start() {
    super.start();
    if (!this.hasStarted) { this.init(); }
    this.show();

    // add local beacon info on screen
    if (this.beacon) {
      document.getElementById('localInfo').innerHTML = 'local iBeacon ID: ' + this.beacon.major + '.' + this.beacon.minor;
    }
  }

  beaconCallback(pluginResult) {
    // get beacon list
    pluginResult.beacons.forEach((beacon) => {
      this.beaconList.set(beacon.major + '.' + beacon.minor, beacon);
    });

    // diplay beacon list on screen
    var log = '';
    this.beaconList.forEach((beacon) => {
      log += 'iBeacon maj.min: ' + beacon.major + '.' + beacon.minor + '</br>' +
             'rssi: ' + beacon.rssi + 'dB ~ dist: ' +
             Math.round( this.beacon.rssiToDist(beacon.rssi)*100, 2 ) / 100 + 'm' + '</br>' +
             '(' + beacon.proximity + ')' + '</br></br>';
    })
    document.getElementById('logValues').innerHTML = log;
  }

}
