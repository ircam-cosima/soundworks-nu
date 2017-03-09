#!/bin/bash

CHROME_APP=/Applications/Browsers/Google\ Chrome.app/Contents/MacOS/Google\ Chrome
URL="http://127.0.0.1:8000"

windowWidth=300
windowHeight=300
I=4
J=4

if [[ $1 == full ]]; then
    echo "full mode"
    I=4
    J=4
    windowHeight=100
    windowWidth=100
fi

for i in $(seq 1 $I);
do
	posY=$(( ($i - 1) * windowWidth ))
	for j in $(seq 1 $J);
	do
		posX=$(( ($j - 1) * windowHeight ))
		# echo "window pos: $posX $posY  dim: $windowWidth $windowHeight"

		# "${CHROME_APP}" --user-data-dir=${PROFILE} --window-size=$windowWidth,$windowHeight --window-position=$posX,$posY --app=$URL

		"${CHROME_APP}" --profile-directory="Default" \
		--app="data:text/html,
		<html> <body> <script>

		window.moveTo(${posX},${posY});
		window.resizeTo(${windowWidth},${windowHeight});			
		window.location='http://127.0.0.1:8000#emulate';

		</script> </body> </html>" &
		sleep 0.1
		if [[ $1 != full ]]; then
			sleep 0.7 # ensures order in client pos / id
		fi

	done
done


# if [[ $1 == full ]]; then
# read -p "Press any key to continue... "
# pkill -f "${CHROME_APP}"
# fi

# "${CHROME_APP}"

# --window-size=800,600 --window-position=580,240 --app="http://127.0.0.1:8000"