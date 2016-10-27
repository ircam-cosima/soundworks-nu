export default class SimulatePropagation {
  constructor() {
  	
  	this.room = {
  		origin: [0,0], width: 1, height: 1, 
  		absorption: [0,0,0,0],  // wall abs clockwise (in 0-1)
  		scatterAmpl: 0.0,
  		scatterAngle: Math.PI / 13.5
  	};

  	this.propagParam = { speed: 0.3, gain: 0.9, rxMinGain: 0.1};

  	this.sourceImageArray = [];
	
  }

  getIrs( speakerPosArray ){
  	
  	// console.log(this.sourceImageArray);
  	// console.log('output source image array:');
  	// this.sourceImageArray.forEach((value, index) => {
  	// 	console.log(value.order, value.ampl, value.time, value.pos[0], value.pos[1], value.wallId);
  	// });

  	// compute IR from sources images for all sensors (player)
  	let irArray = [];
  	let dist, time, gain, timeMin = 0;
  	speakerPosArray.forEach((spkPos, index) => {
  		irArray[index] = [];
	  	this.sourceImageArray.forEach((srcImg, index2) => {
	  		dist = Math.sqrt( Math.pow( srcImg.pos[0] - spkPos[0], 2 ) + Math.pow( srcImg.pos[1] - spkPos[1], 2 ) );
	  		time = srcImg.time + ( dist / this.propagParam.speed );
	  		gain = srcImg.ampl * Math.pow(this.propagParam.gain, dist);
        if( gain >= this.propagParam.rxMinGain ){
          // push IR in array
          irArray[index].push(time, gain);
          // prepare handle neg speed
          if( time < timeMin ) timeMin = time;
        }

	  	});
  	});

  	// return min time so that each client can apply global offset locally (for neg speed), 
  	// and avoids to do a double loop here again
  	return {timeMin: timeMin, irsArray: irArray};

  }

  computeSrcImg( emitterPos ){  	

  	this.sourceImageArray = [];

  	// add emitter to source images
  	this.sourceImageArray.push( {order: 0, ampl: 1, time: 0, pos: emitterPos, wallId: -1} );
  	// console.log('emitter pos: ', emitterPos, 'room:', this.room.width, this.room.height);
  	// create first 4 source images, corresponding with orthogonal point-wall rays
  	let pos, dist, ampl, time, sourceImage, vectDir, vectDirScat, wallId;
  	for( let i = 0; i < 4; i++){
  		if( i == 0 ){ // left
			pos = [ 0, emitterPos[1] ];
			dist = emitterPos[0];
  		}
  		else if( i == 1 ){ // up
			pos = [ emitterPos[0], 0 ];
			dist = emitterPos[1];
  		}
  		else if( i == 2 ){ // right
			pos = [ this.room.width, emitterPos[1] ]; 
			dist = this.room.width - emitterPos[0];
  		}
  		else if( i == 3 ){ // down
			pos = [ emitterPos[0], this.room.height ]; 
			dist = this.room.height - emitterPos[1];
  		}

  		ampl = Math.pow(this.propagParam.gain, dist);
  		ampl *= ( 1.0 - this.room.absorption[i] );
  		time = dist / this.propagParam.speed;
  		
  		// add sources image to array
      if( ampl >= this.propagParam.rxMinGain ){
  		  sourceImage = {order: 1, ampl: ampl, time: time, pos: pos, wallId: i};
  		  this.sourceImageArray.push( sourceImage );
      }

  		// start direct path (orthogonal)
  		// ampl mod. added here and not before since scatterers are not added in the list themselves (see this as direct + scatterers at same pos)
  		// this way the ampl. mod will still be taken into account for propagate function
  		sourceImage = {order: 1, ampl: ampl * ( 1 - this.room.scatterAmpl ), time: time, pos: pos, wallId: i}; // create anew to avoid reference issue
  		vectDir = [ emitterPos[0] - pos[0], emitterPos[1] - pos[1] ];
  		this.propagateFrom( sourceImage, vectDir );
  		
  		// start x2 scattered paths
  		// 1st
  		vectDirScat = [ Math.cos( this.room.scatterAngle ) * vectDir[0] + Math.sin( this.room.scatterAngle ) * vectDir[1],
  					  	Math.cos( this.room.scatterAngle ) * vectDir[1] + Math.sin( this.room.scatterAngle ) * vectDir[0] ];
  		sourceImage = {order: 1, ampl: ampl * this.room.scatterAmpl * 0.5, time: time, pos: pos};
  		this.propagateFrom( sourceImage, vectDirScat );
  		// 2nd
  		// axis-symetry
  		if( i % 2 == 0 ) vectDirScat[1] *= -1;
  		else vectDirScat[0] *= -1;
  		this.propagateFrom( sourceImage, vectDirScat );
  	}
  }

  propagateFrom( sourceImage, vectDir ){
  	// console.log('');
  	// console.log('sourceImage:', sourceImage, 'vectDir:', vectDir);
  	// console.log('sourceImage:', sourceImage);

  	// get next source image pos
  	let hitResult = this.getIntersectionWithWall(sourceImage.pos, vectDir);
  	let hitWallIndex = hitResult[0];

  	if( hitWallIndex == -1 ){
  		console.log('WARNING: in SimulatePropagation, no hit wall, player may be outside room?');
  	}
  	else{
	  	let newPos = [ hitResult[1], hitResult[2] ];
	  	
	  	// compute new ampl. (with wall abs)
	  	let dist = Math.sqrt( Math.pow( newPos[0] - sourceImage.pos[0], 2 ) + Math.pow( newPos[1] - sourceImage.pos[1], 2 ) );
	  	let newAmpl = sourceImage.ampl * Math.pow(this.propagParam.gain, dist) * ( 1.0 - this.room.absorption[hitWallIndex] );
	  	// console.log(dist, sourceImage.ampl, newAmpl, hitWallIndex);
	  	
	  	if( newAmpl >= this.propagParam.rxMinGain ){

		  	// add source image to list
		  	let newTime = sourceImage.time + dist / this.propagParam.speed;
		  	let newSourceImage = {order: sourceImage.order + 1, ampl: newAmpl, time: newTime, pos: newPos, wallId: hitWallIndex};
			this.sourceImageArray.push( newSourceImage );
		  	
		  	// get next vectDir 
		  	let newVectDir = [ vectDir[0], vectDir[1] ];

		  	// opposed walls: even sum, adjacent walls: odd sum: adapt symmetry accordingly
		  	if( hitWallIndex % 2 == 0 ) newVectDir[0] *= -1;
		  	else newVectDir[1] *= -1;

		  	// recursive call
	  		this.propagateFrom( newSourceImage, newVectDir );
	  	}
	  }

  }

  // return single point of intersection with one of room's wall
  getIntersectionWithWall(vectPos, vectDir){

	// get potential walls to hit and their junction, wall sorted left/right in output array
	let consideredWalls = [];
	let midCoord = [];
	if( vectDir[0] > 0 ) {
		consideredWalls.push(2);
		if( vectDir[1] > 0 ) {
			consideredWalls.push(3);
			midCoord = [ this.room.width, this.room.height];
		}
		else{
			consideredWalls.unshift(1);
			midCoord = [ this.room.width, 0];
		}
	}
	else{
		consideredWalls.push(0);
		if( vectDir[1] > 0 ) {
			consideredWalls.unshift(3);
			midCoord = [ 0, this.room.height];
		}
		else{
			consideredWalls.push(1);
			midCoord = [ 0, 0];
		}	
	}


	// get wall hit and hit point
	let vectDirMid = [midCoord[0] - vectPos[0], midCoord[1] - vectPos[1] ];
	let angle = Math.atan2(vectDirMid[1], vectDirMid[0]) - Math.atan2(vectDir[1], vectDir[0]);
	let hitWallId = -1;
	if( (angle < 0) && (angle > - Math.PI) || (angle > Math.PI) ) hitWallId = consideredWalls[1]; // wall "right"
	else hitWallId = consideredWalls[0]; // wall "right" (or in-between)
	// console.log('potential walls:', consideredWalls, 'junction', midCoord, 'angle', angle);
		

	// console.log('hit wall:', hitWallId);

  	this.wallLines = [
  	[[0,0],[0,this.room.height]], // left
  	[[0,0],[this.room.width, 0]], // up
  	[[this.room.width,0],[this.room.width,this.room.height]], // right
  	[[0,this.room.height],[this.room.width,this.room.height]], // down
  	];  

	// get hit point
	let result = this.line_intersect(this.wallLines[hitWallId][0][0], this.wallLines[hitWallId][0][1], this.wallLines[hitWallId][1][0], this.wallLines[hitWallId][1][1], 
					vectPos[0], vectPos[1], vectPos[0] + vectDir[0], vectPos[1] + vectDir[1]);

	// console.log(result, vectPos, vectDir);
	// console.log(this.wallLines[hitWallId][0][0], this.wallLines[hitWallId][0][1], this.wallLines[hitWallId][1][0], this.wallLines[hitWallId][1][1]);
	if( result !== null ){
		return [hitWallId, result.x, result.y];
	}
	else{
		return [-1, null, null];
	}

  }

line_intersect(x1, y1, x2, y2, x3, y3, x4, y4){
    var ua, ub, denom = (y4 - y3)*(x2 - x1) - (x4 - x3)*(y2 - y1);
    if (denom == 0) {
        return null;
    }
    ua = ((x4 - x3)*(y1 - y3) - (y4 - y3)*(x1 - x3))/denom;
    ub = ((x2 - x1)*(y1 - y3) - (y2 - y1)*(x1 - x3))/denom;
    return {
        x: x1 + ua*(x2 - x1),
        y: y1 + ua*(y2 - y1),
        seg1: ua >= 0 && ua <= 1,
        seg2: ub >= 0 && ua <= 1
    };
}


}
