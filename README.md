# Soundworks Application Template

> This is a project template for developing [*Soundworks*](https://github.com/collective-soundworks/soundworks/) applications.  
> The template also includes comprehensive comments in the source files.

[//]: # (For a complete documentation of the *Soundworks* framework, please refer to http://collective-soundworks.github.io/soundworks/.)

## Creating a New Application

To start the development of a new *Soundworks* application, we recommend the following sequence of commands:

```sh
$ git clone https://github.com/collective-soundworks/soundworks-template.git my-soundworks-application
$ cd my-soundworks-application
$ rm -Rf .git
$ npm install
$ npm run watch
```

If you succeeded to execute all commands without errors, you can start connecting clients - on a mobile phone or a browser simulating a mobile user agent and touch events - to the server.

## Helper Scripts

The template includes a set of scripts to support the development of an application.
The scripts can be invoked through the `npm run` command:
 * `transpile` - creates an executable application from the ES2015 (ES6) sources
 * `start` - starts the application (i.e. its server).
 * `watch` - starts the server and watches the file system to do the necessary operations while developing

```shell
$ npm run transpile
$ npm run start
$ npm run watch
```

In detail, the `transpile` script implies the following operations:
 * *transpile* javascript source files from ES2015 to ES5
 * rebundle (i.e. *browserify*) the client Javascript (ES5) sources
 * recreate the *CSS* files from their *SASS* sources

The following operations may be performed by the `watch` script depending on the modification of source files:
 * recreate a *CSS* file when a corresponding *SASS* file in the `sass` directory is modified
 * re-*transpile* a modified server source file in the `src/server` directory
 * re-*transpile* and *browserify* a modified client source file in the `src/client` directory
 * re-*transpile* a modified source file used on both, client and server, in the `src/common` directory

## Files and Directories

The template consists of the following files and directories you should know about:
 * `bin` - the Node.js scripts *(no need to touch these)*
 * `public` - everything the clients need to run the application
   * `fonts` - fonts used by the application template *(this is your directory)*
   * `sounds` - sounds used by the application template *(this is your directory)*
   * `js` - transpiled javascript files *(do not touch)*
   * `css` - *CSS* stylesheets automatically created from *SASS* sources *(do not touch)*
   * . . . add here the assets (images, movies, etc.) used by the clients of your application
 * `sass` - *SASS* stylesheet sources
   * `main.scss` - includes all other *SASS* files in the directory *(the provided files are described in comments)*
   * . . . add your styles here (as *SASS* files) and include them into the `main.scss` file
 * `src` - javascript (ES2015) sources *(this is all yours)*
   * `client` - sources of the application's client side *(contains one directory per client type)*
     * `player` - sources of the *player* client
       * `index.js` - main file of the *player* client
       * . . . files imported by the `index.js` main file
   * `server` - sources of the application's server side
     * `index.js` - server side main file *(for all client types)*
     * . . . files imported by the `index.js` server side main file
 * `html` - template files to generate the application's `index.html` files *(no need to touch)*
 * `package.json` - NPM package file *(modify so that the description and dependencies match your application)*
 * `README.md` - this file *(that you should replace by a file that informs about your application)*

This structure is required by the *Soundworks* framework and the helper scripts.
The files that are part of the application's implementation (i.e. especially the files in the `src` directories) contain comprehensive explanatory comments.
