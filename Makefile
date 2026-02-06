all:
	$(MAKE) -C ./dsp-wasm all

devcontainer-rebuild:
	devcontainer rebuild --workspace-folder .

icon:
	python3 generate_icon.py

test:
	$(MAKE) -C ./dsp-wasm test
	npm run test

