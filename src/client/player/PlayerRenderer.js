import { Renderer } from 'soundworks/client';

/**
 * A simple canvas renderer.
 * The class renders a dot moving over the screen and rebouncing on the edges.
 */
export default class PlayerRenderer extends Renderer {
  constructor(vx, vy) {
    super(0); // update rate = 0: synchronize updates to frame rate

    this.velocityX = vx; // px per seconds
    this.velocityY = vy; // px per seconds
  }

  /**
   * Initialize rederer state.
   * @param {Number} dt - time since last update in seconds.
   */
  init() {
    // set initial dot position
    if (!this.x || !this.y) {
      this.x = Math.random() * this.canvasWidth;
      this.y = Math.random() * this.canvasHeight;
    }
  }

  /**
   * Update rederer state.
   * @param {Number} dt - time since last update in seconds.
   */
  update(dt) {
    // rebounce at the edges
    if (this.x >= this.canvasWidth || this.x <= 0)
      this.velocityX *= -1;

    if (this.y >= this.canvasHeight || this.y <= 0)
      this.velocityY *= -1;

    // update position according to velocity
    this.x += (this.velocityX * dt);
    this.y += (this.velocityY * dt);
  }

  /**
   * Draw into canvas.
   * Method is called by animation frame loop in current frame rate.
   * @param {CanvasRenderingContext2D} ctx - canvas 2D rendering context
   */
  render(ctx) {
    // canvas operations
    ctx.save();
    ctx.beginPath();
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = '#ffffff';
    ctx.arc(this.x, this.y, 4, 0, Math.PI * 2, false);
    ctx.fill();
    ctx.closePath();
    ctx.restore();
  }
}
