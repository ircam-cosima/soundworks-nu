/**
 * NuTemplate: example of how to create a Nu module
 **/

import NuBaseModule from './NuBaseModule'

export default class NuTemplate extends NuBaseModule{
  constructor(serverExperience) {
    super(serverExperience, 'nuTemplate');

    // to be saved params to send to client when connects:
    this.params = { gain: 1.0, fileId: 0 };

    // binding
    this.giveGlobalInstruction = this.giveGlobalInstruction.bind(this);
  }

  // send a global timed instruction to all players from OSC client
  giveGlobalInstruction(args){
    let delay = args;
    let rdvTime = this.e.sync.getSyncTime() + delay;
    this.e.broadcast('player', null, 'nuTemplateInternal_aMethodTriggeredFromServer', rdvTime );
  }

}

