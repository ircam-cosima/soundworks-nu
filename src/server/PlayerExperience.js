import * as soundworks from 'soundworks/server';

import RawSocketStreamer from './RawSocketStreamer';
import NuRoomReverb from './NuRoomReverb';
import NuGroups from './NuGroups';
import NuPath from './NuPath';
import NuLoop from './NuLoop';

const server = soundworks.server;

// server-side 'player' experience.
export default class PlayerExperience extends soundworks.Experience {
  constructor(clientType) {
    super(clientType);

    // require services
    this.checkin = this.require('checkin');
    this.sharedConfig = this.require('shared-config');
    this.sharedConfig.share('setup', 'mapper'); // share `setup` entry to ... (crashes else)
    this.sharedConfig.share('setup', 'player'); // share `setup` entry to ... (crashes else)
    this.sharedConfig.share('socketIO', 'player'); // share `setup` entry to ... (crashes else)
    this.params = this.require('shared-params');
    this.sync = this.require('sync');
    this.osc = this.require('osc');

    // bind methods
    this.enterPlayer = this.enterPlayer.bind(this);
    this.initOsc = this.initOsc.bind(this);

    // local attributes
    this.playerMap = new Map();
    this.coordinatesMap = new Map();
  }

  start() {

    // setup dedicated websocket server (to handle IR msg: avoid to flood main communication socket)
    this.rawSocketStreamer = new RawSocketStreamer(8080);

    // init Nu modules
    this.nuRoomReverb = new NuRoomReverb(this);
    this.nuGroups = new NuGroups(this);
    this.nuPath = new NuPath(this);
    this.nuLoop = new NuLoop(this);

    // 
    this.initOsc();

  }

  enter(client) {
    super.enter(client);

    switch (client.type) {
      case 'player':
        this.enterPlayer(client);
        break;

      // case 'mapper':
      //   this.coordinatesMap.forEach( (item, key) => {
      //     this.broadcast('mapper', null, 'mapper:playerCoordinates', {index: key, xy: item} );
      //   });
      //   break;        
    }
  }

  enterPlayer(client){

    // update local attributes
    this.playerMap.set( client.index, client );
    this.params.update('numPlayers', this.playerMap.size);

    // update worker
    // this.propagationWorker.postMessage({ cmd: 'reset' });

    // init nu modules
    this.nuRoomReverb.enterPlayer(client);
    this.nuGroups.enterPlayer(client);
    this.nuPath.enterPlayer(client);
    this.nuLoop.enterPlayer(client);

    // msg callback: receive client coordinates (could use local service, this way lets open to auto pos estimation from client in the future)
    this.receive(client, 'coordinates', (xy) => {
      this.coordinatesMap.set( client.index, xy );
      // this.broadcast('mapper', null, 'mapper:playerCoordinates', {index: client.index, xy: xy} );
      
      // update client pos in osc client
      this.osc.send('/nuMain/playerPos', [client.index, xy[0], xy[1]] );

    });

    // msg callback: add client beaconMap to worker's
    this.receive(client, 'beaconMap', (beaconMap) => {
      // this.propagationWorker.postMessage({ cmd: 'addToBeaconMap', index: client.index, data: beaconMap });
    });
  }

  exit(client) {
    super.exit(client);

    switch (client.type) {
      case 'player':
        // update local attributes
        this.playerMap.delete( client.index );
        this.coordinatesMap.delete( client.index );
        this.params.update('numPlayers', this.playerMap.size);

        // close modules
        this.nuPath.exitPlayer(client);

        // close socket
        this.rawSocketStreamer.close( client.index );

        // update mapper
        this.broadcast('mapper', null, 'mapper:playerRemoved', client.index );
        // update osc mapper
        this.osc.send('/nuMain/playerRemoved', client.index );
        break;
    }    
  }


  // ------------------------------------------------------------------------------------------------
  // OSC Methods
  // ------------------------------------------------------------------------------------------------

  initOsc(){  

    // osc related binding
    this.updateRequest = this.updateRequest.bind(this);

    // general router towards internal functions when msg concerning the server (i.e. not player) is received
    this.osc.receive('/server', (msg) => {
      console.log(msg);
      // shape msg into array of arguments      
      let args = msg.split(' ');

      // check if msg concerns current Nu module
      if (args[0] !== 'nuMain') return;
      else args.shift();

      // call function associated with first arg in msg
      let functionName = args.shift();
      this[functionName](args);
    });  

    // automatically transfer player osc message 
    this.osc.receive('/player', (msg) => {
      let args = msg.split(' ');
      let moduleName = args.shift();
      this.broadcast('player', null, moduleName, args);
    });

    // send OSC client msg when server started 
    // (TOFIX: delayed in setTimeout for now because OSC not init at start.)
    setTimeout( () => { 
            // sync. clocks
      const clockInterval = 0.1; // refresh interval in seconds
      setInterval(() => { this.osc.send('/nuMain/clock', this.sync.getSyncTime()); }, 1000 * clockInterval);
    }, 1000);

  }

  updateRequest(){
    // send back players position at osc client request
    this.coordinatesMap.forEach((item, key)=>{
      this.osc.send('/nuMain/playerPos', [key, item[0], item[1]] );
    });
  }

}
