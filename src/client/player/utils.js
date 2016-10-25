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
        this.maxFreq = 4000;
        this.filter.frequency.value = this.maxFreq;
        this.filter.Q.value = 3;

        this.filter.connect(audioContext.destination);

        // bind
        this.play = this.play.bind(this);
        this.createNoiseBuffer = this.createNoiseBuffer.bind(this);
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
        // console.log('play buffer');
        let src = audioContext.createBufferSource();
        src.buffer = this.buffer;
        src.connect(this.filter);
        src.start(0);

        this.intervalHandle = setInterval(() => {
            // console.log('in interval')
            if( this.filter.frequency.value > this.minFreq ){
                // console.log(this.filter.frequency.value);
                // let freqStep = (this.maxFreq-this.minFreq) * this.intervalTime / (this.duration * 1000) ;
                let freqStep = (this.filter.frequency.value - this.minFreq) / 2 ;
                this.filter.frequency.value -= freqStep;
            }
        }, this.intervalTime);

        setTimeout( () => {
            this.filter.frequency.value = this.maxFreq;
            clearInterval(this.intervalHandle);
            // console.log('reset', this.filter.frequency.value);
        }, this.duration * 1000);      
    }



}