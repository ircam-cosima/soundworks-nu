/**
 * NuRoomReverb: Nu module in charge of room reverb where players 
 * emit bursts when the acoustical wave passes them by
 **/

import NuBaseModule from './NuBaseModule'

export default class NuRoomReverb extends NuBaseModule {
  constructor(soundworksServer) {
    super(soundworksServer, 'nuRoomReverb');

    // local attributes
    this.propagation = new SimulatePropagation(this);
    // to be saved params to send to client when connects:
    this.params = { masterGain: 1.0, 
                    propagationSpeed: 1.0, 
                    propagationGain: 0.85, 
                    propagationRxMinGain: 0.3, 
                    audioFileId: 0, 
                    perc: 1, 
                    loop: true, 
                    accSlope: 0, 
                    timeBound: 0 };

    // bind
    this.updatePropagation = this.updatePropagation.bind(this);
    this.exitPlayer = this.exitPlayer.bind(this);
  }

  updatePropagation(){

    // get array of clients positions
    let posArray = [];
    let clientIdArray = [];
    this.soundworksServer.coordinatesMap.forEach( (pos, key) => {
      posArray.push( pos );
      clientIdArray.push( key );
    });

    this.soundworksServer.coordinatesMap.forEach( ( emitterPos, emitterId ) => {
      // consider each client as potential emitter
      this.propagation.computeSrcImg( emitterPos );
      // get IR associated for each potential receiver (each client)
      let data = this.propagation.getIrs( posArray );

      // format and send IR via dedicated websocket
      data.irsArray.forEach(( ir, receiverId) => {
        ir.unshift( data.timeMin ); // add time min
        ir.unshift( emitterId ); // add emitter id
        let msgArray = new Float32Array( ir );
        // console.log('send to client', receiverId, clientIdArray[ receiverId ], 'ir', ir);
        let receiverClient = this.soundworksServer.playerMap.get( receiverId );
        this.soundworksServer.rawSocket.send( receiverClient, 'nuRoomReverb', msgArray );
      });

    });
    // this.propagation.simulate([2,2], [[2, 2], [3, 2]]);
  }

  // trigger sound in room, expect args = [floatX, floatY]
  emitAtPos(args) {

    // convert arg in
    let emitPos = [args[0], args[1]];

    // discrete position for now: 
    // find player closest to emit pos to defined it as new emit pos
    let dist = Infinity;
    let emitterId = -1;
    this.soundworksServer.coordinatesMap.forEach((item, key) => {
      let distTmp = Math.sqrt(Math.pow(item[0] - emitPos[0], 2) + Math.pow(item[1] - emitPos[1], 2));
      // console.log(emitPos, item, distTmp, dist);
      if (distTmp < dist) {
        emitterId = key;
        dist = distTmp;
      }
    });
    // console.log('emitterId:', emitterId, 'dist', dist);

    // if found discrete emitter pos (i.e. player), broadcast msg to players to trigger propagation
    if (emitterId > -1) {
      let rdvTime = this.soundworksServer.sync.getSyncTime() + 2.0;
      this.soundworksServer.broadcast('player', null, 'nuRoomReverb', ['emitAtPos', emitterId, rdvTime] );
    }

  }

  absorption(args){
    let wallId = args[0];
    let absorptionValue = args[1];
    this.propagation.room.absorption[wallId] = absorptionValue;
    // console.log('abs:', this.propagation.room.absorption);
  }

  scatterAngle(args){
    let scatterAngle = args;
    this.propagation.room.scatterAngle = scatterAngle * (Math.PI / 180);
  }

  scatterAmpl(args){
    this.propagation.room.scatterAmpl =  args;
  }  

  roomCoord(args){
    let id = args[0]; // 0 is top left, 1 is bottom right
    this.propagation.room.coordsTopLeftBottomRight[id] = [ args[1], args[2] ];
  }  

}


// room walls numbering convention
//
//             1
//         _________
//        |         |
//        |         |
//      0 |         | 2
//        |         |
//        |_________|
//
//             3
// -------------------------------

class SimulatePropagation {
  constructor(parent) {

    this.room = {
      origin: [0, 0],
      // width: 1,
      // height: 1,
      coordsTopLeftBottomRight: [ [0, 0], [1, 1] ],
      absorption: [0, 0, 0, 0], // wall abs clockwise (in 0-1)
      scatterAmpl: 0.0,
      scatterAngle: Math.PI / 13.5
    };

    this.parent = parent;

    this.sourceImageArray = [];
  }

