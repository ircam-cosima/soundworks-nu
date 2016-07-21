import { Experience } from 'soundworks/server';

// server-side 'player' experience.
export default class PlayerExperience extends Experience {
  constructor(clientType) {
    super(clientType);

    // services
    this.checkin = this.require('checkin');
    this.params = this.require('shared-params');
    this.sync = this.require('sync');

    // local attributes
    this.players = [];
  }

  start() {}

  enter(client) {
    super.enter(client);

    // find room for client in local list
    var emptyInd = this.findFirstEmpty(this.players);
    if (emptyInd < 0) emptyInd = this.players.length;
    this.players[emptyInd] = client.uuid;
    // define client beacon parameters
    var beaconInfo = { major: 0, minor: emptyInd };
    this.send(client, 'player:beaconSetup', beaconInfo);
    console.log('welcoming client:', emptyInd, this.players[emptyInd]);

    // msg callback
    this.receive(client, 'server:soundLaunch', (time) => {
      // get index in local list (used to identify launch beacon in clients)
      var elmtPos = this.players.map((x) => { return x; }).indexOf(client.uuid);
      this.broadcast('player', client, 'player:soundLaunched', elmtPos, time );
    });

  }

  exit(client) {
    super.exit(client);

    var elmtPos = this.players.map((x) => { return x; }).indexOf(client.uuid);
    console.log('removing client:', elmtPos, this.players[elmtPos]);
    // this.players.splice(elmtPos, 1);
    this.players[elmtPos] = null; // can't use splice, have to keep index consistent since it points to clients' beacon minor IDs.
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
}




