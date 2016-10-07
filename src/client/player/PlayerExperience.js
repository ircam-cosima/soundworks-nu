import * as soundworks from 'soundworks/client';
import * as soundworksCordova from 'soundworks-cordova/client';

import PlayerRenderer from './PlayerRenderer';
import AudioAnalyser from './AudioAnalyser';

import AudioSynthSwoosher from './utils';

const audioContext = soundworks.audioContext;
const client = soundworks.client;

const viewTemplate = `
  <canvas id='main-canvas' class="background"></canvas>
  <div class="foreground">

    <div class="section-top flex-middle">
      <p class="big">Beacon ID: <%= major %>.<%= minor %></p>
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
  constructor(assetsDomain, audioFiles) {
    super(true);

    // require services
    this.platform = this.require('platform', { features: ['web-audio'] });
    this.params = this.require('shared-params');
    this.sync = this.require('sync');
    this.checkin = this.require('checkin', { showDialog: false });
    this.loader = this.require('loader', {
      assetsDomain: assetsDomain,
      files: audioFiles,
    });

    // beacon only work in cordova mode since it needs access right to BLE
    if (window.cordova) {
      this.beacon = this.require('beacon', { uuid: beaconUUID });
    }   

    // binding
    this.initBeacon = this.initBeacon.bind(this);
    this.beaconCallback = this.beaconCallback.bind(this);
    this.updateBkgColor = this.updateBkgColor.bind(this);
    this.onPlay = this.onPlay.bind(this);
    this.onWebSocketOpen = this.onWebSocketOpen.bind(this);
    this.onWebSocketEvent = this.onWebSocketEvent.bind(this);

    // local attributes
    this.status = 0;
    this.propagParams = {};
    this.audioAnalyser = new AudioAnalyser();
    this.audioSynthSwoosher = new AudioSynthSwoosher({duration: 1.0, gain:0.4});    
  }

  init() {
    // init view (GUI)
    this.viewTemplate = viewTemplate;
    this.viewContent = { subtitle: `in the forest, at night`, major: this.beacon.major, minor: this.beacon.minor };
    this.viewCtor = soundworks.CanvasView;
    this.viewOptions = { preservePixelRatio: true };
    this.view = this.createView();
    this.renderer = new PlayerRenderer();
    this.view.addRenderer(this.renderer);    
  }

  start() {
    super.start();

    if (!this.hasStarted) {
      this.initBeacon();
      this.init();
    }

    this.show();

    // define message callbacks
    this.receive('playDown', this.onPlay);
    this.receive('updateIr', this.onUpdateIr);

    // param listeners
    this.params.addParamListener('masterGain', (value) => this.propagParams.masterGain = value);

    // create touch event, used to send the first message
    const surface = new soundworks.TouchSurface(this.view.$el);
    surface.addListener('touchstart', (id, normX, normY) => {
      // only if propagation has not already started
      if (this.status == 0) {

        // send play msg with fixed rdv time (sync. clients players)
        this.send('playUp', this.sync.getSyncTime() + this.audioSynthSwoosher.duration);
        // visual feedback
        this.renderer.setBkgColor([255, 128, 0]);
        // audio feedback
        this.audioSynthSwoosher.play();

        // play sound (first ping) when finish swoosh
        let src = audioContext.createBufferSource();
        src.buffer = this.loader.buffers[0];
        let gain = audioContext.createGain();
        gain.gain.value = 0.025*this.propagParams.masterGain;
        src.connect(gain);
        gain.connect(audioContext.destination);
        src.start( audioContext.currentTime + this.audioSynthSwoosher.duration );
      }
    });

    // init websocket
    let url = "ws:" + client.config.socketIO.url.split(":")[1] + ":8080";
    console.log('connecting websocket to', url);
    this.ws = new WebSocket(url);
    this.ws.binaryType = 'arraybuffer';
    this.ws.onopen = this.onWebSocketOpen;
    this.ws.onmessage = this.onWebSocketEvent;
  }

  // send client index (at websocket opening) to associate socket / index in server
  onWebSocketOpen(){
    this.ws.send( client.index, { binary: false, mask: true }, (error) => { console.log('websocket error:', error); } );
  }

  /*
  * callback when websocket event (msg containing new IR sent by server) is received
  */
  onWebSocketEvent(event) {

    // de-interleave + get max delay for IR buffer size
    let interleavedIrArray = new Float32Array(event.data);
    let irTime = [], irGain = [], irDuration = 0.0;
    for( let i = 0; i < interleavedIrArray.length / 2; i++ ){
      irTime[i] = interleavedIrArray[2*i];
      irGain[i] = interleavedIrArray[2*i + 1];
      irDuration = Math.max(irDuration, irTime[i]);
    }

    // create IR as float array
    let ir = new Float32Array(Math.ceil(irDuration * audioContext.sampleRate));
    for(let s = 0; s < irTime.length; ++s) {
        ir[Math.floor(irTime[s] * audioContext.sampleRate)] = irGain[s];
    }

    // transform IR float array to web audio buffer
    this.futureIrBuffer = audioContext.createBuffer(1, Math.max(ir.length, 512), audioContext.sampleRate);
    this.futureIrBuffer.getChannelData(0).set(ir);
    this.irBuffer = audioContext.createBuffer(1, Math.max(ir.length, 512), audioContext.sampleRate);

    // inform server we're ready to receive new IR
    this.send('ackIrReceived');

    // feedback user that IR has been loaded 
    this.renderer.setBkgColor([50, 50, 50]);
  }


  /*
  * message callback: play final sound. Run when all nodes in the network
  * have their IR ready
  */
  onPlay(syncstartTime) {

    
    if( (this.futureIrBuffer !== undefined) && ( this.status == 0 ) ){
      
      this.irBuffer.getChannelData(0).set( this.futureIrBuffer.getChannelData(0) );

      // indicate propagation started
      this.status = 1;

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
      
      requestAnimationFrame(this.updateBkgColor);

      // timeout callback, runs when we finished playing
      setTimeout(() => {
        this.status = 0;
        this.renderer.setBkgColor([0,0,0]);
      }, ( syncstartTime - this.sync.getSyncTime() + src.buffer.duration + conv.buffer.duration) * 1000);
    }
  }

  /*
  * Change GUI background color based on current amplitude of sound being played
  */
  updateBkgColor() {
    if (this.status == 1) {
      // call me once, I'll call myself over and over
      requestAnimationFrame(this.updateBkgColor);
      // change background color based on current amplitude
      let amp = 200 * this.audioAnalyser.getAmplitude();
      let rgb = [amp, 50 + amp, 50 + amp];
      this.renderer.setBkgColor(rgb);
    }
  }


  // -------------------------------------------------------------------------------------------
  // BEACON-RELATED METHODS
  // -------------------------------------------------------------------------------------------
  
  /*
  * Init beacon service
  */  
  initBeacon() {

    // initialize ibeacon service
    if (this.beacon) {
      this.beacon.addListener(this.beaconCallback);
      this.beacon.txPower = -55; // fake calibration (in dB)
      this.beacon.major = 0;
      this.beacon.minor = client.index;
      this.beacon.restartAdvertising();
    }

    // INIT FAKE BEACON (for computer based debug)
    else { 
      this.beacon = {major:0, minor: client.index};
      this.beacon.rssiToDist = function(){return 0.01 + 0.1*Math.random()};
      this.beacon.restartAdvertising = function(){};
      window.setInterval(() => {
        var pluginResult = { beacons : [] };
        for (let i = 0; i < 4; i++) {
          if( i != client.index ){
            var beacon = { major: 0, minor: i, rssi: -45 - i * 5, proximity : 'fake, nearby', };
            pluginResult.beacons.push(beacon);
          }
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
    // loop over beacons to fill simplified beacon Map
    const beaconMap = new Map();
    pluginResult.beacons.forEach((beacon) => {
      const id = beacon.minor;
      const dist = this.beacon.rssiToDist(beacon.rssi)
      beaconMap.set(id, dist);
    });
    // upload beacon to server
    this.send('beaconMap', beaconMap);


    // log beacons on screen
    var log = 'Closeby Beacons: </br></br>';
    pluginResult.beacons.forEach((beacon) => {
      log += beacon.major + '.' + beacon.minor + ' dist: ' 
            + Math.round( this.beacon.rssiToDist(beacon.rssi)*100, 2 ) / 100 + 'm' + '</br>' +
             '(' + beacon.proximity + ')' + '</br></br>';
    });
    // diplay beacon list on screen
    document.getElementById('logValues').innerHTML = log;

  }
  // -------------------------------------------------------------------------------------------  

}
