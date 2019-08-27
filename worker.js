
//import * as Comlink from "./node_modules/comlink/dist/esm/comlink.mjs";  
importScripts("./node_modules/comlink/dist/umd/comlink.js");
importScripts("nanovna.js");

class Worker {
	constructor() {
	}

	async init(opts) {
		this.opts = opts;
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

	hello() {
		console.log('hello');
	}
}

Comlink.expose(Worker);
