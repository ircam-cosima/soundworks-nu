/**
 * NuBaseModule: base class of all Nu modules
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
      this.paramCallback(name, args);
    });

    // binding
    this.paramCallback = this.paramCallback.bind(this);
  }

  paramCallback(name, args){
    console.log(this.moduleName, name, args);
    // either route to internal function
    if( this[name] !== undefined )
      this[name](args);
    // or to this.params value
    else
      this.params[name] = args;
  }

}