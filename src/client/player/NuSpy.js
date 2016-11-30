/**
 * NuSpy: get motion etc. info from given client in OSC
 **/

import * as soundworks from 'soundworks/client';
const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuTemplate {
  constructor(soundworksClient) {

    // local attributes
    this.soundworksClient = soundworksClient;
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

    // binding
    this.orientationCallback = this.orientationCallback.bind(this);
    this.accelerationCallback = this.accelerationCallback.bind(this);
    this.energyCallback = this.energyCallback.bind(this);
    this.touchStartCallback = this.touchStartCallback.bind(this);
    this.touchMoveCallback = this.touchMoveCallback.bind(this);
    this.touchEndCallback = this.touchEndCallback.bind(this);

    // setup receive callbacks
    this.soundworksClient.receive('nuSpy', (args) => {
      console.log(args);
      let playerId = args.shift();
      // discard if msg doesn't concern current player
      if( playerId !== client.index && playerId !== -1 ) return;
      let name = args.shift();
      // reduce args array to singleton if only one element left
      args = (args.length == 1) ? args[0] : args;
      if( this.params[name] !== undefined )
        this.params[name] = args; // parameter set
      else
        this[name](args); // function call
    });
    
    this.surface = new soundworks.TouchSurface(this.soundworksClient.view.$el);

  }

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
    this.soundworksClient.send('osc', '/nuSpy', ['orientation', data[0], data[1], data[2]] );
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
    this.soundworksClient.send('osc', '/nuSpy', ['acceleration', data[0], data[1], data[2]] );
  }

  energyCallback(data){
    // throttle
    let delta = Math.abs(this.throttle.energy - data);
    if( delta < this.throttle.energyThreshold ){ return }
    // save new throttle values
    this.throttle.energy = data;
    // send to OSC via server
    this.soundworksClient.send('osc', '/nuSpy', ['energy', data] );
  }

  touchStartCallback(id, normX, normY){
    // notify touch on
    this.soundworksClient.send('osc', '/nuSpy', ['touchOn', 1] );
    // common touch callback
    this.touchCommonCallback(id, normX, normY);      
  }

  touchMoveCallback(id, normX, normY){
    // common touch callback
    this.touchCommonCallback(id, normX, normY);
  }

  touchEndCallback(id, normX, normY){
    // notify touch off
    this.soundworksClient.send('osc', '/nuSpy', ['touchOn', 0] );
    // common touch callback
    this.touchCommonCallback(id, normX, normY);      
  }  

  touchCommonCallback(id, normX, normY){
    // send touch pos
    this.soundworksClient.send('osc', '/nuSpy', ['touchPos', id, normX, normY]);
  }

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
    if (!this.soundworksClient.motionInput.isAvailable('deviceorientation')){ return; }
    // enable if not already enabled
    if( onOff && !this.callBackStatus.ori ){
      this.soundworksClient.motionInput.addListener('deviceorientation', this.orientationCallback);
      this.callBackStatus.ori = true;
    }
    // disable if not already disabled
    if( !onOff && this.callBackStatus.ori ){
      this.soundworksClient.motionInput.removeListener('deviceorientation', this.orientationCallback);
      this.callBackStatus.ori = false;
    }
  }

  acceleration(onOff){
    // discard instruction if motionInput not available
    if (!this.soundworksClient.motionInput.isAvailable('accelerationIncludingGravity')){ return; }
    // enable if not already enabled
    if( onOff && !this.callBackStatus.acc ){
      this.soundworksClient.motionInput.addListener('accelerationIncludingGravity', this.accelerationCallback);
      this.callBackStatus.acc = true;
    }
    // disable if not already disabled
    if( !onOff && this.callBackStatus.acc ){
      this.soundworksClient.motionInput.removeListener('accelerationIncludingGravity', this.accelerationCallback);
      this.callBackStatus.acc = false;
    }
  }

  energy(onOff){
    // discard instruction if motionInput not available
    if (!this.soundworksClient.motionInput.isAvailable('energy')){ return; }
    // enable if not already enabled
    if( onOff && !this.callBackStatus.energy ){
      this.soundworksClient.motionInput.addListener('energy', this.energyCallback);
      this.callBackStatus.energy = true;
    }
    // disable if not already disabled
    if( !onOff && this.callBackStatus.energy ){
      this.soundworksClient.motionInput.removeListener('energy', this.energyCallback);
      this.callBackStatus.energy = false;
    }
  }

}