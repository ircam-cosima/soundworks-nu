/**
 * NuStream: live audio stream from OSC client to players
 * NOT FUNCTIONAL YET
 **/

import NuBaseModule from './NuBaseModule'
import * as soundworks from 'soundworks/client';

const client = soundworks.client;
const audioContext = soundworks.audioContext;

export default class NuStream extends NuBaseModule {
  constructor(soundworksClient) {
    super(soundworksClient, 'nuStream');

    // local attributes
    this.params = {'gain': 1.0};

    // binding
    this.onWebSocketEvent = this.onWebSocketEvent.bind(this);

    // setup socket reveive callbacks (receiving raw audio data)
    this.soundworksClient.rawSocket.receive('nuStream', this.onWebSocketEvent );

  }

  // send client index (at websocket opening) to associate socket / index in server
  onWebSocketOpen() {
    this.ws.send(client.index, { binary: false, mask: true }, (error) => { console.log('websocket error:', error); });
  }

  /*
   * callback when websocket event (msg containing new IR sent by server) is received
   */
  onWebSocketEvent(data) {
    // decode 
    console.log('received data size:', data.length);
    let audioArray = new Float32Array(data);

    // create audio buffer
    let audioBuffer = audioContext.createBuffer(1, data.length, 44100);
    audioBuffer.getChannelData(0).set(data);

    // create audio source
    let src = audioContext.createBufferSource();
    src.buffer = audioBuffer;
    src.connect( audioContext.destination );

    // start source
    src.start();

  }  

}