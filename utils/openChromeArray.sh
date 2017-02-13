#!/bin/bash

CHROME_APP=/Applications/Browsers/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
URL="http://127.0.0.1:8000"

windowWidth=200
windowHeight=200

# FAKEUSER="${1:-fake-chrome-user}"
# CHROMEROOT=$HOME/.chromeroot/

# mkdir -p ${CHROMEROOT}

# export PROFILE="${CHROMEROOT}/${FAKEUSER}-chromium-profile"


for i in {1..4}
do
	posX=$(( ($i - 1) * windowWidth ))
	for j in {1..4}
	do
		posY=$(( ($j - 1) * windowHeight ))
		echo "window pos: $posX $posY  dim: $windowWidth $windowHeight"

		# "${CHROME_APP}" --user-data-dir=${PROFILE} --window-size=$windowWidth,$windowHeight --window-position=$posX,$posY --app=$URL

		"${CHROME_APP}" --profile-directory="Default" \
		--app="data:text/html,
		<html> <body> <script>

		window.moveTo(${posX},${posY});
		window.resizeTo(${windowWidth},${windowHeight});			
		window.location='http://127.0.0.1:8000';

		</script> </body> </html>"
		sleep 0.2

	done
done

# "${CHROME_APP}"

# --window-size=800,600 --window-position=580,240 --app="http://127.0.0.1:8000"
