/**
 * Nu module, in charge of room reverb
 **/

import RawSocketStreamer from './RawSocketStreamer';

import * as soundworks from 'soundworks/server';
const server = soundworks.server;

export default class NuPath {
  constructor(soundworksServer) {

    // local attributes
    this.soundworksServer = soundworksServer;

    // to be saved params to send to client when connects:
    this.params = { masterGain: 1.0, 
                    propagationSpeed: 1.0, 
                    propagationGain: 0.9, 
                    propagationRxMinGain: 0.01, 
                    audioFileId: 0, 
                    perc: 1, 
                    loop: true, 
                    accSlope: 0, 
                    timeBound: 0 };

    // general router towards internal functions when msg concerning the server (i.e. not player) is received
    this.soundworksServer.osc.receive('/server', (msg) => {
      // shape msg into array of arguments      
      let args = msg.split(' ');
      args.numberify();
      // check if msg concerns current Nu module
      if (args[0] !== 'nuPath'){ return; }
      // remove header
      args.shift();
      console.log('nuPath', args);
      // call function associated with first arg in msg
      let name = args.shift();
      if( this.params[name] !== undefined )
        this.params[name] = (args.length == 1) ? args[0] : args; // parameter set
      else
        this[name](args); // function call
    });

    // init socket streamer
    this.rawSocketStreamer = new RawSocketStreamer(8081);

    // binding
    this.setPath = this.setPath.bind(this);
    this.startPath = this.startPath.bind(this);
    this.enterPlayer = this.enterPlayer.bind(this);
    this.exitPlayer = this.exitPlayer.bind(this);
  }

  enterPlayer(client){
    // send to new client information regarding current groups parameters
    this.soundworksServer.send(client, 'nuPathInternal_initParam', this.params);
  }

  exitPlayer(client){
    // close socket
    this.rawSocketStreamer.close( client.index );
  }

  setPath(args){

    let pathId = args.shift();
    console.log('computing ir of path', pathId);
    
    // shape args (from [x0 y0 t0 ... xN yN tN] to ...)
    let pathArray = [];
    for( let i = 0; i < args.length; i+=3){
      let time = args[i];
      let pos = [ args[i+1], args[i+2] ];
      pathArray.push( [time, pos] );
    }
    console.log('path array:', pathArray);
    
    // avoid zero propagation speed
    let propagationSpeed = this.params.propagationSpeed;
    if( Math.abs(propagationSpeed) < 0.1 ) propagationSpeed = 0.1;

    // create IR for each player
    let dist, time, gain, timeMin = 0;
    let irsArray = [];
    this.soundworksServer.coordinatesMap.forEach(( clientPos, clientId) => {
      // init
      irsArray[clientId] = [];
      gain = 1.0;

      // loop over path
      pathArray.forEach(( item, index ) => {
        let pathTime = item[0];
        let pathPos = item[1];
        // compute IR taps
        dist = Math.sqrt(Math.pow(clientPos[0] - pathPos[0], 2) + Math.pow(clientPos[1] - pathPos[1], 2));
        time = pathTime + ( dist / propagationSpeed );
        // gain *= Math.pow( this.params.propagationGain, dist );
        gain = Math.pow( this.params.propagationGain, dist ); 
        // the gain doesn't decrease along the path, rather it decreases as the player
        // got further away from current path point
        // save tap if valid
        if (gain >= this.params.propagationRxMinGain) {
          // push IR in array
          irsArray[clientId].push(time, gain);
          // prepare handle neg speed
          if (time < timeMin) timeMin = time;
          console.log(index,pathTime,pathPos,dist,time,gain, this.params.propagationGain, this.params.propagationRxMinGain)
        }
      });
    });

    // send IRs (had to split in two (see above) because of timeMin)
    this.soundworksServer.coordinatesMap.forEach((clientPos, clientId) => {
      // get IR
      let ir = irsArray[clientId];
      // add init time offset (useful for negative speed)
      ir.unshift( timeMin ); // add time min
      ir.unshift( pathId ); // add path id
      // shape for sending
      let msgArray = new Float32Array( ir );
      console.log('send to client', clientId, 'ir', ir);
      // send
      this.rawSocketStreamer.send( clientId, msgArray.buffer );   
    });
  }

  startPath(args){
    let pathId = args;
    console.log('start path', pathId);
    let rdvTime = this.soundworksServer.sync.getSyncTime() + 2.0;
    this.soundworksServer.broadcast('player', null, 'nuPathInternal_startPath', pathId, rdvTime );
  }

}

