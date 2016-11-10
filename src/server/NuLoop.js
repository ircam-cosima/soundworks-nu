/**
 * Nu module, in charge of room reverb
 **/

import * as soundworks from 'soundworks/server';
const server = soundworks.server;

export default class NuLoop {
  constructor(soundworksServer) {

    // local attributes
    this.soundworksServer = soundworksServer;

    // to be saved params to send to client when connects:
    this.params = { period: 4.0, 
                    divisions: 4, 
                    jitter: 0.0,
                    jitterMemory: false,
                  };

    // general router towards internal functions when msg concerning the server (i.e. not player) is received
    this.soundworksServer.osc.receive('/server', (msg) => {
      // shape msg into array of arguments      
      let args = msg.split(' ');
      // check if msg concerns current Nu module
      if (args[0] !== 'nuLoop') return;
      else args.shift();
      console.log('nuLoop', args);
      // call function associated with first arg in msg
      let name = args.shift();
      // if( name == 'startPath' || name == 'setPath' ) this[name](args); // function call
      // else this.params[name] = Number(args); // parameter set
      this.params[name] = Number(args); // parameter set
    });

    // binding
    this.enterPlayer = this.enterPlayer.bind(this);
    this.exitPlayer = this.exitPlayer.bind(this);

    // local attributes
    // this.groupMap = new Map();

  }

  enterPlayer(client){
    // send to new client information regarding current groups parameters
    this.soundworksServer.send(client, 'nuLoopInternal_initParam', this.params);
  }

  exitPlayer(client){
  }  

}