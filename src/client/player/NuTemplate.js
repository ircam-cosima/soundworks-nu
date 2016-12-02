/**
 * NuTemplate: example of how to create a Nu module
 **/

import NuBaseModule from './NuBaseModule'
import * as soundworks from 'soundworks/client';

const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuTemplate extends NuBaseModule {
  constructor(soundworksClient) {
    super(soundworksClient, 'nuTemplate');

    // local attributes
    this.params = {'gain': 1.0, 'fileId': 0};

    // binding
    this.aMethodTriggeredFromOsc = this.aMethodTriggeredFromOsc.bind(this);
    this.aMethodTriggeredFromServer = this.aMethodTriggeredFromServer.bind(this);

    // setup receive callbacks
    this.soundworksClient.receive('nuTemplateInternal_aMethodTriggeredFromServer', this.aMethodTriggeredFromServer);
  }

  aMethodTriggeredFromOsc(args){
    console.log('aMethodTriggeredFromOsc', args);
  }

  aMethodTriggeredFromServer(args){
    console.log('aMethodTriggeredFromServer, e.g. play a sound at synchronized time:', args);
    this.soundworksClient.renderer.blink([0, 160, 200], 0.4);
  }

}