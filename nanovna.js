/*
Copyright (c) 2019, cho45 <cho45@lowreal.net>
All rights reserved.
Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
    Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the 
    documentation and/or other materials provided with the distribution.
    Neither the name of Great Scott Gadgets nor the names of its contributors may be used to endorse or promote products derived from this software
    without specific prior written permission.
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, 
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

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
		this.initialized = false;
		this.callbacks = [];
		this.onerror = opts.onerror || function () {};
		this.ondisconnected = opts.ondisconnected || function () {};
		this.lastCommand = Promise.resolve();
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
		try {
			await device.open();
		} catch (e) {
			console.log(e);
			throw new Error("failed to open device");
		}
		await device.selectConfiguration(1);
		console.log('claimInterface');
		try {
			// await device.claimInterface(COMMUNICATION_CLASS_INTERFACE);
			await device.claimInterface(DATA_CLASS_INTERFACE);
		} catch (e) {
			console.log(e);
			throw new Error('failed to claim interface');
		}
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
		this.initialized = true;

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
			throw new Error("already started");
		}

		const transfer = async (resolve) => {
			try {
				const result = await this.device.transferIn(USBD1_DATA_AVAILABLE_EP, 64);
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
		this.initialized = false;
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

	async sendCommand(cmd, postProcess) {
		if (!this.initialized) {
			throw new Error("device is not initialized");
		}

		const lastCommand = this.lastCommand;
		this.lastCommand = (async (resolve) => {
			await lastCommand;
			// console.log('sendCommand', cmd);
			await this.waitUntil('ch> ');
			await this.write(cmd);
			// console.log('read echo');
			const echo = await this.readline(); // command echo line
			// console.log('done sendCommand', echo);
			if (postProcess) {
				return await postProcess();
			}
		})();
		return await this.lastCommand;
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
		const data = await this.sendCommand(`data ${s}\r`, async () => await this.getMultiline());
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
		const data = await this.sendCommand(`dump 0\r`, async () => await this.getMultiline());
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
		const data = await this.sendCommand(`frequencies\r`, async () => await this.getMultiline());
		return data.split(/\s+/).map( (n) => +n );
	}

	async getVersion() {
		return await this.sendCommand(`version\r`, async () => await this.readline());
	}

	async getCapture() {
		const width = 320;
		const height = 240;

		const string = await this.sendCommand(`capture\r`, async () => await this.read(width * height * 2));
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

