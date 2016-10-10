self.lastRunningCallbackOver = true;
self.beaconArrays = [];
self.beaconArraysFuture = [];
self.irTapsTable = [];
self.propagParams = {speed: 10, gain: 0.8, rxMinGain:0.3, minDepth:2, maxDepth:5};
self.currentMaxDepth = self.propagParams.minDepth;
self.stopRecursiveCalculation = false;

self.onmessage = function (event) {
    
    switch(event.data.cmd) {
        case 'reset':
            self.reset();
            break;        

        case 'run':
            self.run();
            break;

        case 'addToBeaconMap':
            let beaconMap = [];
            for (let i = 0; i < event.data.data.length; i++) {
                beaconMap[event.data.data[i][0]] = event.data.data[i][1];
            }
            self.beaconArraysFuture[event.data.index] = beaconMap;

            break;

        case 'removeFromBeaconMap':
            self.beaconArraysFuture[event.data.index] = undefined;
            break;

        case 'propagParam':
            self.propagParams[event.data.subcmd] = event.data.data;
            // to get effect as fast as possible: reset depth (but when depth concerned)
            if( (event.data.subcmd !== 'maxDepth') || ( (event.data.subcmd === 'maxDepth') && (event.data.data < self.currentMaxDepth) ) ){
                self.currentMaxDepth = self.propagParams.minDepth;
            }
            break;

        case 'close':
            self.close();
            break; 
    }
}

self.reset = function() {
    // self.lastRunningCallbackOver = true;
    self.stopRecursiveCalculation = true;
    self.currentMaxDepth = self.propagParams.minDepth;
    console.log('reset in worker');
}

self.run = function() {
    if( self.lastRunningCallbackOver ){
        self.runningCallback();
    }
}

self.runningCallback = function() {

    // hold
    self.lastRunningCallbackOver = false;
    
    // reset brutal stop before starting a new calculation
    if ( self.stopRecursiveCalculation )
        self.stopRecursiveCalculation = false;

    self.beaconArrays = self.beaconArraysFuture;

    self.irTapsTable = [];
    self.beaconArrays.forEach( (item, index) => {
        if( item !== undefined ){
            self.irTapsTable[index] = [];
        }
    });

    const emitterId = 0;

    const depth = 0; const emitTime = 0.0; const emitPower = 1.0;
    self.recursiveIrFill(emitterId, depth, emitTime, emitPower);

    if( self.irTapsTable.length > 0 ){ 
        postMessage( {type: 'ir', data: self.irTapsTable} );
    }

    // update max depth
    if( self.currentMaxDepth < self.propagParams.maxDepth){
        self.currentMaxDepth += 1;
        postMessage( {type: 'depth', data: self.currentMaxDepth} );
    }
    // if( self.irTapsTable[emitterId] !== undefined ) console.log('length of emitter IR table:', self.irTapsTable[emitterId].length);

    // release
    self.lastRunningCallbackOver = true;

}

self.recursiveIrFill = function(emitterId, depth, emitTime, emitPower){

  if( self.beaconArrays[emitterId] !== undefined ){

    self.beaconArrays[emitterId].forEach( (item, index) => {

        // if client's beacon map already registered in server's
        if( (self.irTapsTable[index] !== undefined) && ( !self.stopRecursiveCalculation ) ){

            let distFromEmitter = Math.max(item, 1.0);

            let time = emitTime + distFromEmitter / self.propagParams.speed;
            let gain = emitPower * Math.pow(self.propagParams.gain, distFromEmitter);

            self.irTapsTable[index].push(time, gain); // interleaved

            // recursive call
            let newDepth = depth + 1;

            if( (newDepth < self.currentMaxDepth) && (gain > self.propagParams.rxMinGain) ) {
              self.recursiveIrFill(index, newDepth, time, gain);
            }

        }

    });

  }
}