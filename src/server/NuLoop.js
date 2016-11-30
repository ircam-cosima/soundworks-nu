/**
 * Nu module, in charge of room reverb
 **/

import * as soundworks from 'soundworks/server';
const server = soundworks.server;

export default class NuLoop {
  constructor(soundworksServer) {

    // local attributes
    this.soundworksServer = soundworksServer;

    // binding
    this.enterPlayer = this.enterPlayer.bind(this);
    this.exitPlayer = this.exitPlayer.bind(this);

    // local attributes
    // parameters saved and sent to client when connects:
    this.params = { period: 4.0,
                    divisions: 4, 
                    jitter: 0.0,
                    jitterMemory: false,
                    masterGain: 1.0
                  };

    // general router towards internal functions when msg concerning the server (i.e. not player) is received
    this.soundworksServer.osc.receive('/server', (msg) => {
      // shape msg into array of arguments      
      let args = msg.split(' ');
      args.numberify();
      // check if msg concerns current Nu module
      if (args[0] !== 'nuLoop'){ return; }
      // remove nuLoop header
      args.shift();
      console.log('nuLoop', args);
      // set local parameter associated with msg
      let name = args.shift();
      this.params[name] = (args.length == 1) ? args[0] : args; // parameter set
    });

  }

  enterPlayer(client){
    // send to new client information regarding current groups parameters
    this.soundworksServer.send(client, 'nuLoopInternal_initParam', this.params);
  }

  exitPlayer(client){
  }  

}