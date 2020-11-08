#!/usr/bin/env sh

set -ex

./copy-minimum.sh

find www -print

npm install
npx cap sync

