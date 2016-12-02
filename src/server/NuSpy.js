/**
 * NuSpy: get motion etc. info from given client in OSC
 **/

import NuBaseModule from './NuBaseModule'

export default class NuSpy extends NuBaseModule {
  constructor(soundworksServer) {
    super(soundworksServer, 'nuSpy');

    // to be saved params to send to client when connects:
    this.params = { 
      touch: false, 
      orientation: false, 
      acceleration: false, 
      energy: false 
    };

    // binding
    this.paramCallback = this.paramCallback.bind(this);
    this.enterPlayer = this.enterPlayer.bind(this); 
  }

  paramCallback(name, args){
    // only save global state (not player specific instructions)      
    let playerId = args.shift();
    if( playerId !== -1 ){ return; }
    // save value
    this.params[name] = args.shift();
  }

  enterPlayer(client){
    // send to new client information regarding current groups parameters
    Object.keys(this.params).forEach( (key) => {
      // -1 header here is to indicate msg is global (i.e. not player specific)
      this.soundworksServer.send(client, 'nuSpy', [key, -1, this.params[key]]);
    });    
  }

}

