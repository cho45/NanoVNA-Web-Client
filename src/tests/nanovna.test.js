import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NanoVNA_Base } from '../lib/nanovna';

// 決定論的なテストのための非同期キュー
class AsyncQueue {
    constructor() {
        this.queue = [];
        this.resolvers = [];
    }
    async pop() {
        if (this.queue.length > 0) {
            const item = this.queue.shift();
            if (item instanceof Error) throw item;
            return item;
        }
        return new Promise((resolve, reject) => this.resolvers.push({ resolve, reject }));
    }
    push(data) {
        if (this.resolvers.length > 0) {
            const { resolve, reject } = this.resolvers.shift();
            if (data instanceof Error) reject(data);
            else resolve(data);
        } else {
            this.queue.push(data);
        }
    }
}

class NanoVNA_Mock extends NanoVNA_Base {
    constructor(opts) {
        super(opts);
        this.writeMock = vi.fn();
        this.startReaderThreadMock = vi.fn();
        this.waitQueue = [];
    }

    async write(data) {
        return this.writeMock(data);
    }

    async wait(n) {
        return new Promise(resolve => this.waitQueue.push({ n, resolve }));
    }

    resolveWait(n) {
        for (let i = this.waitQueue.length - 1; i >= 0; i--) {
            if (this.waitQueue[i].n === n) {
                const { resolve } = this.waitQueue.splice(i, 1)[0];
                resolve();
                return true;
            }
        }
        return false;
    }

    startReaderThread(callback) {
        this.readerCallback = callback;
        return this.startReaderThreadMock(callback);
    }

    simulateData(data) {
        if (typeof data === 'string') {
            const encoder = new TextEncoder();
            this.readerCallback(encoder.encode(data));
        } else {
            this.readerCallback(data);
        }
    }
}

const flush = () => new Promise(resolve => setTimeout(resolve, 0));

