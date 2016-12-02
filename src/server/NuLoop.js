/**
 * Nu module, in charge of room reverb
 **/

import NuBaseModule from './NuBaseModule'

export default class NuLoop extends NuBaseModule {
  constructor(soundworksServer) {
    super(soundworksServer, 'nuLoop');

    // local attributes
    this.params = { period: 4.0,
                    divisions: 4, 
                    jitter: 0.0,
                    jitterMemory: false,
                    masterGain: 1.0
                  };

  }

}