import * as soundworks from 'soundworks/server';

const server = soundworks.server;

// server-side 'player' experience.
export default class PlayerExperience extends soundworks.Experience {
  constructor(clientType) {
    super(clientType);

    // require services
    this.checkin = this.require('checkin');
    this.sharedConfig = this.require('shared-config');
    this.params = this.require('shared-params');
    this.sync = this.require('sync');

    // bind methods
    this.propagationWorkerOnMsg = this.propagationWorkerOnMsg.bind(this);
    this.enterPlayer = this.enterPlayer.bind(this);
    this.startWorker = this.startWorker.bind(this);
    this.stopWorker = this.stopWorker.bind(this);

    // local attributes
    this.playerMap = new Map();
    this.ackowledgedLastIrReceivedMap = new Map();
    this.wsMap = new Map();    
    this.wss = null;
  }

  start() {

    // setup worker (run method on separate thread)
    this.startWorker();

    // setup dedicated websocket server (to handle IR msg: avoid to flood main communication socket)
    var WebSocketServer = require('ws').Server
    let host = server.config.socketIO.url.split(":")[1].split("/")[2];
    this.wss = new WebSocketServer({port: 8080, host: host});
    this.wss.on('connection', (ws) => {
      // associate websocket to client index on connection for latter use
      ws.on('message', (message) => { this.wsMap.set( parseInt(message), ws ); });
    });

    // shared parameters binding
    this.params.addParamListener('propagationSpeed', (value) => this.propagationWorker.postMessage({ cmd: 'propagParam', subcmd: 'speed', data: value }) );
    this.params.addParamListener('propagationGain', (value) => this.propagationWorker.postMessage({ cmd: 'propagParam', subcmd: 'gain', data: value }) );
    this.params.addParamListener('thresholdReceiveGain', (value) => this.propagationWorker.postMessage({ cmd: 'propagParam', subcmd: 'rxMinGain', data: value }) );
    this.params.addParamListener('maxPropagationDepth', (value) => this.propagationWorker.postMessage({ cmd: 'propagParam', subcmd: 'maxDepth', data: value }) );
    this.params.addParamListener('reset', () => { this.stopWorker(); this.startWorker(); });
    this.params.addParamListener('reloadPlayers', () => { this.broadcast('player', null, 'reload'); });
    
  }

  enter(client) {
    super.enter(client);

    switch (client.type) {
      case 'player':
        this.enterPlayer(client);
        break;
    }
  }

  enterPlayer(client){

    // update local attributes
    this.playerMap.set( client.index, client );
    this.ackowledgedLastIrReceivedMap.set( client.index, true );
    this.params.update('numPlayers', this.playerMap.size);

    // update worker
    this.propagationWorker.postMessage({ cmd: 'reset' });

    // msg callback: add client beaconMap to worker's
    this.receive(client, 'beaconMap', (beaconMap) => {
      this.propagationWorker.postMessage({ cmd: 'addToBeaconMap', index: client.index, data: beaconMap });
    });

    // msg callback: forward 'play sound' instruction
    this.receive(client, 'playUp', (rdvTime) => {
      this.broadcast('player', null, 'playDown', rdvTime);
    });

    // msg callback: flag client as ready to receive new IR when it received at processed last one
    this.receive(client, 'ackIrReceived', () => {
      this.ackowledgedLastIrReceivedMap.set( client.index, true );
    });

  }

  exit(client) {
    super.exit(client);

    switch (client.type) {
      case 'player':
        // update local attributes
        this.playerMap.delete( client.index );
        this.ackowledgedLastIrReceivedMap.delete( client.index );
        this.params.update('numPlayers', this.playerMap.size);
        // update worker attributes
        this.propagationWorker.postMessage({ cmd: 'removeFromBeaconMap', index: client.index });
        break;
    }    
  }

  // -------------------------------------------------------------------------------------------
  // WORKER (PROPAGATION) RELATED METHODS
  // -------------------------------------------------------------------------------------------

  startWorker() {
    // init worker
    var Worker = require('webworker-threads').Worker;
    this.propagationWorker = new Worker('./server/propagationWorker.js');
    this.propagationWorker.onmessage = this.propagationWorkerOnMsg;
    this.propagationWorker.postMessage( { cmd: 'reset' } );
    
    // update worker param based on shared params (usefull after reset)
    const dataToUpdate = ['propagationSpeed', 'maxPropagationDepth', 'propagationGain', 'thresholdReceiveGain'];
    this.params._paramData.forEach( (value, index) => {
      if( dataToUpdate.indexOf(value.name) > -1 )
        this.params.update(value.name, value.value);
    });

    // set interval on estimate IRs callback
    this.workerIntervalHandle = setInterval(() => {
      if( this.propagationWorker !== undefined )
        this.propagationWorker.postMessage({ cmd: 'run' });
    }, 100);
  }

  stopWorker() {
    clearInterval( this.workerIntervalHandle );
    this.propagationWorker.postMessage = function() {}; // to avoid raising errors when calling postMessage once worker terminated
    this.propagationWorker.terminate();
  }

  // defines what to do with msg sent by worker thread. msg is IR table: send each client its associated IR
  propagationWorkerOnMsg (event) {
    if( event.data.type === 'ir' ){
      // loop over received IRs
      let irTapsTable = event.data.data;
      irTapsTable.forEach( (item, index) => {
      
        // avoid sending: 1) empty table, 2) to clients who did not receive or process the last IR
        if( (item !== null) && (item.length > 0) && this.ackowledgedLastIrReceivedMap.get( index ) ){
          this.ackowledgedLastIrReceivedMap.set( index, false ); // flag client as busy from now

          // format and send IR via dedicated websocket
          let msgArray = new Float32Array(item);
          let ws = this.wsMap.get( index );
          ws.send( msgArray.buffer, { binary: true, mask: false } );
        }
      });
    }
    else if ( event.data.type === 'depth' ){
      this.params.update('currentPropagationDepth', event.data.data);
    }
  }

}