describe('NanoVNA_Base (Step-by-Step)', () => {
    let vna;

    beforeEach(() => {
        vna = new NanoVNA_Mock();
        vna.startReaderThread((data) => {
            const decoder = new TextDecoder('ascii');
            vna.buffer += decoder.decode(data);
            const callbacks = [...vna.callbacks];
            vna.callbacks.length = 0;
            for (const resolve of callbacks) resolve();
        });
    });

    it('should initialize and fetch version and info', async () => {
        const p = vna.init();
        await flush();
        vna.simulateData('ch> ');
        vna.resolveWait(0.2);
        await flush(); await flush();

        // Version command
        vna.simulateData('version\r\n0.2.0\nch> ');

        // Info command
        await flush(); await flush();
        vna.simulateData('info\r\nBoard: NanoVNA-H 4\nVersion: 1.2.3\nch> ');

        await p;
        expect(vna.version).toBe('0.2.0\n');
        expect(vna.info).toContain('NanoVNA-H 4');
        expect(vna.screen_width).toBe(480);
        expect(vna.screen_height).toBe(320);
    });

    it('should default resolution for unknown board', async () => {
        const p = vna.init();
        await flush();
        vna.simulateData('ch> ');
        vna.resolveWait(0.2);
        await flush(); await flush();

        // Version command
        vna.simulateData('version\r\n0.2.0\nch> ');

        // Info command
        await flush(); await flush();
        vna.simulateData('info\r\nBoard: NanoVNA-F\nVersion: 1.2.3\nch> ');

        await p;
        expect(vna.info).toContain('NanoVNA-F');
        expect(vna.screen_width).toBe(320);
        expect(vna.screen_height).toBe(240);
    });

    describe('Retrieval Logic', () => {
        beforeEach(() => vna.initialized = true);

        it('read(n) consumes correctly', async () => {
            const p = vna.read(3);
            vna.simulateData('abcd');
            expect(await p).toBe('abc');
            expect(vna.buffer).toBe('d');
        });

        it('readline variations (independent buffer)', async () => {
            vna.buffer = 'part1\npart2';
            expect(await vna.readline()).toBe('part1\n');

            vna.buffer = 'data\r\nnext';
            expect(await vna.readline('\r\n', false)).toBe('data');
            expect(vna.buffer).toBe('\r\nnext');
        });

        it('waitUntil finds index', async () => {
            const p = vna.waitUntil('TARGET');
            vna.simulateData('...TARGET...');
            expect(await p).toBe(3);
        });
    });

    describe('Command Operations', () => {
        beforeEach(() => {
            vna.initialized = true;
            vna.buffer = 'ch> ';
        });

        it('throws error if not initialized', async () => {
            vna.initialized = false;
            await expect(vna.sendCommand('test\r')).rejects.toThrow('device is not initialized');
        });

        it('queues commands based on prompts', async () => {
            const p1 = vna.sendCommand('c1\r');
            const p2 = vna.sendCommand('c2\r');
            await flush();
            expect(vna.writeMock).toHaveBeenCalledWith('c1\r');
            vna.simulateData('c1\r\nch> ');
            await p1;
            await flush();
            expect(vna.writeMock).toHaveBeenCalledWith('c2\r');
        });

        it('wrappers call correct commands', async () => {
            vi.spyOn(vna, 'sendCommand').mockResolvedValue();

            await vna.setFrequency(2e6);
            expect(vna.sendCommand).toHaveBeenCalledWith('freq 2000000\r');

            await vna.setPort(1);
            expect(vna.sendCommand).toHaveBeenCalledWith('port 1\r');

            await vna.setGain(10);
            expect(vna.sendCommand).toHaveBeenCalledWith('gain 10 10\r');

            await vna.setOffset(100);
            expect(vna.sendCommand).toHaveBeenCalledWith('offset 100\r');

            await vna.setPower(3);
            expect(vna.sendCommand).toHaveBeenCalledWith('power 3\r');

            await vna.resume();
            expect(vna.sendCommand).toHaveBeenCalledWith('resume\r');

            await vna.pause();
            expect(vna.sendCommand).toHaveBeenCalledWith('pause\r');

            await vna.setSweep('start', 1e6);
            expect(vna.sendCommand).toHaveBeenCalledWith('sweep start 1000000\r');

            await vna.scan(1e6, 2e6, 101);
            expect(vna.sendCommand).toHaveBeenCalledWith('scan 1000000 2000000 101\r');

            await vna.recall(1);
            expect(vna.sendCommand).toHaveBeenCalledWith('recall 1\r');

            await vna.doCal('open');
            expect(vna.sendCommand).toHaveBeenCalledWith('cal open\r');

            await vna.doSave(2);
            expect(vna.sendCommand).toHaveBeenCalledWith('save 2\r');

            await vna.enterDFU();
            expect(vna.sendCommand).toHaveBeenCalledWith('reset dfu\r');
        });

        it('getInfo returns multiline info', async () => {
            const p = vna.getInfo();
            await flush(); await flush();
            vna.simulateData('info\r\nline1\r\nline2\r\nch> ');
            expect(await p).toBe('line1\r\nline2');
        });
    });

    describe('Parsers and Data Retrieval', () => {
        beforeEach(() => {
            vna.initialized = true;
            vna.buffer = 'ch> ';
        });

        it('getData parses coordinates correctly', async () => {
            const p = vna.getData(0);
            await flush(); await flush();
            vna.simulateData('data 0\r\n1.2 3.4\r\n5.6 7.8\r\nch> ');
            expect(await p).toEqual([[1.2, 3.4], [5.6, 7.8]]);
        });

        it('getFrequencies parses frequency list', async () => {
            const p = vna.getFrequencies();
            await flush(); await flush();
            vna.simulateData('frequencies\r\n1000000 2000000 3000000\r\nch> ');
            expect(await p).toEqual([1000000, 2000000, 3000000]);
        });

        it('getRawWave handles setFrequency -> wait -> dump sequence', async () => {
            const p = vna.getRawWave(1e6);

            // 1. freq command
            await flush(); await flush();
            expect(vna.writeMock).toHaveBeenCalledWith('freq 1000000\r');
            vna.simulateData('freq 1000000\r\nch> ');

            // 2. intermediate wait(0.002)
            await flush();
            expect(vna.waitQueue.some(w => w.n === 0.002)).toBe(true);
            vna.resolveWait(0.002);

            // 3. dump command
            await flush(); await flush();
            expect(vna.writeMock).toHaveBeenCalledWith('dump 0\r');

            let mockData = 'dump 0\r\n';
            // DUMP_BUFFER_LEN is 48
            for (let i = 0; i < 48; i++) {
                // Using hex-like string because parseInt(..., 16) is used
                mockData += `${i.toString(16)} ${(i * 2).toString(16)} `;
            }
            vna.simulateData(mockData + '\r\nch> ');

            const [ref, samp] = await p;
            expect(ref.length).toBe(48);
            expect(ref[0]).toBe(0);
            expect(ref[1]).toBe(1);
            expect(samp[1]).toBe(2);
            expect(ref[47]).toBe(47);
        });

        it('getCapture parses binary blocks of 320x240 RGB565', async () => {
            const p = vna.getCapture();
            await flush(); await flush();
            vna.simulateData('capture\r\n');

            const width = 320;
            const height = 240;
            const bits = new Uint8Array(width * height * 2);
            for (let i = 0; i < width * height; i++) {
                bits[i * 2] = 0x12;
                bits[i * 2 + 1] = 0x34;
            }
            vna.simulateData(bits);

            const res = await p;
            expect(res.length).toBe(width * height);
            expect(res[0]).toBe(0x1234);
            expect(res[width * height - 1]).toBe(0x1234);
        });

        it('getCapture uses 480x320 for NanoVNA-H 4', async () => {
            vna.info = 'NanoVNA-H 4';
            vna.screen_width = 480;
            vna.screen_height = 320;

            const p = vna.getCapture();
            await flush(); await flush();
            vna.simulateData('capture\r\n');

            const width = 480;
            const height = 320;
            const bits = new Uint8Array(width * height * 2);
            bits.fill(0xFF); // Simple fill
            vna.simulateData(bits);

            const res = await p;
            expect(res.length).toBe(width * height);
        });
    });

    describe('Initialization and Retry Logic', () => {
        it('retries initialization if first attempt times out', async () => {
            const p = vna.init();
            await flush();

            // First attempt: write '\r', then wait(0.2)
            expect(vna.writeMock).toHaveBeenCalledWith('\r');

            // Simulate 2s timeout race (the second promise in the race)
            vna.resolveWait(2);
            await flush(); // Should loop back

            // Second attempt
            expect(vna.writeMock).toHaveBeenCalledTimes(2);
            vna.simulateData('ch> ');
            vna.resolveWait(0.2); // wait(0.2) is after write('\r')

            await flush(); await flush();
            vna.simulateData('version\r\n0.2.0\nch> ');

            // Info command
            await flush(); await flush();
            vna.simulateData('info\r\nBoard: NanoVNA-H\nVersion: 1.2.3\nch> ');

            await p;
            expect(vna.initialized).toBe(true);
            expect(vna.version).toBe('0.2.0\n');
        });
    });
});

