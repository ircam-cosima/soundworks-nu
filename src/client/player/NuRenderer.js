/**
 * NuRenderer: nu module in charge of visual feedback
 **/

import * as soundworks from 'soundworks/client';
const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuRenderer extends soundworks.Renderer {
  constructor(soundworksClient) {
    super(1/24); // update rate = 0: synchronize updates to frame rate

    // local attributes
    this.soundworksClient = soundworksClient;
    this.params = {
      'feedbackGain': 1.0,
      'enableFeedback': true
    };

    this.colors = {
      'rest': [0,0,0], 
      'active': [255, 255, 255], 
      'current': [0,0,0]
    };

    this.audioAnalyser = new AudioAnalyser();
    this.bkgChangeColor = false;
    this.numOfElmtInNeedOfMe = 0;

    // this.bkgColorArray = [0,0,0];
    this.blinkStatus = { isBlinking: false, savedBkgColor: [0,0,0] };

    // binding
    this.analyserCallback = this.analyserCallback.bind(this);

    // setup receive callbacks
    this.soundworksClient.receive('nuRenderer', (args) => {
      // get header
      let name = args.shift();
      // discard if msg does not concern current player
      let playerId = args.shift();
      if( playerId !== client.index && playerId !== -1 ) return;
      // reduce args array to singleton if only one element left
      args = (args.length == 1) ? args[0] : args;
      if( this.params[name] !== undefined )
        this.params[name] = args; // parameter set
      else
        this[name](args); // function call
    });

    // ATTEMPT AT CROSSMODULE POSTING: FUNCTIONAL BUT ORIGINAL USE NO LONGER CONSIDERED: TODELETE WHEN CONFIRMED
    // setup internal callback
    // console.log('setup event listener')
    // window.addEventListener("message", (event) => {
    //   console.log('received msg', event);
    //   if( event.origin !== location.origin || event.data[0] !== 'nuRenderer' )
    //     return;
    //   console.log(event.data[4]);
    //   this.restColor([255*event.data[4], 0, 0]);
    // }, false);
    // ----------
    
  }

  restColor(rgb){
    this.colors.rest = rgb;
    // update background only if analyser not active
    if( this.numOfElmtInNeedOfMe == 0 ){
      this.setCurrentColorAmpl(0);
      this.overrideForceRender = true;
    }
  }

  activeColor(rgb){
    this.colors.active = rgb;
  }  

  /**
   * Initialize rederer state.
   * @param {Number} dt - time since last update in seconds.
   */
  init() {}

  /**
   * Update rederer state.
   * @param {Number} dt - time since last update in seconds.
   */
  update(dt) {}

  /**
   * Draw into canvas.
   * Method is called by animation frame loop in current frame rate.
   * @param {CanvasRenderingContext2D} ctx - canvas 2D rendering context
   */
  render(ctx) {
    if ( this.bkgChangeColor && this.params.enableFeedback || this.overrideForceRender ) {
      // console.log(this.bkgColor);
      // ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = 'rgb('
        + Math.round(this.colors.current[0]) + ','
        + Math.round(this.colors.current[1]) + ','
        + Math.round(this.colors.current[2]) + ')';
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
      this.overrideForceRender = false;
      this.bkgChangeColor = false
    }
  }



  // requestAnimationFrame(draw);    /// use rAF here


  enable(){
    this.numOfElmtInNeedOfMe += 1;
    // if need to be triggered on for the first time:
    if( this.numOfElmtInNeedOfMe == 1 )
      requestAnimationFrame(this.analyserCallback);
  }

  disable(){
    // decrement status
    this.numOfElmtInNeedOfMe = Math.max(this.numOfElmtInNeedOfMe-1, 0);
    // reset background color
    if( this.numOfElmtInNeedOfMe == 0 )
      this.bkgChangeColor = true;
  }

  /*
   * Change GUI background color based on current amplitude of sound being played
   */
  analyserCallback() {
    if( this.numOfElmtInNeedOfMe >= 1 || !this.blinkStatus.isBlinking ) {
      // call me once, I'll call myself over and over
      requestAnimationFrame(this.analyserCallback);
      // change background color based on current amplitude
      let amp = this.audioAnalyser.getAmplitude();
      amp *= this.params.feedbackGain;
      this.setCurrentColorAmpl(amp);
      // notify to change color at next animation frame
      this.bkgChangeColor = true;
    }
  }

  setCurrentColorAmpl(amp){
    for (let i = 0; i < this.colors.current.length; i++) {
      this.colors.current[i] = this.colors.rest[i]  + 
                               amp * ( this.colors.active[i] - this.colors.rest[i] );
    }    
  }

  // change screen color to 'color' for 'time' duration (in sec)
  blink(color, time = 0.4){
    // discard if already blinking
    if( this.blinkStatus.isBlinking ){ return; }
    this.blinkStatus.isBlinking = true;
    // save current background color
    for (let i = 0; i < 3; i++)
      this.blinkStatus.savedBkgColor[i] = this.colors.current[i];
    // change bkg color
    this.colors.current = color;
    this.bkgChangeColor = true;
    setTimeout(() => { 
      for (let i = 0; i < 3; i++)
        this.colors.current[i] = this.blinkStatus.savedBkgColor[i];
      this.blinkStatus.isBlinking = false
      this.bkgChangeColor = true;
    }, time * 1000);
  }

  /**
   * Tell render to change background color at next update.
   * @param {Number} colorId - color index in this.bkgColorList
   */
  // setBkgColor(rgb) {
  //   this.bkgColorArray = rgb;
  //   this.bkgColor = 'rgb('
  //     + Math.round(rgb[0]) + ','
  //     + Math.round(rgb[1]) + ','
  //     + Math.round(rgb[2]) + ')';
  //   this.bkgChangeColor = true;
  // }

  text1(args){
    let str = this.formatText(args);
    document.getElementById('text1').innerHTML = str;
  }

  text2(args){
    let str = this.formatText(args);
    document.getElementById('text2').innerHTML = str;
  }

  text3(args){
    let str = this.formatText(args);
    document.getElementById('text3').innerHTML = str;
  }

  formatText(args){
    // from array of elmt to string
    let str = '';
    // simple string
    if( typeof args === 'string' )
      str = args;
    // array of strings
    else
      args.forEach( (elmt) => { str += ' ' + elmt;  });
    // replace "cliendId" with actual client index
    str = str.replace("clientId", client.index);
    str = str.replace("None", '');
    // return formatted string
    return str;
  }

  minDb(value){
    if( value > -100 && value < 0 && value < this.audioAnalyser.in.maxDecibels )
      this.audioAnalyser.in.minDecibels = value;
  }

  maxDb(value){
    if( value > -100 && value < 0 && value < this.audioAnalyser.in.minDecibels )
      this.audioAnalyser.in.maxDecibels = value;
  }

  smoothingTimeConstant(value){
    if( value >= 0 && value <= 1 )
      this.audioAnalyser.in.smoothingTimeConstant = value;
  }

  minFreq(value){
    if( value > 0 && value < this.audioAnalyser.maxFreq ){
      this.audioAnalyser.minFreq = value;
      this.audioAnalyser.updateBinNorm();
    }
  }

  maxFreq(value){
    if( value < 20000 && value > this.audioAnalyser.minFreq ){
      this.audioAnalyser.maxFreq = value;
      this.audioAnalyser.updateBinNorm();
    }
  }

}

