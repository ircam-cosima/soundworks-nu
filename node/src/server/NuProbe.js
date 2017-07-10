/**
 * NuProbe: get motion etc. info from given client in OSC
 **/

import NuBaseModule from './NuBaseModule'

export default class NuProbe extends NuBaseModule {
  constructor(serverExperience) {
    super(serverExperience, 'nuProbe');

    // to be saved params to send to client when connects:
    this.params = { 
      touch: false, 
      orientation: false, 
      acceleration: false, 
      energy: false 
    };
  }

}

