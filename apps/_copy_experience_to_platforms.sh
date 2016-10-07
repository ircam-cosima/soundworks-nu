#!/bin/bash

# This script copies the content of a running soundworks experience from 
# local webpage to cordova's index.html
# 
# argument: target name, default is 'player'

DIRNAME=${1:-player}

# create URL extension (= client type but if "player")
if [ "$1" == "player" ]; then
	URL_EXTENSION=''
else
	URL_EXTENSION='/'$1
fi

# if "client type" directory exists (created using _create_cordova_env.sh)
if [ -d "$DIRNAME" ]; then

	echo "copying Soundworks public files to:" $DIRNAME/www
	cp -R ../public/* $DIRNAME/www

	ADDR="http://127.0.0.1:8000${URL_EXTENSION}"
	echo -e "copying content of ${ADDR} to:" "${DIRNAME}/www/index.html"
	curl "${ADDR}?cordova=true" > $DIRNAME/www/index.html

	if [[ $(head -n 1 $DIRNAME/www/index.html) ]]; then

	    echo "spreading changes to cordova platforms..."
	    cd $DIRNAME
	    cordova prepare
		echo "-> copy finished, ready to build."
		cd ..

	else
	    echo -e "\n### ERROR: node server is not running ->" "${DIRNAME}/www/index.html empty. COPY ABORTED"

	fi

else
	echo -e "### ERROR: directory doesn't exists: ${DIRNAME}" 
fi