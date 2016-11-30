/**
 * NuTemplate: example of how to create a Nu module
 **/

import * as soundworks from 'soundworks/server';
const server = soundworks.server;

export default class NuRenderer {
  constructor(soundworksServer) {

    // local attributes
    this.soundworksServer = soundworksServer;

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

    // general router towards internal functions when msg concerning the server (i.e. not player) is received
    this.soundworksServer.osc.receive('/server', (msg) => {
      // shape msg into array of arguments      
      let args = msg.split(' ');
      args.numberify();
      // check if msg concerns current Nu module
      if (args[0] !== 'nuRenderer'){ return; }
      // remove header
      args.shift();
      console.log('nuRenderer', args);
      // only save global state (not player specific instructions)      
      let playerId = args.shift();
      if( playerId !== -1 ) return;
      // call function associated with first arg in msg
      let name = args.shift();
      if( this.params[name] !== undefined )
        this.params[name] = (args.length == 1) ? args[0] : args; // parameter set
      else
        this[name](args); // function call
    });

    // binding
    this.enterPlayer = this.enterPlayer.bind(this);
  }

  enterPlayer(client){
    // send to new client information regarding current groups parameters
    Object.keys(this.params).forEach( (key) => {
      // -1 header here is to indicate msg is global (i.e. not player specific)
      this.soundworksServer.send(client, 'nuRenderer', [-1, key, this.params[key]]);
    });    
  }

}

