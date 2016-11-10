// import client side soundworks and player experience
import * as soundworks from 'soundworks/client';
import * as soundworksCordova from 'soundworks-cordova/client';
import PlayerExperience from './PlayerExperience.js';
import viewTemplates from '../shared/viewTemplates';
import viewContent from '../shared/viewContent';

// list of files to load (passed to the experience)
const audioFiles = [
  'sounds/100_celt_melody.mp3',
  'sounds/193815__geoneo0__four-voices-whispering-4-wecho.mp3',
  'sounds/drum-loop.wav',
  'sounds/VMH1 Arcade Riffs 308.wav',
  'sounds/VMH1 Synth Shots 177.wav',
  'sounds/VMH1 Synth Shots 204.wav',
  'sounds/VMH1 Synth Shots 219.wav',
  'sounds/VMH1 Synth Shots 269.wav',
  'sounds/VMH1 Synth Shots 271.wav',
  'sounds/VMH1 Synth Shots 285.wav',
  'sounds/VMH1 Synth Shots 325.wav',
  'sounds/VMH1 Synth Shots 327.wav',
  'sounds/VMH1 Synth Shots 341.wav',
  'sounds/VMH1 Synth Shots 361.wav',
  'sounds/VMH1 Synth Shots 363.wav',
  'sounds/w01-drops-A-C2.mp3',
  'sounds/w02-drops-A-E2.mp3',
  'sounds/w03-drops-A-G2.mp3',
];

// launch application when document is fully loaded
const init = () => {
  // configuration received from the server through the `index.html`
  // @see {~/src/server/index.js}
  // @see {~/html/default.ejs}
  const { appName, clientType, socketIO, assetsDomain, standalone, beaconUUID }  = window.soundworksConfig;
  // initialize the 'player' client
  soundworks.client.init(clientType, { appName, socketIO });
  soundworks.client.setViewContentDefinitions(viewContent);
  soundworks.client.setViewTemplateDefinitions(viewTemplates);

  // create client side (player) experience
  const experience = new PlayerExperience(assetsDomain, audioFiles, beaconUUID);

  // start the client
  soundworks.client.start();
};

if (!!window.cordova)
  document.addEventListener('deviceready', init);
else
  window.addEventListener('load', init);
