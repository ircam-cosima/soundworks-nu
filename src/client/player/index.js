// import client side soundworks and player experience
import * as soundworks from 'soundworks/client';
import * as soundworksCordova from 'soundworks-cordova/client';
import PlayerExperience from './PlayerExperience.js';
import viewTemplates from '../shared/viewTemplates';
import viewContent from '../shared/viewContent';

// list of files to load (passed to the experience)
const audioFiles = [
  'sounds/100_celt_bass.mp3',
  'sounds/100_celt_melody.mp3',
  'sounds/193815__geoneo0__four-voices-whispering-4-wecho.mp3',
  'sounds/drum-loop.wav',
  'sounds/Va-pizz-sec-AD4-ff-2c_c.mp3',
  'sounds/Va-pizz-sec-CD4-ff-2c_c.mp3',
  'sounds/Va-pizz-sec-ED4-ff-2c_c.mp3', 
  'sounds/w01-drops-A-C2.mp3',
  'sounds/w02-drops-A-E2.mp3',
  'sounds/w03-drops-A-G2.mp3'
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
