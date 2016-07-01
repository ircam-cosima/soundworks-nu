# Soundworks Application Template with Cordova export

(For more information on the soundwork template see ../README.md)

Direct port from Soundworks experience to Cordova application

## Build Soundworks experience

see ../README.md

## Build Cordova application

### Setup Cordova

* add a platform (e.g. iOS)

```sh
cordova platform add ios
```

### From Soundworks to Cordova

* Copy content of index.html

While soundworks experience is running (following a ``npm run start`` in parent folder):

```sh
./copy.sh
```

check content (.. something other that ''error, could not resolve...'') has been copied in ``www/index.html``

```sh
more www/index.html
```
* Propagate change to platforms

```sh
cordova prepare
```

* Build and run Cordova application

e.g. on iOS: open ``platforms/ios/HelloCordova.xcodeproj``, run (eventually modify bundle identifier for provisionning)