/**
 * Audio analyser for visual feedback of sound amplitude on screen
 */

class AudioAnalyser {
  constructor() {
    // input node
    this.in = audioContext.createAnalyser();
    this.in.smoothingTimeConstant = 0.2;
    this.in.fftSize = 32;
    // compression
    this.in.minDecibels = -100;
    this.in.maxDecibels = -50;
    // limit analyser spectrum
    this.minFreq = 200; // in Hz
    this.maxFreq = 8000; // in Hz
    this.updateBinNorm();
    // pre-allocation of freqs ampl. array
    this.magnitudes = new Uint8Array(this.in.frequencyBinCount);
  }

  updateBinNorm(){
    let norm = this.in.fftSize / audioContext.sampleRate;
    this.minBin = Math.round(this.minFreq * norm);
    this.maxBin = Math.round(this.maxFreq * norm);
    this.binsNormalisation = 1 / (this.maxBin - this.minBin + 1);
  }

  // return current analyser amplitude (no freq. specific) between 0 and 1
  getAmplitude() {
    // extract data from analyser
    this.in.getByteFrequencyData(this.magnitudes);
    // get average ampl. value
    let amplitude = 0.0;
    for( let i = this.minBin; i <= this.maxBin; ++i ) {
      amplitude += this.magnitudes[i];
    }
    amplitude *= this.binsNormalisation / 250;
    // let norm = this.in.frequencyBinCount * 100; // arbitrary value, to be cleaned
    // console.log(amplitude);
    return amplitude;
  }

}