describe('NanoVNA_WebUSB (Deterministic)', () => {
    let device, usbQueue;
    beforeEach(() => {
        usbQueue = new AsyncQueue();
        device = {
            open: vi.fn().mockResolvedValue(),
            selectConfiguration: vi.fn().mockResolvedValue(),
            claimInterface: vi.fn().mockResolvedValue(),
            transferIn: vi.fn().mockImplementation(() => usbQueue.pop()),
            transferOut: vi.fn().mockResolvedValue(),
            clearHalt: vi.fn().mockResolvedValue(),
            close: vi.fn().mockResolvedValue(),
        };
    });

    it('terminates loop by push-and-close', async () => {
        const { NanoVNA_WebUSB } = await import('../lib/nanovna');
        const webusb = new NanoVNA_WebUSB();
        webusb.device = device;
        const thread = webusb.startReaderThread(vi.fn());

        const stop = webusb.stopReaderThread();
        // Resolve both reader threads
        usbQueue.push({ status: 'ok', data: { buffer: new ArrayBuffer(0) } });
        usbQueue.push({ status: 'ok', data: { buffer: new ArrayBuffer(0) } });

        await stop;
        await thread;
        expect(webusb.readerThread).toBeNull();
    });

    it('handles stall status in transferIn', async () => {
        const { NanoVNA_WebUSB } = await import('../lib/nanovna');
        const webusb = new NanoVNA_WebUSB();
        webusb.device = device;
        const callback = vi.fn();
        webusb.startReaderThread(callback);

        usbQueue.push({ status: 'stall' });
        await flush();
        expect(device.clearHalt).toHaveBeenCalled();

        // Push actual data to check if it continues
        const data = new Uint8Array([1, 2, 3]);
        usbQueue.push({ status: 'ok', data: { buffer: data.buffer } });
        await flush();
        expect(callback).toHaveBeenCalledWith(data);
    });

    it('handles error in transferIn', async () => {
        const { NanoVNA_WebUSB } = await import('../lib/nanovna');
        const onerror = vi.fn();
        const webusb = new NanoVNA_WebUSB({ onerror });
        webusb.device = device;
        vi.spyOn(webusb, 'close').mockResolvedValue();

        webusb.startReaderThread(vi.fn());
        usbQueue.push(new Error('USB Error'));

        await flush();
        expect(onerror).toHaveBeenCalled();
        expect(webusb.close).toHaveBeenCalled();
    });

    it('open() calls necessary USB methods', async () => {
        const { NanoVNA_WebUSB } = await import('../lib/nanovna');
        const webusb = new NanoVNA_WebUSB();
        vi.spyOn(webusb, 'init').mockResolvedValue();

        await webusb.open(device);

        expect(device.open).toHaveBeenCalled();
        expect(device.selectConfiguration).toHaveBeenCalledWith(1);
        expect(device.claimInterface).toHaveBeenCalledWith(1);
        expect(webusb.device).toBe(device);
        expect(webusb.init).toHaveBeenCalled();
    });

    it('write() handles string and Uint8Array', async () => {
        const { NanoVNA_WebUSB } = await import('../lib/nanovna');
        const webusb = new NanoVNA_WebUSB();
        webusb.device = device;

        await webusb.write('hello');
        expect(device.transferOut).toHaveBeenCalled();

        const data = new Uint8Array([1, 2, 3]);
        await webusb.write(data);
        expect(device.transferOut).toHaveBeenCalledWith(expect.any(Number), data);
    });

    it('handles null result in transferIn', async () => {
        const { NanoVNA_WebUSB } = await import('../lib/nanovna');
        const webusb = new NanoVNA_WebUSB();
        webusb.device = device;
        const callback = vi.fn();
        webusb.startReaderThread(callback);

        usbQueue.push(null);
        await flush();
        expect(callback).not.toHaveBeenCalled();
    });
});

