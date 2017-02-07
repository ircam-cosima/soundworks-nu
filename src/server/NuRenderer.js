/**
 * NuRenderer: visual feedback
 **/

import NuBaseModule from './NuBaseModule'

export default class NuRenderer extends NuBaseModule {
  constructor(soundworksServer) {
    super(soundworksServer, 'nuRenderer');

    // to be saved params to send to client when connects:
    this.params = {
      'feedbackGain': 1.0,
      'enableFeedback': true,
      'restColor': [0,0,0], 
      'activeColor': [255, 255, 255],
      'text1': 'clientId',
      'text2': ' ',
      'text3': 'in the forest at night',
    };

    // binding
    this.paramCallback = this.paramCallback.bind(this);
    this.enterPlayer = this.enterPlayer.bind(this);
  }

  paramCallback(name, args){
    // only save global state (not player specific instructions)      
    let playerId = args.shift();
    if( playerId !== -1 ){ return; }
    // reduce args array to singleton if only one element left
    args = (args.length == 1) ? args[0] : args;    
    // save value
    this.params[name] = args;
  }

  enterPlayer(client){
    // send to new client information regarding current groups parameters
    Object.keys(this.params).forEach( (key) => {
      // -1 header here is to indicate msg is global (i.e. not player specific)
      this.soundworksServer.send(client, 'nuRenderer', [key, -1, this.params[key]]);
    });    
  }

}

