/**
 * NuGrain: Granular synthesis (based on soudworks-shaker). An audio track is segmented
 * and segments are sorted by loudness. Segments are afterwards playing in a sequencer, 
 * the current active segment being selected based on shaking energy or OSC client sent 
 * energy.
 **/

import NuBaseModule from './NuBaseModule'

export default class NuGrain extends NuBaseModule {
  constructor(soundworksServer) {
    super(soundworksServer, 'nuGrain');

    // local attributes
    this.params = { 
      gain: 1.0, 
      audioFileId: 0, 
      enable: 0, 
      override: 1.0, 
      energy: 0, 
      randomVar: 1, 
      engineParams: {} 
    };

  }
}

