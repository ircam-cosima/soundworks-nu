/**
 * NuBaseModule: base class extended by all Nu modules
 **/

export default class NuBaseModule {
  constructor(serverExperience, moduleName) {

    // local attributes
    this.e = serverExperience;
    this.moduleName = moduleName;

    // to be saved parameters to send to client when connects
    this.params = {};

    // binding
    this.enterPlayer = this.enterPlayer.bind(this);
    this.exitPlayer = this.exitPlayer.bind(this);
    this.paramCallback = this.paramCallback.bind(this); 

    // setup osx msg receive callback: format msg and apply this.paramCallback
    this.e.osc.receive( '/' + this.moduleName, (msgRaw) => {
      // shape msg into array of arguments      
      let msg = msgRaw.split(' ');
      msg.numberify();
      // pass msg to callback
      this.paramCallback( msg );
    });

  }

  /**
  * local equivalent of soundworks "enter" method
  * only applied for clients of type 'player'
  * init client's modules with all Nu parameters saved in server
  **/
  enterPlayer(client){
    // send to new client information regarding current groups parameters
    Object.keys(this.params).forEach( (key) => {
      this.e.send(client, this.moduleName, [key, this.params[key]] );
    });
  }

  /**
  * local equivalent of soundworks exit.
  * only applied for clients of type 'players'. No default behavior, 
  * module-specific override if need be.
  **/
  exitPlayer(client){}

  /**
  * callback that handles Nu msg from OSC client. Supposes that every msg 
  * received contains playerId, re-route to concerned player or to internal
  * params/function if playerId == -1 (all concerned)
  **/
  paramCallback(msg){
    // extract data
    let playerId = msg.shift(); // concerned player id
    let name = msg.shift(); // method / argument name
    
    // eventually convert remaining array to singleton
    let args = (msg.length == 1) ? msg[0] : msg;

    // call local dedicated method if defined
    if( this[name] !== undefined ){  
      this[name]( [playerId].concat(args) );
      return;
    }

    // if player specific instruction, send to player
    if( playerId !== -1 ){
      let client = this.e.playerMap.get( playerId );
      if( client === undefined ){ return; }
      this.e.send( client, this.moduleName, [name].concat(args) );
      return
    }
    
    // all players are concerned: broadcast and save local 
    // (to broadcast current config to newcomers)
    this.e.broadcast( 'player', null, this.moduleName, [name].concat(args) );
    // store value
    this.params[name] = args;
  }

}

