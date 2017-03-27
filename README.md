# Soundworks Nü

The objective of the Nü framework, based on [Soundworks](https://github.com/collective-soundworks/soundworks/), is to give composers control over the speakers of spectators smartphones during a performance. Connecting their devices to a web page broadcasted by the performer's laptop, spectators become part of the composition: from simple sound sources to active musicians. The performer can then control the behaviours of "Nü modules" via a Max/MSP based interface: modular units (distributed room reverb, granular synthesis, etc.) designed for live composition. Nü has been developed as part of the [CoSiMa project](http://cosima.ircam.fr/).

## [Demo](https://youtu.be/a4taMsypqos)

[//]: # (For a complete documentation of the *Soundworks* framework, please refer to http://collective-soundworks.github.io/soundworks/.)

Screenshots of a development session, (*a*) simulated Nü players, (*b*) Nü GUI:
![group_interface](https://cloud.githubusercontent.com/assets/1186926/21421849/4d68fbcc-c835-11e6-94aa-308a2f7ca991.png)
During a performance, Nü players (smartphones) distributed in the room:
![group_real_performance](https://cloud.githubusercontent.com/assets/1186926/21421854/5414aeb2-c835-11e6-8870-699ff9d4969d.png)

## Install Node.js

Node.js or "npm" is a toolbox / framework / magic wizard for javascript & web developers, required to run Nü. Check the official [Node.js installation guide](https://docs.npmjs.com/getting-started/installing-node).

## Install Nü (master)

```sh
git clone https://github.com/ircam-cosima/soundworks-nu.git soundworks-nu
cd soundworks-nu
npm install
npm run watch
```

## Install Nü (develop)

```sh
git clone https://github.com/ircam-cosima/soundworks-nu
cd soundworks-nu
git checkout develop
git pull
npm install
cd node_modules/soundworks
npm run transpile
cd ../..
npm run watch
```

## How to use

* Open Max/MSP main patch `src/maxmsp/_maxControllerv2.maxpat`
* Start the server (see Install)
* Connect client to server (default: open your browser at 127.0.0.1:8000)
* Use Max/MSP patch to control client's behavior