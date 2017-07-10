/**
 * NuOutput: render output, either directly to audioContext.destination or 
 * to spatialization engine for debug sessions (i.e. to get a feel of the final 
 * result while players are emulated on server's laptop)
 **/

import NuBaseModule from './NuBaseModule'
import * as soundworks from 'soundworks/server';

// read audio init
const fs = require('fs');
var encodeWav = require('audio-encode-wav');
import Audio from 'audio';
var AudioContext = require('web-audio-api').AudioContext
const audioContext = new AudioContext;
const savePath = __dirname + '/../../../';

export default class NuOutput extends NuBaseModule {
  constructor(serverExperience) {
    super(serverExperience, 'nuOutput');

    // to be saved parameters to send to client when connects:
    this.params = { 
      gain: 1.0, 
      enableSpat: false,
      ambiOrder: 3,
      enableRoom: false,
      userPos: [0, 0, 0], 
    };

    // locals
    this.logClientRec = [];
    this.storedAudioBuffer = undefined;
    this.startRecTime = 0.0;
    this.discardUnsync = false;

    // binding
    this.rawSocketCallback = this.rawSocketCallback.bind(this);
    this.checkIfAllRecordArrived = this.checkIfAllRecordArrived.bind(this);
    this.writeAudioToDisk = this.writeAudioToDisk.bind(this);
  }

  enterPlayer(client){
    // send to new client information regarding current groups parameters
    Object.keys(this.params).forEach( (key) => {
      this.e.send(client, this.moduleName, [key, this.params[key]] );
    });

    // setup socket receive callbacks (receiving raw audio data)
    this.e.rawSocket.receive(client, this.moduleName, this.rawSocketCallback );
  }

  /** 
  * start / stop recording: will receive audio data from all clients, 
  * and concatenate them into output file written to disk
  **/
  record(args){
    let playerId = args.shift();
    // playerId not used at the moment, only for uniformity with other modules
    let val = args.shift();

    // save recording start time
    if( val === 1 ){ 
      this.startRecTime = this.e.sync.getSyncTime(); 
    }

    // forward msg to players
    this.e.broadcast( 'player', null, this.moduleName, ['record', val] );
  }

  // record callback, called once per client sending audio data at recording's end
  rawSocketCallback( interleavedBuffer ) {
    // skip empty sockets (at startup)
    if( interleavedBuffer.length === 0 ){ return; }

    // create buffer to store audio data if not already created
    // WARNING: here defining final size based on first client's packet length
    // (not wrong, but will skip data from larger packet if e.g. another client started 
    // recording a few ms earlier)
    let headerLength = 3;
    if( this.storedAudioBuffer === undefined ){
      this.storedAudioBuffer = new Float32Array( interleavedBuffer.length - headerLength );
    }

    // extract header (client index)
    let clientId = interleavedBuffer[0];
    let startTime = interleavedBuffer[1];
    let sampleRate = interleavedBuffer[2];
    interleavedBuffer = interleavedBuffer.slice(headerLength, interleavedBuffer.length);

    // get write offset (for sync. write across clients)
    let startOffset = Math.floor( (startTime - this.startRecTime) * sampleRate );

    // check if client's clock is not yet correctly sync.
    if( startOffset < 0 ){ 
      console.warn('\n### client', clientId, 'data in advance of', this.startRecTime - startTime, 'sec (expect weird sync.)\n');
      if( this.discardUnsync ){ startOffset = -1; }
      else{ startOffset = 0; }
    }

    // proceed to writing audio values to local buffer
    if( startOffset >= 0 ){
      var index = 0;
      for( let i = 0; i < interleavedBuffer.length; i++ ){
        index = startOffset + i;
        if( index >= this.storedAudioBuffer.length ){ break; }
        this.storedAudioBuffer[ index ] += interleavedBuffer[i];
      }
    }

    // if all client's sent their data..
    if( this.checkIfAllRecordArrived( clientId ) ){
      // .. write audio to disk
      this.writeAudioToDisk( sampleRate );
      // clear locals for next rec session
      this.logClientRec = [];
      this.storedAudioBuffer = undefined;
      this.startRecTime = 0.0;
    }

  }

  /**
  * add clientId to list of client who already sent audio data, 
  * return true if all clients connected to soundworks server already sent 
  * their data to trigger record to disk method in raw socket callback
  **/
  checkIfAllRecordArrived( clientId ){
    // check if client already sent recording
    if( this.logClientRec.indexOf( clientId ) >= 0 ){ 
      console.error( this.moduleName, 'received twice data from client', clientId );
    }

    // flag client as having sent recording
    this.logClientRec.push( clientId );

    // check if all clients sent recordings
    // TODO: find a way to break out of forEach loop asa one is not in it
    let allReceived = true;
    this.e.playerMap.forEach( (client, id) => {
      if( this.logClientRec.indexOf( id ) < 0 ){
        allReceived = false;
      }
    });
    // return flag
    return allReceived;
  }

  // write audio data to disk
  writeAudioToDisk( sampleRate ){
    // create new audio container
    let audioContainer = new Audio({ length: 2*this.storedAudioBuffer.length, sampleRate: sampleRate });

    // setup fade-in / out of signal
    let fadeTime = 0.01; // in sec
    let fadeDurInSamp = fadeTime * sampleRate;

    // get max audio data value for normalization
    let maxVal = 0.1;
    for( let i = 0; i < this.storedAudioBuffer.length; i++ ){
      maxVal = Math.max( Math.abs(this.storedAudioBuffer[i]), maxVal);
    }

    // fill audio container
    var val;
    let indexStartFadeOut = (this.storedAudioBuffer.length / 2) - fadeDurInSamp
    for( let i = 0; i < this.storedAudioBuffer.length / 2; i++ ){
      for( let j = 0; j < 2; j++ ){
        // mapping
        val = this.storedAudioBuffer[2*i + j] / maxVal; // norm
        val = (val + 1.0) / 2.0; // from -1 1 to 0 1
        val *= 30000;

        // fade in
        if( i < fadeDurInSamp ){  val *= i / (fadeDurInSamp -1 ); }
        // fade out
        if( i >= indexStartFadeOut ){ 
          val *= 1 - (i - indexStartFadeOut) / ( fadeDurInSamp - 1 ); 
        }

        // write to container
        audioContainer.write(val, 2*i+j);
      }
    }

    // encode audio container to wav 
    let wav = encodeWav(audioContainer);

    // get output file name / path
    let date = new Date();
    let fileName = savePath + 'nu-rec-' 
                  + date.getFullYear() + '-' 
                  + date.getMonth() + '-' 
                  + date.getDate() + '-' 
                  + date.getHours() + '-' 
                  + date.getMinutes() + '-' 
                  + date.getSeconds() 
                  + '.wav';

    // write to disk
    fs.writeFileSync( fileName, wav);
    console.log('saved audio file to disk: \n', fileName);
  }

}

