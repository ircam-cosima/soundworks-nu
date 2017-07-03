/**
 * NuLoop: Nu module sequencer-like (drum machine)
 **/

import NuBaseModule from './NuBaseModule'

export default class NuLoop extends NuBaseModule {
  constructor(soundworksServer) {
    super(soundworksServer, 'nuLoop', true);

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
    this.soundworksServer.broadcast( 'player', null, this.moduleName, ['reset'] );
  }  

}