  getIrs(speakerPosArray) {

    // console.log(this.sourceImageArray);
    // console.log('output source image array:');
    // this.sourceImageArray.forEach((value, index) => {
    //  console.log(value.order, value.ampl, value.time, value.pos[0], value.pos[1], value.wallId);
    // });
    
    let propagationGain = this.parent.params.propagationGain;
    let propagationSpeed = this.parent.params.propagationSpeed;
    if( Math.abs(propagationSpeed) < 0.1 ) propagationSpeed = 0.1;
    let propagationRxMinGain = this.parent.params.propagationRxMinGain;

    // compute IR from sources images for all sensors (player)
    let irArray = [];
    let dist, time, gain, timeMin = 0;
    speakerPosArray.forEach((spkPos, index) => {
      irArray[index] = [];
      this.sourceImageArray.forEach((srcImg, index2) => {
        dist = Math.sqrt(Math.pow(srcImg.pos[0] - spkPos[0], 2) + Math.pow(srcImg.pos[1] - spkPos[1], 2));
        time = srcImg.time + ( dist / propagationSpeed );
        gain = srcImg.ampl * Math.pow( propagationGain, dist );
        if (gain >= propagationRxMinGain) {
          // push IR in array
          irArray[index].push(time, gain);
          // prepare handle neg speed
          if (time < timeMin) timeMin = time;
        }

      });
    });

    // return min time so that each client can apply global offset locally (for neg speed), 
    // and avoids to do a double loop here again
    return { timeMin: timeMin, irsArray: irArray };

  }

  computeSrcImg(emitterPos) {

    this.sourceImageArray = [];

    let propagationGain = this.parent.params.propagationGain;
    let propagationSpeed = this.parent.params.propagationSpeed;
    if( Math.abs(propagationSpeed) < 0.1 ) propagationSpeed = 0.1;
    let propagationRxMinGain = this.parent.params.propagationRxMinGain;

    // add emitter to source images
    this.sourceImageArray.push({ order: 0, ampl: 1, time: 0, pos: emitterPos, wallId: -1 });
    // console.log('emitter pos: ', emitterPos, 'room:', this.room.width, this.room.height);
    // create first 4 source images, corresponding with orthogonal point-wall rays
    let pos, dist, ampl, time, sourceImage, vectDir, vectDirScat, wallId;
    for (let i = 0; i < 4; i++) {
      if (i == 0) { // left
        pos = [ this.room.coordsTopLeftBottomRight[0][0], emitterPos[1]];
        dist = emitterPos[0] - pos[0];
      } else if (i == 1) { // up
        pos = [emitterPos[0], this.room.coordsTopLeftBottomRight[0][1] ];
        dist = emitterPos[1] - pos[1];
      } else if (i == 2) { // right
        pos = [ this.room.coordsTopLeftBottomRight[1][0], emitterPos[1]];
        dist = pos[0] - emitterPos[0];
      } else if (i == 3) { // down
        pos = [emitterPos[0], this.room.coordsTopLeftBottomRight[1][1]];
        dist = pos[1] - emitterPos[1];
      }

      ampl = Math.pow( propagationGain, dist );
      ampl *= (1.0 - this.room.absorption[i]);
      time = dist / propagationSpeed;

      // add sources image to array
      if( ampl >= propagationRxMinGain ) {
        sourceImage = { order: 1, ampl: ampl, time: time, pos: pos, wallId: i };
        this.sourceImageArray.push(sourceImage);
      }

      // start direct path (orthogonal)
      // ampl mod. added here and not before since scatterers are not added in the list themselves (see this as direct + scatterers at same pos)
      // this way the ampl. mod will still be taken into account for propagate function
      sourceImage = { order: 1, ampl: ampl * (1 - this.room.scatterAmpl), time: time, pos: pos, wallId: i }; // create anew to avoid reference issue
      vectDir = [emitterPos[0] - pos[0], emitterPos[1] - pos[1]];
      this.propagateFrom(sourceImage, vectDir);

      // start x2 scattered paths
      // 1st
      vectDirScat = [Math.cos(this.room.scatterAngle) * vectDir[0] + Math.sin(this.room.scatterAngle) * vectDir[1],
        Math.cos(this.room.scatterAngle) * vectDir[1] + Math.sin(this.room.scatterAngle) * vectDir[0]
      ];
      sourceImage = { order: 1, ampl: ampl * this.room.scatterAmpl * 0.5, time: time, pos: pos };
      this.propagateFrom(sourceImage, vectDirScat);
      // 2nd
      // axis-symetry
      if (i % 2 == 0) vectDirScat[1] *= -1;
      else vectDirScat[0] *= -1;
      this.propagateFrom(sourceImage, vectDirScat);
    }
  }

