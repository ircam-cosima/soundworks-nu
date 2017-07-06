/**
 * NuMain: misc. config setup
 **/

import NuBaseModule from './NuBaseModule'

export default class NuMain extends NuBaseModule {
  constructor(playerExperience) {
    super(playerExperience, 'nuMain');
  }

  // reload page
  reload(){
    window.location.reload(true);
  }

}