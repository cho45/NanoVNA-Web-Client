set -ex

echo $PWD

rm -rf www
mkdir www
ln -sf $PWD/*.js www
ln -sf $PWD/*.html www
cp -RL $PWD/dsp-wasm www
cp -RL $PWD/lib www

find www -print

rm -r www/lib/webdfu
rm -r www/dsp-wasm/src
rm www/dsp-wasm/*.toml
rm www/dsp-wasm/*.lock
rm www/dsp-wasm/.gitignore
rm www/dsp-wasm/no-modules/*.d.ts
rm www/dsp-wasm/no-modules/package.json
rm www/dsp-wasm/Makefile
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
