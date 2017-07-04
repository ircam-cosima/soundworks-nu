#!/bin/sh

# ensure current dir is .
LIB_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cd $LIB_DIR

# check for homebrew install
which -s brew
if [[ $? != 0 ]] ; then
    # Suggest to install Homebrew
    echo 'script aborted: install homebrew to continue (check https://brew.sh/index_fr.html)'
    exit
else
    brew update
fi

# install node
brew install node

# install and transpile project
npm install
npm run transpile

# output success
echo '\n'
echo '---------------------------'
echo '## installation complete ##'
echo '---------------------------'
echo '\n'