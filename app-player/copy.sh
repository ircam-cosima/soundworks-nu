#!/bin/bash

echo "copy public files"
cp -R ../public/* www

echo "retrieve index.html"
curl "http://127.0.0.1:8000?cordova=true" > www/index.html

