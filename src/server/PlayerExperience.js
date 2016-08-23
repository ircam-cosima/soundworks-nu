import { Experience } from 'soundworks/server';

// server-side 'player' experience.
export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    // services
    this.checkin = this.require('checkin');
    this.params = this.require('shared-params');
    this.sync = this.require('sync');

    // bind methods
    this.checkStateCallback = this.checkStateCallback.bind(this);
    this.reset = this.reset.bind(this);
    this.estimateSimulationTime = this.estimateSimulationTime.bind(this);

    // local attributes
    this.players = [];
    this.lastReceivedMsgTime = 0.0;
    this.numPlayerReady = 0;
    this.state = 0;
    // 0: initial state, quiet
    // 1: propagation, awaiting for nodes to finish sending messages
    // 2: computation: awaiting for nodes to finish local IR computation based on taps exchanged in state 1
    // 3: playing: awaiting for nodes to finish playing IR based buffers before restarting simulation

    this.debugCountTransmissions = 0;
  }

  start() {
    this.params.addParamListener('reset', () => { this.reset(); });
    this.params.addParamListener('replayLast', () => {
      // instruct nodes to start playing
      let startPlayingTime = this.sync.getSyncTime() + 1.0;
      this.broadcast('player', null, 'player:startPlayingDown', startPlayingTime);
    });

    // DEBUG: estimate simulation time based on parameters
    this.params.addParamListener('numPlayers', () => { this.estimateSimulationTime() });
    this.params.addParamListener('propagationGain', () => { this.estimateSimulationTime() });
    this.params.addParamListener('emitterGain', () => { this.estimateSimulationTime() });
    this.params.addParamListener('thresholdReceiveGain', () => { this.estimateSimulationTime() });
  }

  enter(client) {
    super.enter(client);

    // find room for client in local list
    var emptyInd = this.findFirstEmpty(this.players);
    if (emptyInd < 0) emptyInd = this.players.length;
    this.players[emptyInd] = client.uuid;
    this.params.update('numPlayers', this.getArrayLength(this.players) );

    // define client beacon parameters
    var beaconInfo = { major: 0, minor: emptyInd };
    this.send(client, 'player:beaconSetup', beaconInfo);
    console.log('welcoming client:', emptyInd, this.players[emptyInd]);

    // msg callback
    this.receive(client, 'player:emitUp', (time, gain) => {

      // update propagation finished check timer
      this.lastReceivedMsgTime = this.sync.getSyncTime();

      // setup state at first emit
      if (this.state == 0) {
        this.state = 1;
        this.checkStateCallbackInterval = setInterval(() => {
            this.checkStateCallback();
        }, 500);
      }

      // get index in local list (used to identify launch beacon in clients)
      var emitterBeaconMinorID = this.players.map((x) => { return x; }).indexOf(client.uuid);
      // broadcast to all clients but the one who sent it
      this.broadcast('player', client, 'player:emitDown', emitterBeaconMinorID, time, gain);
      // count number of exchanged packets
      this.debugCountTransmissions += 1;
    });

    // when all node finished to compute IR (and are ready to play)
    this.receive(client, 'player:computeIrUp', () => {
      this.numPlayerReady += 1;
      if( this.numPlayerReady == this.getArrayLength(this.players) ) {
        // reset counter
        this.numPlayerReady = 0;
        // change state
        this.state = 3;
        // instruct nodes to start playing
        let startPlayingTime = this.sync.getSyncTime() + 1.0;
        this.broadcast('player', null, 'player:startPlayingDown', startPlayingTime);
      }
    });

    // when all nodes finished playing: reset
    this.receive(client, 'player:startPlayingUp', () => {
      this.numPlayerReady += 1;
      if( this.numPlayerReady == this.getArrayLength(this.players) ) { this.reset(); }
    });

  }

  // when client disconnects
  exit(client) {
    super.exit(client);

    var elmtPos = this.players.map((x) => { return x; }).indexOf(client.uuid);
    console.log('removing client:', elmtPos, this.players[elmtPos]);
    // this.players.splice(elmtPos, 1);
    this.players[elmtPos] = null; // can't use splice, have to keep index consistent since it points to clients' beacon minor IDs.
    // update client count, a bit special here because this.player is used so that indices won't change even if client removed
    this.params.update('numPlayers', this.getArrayLength(this.players) );
  }

  // callback used to survey the end of propagation (msg exchange) phase,
  // i.e. when no cellphone re-emitted propagation msg for 'a while'
  checkStateCallback() {
    console.log(this.state, 'last message received:', Math.round( (this.sync.getSyncTime() - this.lastReceivedMsgTime) * 1e5)/1e5, 'sec ago, total trans packets:', this.debugCountTransmissions);
    // assume propagation over if no messages from nodes after .. secs
    if( (this.state == 1) && ( (this.sync.getSyncTime() - this.lastReceivedMsgTime) > 1) ) {
      // instruct nodes to compute local IR
      this.broadcast('player', null, 'player:computeIrDown');
      // change state
      this.state = 2;
      console.log('propagation over in', this.debugCountTransmissions, 'steps');
      // remove callback
      clearInterval(this.checkStateCallbackInterval);
    }

  }

  reset(){
    console.log('reset server');
    // reset
    this.numPlayerReady = 0;
    this.state = 0;
    this.lastReceivedMsgTime = 0.0;
    this.debugCountTransmissions = 0.0;
    // wipe callback (for when reset is calleb when server stuck in propagation stage)
    if (this.checkStateCallbackInterval) clearInterval(this.checkStateCallbackInterval);
  }

  findFirstEmpty(array) {
    var emptyInd = -1;
    for (var i = 0; i < array.length; i++) {
      if (array[i] == null) {
        emptyInd = i;
        break;
      }
    }
    return emptyInd;
  }

  getArrayLength(array){
    // special here because this.player is used so that indices won't change even if client removed
    var size = array.filter(function(value) { return value !== null }).length;
    return size;
  }

  estimateSimulationTime() {
    var numPlayers, propagationGain, emitterGain, thresholdReceiveGain, interDeviceDist;

    this.params._paramData.forEach( (param) => {
      if (param.name == 'numPlayers') numPlayers = param.value;
      if (param.name == 'propagationGain') propagationGain = param.value;
      if (param.name == 'emitterGain') emitterGain = param.value;
      if (param.name == 'thresholdReceiveGain') thresholdReceiveGain = param.value;
      if (param.name == 'interDeviceDist') interDeviceDist = param.value;
    });
    // console.log(numPlayers, propagationGain, emitterGain, thresholdReceiveGain);

    var gainTrans = Math.pow(propagationGain, interDeviceDist)

    var countTrans = 0;
    while (emitterGain > thresholdReceiveGain) {
      emitterGain *= gainTrans;
      countTrans += 1;
    }

    var delayServer = 0.7e-3; // sec (roughly calibrated)
    let numExchanges = Math.pow(numPlayers-1, countTrans);
    let timeExchange = numExchanges * delayServer;
    this.params.update('estimatedSimulationTime', timeExchange );
  }

}
