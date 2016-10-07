# Soundworks Template Cordova

*Direct port of Soundworks experience to Cordova application (iOS / Android)*


## Setup Cordova

* Install [Cordova](https://cordova.apache.org/)

* Setup Cordova environment (add Cordova folders not kept on the github repository):

```sh
./_create_cordova_env.sh
```
you'll then need to add a Cordova 'platform' in the newly created 'player' folder. Example for iOS platform:

```sh
cd player && cordova platform add ios
```

## Copy Soundworks experience to Cordova platforms

While the Soundworks experience is running (following a ``npm run start`` in parent folder), run:

```sh
./_copy_experience_to_platforms.sh
```

this script will copy the content of ``index.html`` served by the Soundworks server on localhost to ``player/www/``, and spread these changes to cordova platforms.

Note: you may have to change the ip:host defined in ``../src/server/config.default.js``  socketIO.url field to fit your architecture if you're not using the standalone mode (again, see ``../src/server/config.default.js``).


## Build and run Soundworks Cordova application

e.g. on iOS: open ``player/platforms/ios/HelloCordova.xcodeproj``, run (eventually modify bundle identifier for provisioning). see [Cordova website](https://cordova.apache.org/docs/en/latest/#develop-for-platforms) for more details.