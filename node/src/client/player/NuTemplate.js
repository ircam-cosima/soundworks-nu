/**
 * NuTemplate: example of how to create a Nu module
 **/

import NuBaseModule from './NuBaseModule'
import * as soundworks from 'soundworks/client';

const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuTemplate extends NuBaseModule {
  constructor(playerExperience) {
    super(playerExperience, 'nuTemplate');

    // local attributes
    this.params = {'gain': 1.0, 'fileId': 0};

    // binding
    this.aMethodTriggeredFromOsc = this.aMethodTriggeredFromOsc.bind(this);
    this.aMethodTriggeredFromServer = this.aMethodTriggeredFromServer.bind(this);

    // setup receive callbacks
    this.e.receive('nuTemplateInternal_aMethodTriggeredFromServer', this.aMethodTriggeredFromServer);
  }

  // trigger event directly from OSC client
  aMethodTriggeredFromOsc(args){
    console.log('aMethodTriggeredFromOsc', args);
  }

  // re-routed event for sync. playback: server add a rdv time to msg sent by OSC client
  aMethodTriggeredFromServer(args){
    console.log('aMethodTriggeredFromServer, e.g. play a sound at synchronized time:', args);
    this.e.renderer.blink([0, 160, 200], 0.4);
  }

}