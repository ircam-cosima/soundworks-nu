import * as soundworks from 'soundworks/server';

import SimulatePropagation from './SimulatePropagation';

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
    // this.propagationWorkerOnMsg = this.propagationWorkerOnMsg.bind(this);
    this.enterPlayer = this.enterPlayer.bind(this);
    this.updatePropagation = this.updatePropagation.bind(this);
    this.initOsc = this.initOsc.bind(this);


    // this.startWorker = this.startWorker.bind(this);
    // this.stopWorker = this.stopWorker.bind(this);

    // local attributes
    this.playerMap = new Map();
    this.coordinatesMap = new Map();
    this.ackowledgedLastIrReceivedMap = new Map();
    this.wsMap = new Map();    
    this.wss = null;

    this.currentSoundId = 0;
  }

  start() {

    // setup and start worker (run method on separate thread)
    // this.startWorker();

    // setup dedicated websocket server (to handle IR msg: avoid to flood main communication socket)
    var WebSocketServer = require('ws').Server;
    let host = server.config.socketIO.url.split(":")[1].split("/")[2];
    this.wss = new WebSocketServer({port: 8080, host: host});
    this.wss.on('connection', (ws) => {
      // associate websocket to client index on connection for latter use
      ws.on('message', (message) => { this.wsMap.set( parseInt(message), ws ); });
    });

    // simulate propagation
    this.propagation = new SimulatePropagation();

    // shared parameters binding
    this.params.addParamListener('roomWidth', (value) => {  this.propagation.room.width = value; });
    this.params.addParamListener('roomHeight', (value) => { this.propagation.room.height = value; });
    this.params.addParamListener('scatterAmpl', (value) => { this.propagation.room.scatterAmpl = value; });
    this.params.addParamListener('scatterAngle', (value) => { this.propagation.room.scatterAngle = value * (Math.PI / 180); });
    this.params.addParamListener('absorption0', (value) => { this.propagation.room.absorption[0] = value; });
    this.params.addParamListener('absorption1', (value) => { this.propagation.room.absorption[1] = value; });
    this.params.addParamListener('absorption2', (value) => { this.propagation.room.absorption[2] = value; });
    this.params.addParamListener('absorption3', (value) => { this.propagation.room.absorption[3] = value; });

    this.params.addParamListener('propagationSpeed', (value) => { this.propagation.propagParam.speed = value; });
    this.params.addParamListener('propagationGain', (value) => { this.propagation.propagParam.gain = value; });
    this.params.addParamListener('thresholdReceiveGain', (value) => { this.propagation.propagParam.rxMinGain = value; });
    this.params.addParamListener('updatePropagation', () => { this.updatePropagation(); });
    
    // this.params.addParamListener('propagationSpeed', (value) => this.propagationWorker.postMessage({ cmd: 'propagParam', subcmd: 'speed', data: value }) );
    // this.params.addParamListener('propagationGain', (value) => this.propagationWorker.postMessage({ cmd: 'propagParam', subcmd: 'gain', data: value }) );
    // this.params.addParamListener('thresholdReceiveGain', (value) => this.propagationWorker.postMessage({ cmd: 'propagParam', subcmd: 'rxMinGain', data: value }) );
    // this.params.addParamListener('maxPropagationDepth', (value) => this.propagationWorker.postMessage({ cmd: 'propagParam', subcmd: 'maxDepth', data: value }) );
    // this.params.addParamListener('reset', () => { this.stopWorker(); this.startWorker(); });
    // this.params.addParamListener('reloadPlayers', () => { this.broadcast('player', null, 'reload'); console.log('reload')});

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

      //   // msg callback: forward 'play sound' instruction
      //   this.receive(client, 'playUp', (emitterId, audioFileId) => {
      //     // send play msg to clients 
      //     let rdvTime = this.sync.getSyncTime() + 1.0;
      //     this.broadcast('player', null, 'playDown', emitterId, rdvTime, audioFileId);
      //     // console.log("play!!");
      //   });      
          
        break;        
    }
  }

  enterPlayer(client){

    // update local attributes
    this.playerMap.set( client.index, client );
    this.ackowledgedLastIrReceivedMap.set( client.index, true );
    this.params.update('numPlayers', this.playerMap.size);

    // update worker
    // this.propagationWorker.postMessage({ cmd: 'reset' });

    // msg callback: receive client coordinates (could use local service, this way lets open to auto pos estimation from client in the future)
    this.receive(client, 'coordinates', (xy) => {
      this.coordinatesMap.set( client.index, xy );
      // this.broadcast('mapper', null, 'mapper:playerCoordinates', {index: client.index, xy: xy} );
      
      // update client pos in osc client
      this.osc.send('/room/playerPos', [client.index, xy[0], xy[1]] );

      this.updatePropagation(); // here or after socket creation? need both..
    });

    // msg callback: add client beaconMap to worker's
    this.receive(client, 'beaconMap', (beaconMap) => {
      // this.propagationWorker.postMessage({ cmd: 'addToBeaconMap', index: client.index, data: beaconMap });
    });




    // // msg callback: forward 'play sound' instruction
    // this.receive(client, 'playUp', (emitterId, audioFileId) => {

    //   // // mode 1: rought: real-time, emitterPos is discareded for closest player pops which IR is already stored in devices
    //   // // get index player of player closest to emitterPos
    //   // let dist = Infinity, closestPlayerId = -1;
    //   // this.coordinatesMap.forEach( (item, key) => {
    //   //   let distTmp = Math.pow(item[0] - emitterPos[0], 2) + Math.pow(item[1] - emitterPos[1], 2);
    //   //   if( distTmp < dist ) {
    //   //     closestPlayerId = key;
    //   //     dist = distTmp;
    //   //   }
    //   // });

    //   // mode 2: based on direct emitterId

    //   // send play msg to clients 
    //   let rdvTime = this.sync.getSyncTime() + 1.0;
    //   console.log("play!!", audioFileId);
    //   this.broadcast('player', null, 'playDown', emitterId, rdvTime, audioFileId);

    // });

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
        this.coordinatesMap.delete( client.index );
        this.ackowledgedLastIrReceivedMap.delete( client.index );
        this.params.update('numPlayers', this.playerMap.size);

        // close socket
        if( this.wsMap.has( client.index ) ){
          this.wsMap.get( client.index ).close();
          this.wsMap.delete( client.index );
        }
        // update worker attributes
        // this.propagationWorker.postMessage({ cmd: 'removeFromBeaconMap', index: client.index });
        // update mapper
        this.broadcast('mapper', null, 'mapper:playerRemoved', client.index );
        // update osc mapper
        this.osc.send('/room/playerRemoved', client.index );
        break;
    }    
  }


  updatePropagation(){

    // get array of clients positions
    let posArray = [];
    let clientIdArray = [];
    this.coordinatesMap.forEach(( pos, key) => {
      posArray.push( pos );
      clientIdArray.push( key );
    });

    this.coordinatesMap.forEach(( emitterPos, emitterId) => {
      // consider each client as potential emitter
      this.propagation.computeSrcImg( emitterPos );
      // get IR associated for each potential receiver (each client)
      let data = this.propagation.getIrs( posArray );

      // format and send IR via dedicated websocket
      data.irsArray.forEach(( ir, receiverId) => {
        ir.unshift( data.timeMin ); // add time min
        ir.unshift( emitterId ); // add emitter id
        let msgArray = new Float32Array( ir );
        let ws = this.wsMap.get( clientIdArray[ receiverId ] );
        if( ws !== undefined ){ // if socket connected
          ws.send( msgArray.buffer, { binary: true, mask: false } );
        }
        // console.log(msgArray);
      });

    });
    // this.propagation.simulate([2,2], [[2, 2], [3, 2]]);
  }

  // -------------------------------------------------------------------------------------------
  // WORKER (PROPAGATION) RELATED METHODS
  // -------------------------------------------------------------------------------------------

  // startWorker() {
  //   // init worker
  //   var Worker = require('webworker-threads').Worker;
  //   // this.propagationWorker = new Worker('./server/propagationWorker.js');
  //   this.propagationWorker = new Worker('./server/propagationWorker.js');
  //   this.propagationWorker.onmessage = this.propagationWorkerOnMsg;
  //   this.propagationWorker.postMessage( { cmd: 'reset' } );
    
  //   // update worker param based on shared params (usefull after reset)
  //   const dataToUpdate = ['propagationSpeed', 'maxPropagationDepth', 'propagationGain', 'thresholdReceiveGain'];
  //   this.params._paramData.forEach( (value, index) => {
  //     if( dataToUpdate.indexOf(value.name) > -1 )
  //       this.params.update(value.name, value.value);
  //   });

  //   // set interval on estimate IRs callback
  //   this.workerIntervalHandle = setInterval(() => {
  //     if( this.propagationWorker !== undefined )
  //       this.propagationWorker.postMessage({ cmd: 'run' });
  //   }, 100);
  // }

  // stopWorker() {
  //   clearInterval( this.workerIntervalHandle );
  //   this.propagationWorker.postMessage = function() {}; // to avoid raising errors when calling postMessage once worker terminated
  //   this.propagationWorker.terminate();
  // }

  // defines what to do with msg sent by worker thread. msg is IR table: send each client its associated IR
  // propagationWorkerOnMsg (event) {
  //   if( event.data.type === 'ir' ){
  //     // loop over received IRs
  //     let irTapsTable = event.data.data;
  //     irTapsTable.forEach( (item, index) => {
      
  //       // avoid sending: 1) empty table, 2) to clients who did not receive or process the last IR
  //       if( (item !== null) && (item.length > 0) && this.ackowledgedLastIrReceivedMap.get( index ) ){
  //         this.ackowledgedLastIrReceivedMap.set( index, false ); // flag client as busy from now

  //         // format and send IR via dedicated websocket
  //         let msgArray = new Float32Array(item);
  //         let ws = this.wsMap.get( index );
  //         ws.send( msgArray.buffer, { binary: true, mask: false } );
  //       }
  //     });
  //   }
  //   else if ( event.data.type === 'depth' ){
  //     this.params.update('currentPropagationDepth', event.data.data);
  //   }
  // }


  // ------------------------------------------------------------------------------------------------
  // OSC Methods
  // ------------------------------------------------------------------------------------------------

  initOsc(){

    // emit sound at pos in room
    this.osc.receive('/room/emitPos', (values) => {
      console.log(values);

      let emitterPos = this.shapeOsc_NumberArray(values);

      // get closest beacon to define as emitter
      let dist = Infinity; let emitterId = -1;
      this.coordinatesMap.forEach((item, key) => {
        let distTmp = Math.sqrt( Math.pow(item[0] - emitterPos[0], 2) + Math.pow(item[1] - emitterPos[1], 2) );
        console.log(emitterPos, item, distTmp, dist);
        if( distTmp < dist ){
          emitterId = key;
          dist = distTmp;
        } 
      });
      console.log('emitterId:', emitterId, 'dist', dist);
      if( emitterId > -1 ){
        let rdvTime = this.sync.getSyncTime() + 1.0;
        this.broadcast('player', null, 'playDown', emitterId, rdvTime, this.currentSoundId);      
      }
    });    

    // send back players position at osc client request
    this.osc.receive('/room/posRequest', (values) => {
      this.coordinatesMap.forEach((item, key)=>{
        console.log(item);
        this.osc.send('/room/playerPos', [key, item[0], item[1]] );
      });
    });    

    // send back players position at osc client request
    this.osc.receive('/room/emitSoundId', (values) => {      
      this.currentSoundId = values;
    });

  }


  // convert string to array of numbers
  shapeOsc_NumberArray(msgIn) {
    let out = [];
    let stringArray = msgIn.split(' ');
    stringArray.forEach((item, index)=>{
      out.push(Number(item));
    });
    return out;
  }

}
