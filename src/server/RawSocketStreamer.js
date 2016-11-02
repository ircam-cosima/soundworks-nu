/**
* Class used to send raw data (without the overload stringify added by server's this.send)
* to be replaced by soundworks service eventually
**/

import * as soundworks from 'soundworks/server';
const server = soundworks.server;

export default class RawSocketStreamer {
  constructor(port) {
  	
    // init websocket server
    var WebSocketServer = require('ws').Server;
    let host = server.config.socketIO.url.split(":")[1].split("/")[2];    
    this.wss = new WebSocketServer({port: port, host: host});

    // local attributes
    this.wsMap = new Map();

    // define what to do once a new socket connects to the server
    this.wss.on('connection', (ws) => {
      console.log('connection sowket');
      // msg callback: associate websocket to client index on connection for latter use
      ws.on('message', (message) => { 
        console.log('connection mesg', message);
        this.wsMap.set( parseInt(message), ws ); 
      });
    });
	
  }

  // send msg through a specific socket (here sockId = soundworks client id)
  send(sockId, buffer){
    if( this.wsMap.has( sockId ) ){
      let ws = this.wsMap.get( sockId );
      console.log('senbding');
      ws.send( buffer, { binary: true, mask: false } );
    }
  }


  // close a specific socket (here sockId = soundworks client id)
  close(sockId){
    // if socket connected
    if( this.wsMap.has( sockId ) ){
      // close socket
      this.wsMap.get( sockId ).close();
      // delete socket from local attributes
      this.wsMap.delete( sockId );
    }
  }

}
