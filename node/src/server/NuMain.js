/**
 * NuMain: misc. config setup
 **/

import NuBaseModule from './NuBaseModule'

export default class NuMain extends NuBaseModule {
  constructor(serverExperience) {
    super(serverExperience, 'nuMain');

    setTimeout( () => { 
      // sync. clocks
      const clockInterval = 0.1; // refresh interval in seconds
      setInterval( () => { 
        this.e.osc.send('/nuMain/clock', this.e.sync.getSyncTime()); 
      }, 1000 * clockInterval);
    }, 1000);

  }

  enterPlayer(client){

    // direct forward of players message to OSC client
    this.e.receive(client, 'osc', (header, args) => {
      // append client index to msg
      args.unshift(client.index);
      // forward to OSC
      this.e.osc.send(header, args);
    });
  }

  exitPlayer(client){
    // update local attributes
    this.e.coordinatesMap.delete( client.index );
  // update osc mapper
  this.e.osc.send('/nuMain/playerRemoved', client.index );
  }

  /**
  * method triggered by OSC client upon connection, requiring an update on all 
  * the "knowledge" the server already gathered about the current experiment setup
  **/
  updateRequest(){
    // send back players position at osc client request
    this.e.coordinatesMap.forEach((item, key)=>{
      this.e.osc.send('/nuMain/playerPos', [key, item[0], item[1]] );
    });
  }

  // force all players to reload the current page
  reloadPlayers(){
    // re-route to clients
    this.e.broadcast( 'player', null, 'nuMain', ['reload'] );    
  }

}

