import * as soundworks from 'soundworks/client';
const audioContext = soundworks.audioContext;

export default class AudioAnalyser {
  constructor() {

    this.in = audioContext.createAnalyser();
    console.log(this.in.smoothingTimeConstant);
    this.in.smoothingTimeConstant = 0.1;
    console.log(this.in.smoothingTimeConstant);
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
    console.log(amplitude / norm);
    return amplitude / norm;
  }

}
