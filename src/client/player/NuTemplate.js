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
  		console.log(args);
      let name = args.shift();
      if( this.params[name] !== undefined )
        this.params[name] = (args.length == 1) ? args[0] : args; // parameter set
      else
        this[name](args); // function call
    });

    // setup receive callbacks
    this.soundworksClient.receive('nuTemplateInternal_initParam', (params) => {
        // set all local parameters based on server's 
        // (for late arrivals, if OSC client alreay defined some earlier)
        Object.keys(params).forEach( (key) => {
          console.log('init local parameter:', key, 'to value:', params[key])
        	this.params[key] = params[key];
        });
    });

    // setup receive callbacks
    this.soundworksClient.receive('nuTemplateInternal_aMethodTriggeredFromServer', this.aMethodTriggeredFromServer);
  }


  aMethodTriggeredFromOsc(args){
    console.log('aMethodTriggeredFromOsc', args);
  }

  aMethodTriggeredFromServer(args){
    console.log('aMethodTriggeredFromServer, e.g. play a sound at synchronized time:', args);
  }

}