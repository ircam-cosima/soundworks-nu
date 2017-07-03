/**
 * NuTemplate: example of how to create a Nu module
 **/

import NuBaseModule from './NuBaseModule'

export default class NuTemplate extends NuBaseModule{
  constructor(soundworksServer) {
    super(soundworksServer, 'nuTemplate');

    // to be saved params to send to client when connects:
    this.params = { gain: 1.0, fileId: 0 };

    // binding
    this.giveGlobalInstruction = this.giveGlobalInstruction.bind(this);
  }

  // send a global timed instruction to all players from OSC client
  giveGlobalInstruction(args){
    let delay = args;
    let rdvTime = this.soundworksServer.sync.getSyncTime() + delay;
    this.soundworksServer.broadcast('player', null, 'nuTemplateInternal_aMethodTriggeredFromServer', rdvTime );
  }

}