describe('NanoVNA_WebSerial (Deterministic)', () => {
    let port, serialQueue, mockReader, mockWriter;
    beforeEach(() => {
        serialQueue = new AsyncQueue();
        mockReader = {
            read: vi.fn().mockImplementation(() => serialQueue.pop()),
            releaseLock: vi.fn(),
            cancel: vi.fn().mockResolvedValue(),
        };
        mockWriter = {
            write: vi.fn().mockResolvedValue(),
            releaseLock: vi.fn(),
        };
        port = {
            open: vi.fn().mockResolvedValue(),
            close: vi.fn().mockResolvedValue(),
            readable: { getReader: () => mockReader },
            writable: { getWriter: () => mockWriter },
        };
    });

    it('terminates loop by done flag', async () => {
        const { NanoVNA_WebSerial } = await import('../lib/nanovna');
        const webserial = new NanoVNA_WebSerial();
        webserial.port = port;
        const thread = webserial.startReaderThread(vi.fn());

        const stop = webserial.stopReaderThread();
        serialQueue.push({ value: null, done: true });

        await stop;
        await thread;
        expect(webserial.readerThread).toBeNull();
    });

    it('handles error in read()', async () => {
        const { NanoVNA_WebSerial } = await import('../lib/nanovna');
        const onerror = vi.fn();
        const webserial = new NanoVNA_WebSerial({ onerror });
        webserial.port = port;
        vi.spyOn(webserial, 'close').mockResolvedValue();

        webserial.startReaderThread(vi.fn());
        serialQueue.push(new Error('Serial Error'));

        await flush();
        expect(onerror).toHaveBeenCalled();
        expect(webserial.close).toHaveBeenCalled();
    });

    it('open() and write() works', async () => {
        const { NanoVNA_WebSerial } = await import('../lib/nanovna');
        const webserial = new NanoVNA_WebSerial();
        vi.spyOn(webserial, 'init').mockResolvedValue();

        await webserial.open(port);
        expect(port.open).toHaveBeenCalled();
        expect(webserial.init).toHaveBeenCalled();

        await webserial.write('test');
        expect(mockWriter.write).toHaveBeenCalled();
        expect(mockWriter.releaseLock).toHaveBeenCalled();
    });

    it('handles unexpected EOF', async () => {
        const { NanoVNA_WebSerial } = await import('../lib/nanovna');
        const onerror = vi.fn();
        const webserial = new NanoVNA_WebSerial({ onerror });
        webserial.port = port;
        vi.spyOn(webserial, 'close').mockResolvedValue();

        webserial.startReaderThread(vi.fn());
        serialQueue.push({ value: null, done: true });

        await flush();
        expect(onerror).toHaveBeenCalledWith(expect.objectContaining({ message: 'EOF' }));
        expect(webserial.close).toHaveBeenCalled();
    });

    it('static methods return correct values', async () => {
        const { NanoVNA_WebSerial } = await import('../lib/nanovna');
        global.navigator.serial = {
            requestPort: vi.fn().mockResolvedValue({}),
            getPorts: vi.fn().mockResolvedValue([{}]),
        };
        expect(await NanoVNA_WebSerial.requestDevice()).not.toBeNull();
        expect(await NanoVNA_WebSerial.getDevice()).not.toBeNull();
        expect(NanoVNA_WebSerial.deviceInfo({})).toEqual({ type: 'serial' });

        delete global.navigator.serial;
        expect(await NanoVNA_WebSerial.requestDevice()).toBeNull();
    });
});

