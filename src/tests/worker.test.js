import { expect, test, vi, describe, beforeEach } from 'vitest';

// Hoist all mocks to avoid TDZ
const { mockNanoVNAInstance, mockNanoVNA_WebSerial, mockNanoVNA_WebUSB } = vi.hoisted(() => {
    const mockNanoVNAInstance = {
        open: vi.fn(),
        close: vi.fn(),
        version: '1.2.3',
        getFrequencies: vi.fn(),
        getData: vi.fn(),
        setSweep: vi.fn(),
        scan: vi.fn(),
        getCapture: vi.fn(),
        recall: vi.fn(),
        doCal: vi.fn(),
        doSave: vi.fn(),
        calcTDR: vi.fn(),
        getInfo: vi.fn(),
        resume: vi.fn(),
    };

    // Mock constructors - capture last args for testing
    function mockNanoVNA_WebSerial(args) {
        mockNanoVNA_WebSerial.lastArgs = args;
        return mockNanoVNAInstance;
    }
    mockNanoVNA_WebSerial.getDevice = vi.fn();
    mockNanoVNA_WebSerial.lastArgs = null;

    function mockNanoVNA_WebUSB(args) {
        mockNanoVNA_WebUSB.lastArgs = args;
        return mockNanoVNAInstance;
    }
    mockNanoVNA_WebUSB.getDevice = vi.fn();
    mockNanoVNA_WebUSB.lastArgs = null;

    return { mockNanoVNAInstance, mockNanoVNA_WebSerial, mockNanoVNA_WebUSB };
});

// Mock nanovna.js
vi.mock('../lib/nanovna', () => ({
    NanoVNA_Base: {
        DUMP_BUFFER_LEN: 100,
    },
    NanoVNA_WebSerial: mockNanoVNA_WebSerial,
    NanoVNA_WebUSB: mockNanoVNA_WebUSB,
}));

// Mock dsp-wasm - must import actual module then override its default export
vi.mock('../dsp-wasm/web/dsp_wasm', async (importOriginal) => {
    return {
        default: vi.fn(() => Promise.resolve()),
        FFT: vi.fn(function (size, window) {
            this.size = size;
            this.window = window;
        }),
        DSP: vi.fn(function (bufferLen) {
            this.bufferLen = bufferLen;
        }),
    };
});

// Import NanoVNAWorker after mocks
import { NanoVNAWorker } from '../worker';

describe('NanoVNAWorker', () => {
    let worker;
    let callbacks;

    beforeEach(async () => {
        vi.clearAllMocks();

        worker = new NanoVNAWorker();

        callbacks = {
            log: vi.fn(),
            onerror: vi.fn(),
            ondisconnected: vi.fn(),
        };

        await worker.init(callbacks, { skipWasm: true });
    });

    test('init stores callbacks', () => {
        expect(worker.callbacks).toBe(callbacks);
    });

    test('open with serial type selects NanoVNA_WebSerial', async () => {
        const device = { name: 'SerialDevice' };
        mockNanoVNA_WebSerial.getDevice.mockResolvedValue(device);

        await worker.open({ type: 'serial' });

        expect(mockNanoVNA_WebSerial.getDevice).toHaveBeenCalledWith({ type: 'serial' });
        // Constructor was called if mockNanoVNAInstance.open was invoked
        expect(mockNanoVNAInstance.open).toHaveBeenCalledWith(device);
    });

    test('open with usb type selects NanoVNA_WebUSB', async () => {
        const device = { name: 'USBDevice' };
        mockNanoVNA_WebUSB.getDevice.mockResolvedValue(device);

        await worker.open({ type: 'usb' });

        expect(mockNanoVNA_WebUSB.getDevice).toHaveBeenCalledWith({ type: 'usb' });
        // Constructor was called if mockNanoVNAInstance.open was invoked
        expect(mockNanoVNAInstance.open).toHaveBeenCalledWith(device);
    });

    test('open throws if device not found', async () => {
        mockNanoVNA_WebSerial.getDevice.mockResolvedValue(null);
        await expect(worker.open({ type: 'serial' })).rejects.toThrow('Device not found');
    });

    test('open passes proxies for callbacks to ConnectionClass (LOGGING TEST)', async () => {
        const device = { name: 'SerialDevice' };
        mockNanoVNA_WebSerial.getDevice.mockResolvedValue(device);

        await worker.open({ type: 'serial' });

        // Check constructor arguments using captured lastArgs
        const constructorArgs = mockNanoVNA_WebSerial.lastArgs;
        expect(constructorArgs).toHaveProperty('log');
        expect(constructorArgs).toHaveProperty('onerror');
        expect(constructorArgs).toHaveProperty('ondisconnected');

        // Verify callback invocations

        // TEST LOGGING
        constructorArgs.log('test log message');
        expect(callbacks.log).toHaveBeenCalledWith('test log message');

        // TEST ERROR
        constructorArgs.onerror('test error message');
        expect(callbacks.onerror).toHaveBeenCalledWith('test error message');

        // TEST DISCONNECT
        constructorArgs.ondisconnected();
        expect(callbacks.ondisconnected).toHaveBeenCalled();
    });
});
