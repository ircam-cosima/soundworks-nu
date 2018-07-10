# Nü Soundworks

Framework source code. See the [project website](https://ircam-cosima.github.io/soundworks-nu/) for more details.

## License and Credits

The Nü framework is released under the [BSD 3-Clause license](https://opensource.org/licenses/BSD-3-Clause).

Nü has been developped at IRCAM-CNRS within the [CoSiMa](http://cosima.ircam.fr/) research project, supported by the French National Research Agency (ANR).

## Install Node.js

Node.js or "npm" is a toolbox / framework / magic wizard for javascript & web developers, required to run Nü. Check the official [Node.js installation guide](https://docs.npmjs.com/getting-started/installing-node).

## Install Nü (master)

```sh
git clone https://github.com/ircam-cosima/soundworks-nu.git soundworks-nu
cd soundworks-nu/node
npm install
echo '## DEV ## working with develop version of soundworks even here, requires transpile'
cd node_modules/soundworks
npm run transpile
cd ../..
echo '## DEV ##'
npm run watch
```

## Install Nü (develop)

```sh
git clone https://github.com/ircam-cosima/soundworks-nu
cd soundworks-nu
git checkout develop
git pull
cd node
npm install
cd node_modules/soundworks
npm run transpile
cd ../..
npm run watch
```

## How to use

* Start the server (see Install)
* Connect client to server (default: open your browser at 127.0.0.1:8000)
* Use Max/MSP modules to control client's behavior (starting with nu.main)
