/**
 * NuLoop: Nu module sequencer-like (drum machine)
 **/

import NuBaseModule from './NuBaseModule'

export default class NuLoop extends NuBaseModule {
  constructor(serverExperience) {
    super(serverExperience, 'nuLoop');

    // local attributes
    this.params = { period: 2.0,
                    divisions: 16, 
                    jitter: 0.0,
                    jitterMemory: false,
                    masterGain: 1.0
                  };

  }

}