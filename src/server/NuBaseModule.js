/**
 * NuBaseModule: base class of all Nu modules
 **/

export default class NuBaseModule {
  constructor(soundworksServer, moduleName) {

    // local attributes
    this.soundworksServer = soundworksServer;
    this.moduleName = moduleName;

    // to be saved params to send to client when connects:
    this.params = {};

    // general router towards internal functions when msg concerning the server (i.e. not player) is received
    this.soundworksServer.osc.receive('/server', (msg) => {
      // shape msg into array of arguments      
      let args = msg.split(' ');
      args.numberify();
      // get header
      let header = args.shift();
      // check if msg concerns current Nu module
      if (header !== this.moduleName){ return; }
      // get argument name
      let name = args.shift();
      // convert eventual remaining array to singleton
      args = (args.length == 1) ? args[0] : args;
      this.paramCallback(name, args);
    });

    // binding
    this.enterPlayer = this.enterPlayer.bind(this);
    this.exitPlayer = this.exitPlayer.bind(this);
    this.paramCallback = this.paramCallback.bind(this);
  }

  enterPlayer(client){
    // send to new client information regarding current groups parameters
    Object.keys(this.params).forEach( (key) => {
      this.soundworksServer.send(client, this.moduleName, [key, this.params[key]]);
    });    
  }

  exitPlayer(client){
  }

  paramCallback(name, args){
    // either call dedicated method
    if( this[name] !== undefined )
      this[name](args);
    // or set local param value
    else
      this.params[name] = args;
  }

}

