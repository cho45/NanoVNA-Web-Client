#!/usr/bin/env sh

set -ex

rm -rf www
mkdir www
ln -sf $PWD/*.js www
ln -sf $PWD/*.html www
ln -sf $PWD/images www
ln -sf $PWD/dsp-wasm www
cp -RL $PWD/lib www/lib

rm -r www/lib/webdfu
rm www/dfu.{js,html}
rm www/lib/comlink/*/node-adapter.*
rm www/lib/comlink/*/*.{ts,map}
rm www/lib/material-design-icons-iconfont/material-design-icons.css.map
rm www/lib/material-design-icons-iconfont/fonts/*.{json,ttf,eot,woff}
rm www/lib/theme/*.scss
rm www/lib/theme/*/*.scss
rm www/lib/theme/black-green-*.css

find www -print

npm install
npx cap sync

