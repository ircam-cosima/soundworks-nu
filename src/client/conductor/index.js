import * as soundworks from 'soundworks/client';
import viewTemplates from '../shared/viewTemplates';
import viewContent from '../shared/viewContent';

window.addEventListener('load', () => {
  // configuration received from the server through the `index.html`
  // @see {~/src/server/index.js}
  // @see {~/html/default.ejs}
  const { appName, clientType, socketIO }  = window.soundworksConfig;
  // initialize the 'player' client
  soundworks.client.init(clientType, { socketIO, appName });
  soundworks.client.setViewContentDefinitions(viewContent);
  soundworks.client.setViewTemplateDefinitions(viewTemplates);

  // configure appearance of shared parameters
  let defaultSliderSize = 'medium';
  const conductor = new soundworks.BasicSharedController({
    numPlayers: { readOnly: true },
    masterGain: { type: 'slider', size: defaultSliderSize },

    roomWidth: { type: 'slider', size: defaultSliderSize },
    roomHeight: { type: 'slider', size: defaultSliderSize },
    propagationSpeed: { type: 'slider', size: defaultSliderSize },
    propagationGain: { type: 'slider', size: defaultSliderSize },
    scatterAmpl: { type: 'slider', size: defaultSliderSize },
    scatterAngle: { type: 'slider', size: defaultSliderSize },
    absorption0: { type: 'slider', size: defaultSliderSize },
    absorption1: { type: 'slider', size: defaultSliderSize },
    absorption2: { type: 'slider', size: defaultSliderSize },
    absorption3: { type: 'slider', size: defaultSliderSize },

    // thresholdReceiveGain: { type: 'slider', size: defaultSliderSize },
    // reset: { type: 'buttons' },
    // reloadPlayers: { type: 'buttons' },
    // updatePropagation: { type: 'buttons' }
  });

  // start client
  soundworks.client.start();
});
