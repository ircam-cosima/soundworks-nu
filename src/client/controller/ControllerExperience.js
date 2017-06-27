import * as soundworks from 'soundworks/client';

const audioContext = soundworks.audioContext;
const client = soundworks.client;

const viewTemplate = `
  <canvas id='main-canvas' class="background controller-background"></canvas>
  <div class="foreground">

    <div class="section-top flex-middle">
      <p class="huge"></p>
    </div>

    <div class="section-center flex-middle">
      <p class="big" ><%= checkinId %></p>
    </div>

    <div class="section-bottom flex-center">
      <p class="medium soft-blink"><%= subtitle %></p>
    </div>
    
  </div>
`;


/* Description:
...
*/

export default class PlayerExperience extends soundworks.Experience {
  constructor(assetsDomain) {
    super();

    // soundworks services
    this.motionInput = this.require('motion-input', {
      descriptors: ['accelerationIncludingGravity', 'deviceorientation', 'energy']
    });

    // binding
    this.touchGestureDetect = this.touchGestureDetect.bind(this);
    this.touchCallback = this.touchCallback.bind(this);

    // local attributes
    this.throttle = {
      'acc': [Infinity, Infinity, Infinity],
      'accThreshold': 2.5,
      'ori': [Infinity, Infinity, Infinity],
      'oriThreshold': 3,
      'energy': Infinity,
      'energyThreshold': 0.1,
      'touch': [Infinity, Infinity]
    };
    this.touchDataMap = new Map();

  }

  start() {
    super.start();

    // receive and display controller id
    this.receive('checkinId', (id) => {
      // initialize the view
      this.view = new soundworks.CanvasView(viewTemplate, { subtitle: `controller`, checkinId: id }, {}, {
        id: this.id,
        preservePixelRatio: true,
      });
      // start exp. once view showed
      this.show().then( this.startOnceViewShowed() );
    }); 

  }

  startOnceViewShowed() {

    // setup motion input listeners
    if (this.motionInput.isAvailable('accelerationIncludingGravity')) {
      this.motionInput.addListener('accelerationIncludingGravity', (data) => {
          // throttle
          let delta = Math.abs(this.throttle.acc[0] - data[0]) + 
                      Math.abs(this.throttle.acc[1] - data[1]) + 
                      Math.abs(this.throttle.acc[2] - data[2]);
          if( delta < this.throttle.accThreshold ){ return }
          // save new throttle values
          this.throttle.acc[0] = data[0];
          this.throttle.acc[1] = data[1];
          this.throttle.acc[2] = data[2];
          // send to OSC via server
          this.send('osc', '/nuController', ['acceleration', data[0], data[1], data[2]] );
      });
    }

    // setup motion input listeners
    if (this.motionInput.isAvailable('deviceorientation')) {
      this.motionInput.addListener('deviceorientation', (data) => {
          // throttle
          let delta = Math.abs(this.throttle.ori[0] - data[0]) + 
                      Math.abs(this.throttle.ori[1] - data[1]) + 
                      Math.abs(this.throttle.ori[2] - data[2]);
          if( delta < this.throttle.oriThreshold ){ return }
          // save new throttle values
          this.throttle.ori[0] = data[0];
          this.throttle.ori[1] = data[1];
          this.throttle.ori[2] = data[2];
          // send to OSC via server
          this.send('osc', '/nuController', ['orientation', data[0], data[1], data[2]] );
      });
    }

    // setup motion input listeners
    if (this.motionInput.isAvailable('energy')) {
      this.motionInput.addListener('energy', (data) => {
          // throttle
          let delta = Math.abs(this.throttle.energy - data);
          if( delta < this.throttle.energyThreshold ){ return }
          // save new throttle values
          this.throttle.energy = data;
          // send to OSC via server
          this.send('osc', '/nuController', ['energy', data] );
      });
    }


    // disable text selection, magnifier, and screen move on swipe on ios
    document.getElementsByTagName("body")[0].addEventListener("touchstart",
    function(e) { e.returnValue = false });
    
    const surface = new soundworks.TouchSurface(this.view.$el);

    // setup touch listeners
    surface.addListener('touchstart', (id, normX, normY) => {
      // notify touch on
      this.send('osc', '/nuController', ['touchOn', 1] );
      // reset touch memory
      this.touchDataMap.set(id, []);
      // general callback
      this.touchCallback(id, normX, normY);
    });

    surface.addListener('touchmove', (id, normX, normY) => {
      // general callback
      this.touchCallback(id, normX, normY);
    });

    surface.addListener('touchend', (id, normX, normY) => {
      // general callback
      this.touchCallback(id, normX, normY);
      // notify touch off
      this.send('osc', '/nuController', ['touchOn', 0] );
      // gesture detection
      this.touchGestureDetect(this.touchDataMap.get(id));
    });

  }

  touchCallback(id, normX, normY){
    // save touch data
    this.touchDataMap.get(id).push([audioContext.currentTime, normX, normY]);   
    // send touch pos
    this.send('osc', '/nuController', ['touchPos', id, normX, normY]);
  }

  touchGestureDetect(data) {
    let N = data.length - 1;
    let pathVect = [data[N][1] - data[0][1], data[N][2] - data[0][2]];
    let pathDuration = data[N][0] - data[0][0];

    // discard slow movements
    if (pathDuration > 2.0) return;

    // swipe up
    if (pathVect[1] > 0.4)
      this.send('osc', '/nuController', ['gesture', 'swipe', 0] );
    // swipe down
    if (pathVect[1] < -0.4)
      this.send('osc', '/nuController', ['gesture', 'swipe', 1] );
  }

}