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
    this.params = {
      'gain': 1.0
    };

    // binding
    this.directToClientMethod = this.directToClientMethod.bind(this);
    this.methodTriggeredFromServer = this.methodTriggeredFromServer.bind(this);

    // setup receive callbacks
    this.e.receive('nuTemplate_methodTriggeredFromServer', this.methodTriggeredFromServer);
  }

  // trigger event directly from OSC client
  directToClientMethod(value){
    this.e.renderer.blink([0, this.params.gain * value, 0], 0.4);
    console.log('blinking now!');
  }

  // re-routed event for sync. playback: server add a rdv time to msg sent by OSC client
  methodTriggeredFromServer(rdvTime){
    // get rel time (sec) in which I must blink
    let timeRemaining = rdvTime - this.e.sync.getSyncTime();
    console.log('will blink in', timeRemaining, 'seconds');
    setTimeout( () => { this.e.renderer.blink([0, 160, 200], 0.4); }, timeRemaining * 1000 );
  }

}