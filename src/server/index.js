import 'source-map-support/register'; // enable sourcemaps in node
import * as soundworks from 'soundworks/server';
import PlayerExperience from './PlayerExperience';
import defaultConfig from './config/default';

let config = null;

switch(process.env.ENV) {
  default:
    config = defaultConfig;
    break;
}

// configure express environment ('production' enables cache systems)
process.env.NODE_ENV = config.env;
// initialize application with configuration options
soundworks.server.init(config);

// define parameters shared by different clients
const sharedParams = soundworks.server.require('shared-params');
sharedParams.addText('numPlayers', 'num players', 0, ['conductor']);
sharedParams.addNumber('masterGain', 'master gain (SI)', 0, 10.0, 0.1, 4.0);
sharedParams.addNumber('propagationSpeed', 'propagation speed (m.s-1)', 1, 344, 1, 10); // min, max, step, value
sharedParams.addNumber('propagationGain', 'propagation gain (SI.m-1)', 0.1, 0.99, 0.01, 0.8);
// sharedParams.addNumber('emitterGain', 'emitter gain (SI)', 0.1, 1, 0.01, 1);
sharedParams.addNumber('thresholdReceiveGain', 'threshold receive gain (SI)', 0.01, 0.5, 0.01, 0.3);

sharedParams.addText('currentPropagationDepth', 'current propag. depth (SI)', 0, ['conductor']);
sharedParams.addNumber('maxPropagationDepth', 'max propag. depth (SI)', 2, 15, 1, 5);

// sharedParams.addNumber('thresholdReceiveTime', 'threshold receive time (sec)', 0, 20.0, 0.1, 10.0);
// sharedParams.addTrigger('replayLast', 'replay last');
sharedParams.addTrigger('reset', 'reset');
sharedParams.addTrigger('reloadPlayers', 'reload clients (players only)');
// sharedParams.addNumber('interDeviceDist', 'est. iner device dist (m)', 0.01, 10, 0.01, 1);
// sharedParams.addText('estimatedSimulationTime', 'est. simulation time (sec)', 0, ['conductor']);

// create server side conductor experience
const conductor = new soundworks.BasicSharedController('conductor');

// define the configuration object to be passed to the `.ejs` template
soundworks.server.setClientConfigDefinition((clientType, config, httpRequest) => {

  let includeCordovaTags = false;
  
  if (httpRequest.query.cordova) {
    includeCordovaTags = true;
    config.assetsDomain = '';
  }

  const data = {
    standalone: config.standalone,
    clientType: clientType,
    env: config.env,
    appName: config.appName,
    socketIO: config.socketIO,
    version: config.version,
    defaultType: config.defaultClient,
    assetsDomain: config.assetsDomain,

    // cordova / environment
    beaconUUID: config.beaconUUID,
    includeCordovaTags: includeCordovaTags,
    env: config.env,
    gaId: config.gaId,
  };

  if (!config.standalone)
    data.socketIO = config.socketIO;

  return data;  
});

// create the experience
// activities must be mapped to client types:
// - the `'player'` clients (who take part in the scenario by connecting to the
//   server through the root url) need to communicate with the `checkin` (see
// `src/server/playerExperience.js`) and the server side `playerExperience`.
// - we could also map activities to additional client types (thus defining a
//   route (url) of the following form: `/${clientType}`)
const experience = new PlayerExperience('player');

// start application
soundworks.server.start();
