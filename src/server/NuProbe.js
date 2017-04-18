/**
 * NuProbe: get motion etc. info from given client in OSC
 **/

import NuBaseModule from './NuBaseModule'

export default class NuProbe extends NuBaseModule {
  constructor(soundworksServer) {
    super(soundworksServer, 'nuProbe', true);

    // to be saved params to send to client when connects:
    this.params = { 
      touch: false, 
      orientation: false, 
      acceleration: false, 
      energy: false 
    };
  }

}