  propagateFrom(sourceImage, vectDir) {
    
    let propagationGain = this.parent.params.propagationGain;
    let propagationSpeed = this.parent.params.propagationSpeed;
    if( Math.abs(propagationSpeed) < 0.1 ) propagationSpeed = 0.1;
    let propagationRxMinGain = this.parent.params.propagationRxMinGain;

    // get next source image pos
    let hitResult = this.getIntersectionWithWall(sourceImage.pos, vectDir);
    let hitWallIndex = hitResult[0];

    if (hitWallIndex == -1) {
      console.log('WARNING: in SimulatePropagation, no hit wall, player may be outside room?');
    } else {
      let newPos = [hitResult[1], hitResult[2]];

      // compute new ampl. (with wall abs)
      let dist = Math.sqrt(Math.pow(newPos[0] - sourceImage.pos[0], 2) + Math.pow(newPos[1] - sourceImage.pos[1], 2));
      let newAmpl = sourceImage.ampl * Math.pow(propagationGain, dist) * (1.0 - this.room.absorption[hitWallIndex]);
      // console.log(dist, sourceImage.ampl, newAmpl, hitWallIndex);

      if (newAmpl >= propagationRxMinGain) {

        // add source image to list
        let newTime = sourceImage.time + dist / propagationSpeed;
        let newSourceImage = { order: sourceImage.order + 1, ampl: newAmpl, time: newTime, pos: newPos, wallId: hitWallIndex };
        this.sourceImageArray.push(newSourceImage);

        // get next vectDir 
        let newVectDir = [vectDir[0], vectDir[1]];

        // opposed walls: even sum, adjacent walls: odd sum: adapt symmetry accordingly
        if (hitWallIndex % 2 == 0) newVectDir[0] *= -1;
        else newVectDir[1] *= -1;

        // recursive call
        this.propagateFrom(newSourceImage, newVectDir);
      }
    }

  }

  // return single point of intersection with one of room's wall
  getIntersectionWithWall(vectPos, vectDir) {

    // get potential walls to hit and their junction, wall sorted left/right in output array
    let consideredWalls = [];
    let midCoord = [];
    if (vectDir[0] > 0) {
      consideredWalls.push(2);
      if (vectDir[1] > 0) {
        consideredWalls.push(3);
        midCoord = [ this.room.coordsTopLeftBottomRight[1][0], this.room.coordsTopLeftBottomRight[1][1]];
      } else {
        consideredWalls.unshift(1);
        midCoord = [ this.room.coordsTopLeftBottomRight[1][0], this.room.coordsTopLeftBottomRight[0][1]];
      }
    } else {
      consideredWalls.push(0);
      if (vectDir[1] > 0) {
        consideredWalls.unshift(3);
        midCoord = [this.room.coordsTopLeftBottomRight[0][0], this.room.coordsTopLeftBottomRight[1][1]];
      } else {
        consideredWalls.push(1);
        midCoord = [this.room.coordsTopLeftBottomRight[0][0], this.room.coordsTopLeftBottomRight[0][1]];
      }
    }


    // get wall hit and hit point
    let vectDirMid = [midCoord[0] - vectPos[0], midCoord[1] - vectPos[1]];
    let angle = Math.atan2(vectDirMid[1], vectDirMid[0]) - Math.atan2(vectDir[1], vectDir[0]);
    let hitWallId = -1;
    if ((angle < 0) && (angle > -Math.PI) || (angle > Math.PI)) hitWallId = consideredWalls[1]; // wall "right"
    else hitWallId = consideredWalls[0]; // wall "right" (or in-between)
    // console.log('potential walls:', consideredWalls, 'junction', midCoord, 'angle', angle);


    // console.log('hit wall:', hitWallId);
    let c = this.room.coordsTopLeftBottomRight;
    this.wallLines = [
      [
        [ c[0][0], c[0][1] ],
        [ c[0][0], c[1][1]]
      ], // left
      [
        [ c[0][0], c[0][1] ],
        [ c[1][0], c[0][1] ]
      ], // up
      [
        [ c[1][0], c[0][1]],
        [ c[1][0], c[1][1]]
      ], // right
      [
        [ c[0][0], c[1][1] ],
        [ c[1][0], c[1][1] ]
      ], // down
    ];

    // get hit point
    let result = this.line_intersect(this.wallLines[hitWallId][0][0], this.wallLines[hitWallId][0][1], this.wallLines[hitWallId][1][0], this.wallLines[hitWallId][1][1],
      vectPos[0], vectPos[1], vectPos[0] + vectDir[0], vectPos[1] + vectDir[1]);

    // console.log(result, vectPos, vectDir);
    // console.log(this.wallLines[hitWallId][0][0], this.wallLines[hitWallId][0][1], this.wallLines[hitWallId][1][0], this.wallLines[hitWallId][1][1]);
    if (result !== null) {
      return [hitWallId, result.x, result.y];
    } else {
      return [-1, null, null];
    }

  }

  line_intersect(x1, y1, x2, y2, x3, y3, x4, y4) {
    var ua, ub, denom = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1);
    if (denom == 0) {
      return null;
    }
    ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / denom;
    ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / denom;
    return {
      x: x1 + ua * (x2 - x1),
      y: y1 + ua * (y2 - y1),
      seg1: ua >= 0 && ua <= 1,
      seg2: ub >= 0 && ua <= 1
    };
  }


}