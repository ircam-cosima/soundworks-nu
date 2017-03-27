/**
 * NuSynth: distributed synthetizer, sending "note" information via OSC
 * to trigger real notes in local synthetizer
 **/

import NuBaseModule from './NuBaseModule'
import * as soundworks from 'soundworks/client';

const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuSynth extends NuBaseModule {
  constructor(soundworksClient) {
    super(soundworksClient, 'nuSynth');
    // create synth
    this.audioSynth = new AudioSynth(this.soundworksClient);
    // create master gain
    this.localGain = audioContext.createGain();
    // connect graph
    this.audioSynth.out.connect(this.localGain);
    this.localGain.connect(this.soundworksClient.nuOutput.in);
    // binding
    this.noteOnOff = this.noteOnOff.bind(this);
    this.volume = this.volume.bind(this);
  }

  // set note on / off (args = [noteId, onOff status])
  noteOnOff(args){
    let noteId = args.shift();
    let status = args.shift();
    this.audioSynth.playNote(noteId, status);
  }

  // set local volume
  volume(value){
    this.localGain.gain.value = value;
  }

  /**
  * set noteId volume, "linking" the note to the player
  * (e.g. to attribute a unique note to each player)
  **/
  linkPlayerToNote(args){
    let noteId = args.shift();
    let volume = args.shift();
    this.audioSynth.setNoteVolume(noteId, volume);
  }

  // define local synthetizer used for audio rendering
  synthType(type){
    this.audioSynth.setType(type); 
  }

  // define synth. attack time
  attackTime(value){
    this.audioSynth.attackTime = value; 
  }

  // define synth. release time
  releaseTime(value){
    this.audioSynth.releaseTime = value; 
  }

  // define synth waveform
  periodicWave(args){
    let halfLength = Math.floor(args.length/2);
    var real = new Float32Array(halfLength);
    var imag = new Float32Array(halfLength);    
    for (let i = 0; i < args.length/2; i++) {
      real[i] = args[2*i];
      imag[i] = args[2*i+1];
    }
    this.audioSynth.setPeriodicWave(audioContext.createPeriodicWave(real, imag));
  }

}

// a (really) basic audio synthetizer, based on the WebAudio Oscillator node
class AudioSynth {
  constructor(soundworksClient){
    this.soundworksClient = soundworksClient;

    // local attributes
    this.noteMap = new Map();
    this.type = 'square';
    this.isPlaying = false;
    this.numNotesPlayed = 0;
    this.attackTime = 0.1; // in sec
    this.releaseTime = 0.1; // in sec
    // create custom periodic wave
    var real = new Float32Array(2);
    var imag = new Float32Array(2);
    real[0] = 0; imag[0] = 0; real[1] = 1; imag[1] = 0;
    this.periodicWave = audioContext.createPeriodicWave(real, imag);
    // output gain
    this.out = audioContext.createGain();
    this.out.gain.value = 1.0;        
    // notes ferquencies
    let noteFreqTable = [
      130.813,
      138.591,
      146.832,
      155.563,
      164.814,
      174.614,
      184.997,
      195.998,
      207.652,
      220,
      233.082,
      246.942,    
    ];

    // add octaves (not just? true)
    let numOctaves = 4;
    const initTableLength = noteFreqTable.length;
    for( let i = 1; i < numOctaves; i++ ){
    for( let j = 0; j < initTableLength; j++ ){
      noteFreqTable.push( noteFreqTable[j] * Math.pow(2, i) );
      }
    }

    // create notes
    for (let i = 0; i < noteFreqTable.length; i++) {
      // create note gain (note volume)
      let gain = audioContext.createGain();
      gain.gain.value = 1.0;
      // create note envelope gain
      let envelopeGain = audioContext.createGain();
      envelopeGain.gain.value = 0.0;
      envelopeGain.connect(this.out);
      // connect graph
      gain.connect(envelopeGain);
      envelopeGain.connect(this.out);
      // store note
      this.noteMap.set(i, {
        freq: noteFreqTable[i],
        gain: gain,
        envelopeGain: envelopeGain,
        osc: undefined, 
        timeout: undefined
      });
    }
  }

  // set master volume
  setVolume(value){
    this.out.gain.value = value;
  }

  // set note specific volume
  setNoteVolume(noteId, value){
    // get note
    let note = this.noteMap.get(noteId);
    // discard if note does't exist
    if( note === undefined ){ return; }
    // set note gain
    note.gain.gain.value = value;
  }

  // synth type (waveform)
  setType(value){
    this.type = value;
  }

  // define synth. waveform
  setPeriodicWave(wave){
    this.periodicWave = wave;
  }

  // play a note on the synth.
  playNote(noteId, status){
    // get note based on id
    let note = this.noteMap.get(noteId);
    // discard if note undefined
    if( note === undefined ){
      this.soundworksClient.renderer.blink([200, 0, 0]);
      console.warn('note', noteId, 'not defined');
      return;
    }
    // note ON
    if( status ){
      // create osc.
      let osc = audioContext.createOscillator();
      // setup osc
      if( this.type === 'custom' )
        osc.setPeriodicWave(this.periodicWave);
      else
        osc.type = this.type;
      osc.frequency.value = note.freq; // value in hertz
      // connect graph
      osc.connect(note.gain);
      // handle envelope
      let now = audioContext.currentTime;
      note.envelopeGain.gain.cancelScheduledValues(now);
      note.envelopeGain.gain.setValueAtTime(note.envelopeGain.gain.value, now);
      note.envelopeGain.gain.linearRampToValueAtTime(1, now + this.attackTime);
      // note.envelopeGain.gain.setTargetAtTime(1, now, 1/this.attackTime);
      // add to note
      note.osc = osc;
      // cancell eventual previous timeout (to avoid stoopping new note in old timeout)
      if( note.timeout !== undefined ){
        clearTimeout(note.timeout);
        note.timeout = undefined;
      }
      else{
        // update counter (for render)
        this.numNotesPlayed += 1;
      }
      // start      
      osc.start();
    }
    // note OFF
    else{
      // discard if note never set to on
      if(note.osc === undefined){ return; }
      // handle enveloppe
      let now = audioContext.currentTime;
      note.envelopeGain.gain.cancelScheduledValues(now);
      note.envelopeGain.gain.setValueAtTime(note.envelopeGain.gain.value, now);    
      note.envelopeGain.gain.linearRampToValueAtTime(0, now + this.releaseTime);
      // note.envelopeGain.gain.setTargetAtTime(0, now, 1/this.attackTime);
      // stop oscillator
      note.osc.stop(now + this.releaseTime);
      // schedule oscillator kill
      note.timeout = setTimeout(() => { 
        // decrement renderer counter
        this.numNotesPlayed -= 1;
        this.updateRendererStatus();
        // kill osc if re-started since (discard if osc already killed)
        if(note.osc === undefined){ return; }
        try{ // weird Safari behavior...
          note.osc.stop();
        }
        catch(e){
          if( e.name !== 'InvalidStateError'){ console.error(e); }
        }              
        note.osc = undefined;
        // delete timeout reference
        note.timeout = undefined;
      }, this.releaseTime*1000);      
    }

    this.updateRendererStatus();
  }

  // enable / disable visualization (enable as long as at least one note plays)
  updateRendererStatus(){
    if( this.numNotesPlayed === 1 && !this.isPlaying){
      this.soundworksClient.renderer.enable();
      this.isPlaying = true;
    }
    else if( this.numNotesPlayed === 0 ){
      this.soundworksClient.renderer.disable();
      this.isPlaying = false;
    }    
  }

}