# Soundworks Nü
The objective of the Nü framework, based on [*Soundworks*](https://github.com/collective-soundworks/soundworks/), is to give composers control over the speakers of spectators smartphones during a performance. Connecting their devices to a webpage broadcasted by the performer's laptop, spectators become part of the composition: from simple sound sources to active musicians. The performer can then control the behaviours of "Nü modules" via a Max/MSP based interface: modular units (distributed room reverb, granular synthesis, etc.) designed for live composition.

[//]: # (For a complete documentation of the *Soundworks* framework, please refer to http://collective-soundworks.github.io/soundworks/.)

![group_interface](https://cloud.githubusercontent.com/assets/1186926/21421849/4d68fbcc-c835-11e6-94aa-308a2f7ca991.png)
![group_real_performance](https://cloud.githubusercontent.com/assets/1186926/21421854/5414aeb2-c835-11e6-8870-699ff9d4969d.png)

## Install

```sh
$ git clone https://github.com/ircam-cosima/soundworks-nu.git soundworks-nu
$ cd soundworks-nu
$ npm install
$ npm run watch
```

## How to use

* Setup network parameters in `src/server/config/default.js`
* Open Max/MSP main patch `src/maxmsp/_maxControllerv2.maxpat`
* Start the server (see Install)
* Connect client to server
* Use Max/MSP patch to control client's behaviour