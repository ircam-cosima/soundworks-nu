/**
 * NuRenderer: visual feedback
 **/

import NuBaseModule from './NuBaseModule'

export default class NuRenderer extends NuBaseModule {
  constructor(soundworksServer) {
    super(soundworksServer, 'nuRenderer', true);

    // to be saved params to send to client when connects:
    this.params = {
      'feedbackGain': 1.0,
      'enableFeedback': true,
      'restColor': [0,0,0], 
      'activeColor': [255, 255, 255],
      'text1': 'clientId',
      'text2': ' ',
      'text3': 'in the forest at night',
    };
  }

}

