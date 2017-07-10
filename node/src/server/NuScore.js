/**
 * NuScore: define sequences of sounds to play
 **/

import NuBaseModule from './NuBaseModule'

export default class NuScore extends NuBaseModule {
  constructor(serverExperience) {
    super(serverExperience, 'nuScore');

    // to be saved params to send to client when connects:
    this.params = { 
      gain: 1.0, 
      perc: 1.0,
      delay: 2.0, // set delay before start score (for rendez-vous time sync. based mechanism)
    };
  }

  // overwrite enterPlayer to make sure saved score will not be sent to client upon conection (saved in this.params.setScore)
  // got to find a better mechanism for this whole saved param spread business..
  enterPlayer(client){
    // send to new client information regarding current groups parameters
    Object.keys(this.params).forEach( (key) => {
      if( key != 'startScore' ){
        this.e.send(client, this.moduleName, [key, this.params[key]] );
      }
    });
  }

}

