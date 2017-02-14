/**
 * NuOutput: render output, either directly to audioContext.destination or 
 * to spatialization engine for debug sessions (i.e. to get a feel of the final 
 * result while players are emulated on server's laptop). Spatialization is based 
 * Ambisonic encoding plugged in binaural decoding.
 **/

import NuBaseModule from './NuBaseModule'
import * as soundworks from 'soundworks/client';
import * as ambisonics from 'ambisonics';

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
  constructor(soundworksClient) {
    super(soundworksClient, 'nuOutput');

    // local attributes
    this.params = { userPos: [0, 0, 0] };

    /**
    * input gain (connected to analyzer for visual feedback)
    * (had to do it the other around since Safari's analyser would
    * remain frozen this.in was the gain connected to the analyser)
    **/
    this.in = this.soundworksClient.renderer.audioAnalyser.in;
    this.masterGain = audioContext.createGain();
    this.in.connect( this.masterGain );

    // create Ambisonic encoder / decoder
    this.maxOrder = 3;
    this.ambiOrderValue = 3;
    this.encoder = new ambisonics.monoEncoder(audioContext, this.ambiOrderValue);
    this.limiter = new ambisonics.orderLimiter(audioContext, this.maxOrder, this.maxOrder);
    this.decoder = new ambisonics.binDecoder(audioContext, this.ambiOrderValue);

    // create additional gain to compensate for badly norm. room IR
    this.ambiGain = audioContext.createGain();

    // init coordinates
    let coordinates = this.soundworksClient.sharedConfig.get('setup.coordinates');
    let coordXY = coordinates[client.index];
    this.coordXYZ = [ coordXY[0], coordXY[1], 0];

    // connect graph
    this.ambiGain.connect( this.encoder.in )
    this.encoder.out.connect( this.limiter.in );
    this.limiter.out.connect( this.decoder.in );
  }

  // set audio gain out
  gain(val){
    this.masterGain.gain.value = val;
  }

  // enable / disable spatialization of player based on its position in the room
  enableSpat(val){
    if(val){
      try{ this.masterGain.disconnect( audioContext.destination ); }
      catch(e){ if( e.name !== 'InvalidAccessError'){ console.error(e); } }
      this.masterGain.connect( this.ambiGain );
      this.decoder.out.connect( audioContext.destination );
    }
    else{
      try{
        this.decoder.out.disconnect( audioContext.destination );
        this.masterGain.disconnect( this.ambiGain ); 
      }
      catch(e){ if( e.name !== 'InvalidAccessError'){ console.error(e); } }
      this.masterGain.connect( audioContext.destination );
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
      irUrl = 'irs/room-medium-1-furnished-src-20-Set1_16b.wav';
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
    this.encoder.elev = coordSph[0];
    this.encoder.updateGains();
  }

}
