/**
 * NuBaseModule: base class extended by all Nu modules
 **/

export default class NuBaseModule {
  constructor(serverExperience, moduleName, requiresPlayerId = false) {

    // local attributes
    this.e = serverExperience;
    this.moduleName = moduleName;

    // to be saved parameters to send to client when connects:
    this.params = {};

    // binding
    this.enterPlayer = this.enterPlayer.bind(this);
    this.exitPlayer = this.exitPlayer.bind(this);
    if( requiresPlayerId ){ 
      this.paramCallback = this.paramCallbackWithPlayerId.bind(this); 
    }
    else{
      this.paramCallback = this.paramCallbackDefault.bind(this);
    }

    // general router towards internal functions
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
  * only applied for clients of type 'player'
  **/
  exitPlayer(client){}

  // callback that handles Nu messages from OSC client
  paramCallbackDefault(msg){
    // extract data
    let name = msg[0];
    let args = msg.slice(1, msg.length);
    // convert eventual remaining array to singleton
    args = (args.length == 1) ? args[0] : args;    
    // either call dedicated method
    if( this[name] !== undefined ){
      this[name](args);
    }
    // or save value to local and forward to players
    else{
      this.params[name] = args;
      this.e.broadcast( 'player', null, this.moduleName, msg );
    }
  }

  /**
  * callback that handles Nu msg from OSC client.
  * this second version supposes that every msg received contains 
  * playerId, and will re-route messages to the corresponding player
  **/
  paramCallbackWithPlayerId(msg){
    // extract data
    let name = msg[0];
    
    // call dedicated method if defined
    if( this[name] !== undefined ){  
      this[name]( msg.splice(1, 1) );
      return;
    }

    // extract player Id from msg
    let playerId = msg.splice(1, 1)[0]; 

    // if player specific instruction, send to player
    if( playerId !== -1 ){
      let client = this.e.playerMap.get( playerId );
      if( client === undefined ){ return; }
      this.e.send( client, this.moduleName, msg );
    }
    
    // else, broadcast and save local
    else{
      // broadcast message
      this.e.broadcast( 'player', null, this.moduleName, msg );
      
      // extract parameter value
      let args = msg.slice(1);
      // convert eventual remaining array to singleton
      args = (args.length == 1) ? args[0] : args;
      // store value
      this.params[name] = args;
    }
  }

}

