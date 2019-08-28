
//import * as Comlink from "./node_modules/comlink/dist/esm/comlink.mjs";  
importScripts("./node_modules/comlink/dist/umd/comlink.js");
importScripts("nanovna.js");

const lib = {};
(() => {
	importScripts("./dsp-wasm/no-modules/dsp_wasm.js");
	lib.wasm_bindgen = self.wasm_bindgen;
	console.log(lib);
})();

const FFT_SIZE = 1024;

class Worker {
	constructor() {
	}

	async init(opts) {
		this.opts = opts;
		console.log('init worker');
		await lib.wasm_bindgen("./dsp-wasm/no-modules/dsp_wasm_bg.wasm");

		const windowFunction = (x) => {
			// blackman window
			const alpha = 0.16;
			const a0 = (1.0 - alpha) / 2.0;
			const a1 = 1.0 / 2.0;
			const a2 = alpha / 2.0;
			return  a0 - a1 * Math.cos(2 * Math.PI * x) + a2 * Math.cos(4 * Math.PI * x);
		};

		const window = new Float32Array(FFT_SIZE);
		for (let i = 0; i < FFT_SIZE; i++) {
			window[i] = windowFunction(i / FFT_SIZE);
		}
		this.FFT = new lib.wasm_bindgen.FFT(FFT_SIZE, window);
	}

	async open(opts) {
		const devices = await navigator.usb.getDevices();
		console.log(opts);
		const device = !opts ? devices[0] : devices.find( d => {
			if (opts.vendorId) {
				if (d.vendorId !== opts.vendorId) {
					return false;
				}
			}
			if (opts.productId) {
				if (d.productId !== opts.productId) {
					return false;
				}
			} 
			if (opts.serialNumber) {
				if (d.serialNumber !== opts.serialNumber) {
					return false;
				}
			}
			return true;
		});
		if (!device) {
			return false;
		}
		console.log(device);
		this.nanovna = new NanoVNA({
			onerror: (e) => {
				this.opts.onerror(String(e));
			},
			ondisconnected: this.opts.ondisconnected,
		});
		await this.nanovna.open(device);
		return true;
	}

	async getVersion() {
		return this.nanovna.version;
	}

	async close() {
		await this.nanovna.close();
		this.nanovna = null;
	}

	async getFrequencies() {
		return await this.nanovna.getFrequencies();
	}

	async getData(s) {
		return await this.nanovna.getData(s);
	}

	async setSweep(type, freq) {
		return await this.nanovna.setSweep(type, freq);
	}

	async getCapture() {
		return await this.nanovna.getCapture();
	}

	async doCal(type) {
		return await this.nanovna.doCal(type);
	}

	async doSave(n) {
		return await this.nanovna.doSave(n);
	}

	async calcTDR() {
		const freqs = await this.getFrequencies();
		const data = await this.getData(0);
		console.log('calcTDR', {freqs, data});

		const input = new Float32Array(FFT_SIZE * 2);
		input.set(data.flat());

		console.log(input);
		const output = new Float32Array(FFT_SIZE);

		this.FFT.ifft_abs(input, output);

		const frequencyStep = 1 / (freqs[1] - freqs[0]);
		const timeAxis = new Float32Array(FFT_SIZE).map( (_, i) => frequencyStep/(FFT_SIZE-1)*i)
		return {
			mag: output,
			time: timeAxis,
		};
	}

	hello() {
		console.log('hello');
	}
}

Comlink.expose(Worker);
