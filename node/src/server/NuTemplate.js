/**
 * NuTemplate: example of how to create a Nu module
 **/

import NuBaseModule from './NuBaseModule'

export default class NuTemplate extends NuBaseModule{
  constructor(serverExperience) {
    super(serverExperience, 'nuTemplate');

    // to be saved params to send to client when connects:
    this.params = { gain: 1.0, fileId: 0 };

    // binding
    this.serverMethod = this.serverMethod.bind(this);
  }

  // send a global timed instruction to all players from OSC client
  serverMethod(args){
    console.log('--', args)
    // extract arguments
    let playerId = args[0];
    let delay = args[1];

    // define rdv time (sec) in which to blink synchronously
    let rdvTime = this.e.sync.getSyncTime() + delay;
    console.log(rdvTime, delay, this.e.sync.getSyncTime());
    
    // send to all a rdv time 
    if( playerId == -1 ){
      this.e.broadcast('player', null, 'nuTemplate_methodTriggeredFromServer', rdvTime );
      return;
    }
    
    // msg is player specific: get player from server map
    let client = this.e.playerMap.get( playerId );
    // discard if player not defined
    if( client === undefined ){ return; }
    // send player specific msg
    this.e.send(client, 'nuTemplate_methodTriggeredFromServer', rdvTime );
  }

}

