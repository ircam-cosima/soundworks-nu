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

// define the configuration object to be passed to the `.ejs` template
soundworks.server.setClientConfigDefinition((clientType, config, httpRequest) => {
  let includeCordovaTags = false;
  let socketIOConfig = config.socketIO;

  if (httpRequest.query.cordova) {
    includeCordovaTags = true;

    Object.assign(socketIOConfig, {
      url: 'http://10.0.0.1:8000',
    });

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
    beaconUUID: config.beaconUUID,

    includeCordovaTags: includeCordovaTags,

    // environment
    env: config.env,
    gaId: config.gaId,

  };

  if (!config.standalone)
    data.socketIO = socketIOConfig;

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
