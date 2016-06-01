import 'source-map-support/register'; // enable sourcemaps in node
import * as soundworks from 'soundworks/server';
import PlayerExperience from './PlayerExperience';

// initialize application with configuration options
soundworks.server.init({ appName: 'Template' });

const standalone = false;

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
    standalone: standalone,
    clientType: clientType,
    appName: config.appName,
    version: config.version,
    defaultType: config.defaultClient,
    assetsDomain: config.assetsDomain,
    includeCordovaTags: includeCordovaTags,
  };

  if (!standalone)
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
const experience = new PlayerExperience('player', standalone);

// start application
soundworks.server.start();
