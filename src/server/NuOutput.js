/**
 * NuOutput: render output, either directly to audioContext.destination or 
 * to spatialization engine for debug sessions (i.e. to get a feel of the final 
 * result while players are emulated on server's laptop)
 **/

import NuBaseModule from './NuBaseModule'

export default class NuOutput extends NuBaseModule {
  constructor(soundworksServer) {
    super(soundworksServer, 'nuOutput');

    // to be saved params to send to client when connects:
    this.params = { 
      gain: 1.0, 
      enableSpat: false,
      ambiOrder: 3,
      enableRoom: false,
      userPos: [0, 0, 0], 
    };

  }

}

