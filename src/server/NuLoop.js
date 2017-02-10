/**
 * Nu module, in charge of room reverb
 **/

import NuBaseModule from './NuBaseModule'

export default class NuLoop extends NuBaseModule {
  constructor(soundworksServer) {
    super(soundworksServer, 'nuLoop', true);

    // local attributes
    this.params = { period: 4.0,
                    divisions: 4, 
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