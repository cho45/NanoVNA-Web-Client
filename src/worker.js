import * as Comlink from 'comlink';
import { NanoVNA_Base, NanoVNA_WebSerial, NanoVNA_WebUSB } from './lib/nanovna';
import initWasm, { FFT, DSP } from '../dsp-wasm/web/dsp_wasm';

const FFT_SIZE = 8192;

class NanoVNAWorker {
    constructor() {
        this.nanovna = null;
        this.onerror = null;
        this.ondisconnected = null;
        this.fft = null;
        this.dsp = null;
        this.frequencies = null;
        this.callbacks = null;
    }

    async init(callbacks, options = {}) {
        this.callbacks = callbacks;
        console.log('init worker');

        // Skip WASM initialization for tests
        if (options.skipWasm) {
            return;
        }

        // Initialize WASM
        await initWasm();

        const window = new Float32Array(FFT_SIZE);
        window.fill(1);
        this.fft = new FFT(FFT_SIZE, window);
        this.dsp = new DSP(NanoVNA_Base.DUMP_BUFFER_LEN);
    }

    async open(opts) {
        console.log('worker.open starting with opts:', opts);

        const NanoVNA = opts.type === 'usb' ? NanoVNA_WebUSB : NanoVNA_WebSerial;

        // Logic update:
        // We rely on getDevice finding the device.
        const device = await NanoVNA.getDevice(opts);
        if (!device) {
            throw new Error('Device not found or not authorized');
        }

        this.nanovna = new NanoVNA({
            onerror: (e) => {
                if (this.callbacks) this.callbacks.onerror(String(e));
            },
            ondisconnected: () => {
                if (this.callbacks) this.callbacks.ondisconnected();
            },
            log: (msg) => {
                if (this.callbacks) this.callbacks.log(msg);
            }
        });

        await this.nanovna.open(device);
        return true;
    }

    async getVersion() {
        return this.nanovna.version;
    }

    async close() {
        if (this.nanovna) {
            await this.nanovna.close();
            this.nanovna = null;
        }
    }

    async resume() {
        await this.nanovna.resume();
    }

    async getFrequencies() {
        if (this.frequencies) return this.frequencies;
        return await this.nanovna.getFrequencies();
    }

    async getData(s) {
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

    async recall(n) {
        return await this.nanovna.recall(n);
    }

    async doCal(step, slot) {
        // NanoVNA command for calibration is 'cal <step>'
        // If slot is provided, it might be for saving
        await this.nanovna.doCal(step);
    }

    async doSave(n) {
        return await this.nanovna.doSave(n);
    }

    // TDR calculation using FFT from WASM
    async calcTDR(chData) {
        const windowFunction = (x) => {
            x = x / 2 + 0.5;
            return 0.54 - 0.46 * Math.cos(Math.PI * 2 * x);
        };

        const freqs = chData.map(i => i.freq);
        const data = chData.map(i => [i.real, i.imag]);

        for (let i = 0, len = data.length; i < len; i++) {
            data[i][0] *= windowFunction(i / len);
            data[i][1] *= windowFunction(i / len);
        }

        const input = new Float32Array(FFT_SIZE * 2);
        for (let i = 0; i < data.length; i++) {
            input[i * 2 + 0] = data[i][0];
            input[i * 2 + 1] = data[i][1];
            input[(FFT_SIZE - i) * 2 + 0] = data[i][0];
            input[(FFT_SIZE - i) * 2 + 1] = -data[i][1];
        }

        const output = new Float32Array(FFT_SIZE * 2);
        this.fft.ifft(input, output);

        const frequencyStep = 1 / (freqs[1] - freqs[0]);
        const timeAxis = new Float32Array(FFT_SIZE).map((_, i) => frequencyStep / (FFT_SIZE - 1) * i);
        return {
            complex: output,
            time: timeAxis,
        };
    }

    async getInfo() {
        return await this.nanovna.getInfo();
    }

    async refreshConfig() {
        const freqs = await this.nanovna.getFrequencies();
        if (freqs.length > 0) {
            return {
                start: freqs[0],
                stop: freqs[freqs.length - 1],
                segments: 1
            };
        }
        return null;
    }
}

// Export for testing
export { NanoVNAWorker };

Comlink.expose(new NanoVNAWorker());
