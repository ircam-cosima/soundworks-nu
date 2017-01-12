/**
 * NuSynth: distributed synthetizer
 **/

import NuBaseModule from './NuBaseModule'

export default class NuSynth extends NuBaseModule {
  constructor(soundworksServer) {
    super(soundworksServer, 'nuSynth');

    // local attributes
    this.params = {
      volume: 1.0, 
      synthType: 'square',
      attackTime: 0.1,
      releaseTime: 0.1,
      periodicWave: [0, 0, 1, 0]
    };
  }

  // override default paramCallback from parent
  paramCallback(name, args){
    // only save global state (not player specific instructions)      
    let playerId = args.shift();
    if( playerId !== -1 ){ return; }
    // convert eventual remaining array to singleton
    args = (args.length == 1) ? args[0] : args;
    // store value
    this.params[name] = args;
  }

  enterPlayer(client){
    // send to new client information regarding current parameters
    Object.keys(this.params).forEach( (key) => {
      // -1 header here is to indicate msg is global (i.e. not player specific)
      this.soundworksServer.send(client, 'nuSynth', [key, -1, this.params[key]]);
    });
  }  

}