describe('NanoVNA_Base Static Constants', () => {
    it('has correct buffer lengths', () => {
        expect(NanoVNA_Base.AUDIO_BUFFER_LEN).toBe(96);
        expect(NanoVNA_Base.DUMP_BUFFER_LEN).toBe(48);
    });
});

describe('NanoVNA_Base Additional Edge Cases', () => {
    let vna;
    beforeEach(() => {
        vna = new NanoVNA_Mock();
        vna.initialized = true;
        // Setup internal reader logic similar to NanoVNA_Base.init
        vna.startReaderThread((data) => {
            const decoder = new TextDecoder('ascii');
            vna.buffer += decoder.decode(data);
            const callbacks = [...vna.callbacks];
            vna.callbacks.length = 0;
            for (const resolve of callbacks) resolve();
        });
    });

    it('sendCommand handles postProcess failure and allows subsequent commands', async () => {
        vna.buffer = 'ch> ';
        const postProcess = vi.fn().mockRejectedValue(new Error('PostProcess Failed'));
        const p1 = vna.sendCommand('test\r', postProcess);

        await flush();
        vna.simulateData('test\r\n'); // Echo line for readline()

        await expect(p1).rejects.toThrow('PostProcess Failed');

        // Subsequent commands should still work
        vna.buffer = 'ch> ';
        const p2 = vna.sendCommand('next\r');
        await flush();
        vna.simulateData('next\r\n'); // Echo line
        vna.simulateData('ch> ');    // Prompt
        await p2;
        expect(vna.writeMock).toHaveBeenCalledWith('next\r');
    });

    it('read(n) waits for enough data', async () => {
        const p = vna.read(5);
        vna.simulateData('12');
        await flush();
        vna.simulateData('3456');
        expect(await p).toBe('12345');
        expect(vna.buffer).toBe('6');
    });
});

describe('NanoVNA_WebUSB Static Methods', () => {
    it('getDevice filters correctly', async () => {
        const { NanoVNA_WebUSB } = await import('../lib/nanovna');
        const devices = [
            { vendorId: 0x1111, productId: 0x2222, serialNumber: 'SN1' },
            { vendorId: 0x3333, productId: 0x4444, serialNumber: 'SN2' },
        ];
        global.navigator.usb = {
            getDevices: vi.fn().mockResolvedValue(devices),
            requestDevice: vi.fn().mockResolvedValue(devices[0]),
        };

        expect(await NanoVNA_WebUSB.getDevice()).toBe(devices[0]);
        expect(await NanoVNA_WebUSB.getDevice({ vendorId: 0x3333 })).toBe(devices[1]);
        expect(await NanoVNA_WebUSB.getDevice({ productId: 0x2222 })).toBe(devices[0]);
        expect(await NanoVNA_WebUSB.getDevice({ serialNumber: 'SN2' })).toBe(devices[1]);
        expect(await NanoVNA_WebUSB.getDevice({ vendorId: 0x9999 })).toBeUndefined();

        expect(await NanoVNA_WebUSB.requestDevice()).toBe(devices[0]);
        expect(NanoVNA_WebUSB.deviceInfo(devices[0])).toEqual({
            vendorId: 0x1111,
            productId: 0x2222,
            serialNumber: 'SN1',
            type: 'usb'
        });
    });
});
