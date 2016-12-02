/**
 * NuStream: live audio stream from OSC client to players
 * NOT FUNCTIONAL YET
 **/

import * as soundworks from 'soundworks/server';
const server = soundworks.server;

import RawSocketStreamer from './RawSocketStreamer';

export default class NuStream {
  constructor(soundworksServer) {

    // local attributes
    this.soundworksServer = soundworksServer;

    // to be saved params to send to client when connects:
    this.params = { gain: 1.0 };

    // general router towards internal functions when msg concerning the server (i.e. not player) is received
    this.soundworksServer.osc.receive('/server', (msg) => {
      // shape msg into array of arguments      
      let args = msg.split(' ');
      args.numberify();
      // check if msg concerns current Nu module
      if (args[0] !== 'nuStream'){ return; }
      // remove header
      args.shift();
      console.log('nuStream', args);
      // call function associated with first arg in msg
      let name = args.shift();
      if( this.params[name] !== undefined )
        this.params[name] = (args.length == 1) ? args[0] : args; // parameter set
      else
        this[name](args); // function call
    });

    // binding
    this.enterPlayer = this.enterPlayer.bind(this);
    this.exitPlayer = this.exitPlayer.bind(this);

    // setup dedicated websocket server (to handle IR msg: avoid to flood main communication socket)
    this.rawSocketStreamer = new RawSocketStreamer(8082);

    // init OSC
    this.soundworksServer.osc.receive('/serverStream', (msg) => {
      console.log(msg);
    });

  }

  enterPlayer(client){
    // send to new client information regarding current groups parameters
    Object.keys(this.params).forEach( (key) => {
      this.soundworksServer.send(client, 'nuStream', [key, this.params[key]]);
    });    
  }

  exitPlayer(client){
  }

  // giveGlobalInstruction(args){
  //   let delay = args;
  //   let rdvTime = this.soundworksServer.sync.getSyncTime() + delay;
  //   this.soundworksServer.broadcast('player', null, 'nuTemplateInternal_aMethodTriggeredFromServer', rdvTime );
  // }

}

