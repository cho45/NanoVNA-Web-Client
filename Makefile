

all:
	$(MAKE) -C ./dsp-wasm all

cap:
	rm -rf www
	mkdir www
	ln -sf $(wildcard $(CURDIR)/*.js) www
	ln -sf $(wildcard $(CURDIR)/*.html) www
	ln -sf $(CURDIR)/images www
	ln -sf $(CURDIR)/dsp-wasm www
	cp -RL lib www/lib
	rm -r www/lib/webdfu
	sh -c 'rm -f www/lib/comlink/{esm,umd}/node-adapter.*'
	sh -c 'rm -f www/lib/comlink/{esm,umd}/*.{ts,map}'
	sh -c 'rm -f www/lib/material-design-icons-iconfont/fonts/*.{json,ttf,eot,woff}'
	sh -c 'rm -f www/lib/theme/*.scss www/lib/theme/*/*.scss www/lib/theme/{black-green-dark,black-green-light}.css'
	npm install
	npx cap sync

res:
	convert images/splash.png -gravity center -resize 480x320^ -extent 480x320 ./android/app/src/main/res/drawable/splash.png
	convert images/splash.png -gravity center -resize 800x480^ -extent 800x480 ./android/app/src/main/res/drawable-land-hdpi/splash.png
	convert images/splash.png -gravity center -resize 480x320^ -extent 480x320 ./android/app/src/main/res/drawable-land-mdpi/splash.png
	convert images/splash.png -gravity center -resize 1280x720^ -extent 1280x720 ./android/app/src/main/res/drawable-land-xhdpi/splash.png
	convert images/splash.png -gravity center -resize 1600x960^ -extent 1600x960 ./android/app/src/main/res/drawable-land-xxhdpi/splash.png
	convert images/splash.png -gravity center -resize 1920x1280^ -extent 1920x1280 ./android/app/src/main/res/drawable-land-xxxhdpi/splash.png
	convert images/splash.png -gravity center -resize 480x800^ -extent 480x800 ./android/app/src/main/res/drawable-port-hdpi/splash.png
	convert images/splash.png -gravity center -resize 320x480^ -extent 320x480 ./android/app/src/main/res/drawable-port-mdpi/splash.png
	convert images/splash.png -gravity center -resize 720x1280^ -extent 720x1280 ./android/app/src/main/res/drawable-port-xhdpi/splash.png
	convert images/splash.png -gravity center -resize 960x1600^ -extent 960x1600 ./android/app/src/main/res/drawable-port-xxhdpi/splash.png
	convert images/splash.png -gravity center -resize 1280x1920^ -extent 1280x1920 ./android/app/src/main/res/drawable-port-xxxhdpi/splash.png
	optipng $(wildcard ./android/app/src/main/res/*/splash.png)


android: cap
	cd android && ./gradlew assembleDebug

