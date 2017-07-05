/**
 * NuBaseModule: base class extended by all Nu modules
 **/

import * as soundworks from 'soundworks/client';
const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuBaseModule {
  constructor(soundworksClient, moduleName) {

    // local attributes
    this.soundworksClient = soundworksClient;
    this.moduleName = moduleName;
    this.params = {};
    
    // setup receive callbacks
    this.soundworksClient.receive(this.moduleName, (args) => {
      // get header
      let name = args.shift();
      // convert singleton array if need be
      args = (args.length == 1) ? args[0] : args;
      // process msg
      this.paramCallback(name, args);
    });

    // notify module is ready to receive msg
    this.soundworksClient.send('moduleReady', this.moduleName);

    // binding
    this.paramCallback = this.paramCallback.bind(this);
  }

  /**
  * default callback applied to all incoming 'OSC' messages
  * (come from OSC at least, the protocol would however be web-socket 
  * since message pre-processed by soundworks server
  **/
  paramCallback(name, args){
    // either route to internal function
    if( this[name] !== undefined ){ this[name]( args ); }
    // or to this.params value
    else{ this.params[name] = args; }
  }

}