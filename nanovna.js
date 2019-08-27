const CDC_SET_LINE_CODING        = 0x20;
const CDC_GET_LINE_CODING        = 0x21;
const CDC_SET_CONTROL_LINE_STATE = 0x22;
const CLS_DTR  = (1 << 0);
const CLS_RTS  = (1 << 1);

const COMMUNICATION_CLASS_INTERFACE = 0;
const DATA_CLASS_INTERFACE = 1;
// https://github.com/ttrftech/NanoVNA/blob/master/usbcfg.c#L25
const USBD1_DATA_REQUEST_EP = 1;
const USBD1_DATA_AVAILABLE_EP = 1;

const REF_LEVEL = (1<<9);

class NanoVNA {
	constructor(opts) {
		this.callbacks = [];
		this.onerror = opts.onerror || function () {};
		this.ondisconnected = opts.ondisconnected || function () {};
	}

	static async requestDevice(filters) {
		const device = await navigator.usb.requestDevice({
			filters: filters || [
				// https://github.com/ttrftech/NanoVNA/blob/master/usbcfg.c#L38
				{ 'vendorId': 0x0483, 'productId': 0x5740 }
			]
		}).catch(e => null);
		if (!device) {
			console.log('no device matched');
			return;
		}
		return device;
	}

	async open(device) {
		if (this.device) {
			await this.close();
		}

		console.log(device);
		console.log(device.configurations);

		console.log('open device', device);
		await device.open();
		await device.selectConfiguration(1);
		console.log('claimInterface');
		// await device.claimInterface(COMMUNICATION_CLASS_INTERFACE);
		await device.claimInterface(DATA_CLASS_INTERFACE);
		console.log('device was opened');

		this.device = device;

		const callbacks = this.callbacks;

		this.buffer = '';
		this.startReaderThread( (data) => {
			this.buffer += String.fromCharCode(...data);
			for (var i = 0, it; (it = callbacks[i]); i++) {
				it();
			}
			callbacks.length = 0;
		});

		for (;;) {
			console.log('initialize...');
			const ok = await Promise.race([
				(async () => {
					console.log('init');
					await this.write('\r');
					await this.wait(0.2);
					await this.waitUntil('ch> ');
					return true;
				})(),
				(async () => {
					console.log('timeout');
					await this.wait(2);
					return false;
				})()
			]);
			if (ok) break;
		}
		this.buffer = 'ch> ';

		this.version = await this.getVersion();
		console.log('version', this.version);
	}
	
	waitNextData() {
		return new Promise( (resolve) => {
			this.callbacks.push(resolve);
		});
	}

	async startReaderThread(callback) {
		if (this.readerThread) {
			throw "already started";
		}

		const transfer = async (resolve) => {
			try {
				const result = await this.device.transferIn(USBD1_DATA_AVAILABLE_EP, 4096);
				if (this.readerThread) {
					transfer(resolve);
				} else {
					resolve();
				}
				// console.log('transferIn', result.status);
				if (result) {
					if (result.status === 'stall') {
						console.warn('Endpoint stalled. Clearing.');
						await this.device.clearHalt('in', USBD1_DATA_AVAILABLE_EP);
					}
					if (result.status === 'ok') {
						callback(new Uint8Array(result.data.buffer));
					} else {
						console.log('failed to get transfer');
					}
				}
			} catch (e) {
				console.error('error on transfer', String(e));
				this.onerror(e);
				this.close();
			}
		}
		this.readerThread = [
			new Promise( resolve => transfer(resolve) ).catch( (e) => {
				console.log('readerThread catch', e);
			}),
			new Promise( resolve => transfer(resolve) ).catch( (e) => {
				console.log('readerThread catch', e);
			})
		];
	}

	async stopReaderThread() {
		if (this.readerThread) {
			console.log('stopReaderThread');
			const promises = this.readerThread;
			this.readerThread = null;
			await Promise.all(promises);
		}
	}

	async write(data) {
		if (typeof data === "string") {
			// string to utf-8 arraybuffer
			const arraybuffer = await new Promise( (resolve, reject) => {
				const reader = new FileReader();
				reader.onloadend = function () {
					resolve(reader.result);
				};
				reader.readAsArrayBuffer(new Blob([data]));
			});
			await this.device.transferOut(USBD1_DATA_REQUEST_EP, arraybuffer);
		} else {
			await this.device.transferOut(USBD1_DATA_REQUEST_EP, data);
		}
	}

