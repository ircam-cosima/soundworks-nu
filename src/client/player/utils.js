import * as soundworks from 'soundworks/client';
const audioContext = soundworks.audioContext;

export default class AudioSynthSwoosher  {

    constructor(params = {}) {

        this.duration = params.duration; // second
        this.gain = params.gain;
        this.intervalTime = 100;

        this.buffer = this.createNoiseBuffer(this.duration);

        this.filter = audioContext.createBiquadFilter();
        this.filter.type = 'bandpass';
        this.minFreq = 10;
        this.maxFreq = 20000;
        this.filter.frequency.value = this.minFreq;
        this.filter.Q.value = 3;

        this.filter.connect(audioContext.destination);
    }


    createNoiseBuffer(duration) {
        const length = duration * audioContext.sampleRate;
        const channelCount = audioContext.destination.channelCount;
        let buffer = audioContext.createBuffer(channelCount, length, audioContext.sampleRate);

        for (let c = 0; c < channelCount; ++c) {
            let data = buffer.getChannelData(c);
            for (let i = 0; i < length; ++i) {
                data[i] = this.gain * (Math.random() * 2 - 1);
            }
        }

        return buffer;
    }

    play(){
        console.log('play buffer');
        let src = audioContext.createBufferSource();
        src.buffer = this.buffer;
        src.connect(this.filter);
        src.start(0);

        this.intervalHandle = setInterval(() => {
            if( this.filter.frequency.value < this.maxFreq ){
                let freqStep = (this.maxFreq-this.minFreq) * this.intervalTime / (this.duration * 1000) ;
                this.filter.frequency.value += freqStep;
                console.log('jk1');
            }
            else{
                clearInterval(this.intervalHandle);
                this.filter.frequency.value = this.minFreq;
                console.log('jk2');
            } 

        }, this.intervalTime);        
    }



}