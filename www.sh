#!/usr/bin/env sh

set -ex

echo $PWD

rm -rf www
mkdir www
ln -sf $PWD/*.js www
ln -sf $PWD/*.html www
ln -sf $PWD/images www
ln -sf $PWD/dsp-wasm www
cp -RL $PWD/lib www/lib

find www -print

rm -r www/lib/webdfu
rm www/dfu.js
rm www/dfu.html
rm www/lib/comlink/*/node-adapter.*
rm www/lib/comlink/*/*.ts
rm www/lib/comlink/*/*.map
rm www/lib/material-design-icons-iconfont/material-design-icons.css.map
rm www/lib/material-design-icons-iconfont/fonts/*.json
rm www/lib/material-design-icons-iconfont/fonts/*.ttf
rm www/lib/material-design-icons-iconfont/fonts/*.eot
rm www/lib/material-design-icons-iconfont/fonts/*.woff
rm www/lib/theme/*.scss
rm www/lib/theme/*/*.scss
rm www/lib/theme/black-green-*.css

find www -print

npm install
npx cap sync

