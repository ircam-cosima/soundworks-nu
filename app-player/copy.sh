#!/bin/bash

echo "copying public files..."
cp -R ../public/* www

echo "copying the content of index.html in www/index.html"
curl "http://127.0.0.1:8000?cordova=true" > www/index.html

if [[ $(head -n 1 www/index.html) ]]; then

    echo "spreading changes to cordova platforms..."
    cordova prepare

    echo "-> copy finished, ready to build."

else

    echo "### ERROR: node server is not running -> ./www/index.html empty. COPY ABORTED"

fi
