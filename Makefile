

all:
	$(MAKE) -C ./dsp-wasm all

cap:
	rm -r www
	mkdir www
	ln -sf $(PWD)/*.{js,html} www
	ln -sf $(PWD)/{node_modules,lib,images,dsp-wasm} www
	npx cap copy

