// Definition of the content used in the view of `Activity` instances. The key
// of the returned object match the id of the activities.
//
// Each content defines the variables that are used inside the corresponding
// [`template`]{@link module soundworks/client.defaultViewTemplates}. A special
// key `globals` is accessible among all templates and can then be used to share
// variables among all the views of the application.
// These objects are used to populate the templates declared inside the
// `~/src/client/shared/viewTemplate.js` file.
export default {
  // variables shared among all templates through the global namespace
  'globals': {},

   // content of the `auth` service
  'service:auth': {
    instructions: 'Login',
    send: 'Send',
    rejectMessage: `Sorry, you don't have access to this client`,
    rejected: false,
  },

  // content of the `checkin` service
  'service:checkin': {
    labelPrefix: 'Go to',
    labelPostfix: 'Touch the screen<br class="portrait-only" />when you are ready.',
    error: false,
    errorMessage: 'Sorry,<br/>no place available',
    wait: 'Please wait...',
    label: '',
  },

  // content of the `loader` service
  'service:loader': {
    loading: 'Loading sounds…',
  },

  // content of the `locator` service
  'service:locator': {
    instructions: 'Define your position in the area',
    send: 'Send',
    showBtn: false,
  },

  // content of the `placer` service
  'service:placer': {
    instructions: 'Select your position',
    send: 'Send',
    reject: 'Sorry, no place is available',
    showBtn: false,
    rejected: false,
  },

  // content of the `platform` service
  'service:platform': {
    isCompatible: null,
    errorMessage: 'Sorry,<br />Your device is not compatible with the application.',
    intro: 'Welcome to',
    instructions: 'Touch the screen to join !',
  },

  // content of the `sync` service
  'service:sync': {
    wait: `Clock syncing,<br />stand by&hellip;`,
  },

  // content of the `survey` scene
  'survey': {
    next: 'Next',
    validate: 'Validate',
    thanks: 'Thanks!',
    length: '-',
  },
};
