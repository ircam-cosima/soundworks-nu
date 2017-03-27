/**
 * NuSpy: get motion etc. info from given client in OSC
 **/

import NuBaseModule from './NuBaseModule'

export default class NuSpy extends NuBaseModule {
  constructor(soundworksServer) {
    super(soundworksServer, 'nuSpy', true);

    // to be saved params to send to client when connects:
    this.params = { 
      touch: false, 
      orientation: false, 
      acceleration: false, 
      energy: false 
    };
  }

}

