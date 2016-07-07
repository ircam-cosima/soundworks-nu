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

  constructor(assetsDomain, standalone, audioFiles) {
    // disable socket connection - use for standalone application
    super(!standalone);
    // beacon only work in cordova mode since it needs access right to BLE
    if (window.cordova) { this.beacon = this.require('beacon'); }
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
      // add callback, invoked whenever beacon scan is executed
      this.beacon.addCallback(this.beaconCallback);
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
    var log = '';
    pluginResult.beacons.forEach((beacon) => {
      log += 'iBeacon maj.min: ' + beacon.major + '.' + beacon.minor + '</br>' +
             'rssi: ' + beacon.rssi + 'dB' + '</br>' +
             '(' + beacon.proximity + ')' + '</br></br>';
    });
    // diplay beacon list on screen
    document.getElementById('logValues').innerHTML = log;
  }

}
