#!/bin/bash

# This script creates a basic directory filled with the minimum requirements 
# for Cordova framework to operate
# 
# argument: folder name, default is 'player'

DIRNAME=${1:-player}

echo 'creating folder:' $DIRNAME
mkdir $DIRNAME

echo 'creating directories for Cordova to feel at home...'
mkdir $DIRNAME/platforms
mkdir $DIRNAME/plugins
mkdir $DIRNAME/www

echo 'copying default config.xml from assets'
cp assets/config.xml $DIRNAME

cd $DIRNAME

echo 'adding default platforms: iOS and Android'
cordova platform add ios
cordova platform add android

echo 'installing default cordova plugins'
echo '* iBeacon plugin'
cordova plugin add https://github.com/petermetz/cordova-plugin-ibeacon.git#3.3.0

echo 'spreading installed plugins to platforms'
cordova prepare
cd ..

echo '-> Cordova environment ready'