	async close() {
		console.log('close');
		try {
			await this.stopReaderThread();
		} catch (e) {
			console.log('failed to stop reader thread');
		}
		try {
			console.log('device.close()');
			await this.device.close();
		} catch (e) {
			console.log('failed to close device');
		}
		console.log('call disconnect callback');
		this.ondisconnected();
	}

	async read(n) {
		if (!n) n = 1;
		while (this.buffer.length < n) {
			await this.waitNextData();
		}

		const ret = this.buffer.substring(0, n);
		this.buffer = this.buffer.substring(n);
		return ret;
	}

	async readline(eol, removeEol) {
		if (!eol) eol = '\n';
		if (typeof removeEol === 'undefined') removeEol = true;
		const index = await this.waitUntil(eol);

		return await this.read(index + (removeEol ? eol.length : 0));
	}

	async waitUntil(string) {
		let index;
		while ((index = this.buffer.indexOf(string)) === -1) {
			// console.log('waitUntil', JSON.stringify(string), JSON.stringify(this.buffer));
			await this.waitNextData();
		}
		// console.log('waitUntil done', JSON.stringify(string), JSON.stringify(this.buffer));
		return index;
	}

	async wait(n) {
		return new Promise( (resolve) => setTimeout(resolve, n * 1000) );
	}

	async sendCommand(cmd) {
		// console.log('sendCommand', cmd);
		await this.waitUntil('ch> ');
		await this.write(cmd);
		// console.log('read echo');
		const echo = await this.readline(); // command echo line
		// console.log('done sendCommand', echo);
	}

	async setFrequency(freq) {
		await this.sendCommand(`freq ${freq}\r`);
	}

	async setPort(port) {
		await this.sendCommand(`port ${port}\r`);
	}

	async setGain(gain) {
		await this.sendCommand(`gain ${gain} ${gain}\r`);
	}

	async setOffset(offset) {
		await this.sendCommand(`offset ${offset}\r`);
	}

	async setPower(power) {
		await this.sendCommand(`power ${power}\r`);
	}

	async getMultiline() {
		const lines = await this.readline('ch> ', false);
		return lines.slice(0, -2);
	}

	/**
	 * 0 -> measured 0
	 * 1 -> measured 1
	 * 2 -> cal_data 0
	 * 3 -> cal_data 1
	 * 4 -> cal_data 2
	 * 5 -> cal_data 3
	 * 6 -> cal_data 4
	 */
	async getData(s) {
		await this.sendCommand(`data ${s}\r`);
		const data = await this.getMultiline();
		// console.log(data);

		const nums = data.split(/\s+/);
		const ret = [];
		for (var i = 0, len = nums.length; i < len; i += 2) {
			ret.push([+nums[i+0], +nums[i+1]]);
		}
		return ret;
	}

	async getRawWave(s, freq) {
		if (freq) {
			await this.setFrequency(freq);
			await this.wait(0.05);
		}
		await this.sendCommand(`dump 0\r`);
		const data = await this.getMultiline();
		const nums = data.split(/\s+/);
		const ret = [];
		for (var i = 0, len = nums.length; i < len; i += 2) {
			ret.push([+nums[i+0], +nums[i+1]]);
		}
		return ret;
	}

	async resume() {
		await this.sendCommand(`resume\r`);
	}

	async pause() {
		await this.sendCommand(`pause\r`);
	}

	async setSweep(type, freq) {
		console.log('sweep', type, freq);
		await this.sendCommand(`sweep ${type} ${freq}\r`);
	}

	async getFrequencies() {
		await this.sendCommand(`frequencies\r`);
		const data = await this.getMultiline();
		return data.split(/\s+/).map( (n) => +n );
	}

	async getVersion() {
		await this.sendCommand(`version\r`);
		return (await this.readline());
	}

	async getCapture() {
		const width = 320;
		const height = 240;

		await this.sendCommand(`capture\r`);
		const string = await this.read(width * height * 2)
		const uint16view = new Uint16Array(width * height);
		for (var i = 0, len = width * height; i < len; i++) {
			uint16view[i] =
				((string.charCodeAt(i*2+0) & 0xff) << 8) |
				((string.charCodeAt(i*2+1) & 0xff) << 0) ;
		}
		return uint16view;
	}

	async doCal(type) {
		await this.sendCommand(`cal ${type}\r`);
	}

	async doSave(n) {
		await this.sendCommand(`save ${n}\r`);
	}
}

