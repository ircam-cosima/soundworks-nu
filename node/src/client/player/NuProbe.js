/**
 * NuProbe: get motion etc. info from given client in OSC
 **/

import NuBaseModule from './NuBaseModule'
import * as soundworks from 'soundworks/client';

const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuProbe extends NuBaseModule {
  constructor(playerExperience) {
    super(playerExperience, 'nuProbe');

    // local attributes
    this.params = {};
    this.throttle = {
      'acc': [Infinity, Infinity, Infinity],
      'accThreshold': 2.5,
      'ori': [Infinity, Infinity, Infinity],
      'oriThreshold': 3,
      'energy': Infinity,
      'energyThreshold': 0.1,
      'touch': [Infinity, Infinity]
    };
    this.callBackStatus = {
      ori: false,
      acc: false, 
      energy: false,
      touch: false
    };
    this.surface = new soundworks.TouchSurface(this.e.view.$el);

    // binding
    this.orientationCallback = this.orientationCallback.bind(this);
    this.accelerationCallback = this.accelerationCallback.bind(this);
    this.energyCallback = this.energyCallback.bind(this);
    this.touchStartCallback = this.touchStartCallback.bind(this);
    this.touchMoveCallback = this.touchMoveCallback.bind(this);
    this.touchEndCallback = this.touchEndCallback.bind(this);
  }

  // Note: all callbacks in aftewards section are enabled / disabled with the methods 
  // at scripts' end (via OSC msg)

  orientationCallback(data){
    // for computers, otherwise they'll send [null,null,null] at startup
    if( data[0] === null ){ return; }
    // throttle
    let delta = Math.abs(this.throttle.ori[0] - data[0]) + 
                Math.abs(this.throttle.ori[1] - data[1]) + 
                Math.abs(this.throttle.ori[2] - data[2]);
    if( delta < this.throttle.oriThreshold ){ return }
    // save new throttle values
    this.throttle.ori[0] = data[0];
    this.throttle.ori[1] = data[1];
    this.throttle.ori[2] = data[2];
    // send to OSC via server
    this.e.send('osc', '/' + this.moduleName, ['orientation', data[0], data[1], data[2]] );
  }

  accelerationCallback(data){
    // throttle
    let delta = Math.abs(this.throttle.acc[0] - data[0]) + 
                Math.abs(this.throttle.acc[1] - data[1]) + 
                Math.abs(this.throttle.acc[2] - data[2]);
    if( delta < this.throttle.accThreshold ){ return }
    // save new throttle values
    this.throttle.acc[0] = data[0];
    this.throttle.acc[1] = data[1];
    this.throttle.acc[2] = data[2];
    // send to OSC via server
    this.e.send('osc', '/' + this.moduleName, ['acceleration', data[0], data[1], data[2]] );
  }

  energyCallback(data){
    // throttle
    let delta = Math.abs(this.throttle.energy - data);
    if( delta < this.throttle.energyThreshold ){ return }
    // save new throttle values
    this.throttle.energy = data;
    // send to OSC via server
    this.e.send('osc', '/' + this.moduleName, ['energy', data] );
  }

  touchStartCallback(id, normX, normY){
    // notify touch on
    this.e.send('osc', '/' + this.moduleName, ['touchOn', 1] );
    // common touch callback
    this.touchCommonCallback(id, normX, normY);      
  }

  touchMoveCallback(id, normX, normY){
    // common touch callback
    this.touchCommonCallback(id, normX, normY);
  }

  touchEndCallback(id, normX, normY){
    // notify touch off
    this.e.send('osc', '/' + this.moduleName, ['touchOn', 0] );
    // common touch callback
    this.touchCommonCallback(id, normX, normY);      
  }  

  touchCommonCallback(id, normX, normY){
    // ATTEMPT AT CROSSMODULE POSTING: FUNCTIONAL BUT ORIGINAL USE NO LONGER CONSIDERED: TODELETE WHEN CONFIRMED
    // window.postMessage(['nuRenderer', 'touch', id, normX, normY], location.origin);
    // ----------
    // send touch pos
    this.e.send('osc', '/' + this.moduleName, ['touchPos', id, normX, normY]);
  }

  // Note: hereafter are the OSC triggered functions used to enable / disable 
  // hereabove callbacks

  touch(onOff){
    // enable if not already enabled
    if( onOff && !this.callBackStatus.touch ){
      this.surface.addListener('touchstart', this.touchStartCallback);
      this.surface.addListener('touchmove', this.touchMoveCallback);
      this.surface.addListener('touchend', this.touchEndCallback);
      this.callBackStatus.touch = true;
    }
    // disable if not already disabled
    if( !onOff && this.callBackStatus.touch ){
      this.surface.removeListener('touchstart', this.touchStartCallback);
      this.surface.removeListener('touchmove', this.touchMoveCallback);
      this.surface.removeListener('touchend', this.touchEndCallback);
      this.callBackStatus.touch = false;
    }
  }

  orientation(onOff){
    // discard instruction if motionInput not available
    if (!this.e.motionInput.isAvailable('deviceorientation')){ return; }
    // enable if not already enabled
    if( onOff && !this.callBackStatus.ori ){
      this.e.motionInput.addListener('deviceorientation', this.orientationCallback);
      this.callBackStatus.ori = true;
    }
    // disable if not already disabled
    if( !onOff && this.callBackStatus.ori ){
      this.e.motionInput.removeListener('deviceorientation', this.orientationCallback);
      this.callBackStatus.ori = false;
    }
  }

  acceleration(onOff){ 
    // discard instruction if motionInput not available
    if (!this.e.motionInput.isAvailable('accelerationIncludingGravity')){ return; }
    // enable if not already enabled
    if( onOff && !this.callBackStatus.acc ){
      this.e.motionInput.addListener('accelerationIncludingGravity', this.accelerationCallback);
      this.callBackStatus.acc = true;
    }
    // disable if not already disabled
    if( !onOff && this.callBackStatus.acc ){
      this.e.motionInput.removeListener('accelerationIncludingGravity', this.accelerationCallback);
      this.callBackStatus.acc = false;
    }
  }

  energy(onOff){ 
    // discard instruction if motionInput not available
    if (!this.e.motionInput.isAvailable('energy')){ return; }
    // enable if not already enabled
    if( onOff && !this.callBackStatus.energy ){
      this.e.motionInput.addListener('energy', this.energyCallback);
      this.callBackStatus.energy = true;
    }
    // disable if not already disabled
    if( !onOff && this.callBackStatus.energy ){
      this.e.motionInput.removeListener('energy', this.energyCallback);
      this.callBackStatus.energy = false;
    }
  }

}