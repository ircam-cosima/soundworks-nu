/**
 * NuLoop: Nu module sequencer-like (drum machine)
 **/

import NuBaseModule from './NuBaseModule'

export default class NuLoop extends NuBaseModule {
  constructor(serverExperience) {
    super(serverExperience, 'nuLoop', true);

    // local attributes
    this.params = { period: 2.0,
                    divisions: 16, 
                    jitter: 0.0,
                    jitterMemory: false,
                    masterGain: 1.0
                  };

  }

  reset(){
    // re-route to clients
    this.e.broadcast( 'player', null, this.moduleName, ['reset'] );
  }  

}