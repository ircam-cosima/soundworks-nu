import {
  Service,
  serviceManager
} from 'soundworks/client';

const SERVICE_ID = 'service:beacon';
/* need cordova plugin add https://github.com/petermetz/cordova-plugin-ibeacon.git*/

class Beacon extends Service {
  /** _<span class="warning">__WARNING__</span> This class should never be instanciated manually_ */
  constructor() {
    console.log('constructor beacon');
    super(SERVICE_ID, false); // true: needs netwok connection

    // local attributes
    this._beaconData = {};
    this._callbacks = new Set();

    // bind local methods
    this._startAdvertising = this._startAdvertising.bind(this);
    this._stopAdvertising = this._stopAdvertising.bind(this);
    this._startRanging = this._startRanging.bind(this);
    this._stopRanging = this._stopRanging.bind(this);
    this._didRangeBeaconsInRegion = this._didRangeBeaconsInRegion.bind(this);
  }

  /** @private */
  init() {
    console.log('init beacon');

    /**
     * - uuid represent the beacon region. a given ranging callback can obly monitor
     * beacons with the same uuid, hence uuid in the soundwork beacon service is hardcoded.
     * - identifier came with the cordova-plugin-ibeacon API, no real cues why it's there.
     * - major / minor: each encoded on 16 bits, these values are to be used to defined a
     * unique soundwork client.
     */
    this._beaconData = {
      uuid: '74278BDA-B644-4520-8F0C-720EAF059935',
      identifier: 'advertisedBeacon',
      major: Math.floor(Math.random() * 65500),
      minor: Math.floor(Math.random() * 65500)
    }

    // withtout this setTimeout (delayed execution), the call to
    // var beaconRegion = new cordova.plugins.locationManager.BeaconRegion(identifier, uuid, major, minor);
    // in startAdvertising / startRanging raises an undefined error
    var lameTechniqueToBeCleaned = setTimeout(() => {
      this._startAdvertising();
      this._startRanging();

    }, 1000);
  }

  /** @private */
  start() {
    console.log('start beacon');
    super.start();

    if (!this.hasStarted)
      this.init();

    this.ready();
  }

  /** @private */
  stop() {
    console.log('stop beacon');
    super.stop();
    // // COMMENTED BECAUSE THE STOP METHOD SOMEHOW RUNS AT SOUDNWORK START
    // this._stopAdvertising();
    // this._stopRanging();
  }

  /**
   * Register a function that will be invokedwhen neighboring ibeacon list is updated
   * (i.e. every nth millisec. once a single beacon is registered)
   * @param {Function} callback
   */
  addCallback(callback) {
    this._callbacks.add(callback);
  }

  /**
  * remove registered callback from stack (see "addCallback")
  */
  rmCallback(callback) {
    if (this._callbacks.has(callback)) {
      this._callbacks.delete(callback);
    }
  }

  /** @private */
  _startAdvertising() {
    // define beacon parameters
    var uuid = this._beaconData.uuid;
    var identifier = this._beaconData.identifier;
    var minor = this._beaconData.minor;
    var major = this._beaconData.major;
    var beaconRegion = new cordova.plugins.locationManager.BeaconRegion(identifier, uuid, major, minor);

    // verify the platform supports transmitting as a beacon
    cordova.plugins.locationManager.isAdvertisingAvailable()
      .then(function(isSupported) {

        if (isSupported) {
          // start advertising
          cordova.plugins.locationManager.startAdvertising(beaconRegion)
            .fail(console.error)
            .done();
        } else {
          console.log("Advertising not supported");
        }
      })
      .fail(function(e) { console.error(e); })
      .done();
  }

  /** @private */
  _stopAdvertising() {
    cordova.plugins.locationManager.stopAdvertising()
      .fail(function(e) { console.error(e); })
      .done();
  }

  /** @private */
  _startRanging() {

    var delegate = new cordova.plugins.locationManager.Delegate();
    delegate.didRangeBeaconsInRegion = this._didRangeBeaconsInRegion;
    cordova.plugins.locationManager.setDelegate(delegate);

    var uuid = this._beaconData.uuid;
    var identifier = this._beaconData.identifier;
    var beaconRegion = new cordova.plugins.locationManager.BeaconRegion(identifier, uuid);

    // required in iOS 8+
    cordova.plugins.locationManager.requestWhenInUseAuthorization();
    // or cordova.plugins.locationManager.requestAlwaysAuthorization()

    cordova.plugins.locationManager.startRangingBeaconsInRegion(beaconRegion)
      .fail(function(e) { console.error(e); })
      .done();
  }

  /** @private */
  _didRangeBeaconsInRegion(pluginResult) {
    // call user defined callbacks
    this._callbacks.forEach(function(callback) {
      callback(pluginResult);
    });
  }

  /** @private */
  _stopRanging() {

    var uuid = this._beaconData.uuid;
    var identifier = this._beaconData.identifier;
    var beaconRegion = new cordova.plugins.locationManager.BeaconRegion(identifier, uuid);

    cordova.plugins.locationManager.stopRangingBeaconsInRegion(beaconRegion)
      .fail(function(e) { console.error(e); })
      .done();
  }

  /**
  * Get advertising iBeacon region UUID
  */
  get uuid() {
    return this._beaconData.uuid;
  }
  /**
  * Get advertising iBeacon major ID
  */
  get major () {
    return this._beaconData.major;
  }
  /**
  * Get advertising iBeacon minor ID
  */
  get minor () {
    return this._beaconData.minor;
  }

  /**
  * Set advertising iBeacon UUID
  * @param {String} val - new UUID
  */
  set uuid(val) { // USE AT YOUR OWN RISKS
    this._stopAdvertising();
    this._beaconData.uuid = val;
    this._startAdvertising();
  }

  /**
  * Set advertising iBeacon major ID
  * @param {Number} val - new major ID
  */
  set major (val) {
    if ( (val <= 65535) && (val >= 0) ){
      this._stopAdvertising();
      this._beaconData.major = val;
      this._startAdvertising();
    }
    else {
      console.warn('WARNING: attempt to define invalid major value: ', val, ' (must be in range [0,65535]');
    }
  }

  /**
  * Set advertising iBeacon minor ID
  * @param {Number} val - new minor ID
  */
  set minor (val) {
    if ( (val <= 65535) && (val >= 0) ){
      this._stopAdvertising();
      this._beaconData.minor = val;
      this._startAdvertising();
    }
    else {
      console.warn('WARNING: attempt to define invalid minor value: ', val, ' (must be in range [0,65535]');
    }
  }

}

serviceManager.register(SERVICE_ID, Beacon);

export default Beacon;
