/**
 * NuSynth: distributed synthetizer, sending "note" information via OSC
 * to trigger real notes in local synthetizer
 **/
 
import NuBaseModule from './NuBaseModule'

export default class NuSynth extends NuBaseModule {
  constructor(serverExperience) {
    super(serverExperience, 'nuSynth', true);

    // local attributes
    this.params = {
      volume: 1.0, 
      synthType: 'square',
      attackTime: 0.1,
      releaseTime: 0.1,
      periodicWave: [0, 0, 1, 0]
    };
  }

}