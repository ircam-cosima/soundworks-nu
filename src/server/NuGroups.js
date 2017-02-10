/**
 * NuGroup: Nu module to assign audio tracks to groups of players
 **/

import NuBaseModule from './NuBaseModule'

export default class NuGroups extends NuBaseModule {
  constructor(soundworksServer) {
    super(soundworksServer, 'nuGroups', true);

    // binding
    this.getGroup = this.getGroup.bind(this);
    this.enterPlayer = this.enterPlayer.bind(this);

    // local attributes
    this.groupMap = new Map();
  }

  // override default paramCallback from parent
  paramCallback2(msg){
    let name = msg[0];
    let playerId = msg[1];
    let args = msg.slice(2, msg.length);
    let msgStippedOfPlayerId = [name].concat(args);
    console.log('->', msgStippedOfPlayerId);
    // if player specific instruction
    if( playerId !== -1 ){
      let client = this.soundworksServer.playerMap.get( playerId );
      if( client === undefined ){ return; }
      this.soundworksServer.send( client, this.moduleName, msgStippedOfPlayerId );
    }
    // if instruction concerns all the players
    else{
      // broadcast msg
      this.soundworksServer.broadcast( 'player', null, this.moduleName, msgStippedOfPlayerId ); 
      // store value
      let groupId = args.shift();
      let value = args.shift();
      // get associated group
      let group = this.getGroup( groupId );
      // save values
      group[name] = value;
    }

    // console.log(name, args)
    // // only save global state (not player specific instructions)      
    // let playerId = args.shift();
    // if( playerId !== -1 ){ return; }
    // // get values
    // let groupId = args.shift();
    // let value = args.shift();
    // // get associated group
    // let group = this.getGroup( groupId );
    // // save values
    // group[name] = value;
    // console.log(group)
  }

  getGroup(groupId) {
    // get already existing group
    if (this.groupMap.has(groupId))
      return this.groupMap.get(groupId);
    // create new group
    let group = { time: 0, startTime: 0, onOff: 0, volume: 1, loop: 1 };
    // store new group in local map
    this.groupMap.set(groupId, group);
    // return created group
    return group;
  }

  enterPlayer(client){
    // send to new client information regarding current groups parameters
    this.groupMap.forEach( (group, groupId) => {
      Object.keys(group).forEach( (key) => {
        // -1 header here is to indicate msg is global (i.e. not player specific)
        // console.log('nuGroup', [key, -1, groupId, group[key]]);
        this.soundworksServer.send(client, 'nuGroups', [key, groupId, group[key]]);
      });          
    });    
  }


}