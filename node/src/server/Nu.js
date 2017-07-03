/**
 * Nu: Simple wrapper to export all Nu modules
 **/

export { default as Display } from './NuDisplay';
export { default as Output } from './NuOutput';
export { default as Groups } from './NuGroups';
export { default as RoomReverb } from './NuRoomReverb';
export { default as Path } from './NuPath';
export { default as Loop } from './NuLoop';
export { default as Template } from './NuTemplate';
export { default as Grain } from './NuGrain';
export { default as Probe } from './NuProbe';
export { default as Synth } from './NuSynth';
export { default as Stream } from './NuStream';

// ------------------------------------------------------------
// UTILS
// ------------------------------------------------------------

// convert "stringified numbers" (e.g. '10.100') element of arayIn to Numbers
Array.prototype.numberify = function() {
	this.forEach( (elmt, index) => {
	if( !isNaN(elmt) ) 
    	this[index] = Number(this[index]);
    });
    return this;
};

// ------------------------------------------------------------
// NU MAIN
// ------------------------------------------------------------

import NuBaseModule from './NuBaseModule'

export default class NuMain extends NuBaseModule {
  constructor(soundworksClient) {
    super(soundworksClient, 'nuMain');

    setTimeout( () => { 
      // sync. clocks
      const clockInterval = 0.1; // refresh interval in seconds
      setInterval( () => { 
      	this.soundworksServer.osc.send('/nuMain/clock', this.soundworksServer.sync.getSyncTime()); 
      }, 1000 * clockInterval);
    }, 1000);

  }

  enterPlayer(client){
    // msg callback: receive client coordinates 
    // (could use local service, this way lets open for pos estimation in client in the future)
    this.soundworksServer.receive(client, 'coordinates', (xy) => {
      this.soundworksServer.coordinatesMap.set( client.index, xy );
      // update client pos in osc client
      this.soundworksServer.osc.send('/nuMain/playerPos', [client.index, xy[0], xy[1]] );
    });

    // direct forward of players message to OSC client
    this.soundworksServer.receive(client, 'osc', (header, args) => {
      // append client index to msg
      args.unshift(client.index);
      // forward to OSC
      this.soundworksServer.osc.send(header, args);
    });
  }

  exitPlayer(client){
  	// update local attributes
  	this.soundworksServer.coordinatesMap.delete( client.index );
	// update osc mapper
	this.soundworksServer.osc.send('/nuMain/playerRemoved', client.index );
  }

  /**
  * method triggered by OSC client upon connection, requiring an update on all 
  * the "knowledge" the server already gathered about the current experiment setup
  **/
  updateRequest(){
    // send back players position at osc client request
    this.soundworksServer.coordinatesMap.forEach((item, key)=>{
      this.soundworksServer.osc.send('/nuMain/playerPos', [key, item[0], item[1]] );
    });
  }

  // force all players to reload the current page
  reloadPlayers(){
    // re-route to clients
    this.soundworksServer.broadcast( 'player', null, 'nuMain', ['reload'] );    
  }

}