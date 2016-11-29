/**
 * NuTemplate: example of how to create a Nu module
 **/

import * as soundworks from 'soundworks/server';
const server = soundworks.server;

export default class NuGrain {
  constructor(soundworksServer) {

    // local attributes
    this.soundworksServer = soundworksServer;

    // to be saved params to send to client when connects:
    this.params = { gain: 1.0, audioFileId: 0, enable: 0, override: 1.0, energy: 0, randomVar: 1, engineParams: {} };

    // general router towards internal functions when msg concerning the server (i.e. not player) is received
    this.soundworksServer.osc.receive('/server', (msg) => {
      // shape msg into array of arguments      
      let args = msg.split(' ');
      args.numberify();
      // check if msg concerns current Nu module
      if (args[0] !== 'nuGrain'){ return; }
      // remove header
      args.shift();
      // call function associated with first arg in msg
      let name = args.shift();
      if( this.params[name] !== undefined )
        this.params[name] = (args.length == 1) ? args[0] : args; // parameter set
      else
        this[name](args); // function call
    });

    // binding
    this.enterPlayer = this.enterPlayer.bind(this);
    // this.giveGlobalInstruction = this.giveGlobalInstruction.bind(this);
  }

  enterPlayer(client){
    // send to new client information regarding current groups parameters
    Object.keys(this.params).forEach( (key) => {
      this.soundworksServer.send(client, 'nuGrain', [key, this.params[key]]);
    });    
  }

  // giveGlobalInstruction(args){
  //   let delay = args;
  //   let rdvTime = this.soundworksServer.sync.getSyncTime() + delay;
  //   this.soundworksServer.broadcast('player', null, 'nuTemplateInternal_aMethodTriggeredFromServer', rdvTime );
  // }

}

