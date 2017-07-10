/**
 * NuPath: Nu module to move a sound through players topology, based on 
 * emission points. A path is composed of emission points coupled with 
 * emission time. Each point is used as a source image to produce a tap 
 * in player's IR.
 **/

import NuBaseModule from './NuBaseModule'

export default class NuPath extends NuBaseModule {
  constructor(serverExperience) {
    super(serverExperience, 'nuPath');

    // to be saved params to send to client when connects:
    this.params = { masterGain: 1.0, 
                    propagationSpeed: 100.0, 
                    propagationGain: 0.9, 
                    propagationRxMinGain: 0.01, 
                    audioFileId: "snap", 
                    perc: 1, 
                    loop: true, 
                    accSlope: 0, 
                    timeBound: 0 };
    
    // this variable is intern to server, no need to broadcast it to clients upon connection
    this._rdvDelay = 2.0;                    
    
    // binding
    this.setPath = this.setPath.bind(this);
    this.startPath = this.startPath.bind(this);
    this.rdvDelay = this.rdvDelay.bind(this);
  }

  setPath(args){
    args.shift(); // playerId, not used, here to keep uniform the module impl.
    // extract from arguments
    let pathId = args.shift();
    
    // shape args from [x0 y0 t0 ... xN yN tN] to [ [t0, [x0, y0]], [tN, [xN, yN]] ]
    let pathArray = [];
    for( let i = 0; i < args.length; i+=3){
      let time = args[i];
      let pos = [ args[i+1], args[i+2] ];
      pathArray.push( [time, pos] );
    }
    
    // avoid zero propagation speed
    let propagationSpeed = this.params.propagationSpeed;
    if( Math.abs(propagationSpeed) < 0.1 ) propagationSpeed = 0.1;

    // create IR for each player
    let dist, time, gain, timeMin = 0;
    let irsArray = [];
    this.e.coordinatesMap.forEach(( clientPos, clientId) => {
      
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
        // the gain doesn't decrease along the path, rather it decreases as the player
        // gets further away from current path point:
        gain = Math.pow( this.params.propagationGain, dist ); 
        // save tap if valid
        if (gain >= this.params.propagationRxMinGain) {
          // push IR in array
          irsArray[clientId].push(time, gain);
          // prepare handle neg speed
          if (time < timeMin) timeMin = time;
        }
      });
    });

    // send IRs (had to split in two (see above) because of timeMin)
    this.e.coordinatesMap.forEach((clientPos, clientId) => {
      // get IR
      let ir = irsArray[ clientId ];
      // add init time offset (useful for negative speed)
      ir.unshift( timeMin ); // add time min
      ir.unshift( pathId ); // add path id
      // shape for sending
      let msgArray = new Float32Array( ir );
      // send
      let client = this.e.playerMap.get( clientId );
      this.e.rawSocket.send( client, this.moduleName, msgArray );
    });
  }

  // trigger path rendering in clients
  startPath(args){
    args.shift(); // playerId, not used, here to keep uniform the module impl.
    let pathId = args.shift();
    // set rendez-vous time in 2 seconds from now.
    let rdvTime = this.e.sync.getSyncTime() + this._rdvDelay;
    this.e.broadcast('player', null, this.moduleName, ['startPath', pathId, rdvTime] );
  }

  // define delay before rdv time, in sec, from moment when play path msg is received
  // (for syync. play)
  rdvDelay(args){
    args.shift(); // playerId, not used, here to keep uniform the module impl.
    this._rdvDelay = args.shift();
  }

  // reset clients (stop all sounds)
  reset(){
    // re-route to clients
    this.e.broadcast( 'player', null, this.moduleName, ['reset'] );
  }

}

