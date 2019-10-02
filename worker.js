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

//import * as Comlink from "./node_modules/comlink/dist/esm/comlink.mjs";  
importScripts("./lib/comlink/umd/comlink.js");
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

		const window = new Float32Array(FFT_SIZE);
		window.fill(1);
		this.FFT = new lib.wasm_bindgen.FFT(FFT_SIZE, window);
		this.DSP = new lib.wasm_bindgen.DSP(NanoVNA.DUMP_BUFFER_LEN);
	}

	async open(opts) {
		const device = await NanoVNA.getDevice(opts);
		this.nanovna = new NanoVNA({
			onerror: (e) => {
				this.opts.onerror(String(e));
			},
			ondisconnected: this.opts.ondisconnected,
		});
		console.log({opts, device});
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

	async resume() {
		await this.nanovna.resume();
	}

	async getFrequencies() {
		if (this.frequencies) {
			return this.frequencies;
		}
		return await this.nanovna.getFrequencies();
	}

	async getData(s) {
		if (this.frequencies) {
			return await this.calcCoeffsByFreqs(s, this.frequencies);
		}
		return await this.nanovna.getData(s);
	}

	async setSweep(type, freq) {
		return await this.nanovna.setSweep(type, freq);
	}

	async scan(start, stop, length) {
		return await this.nanovna.scan(start, stop, length);
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

	async calcTDR(chData) {
		const windowFunction = (x) => {
			// return 1;

			// windowin low
			x = x / 2 + 0.5;

			/*
			// blackman window
			const alpha = 0.16;
			const a0 = (1.0 - alpha) / 2.0;
			const a1 = 1.0 / 2.0;
			const a2 = alpha / 2.0;
			return  a0 - a1 * Math.cos(2 * Math.PI * x) + a2 * Math.cos(4 * Math.PI * x);
			//*/

			
			// hamming window
			return 0.54 - 0.46 * Math.cos(Math.PI * 2 * x);
			//*/
		};

		const freqs = chData.map( i => i.freq );
		const data = chData.map(i => [i.real, i.imag]);
		// console.log('calcTDR', {chData, freqs, data});

		for (let i = 0, len = data.length; i < len; i++) {
			data[i][0] *= windowFunction(i / len);
			data[i][1] *= windowFunction(i / len);
		}

		const input = new Float32Array(FFT_SIZE * 2);
		// input.set(data.flat());
		for (let i = 0; i < data.length; i++) {
			input[i*2+0] = data[i][0];
			input[i*2+1] = data[i][1];

			input[(FFT_SIZE-i)*2+0] =  data[i][0];
			input[(FFT_SIZE-i)*2+1] = -data[i][1];
		}

		const output = new Float32Array(FFT_SIZE * 2);

		this.FFT.ifft(input, output);

		const frequencyStep = 1 / (freqs[1] - freqs[0]);
		const timeAxis = new Float32Array(FFT_SIZE).map( (_, i) => frequencyStep/(FFT_SIZE-1)*i)
		return {
			complex: output,
			time: timeAxis,
		};
	}

	async getInfo() {
		return await this.nanovna.getInfo();
	}

	async calcCoeffsByFreqs(port, freqs) {
		const start = performance.now();
		await this.nanovna.setPort(port);
		const gammas = [];
		for (let freq of freqs) {
			const [ref, samp] = await this.nanovna.getRawWave(freq);
			const gamma = this.DSP.calc_reflect_coeff_from_rawave(ref, samp);
			gammas.push(gamma);
		}
		const elapsed = performance.now() - start;
		console.log('sweeep done with ', elapsed);
		return gammas;
	}

	hello() {
		console.log('hello');
	}
}

Comlink.expose(Worker);
