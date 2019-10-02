

all:
	$(MAKE) -C ./dsp-wasm all

cap:
	rm -rf www
	mkdir www
	ln -sf $(wildcard $(PWD)/*.js) www
	ln -sf $(wildcard $(PWD)/*.html) www
	ln -sf $(PWD)/images www
	ln -sf $(PWD)/dsp-wasm www
	cp --dereference -r lib www/lib
	npx cap copy

