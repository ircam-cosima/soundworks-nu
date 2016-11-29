/**
 * NuTemplate: example of how to create a Nu module
 **/

import * as soundworks from 'soundworks/client';
const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuTemplate {
  constructor(soundworksClient) {

    // local attributes
    this.soundworksClient = soundworksClient;
    this.params = {'gain': 1.0, 'fileId': 0};

    // binding
    this.aMethodTriggeredFromOsc = this.aMethodTriggeredFromOsc.bind(this);
    this.aMethodTriggeredFromServer = this.aMethodTriggeredFromServer.bind(this);

    // setup receive callbacks
    this.soundworksClient.receive('nuTemplate', (args) => {
      let name = args.shift();
      // reduce args array to singleton if only one element left
      args = (args.length == 1) ? args[0] : args;
      if( this.params[name] !== undefined )
        this.params[name] = args; // parameter set
      else
        this[name](args); // function call
    });

    // setup receive callbacks
    this.soundworksClient.receive('nuTemplateInternal_aMethodTriggeredFromServer', this.aMethodTriggeredFromServer);
  }


  aMethodTriggeredFromOsc(args){
    console.log('aMethodTriggeredFromOsc', args);
    if (args) this.soundworksClient.renderer.setBkgColor([190, 140, 50]);
    else this.soundworksClient.renderer.setBkgColor([0, 0, 0]);
  }

  aMethodTriggeredFromServer(args){
    console.log('aMethodTriggeredFromServer, e.g. play a sound at synchronized time:', args);
    this.soundworksClient.renderer.blink([0, 160, 200], 0.4);
  }

}