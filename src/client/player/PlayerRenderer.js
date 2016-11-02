import * as soundworks from 'soundworks/client';

/**
 * A simple canvas renderer, used e.g. to change screen's background color.
 */
export default class PlayerRenderer extends soundworks.Renderer {
  constructor() {
    super(0); // update rate = 0: synchronize updates to frame rate

    // local attributes
    this.audioAnalyser = new AudioAnalyser();
    this.bkgChangeColor = false;
    this.numOfElmtInNeedOfMe = 0;

    // binding
    this.updateBkgColor = this.updateBkgColor.bind(this);

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
    if (this.bkgChangeColor) {
      // console.log(this.bkgColor);
      // ctx.save();
      ctx.globalAlpha = 1;
      ctx.fillStyle = this.bkgColor;
      ctx.rect(0, 0, ctx.canvas.width, ctx.canvas.height);
      ctx.fill();
      // ctx.restore();
      this.bkgChangeColor = false
    }
  }

  /**
   * Tell render to change background color at next update.
   * @param {Number} colorId - color index in this.bkgColorList
   */
  setBkgColor(rgb) {
    this.bkgColor = 'rgb('
      + Math.ceil(rgb[0]) + ','
      + Math.ceil(rgb[1]) + ','
      + Math.ceil(rgb[2]) + ')';
    this.bkgChangeColor = true;
  }


  enable(){
    this.numOfElmtInNeedOfMe += 1;
    // if need to be triggered on for the first time:
    if( this.numOfElmtInNeedOfMe == 1 )
    {
      requestAnimationFrame(this.updateBkgColor);
    }
  }

  disable(){
    // decrement status
    this.numOfElmtInNeedOfMe = Math.max(this.numOfElmtInNeedOfMe-1, 0);
    // reset background color
    if( this.numOfElmtInNeedOfMe == 0 ) this.setBkgColor([0,0,0]);
  }

  /*
   * Change GUI background color based on current amplitude of sound being played
   */
  updateBkgColor() {
    if( this.numOfElmtInNeedOfMe >= 1 ) {
      // call me once, I'll call myself over and over
      requestAnimationFrame(this.updateBkgColor);
      // change background color based on current amplitude
      let amp = 200 * this.audioAnalyser.getAmplitude();
      let rgb = [amp, 50 + amp, 50 + amp];
      this.setBkgColor(rgb);
    }
  }

}



/**
 * Audio analyser for visual feedback of sound amplitude on screen
 */

const audioContext = soundworks.audioContext;

class AudioAnalyser {
  constructor() {

    this.in = audioContext.createAnalyser();
    this.in.smoothingTimeConstant = 0.1;
    this.in.fftSize = 32;

    this.freqs = new Uint8Array(this.in.frequencyBinCount);

  }


  getAmplitude() {

    this.in.getByteFrequencyData(this.freqs);

    let amplitude = 0.0;

    for (let i = 0; i < this.in.frequencyBinCount; i++) {
      amplitude += this.freqs[i];
    }

    let norm = this.in.frequencyBinCount * 32; // arbitrary value, to be cleaned
    return amplitude / norm;
  }

}