/**
 * NuOutput: render output, either directly to audioContext.destination or 
 * to spatialization engine for debug sessions (i.e. to get a feel of the final 
 * result while players are emulated on server's laptop). Spatialization is based 
 * Ambisonic encoding plugged in binaural decoding.
 **/

import NuBaseModule from './NuBaseModule'
import * as soundworks from 'soundworks/client';
import * as ambisonics from 'ambisonics';
import Recorder from 'recorderjs';

const client = soundworks.client;
const audioContext = soundworks.audioContext;

/** 
* convert Cartesian to spherical coordinates 
* (azimuth is in xy. elev at zero is in xy, positive up)
**/
const cart2sph = function(xyz){
  let r2d = 180 / Math.PI;
  let d = Math.sqrt( Math.pow(xyz[0], 2) + Math.pow(xyz[1], 2) + Math.pow(xyz[2], 2) );
  let a = r2d * Math.atan2(xyz[0], xyz[1]);
  let e = 0;
  if( d !== 0 ){ e = r2d * Math.asin(xyz[2] / d); }
  return [a,e,d];
}

export default class NuOutput extends NuBaseModule {
  constructor(playerExperience) {
    super(playerExperience, 'nuOutput');

    // local attributes
    this.params = { userPos: [0, 0, 0] };

    /**
    * input gain (connected to analyzer for visual feedback)
    * (had to do it the other around since Safari's analyser would
    * remain frozen this.in was the gain connected to the analyser)
    **/
    this.in = this.e.renderer.audioAnalyser.in;
    this.masterGain = audioContext.createGain();
    this.out = audioContext.createGain();

    // create Ambisonic encoder / decoder
    this.maxOrder = 3;
    this.ambiOrderValue = 3;
    this.encoder = new ambisonics.monoEncoder(audioContext, this.ambiOrderValue);
    this.limiter = new ambisonics.orderLimiter(audioContext, this.maxOrder, this.maxOrder);
    this.decoder = new ambisonics.binDecoder(audioContext, this.ambiOrderValue);

    // create additional gain to compensate for badly norm. room IR
    this.ambiGain = audioContext.createGain();

    // create audio recorder, a too large bufferLen here will produce unsync
    // recordings when server will add client's buffers together (the javascript 
    // node "starting" to record samples in indpt worker will fire in between 
    // "start record" and in bufferLen samples, and that "randomly" for each client)
    this.recorder = new Recorder( this.out, {bufferLen: 512} );
    this.startRecTime = 0.0;

    // init coordinates
    let coordXY = this.e.coordinates;
    this.coordXYZ = [ coordXY[0], coordXY[1], 0];

    // connect graph
    this.in.connect( this.masterGain );
    this.out.connect( audioContext.destination );
    this.ambiGain.connect( this.encoder.in )
    this.encoder.out.connect( this.limiter.in );
    this.limiter.out.connect( this.decoder.in );
  }

  // trigger session recording to disk
  record(val) {
      // start recording
      if (val) {
        // start recording
        this.recorder.clear();
        this.recorder.record();
        this.startRecTime = this.e.sync.getSyncTime();
      }
      // stop recording
      else {
        // stop recorder
        this.recorder.stop();
        // get recorder buffer and send audio data to server
        this.recorder.getBuffer( (buffers) => {
          
          // create empty buffer for interleaving before send
          let headerLength = 3;
          var interleavedBuffer = new Float32Array( 2*buffers[0].length + headerLength);

          // add header
          interleavedBuffer[0] = client.index;
          interleavedBuffer[1] = this.startRecTime;
          interleavedBuffer[2] = audioContext.sampleRate;

          // fill interleaved buffer
          for( let i = 0; i < buffers[0].length; i++ ){
            interleavedBuffer[ headerLength + 2*i ] = buffers[0][i];
            interleavedBuffer[ headerLength + 2*i + 1] = buffers[1][i];
          }

          // send audio data
          this.e.rawSocket.send( this.moduleName, interleavedBuffer );
        });

    }
  }

  // set audio gain out
  gain(val){
    this.masterGain.gain.value = val;
  }

  // enable / disable spatialization of player based on its position in the room
  enableSpat(val){
    if(val){
      try{ this.masterGain.disconnect( this.out ); }
      catch(e){ if( e.name !== 'InvalidAccessError'){ console.error(e); } }
      this.masterGain.connect( this.ambiGain );
      this.decoder.out.connect( this.out );
    }
    else{
      try{
        this.decoder.out.disconnect( this.out );
        this.masterGain.disconnect( this.ambiGain ); 
      }
      catch(e){ if( e.name !== 'InvalidAccessError'){ console.error(e); } }
      this.masterGain.connect( this.out );
    }
  }

  // set encoding Ambisonic order
  ambiOrder(val){
    // filter order in
    if( val > 3 || val < 1 ){ return; }
    this.limiter.updateOrder( val );
    this.limiter.out.connect( this.decoder.in );
  }

  /** 
  * enable spatialized room reverberation 
  * (replace dry Ambisonic IR with Room Ambisonic IR)
  **/
  enableRoom(val){
    let irUrl = '';
    if( val ){
      // different IR for reverb (+ gain adjust for iso-loudness)
      irUrl = 'irs/HOA3_BRIRs-medium.wav';
      this.ambiGain.gain.value = 0.5;
    }
    else{
      irUrl = 'irs/HOA3_filters_virtual.wav';
      this.ambiGain.gain.value = 1.0;
    }
    // load HOA to bianural filters in decoder
    var loader_filters = new ambisonics.HOAloader(audioContext, this.maxOrder, irUrl, (buffer) => { this.decoder.updateFilters(buffer); } );
    loader_filters.load();
  }

  /** define fake user position (the user here is the composer / debugger, 
   * sitting in front of browsers simulating the players, deciding where 
   * he/she wants to be in the room during the composition / debug session)
  **/
  userPos(args){
    this.params.userPos[0] = args[0];
    this.params.userPos[1] = args[1];
    this.setPos();
  }

  // update player position
  setPos(){
    // get rel. pos from user (debug listener)
    let relXYZ = [];
    for( let i = 0; i < 3; i++ ){ 
      relXYZ.push( this.params.userPos[i] - this.coordXYZ[i] ); 
    }
    let coordSph = cart2sph( relXYZ );
    // update encoder parameters
    this.encoder.azim = coordSph[0];
    this.encoder.elev = coordSph[1];
    this.encoder.updateGains();
  }

}
