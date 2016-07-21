import { Renderer } from 'soundworks/client';

/**
 * A simple canvas renderer, used e.g. to change screen's background color.
 */
export default class PlayerRenderer extends Renderer {
  constructor() {
    super(0); // update rate = 0: synchronize updates to frame rate

    // local attributes
    this.bkgChangeColor = false;

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
}
