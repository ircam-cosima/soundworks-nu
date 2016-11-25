/**
 * Nu module, in charge of room reverb
 **/

import * as soundworks from 'soundworks/server';
const server = soundworks.server;

export default class NuGroups {
  constructor(soundworksServer) {

    // local attributes
    this.soundworksServer = soundworksServer;

    // general router towards internal functions when msg concerning the server (i.e. not player) is received
    this.soundworksServer.osc.receive('/server', (msg) => {

      // shape msg into array of arguments      
      let args = msg.split(' ');
      args.numberify();
      // check if msg concerns current Nu module
      if (args[0] !== 'nuGroups') return;
      else args.shift();

      // save local value in group map
      let attrName = args.shift();
      let groupId = args.shift();
      let value = args.shift();

      let group = this.getGroup( groupId );
      group[attrName] = value;
      
      console.log('rcv (nugroup):', attrName, value);

      // let functionName = args.shift();
      // this[functionName](args);
    });

    // binding
    // this.linkPlayerToGroup = this.linkPlayerToGroup.bind(this);
    this.getGroup = this.getGroup.bind(this);
    this.enterPlayer = this.enterPlayer.bind(this);

    // local attributes
    this.groupMap = new Map();

  }

  getGroup(groupId) {
    // get already existing group
    if (this.groupMap.has(groupId))
      return this.groupMap.get(groupId);

    // create new group
    let group = { time: 0, onOff: 0, volume: 1, loop: 1 };

    // store new group in local map
    this.groupMap.set(groupId, group);

    // return created group
    return group;
  }

  enterPlayer(client){
    // send to new client information regarding current groups parameters
    this.soundworksServer.send(client, 'nuGroupsInternal_groupMap', this.groupMap);
  }


}