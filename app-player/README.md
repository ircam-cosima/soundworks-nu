# Soundworks Application Template with Cordova export

Direct port from Soundworks experience to Cordova application
(For more information on the soundwork template see ../README.md)


## Build Soundworks experience

see ../README.md


## Build Cordova application

### Setup Cordova

* setup cordova environment (add cordova folders not kept on the repo)

```sh
./create.sh
```

* add a platform (e.g. iOS)

```sh
cordova platform add ios
```

### From Soundworks to Cordova

* Copy soundworks project

While soundworks experience is running (following a ``npm run start`` in parent folder):

```sh
./copy.sh
```

this script will copy the content of index.html served by the soundworks server into ./www and spread these changes to cordova platforms.

Note: you may have to change the ip:host defined in ``../src/server/index.js`` to fit your architecture if you're not using the standalone mode (also defined in ``index.js``).

* Build and run Cordova application

e.g. on iOS: open ``platforms/ios/HelloCordova.xcodeproj``, run (eventually modify bundle identifier for provisionning)


## Use soundwork Services based on Cordova plugins

The command below are to be exectuted in a terminal open in this directory. Do not forget to run ``cordova prepare`` to propagate the changes through Cordova's platforms afterwards.

### Beacon service

```sh
cordova plugin add https://github.com/petermetz/cordova-plugin-ibeacon.git
```
