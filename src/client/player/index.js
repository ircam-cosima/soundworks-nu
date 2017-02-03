// import client side soundworks and player experience
import * as soundworks from 'soundworks/client';
import PlayerExperience from './PlayerExperience.js';
import viewTemplates from '../shared/viewTemplates';
import viewContent from '../shared/viewContent';

// list of files to load (passed to the experience)
const audioFiles = [
  'sounds/note c2.wav',
  'sounds/note f1.wav',
  'sounds/note g-1.wav',
  'sounds/note g1.wav',
  'sounds/perc bongo.wav',
  'sounds/perc clap.wav',
  'sounds/perc kick.wav',
  'sounds/perc rimshot.wav',
  'sounds/perc snap.wav',
  'sounds/perc snare.wav',
  'sounds/perc voice.wav',
  'sounds/perc woosh.wav',
  'sounds/pers beatbox.mp3',
  'sounds/wlong drum-loop.wav',
  'sounds/wlong voice.mp3',
];

// launch application when document is fully loaded
window.addEventListener('load', () => {
  // initialize the client with configuration received
  // from the server through the `index.html`
  // @see {~/src/server/index.js}
  // @see {~/html/default.ejs}
  const config = window.soundworksConfig;
  soundworks.client.init(config.clientType, config);
  soundworks.client.setViewContentDefinitions(viewContent);
  soundworks.client.setViewTemplateDefinitions(viewTemplates);

  // create client side (player) experience
  const experience = new PlayerExperience(config.assetsDomain, audioFiles);

  // start the client
  soundworks.client.start();
});
