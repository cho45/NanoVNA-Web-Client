import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
let store, connect, disconnect, startUpdateLoop, getWorker;

// Mock localStorage
const localStorageMock = (() => {
    let store = {};
    return {
        getItem: vi.fn(key => store[key] || null),
        setItem: vi.fn((key, value) => { store[key] = value.toString(); }),
        clear: vi.fn(() => { store = {}; })
    };
})();
Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock Comlink and Worker
class MockWorker {
    constructor() { }
    postMessage() { }
    addEventListener() { }
    removeEventListener() { }
    terminate() { }
}
global.Worker = MockWorker;

vi.mock('comlink', () => ({
    wrap: vi.fn(() => ({
        init: vi.fn(),
        open: vi.fn(() => true),
        getVersion: vi.fn(() => '0.2.0'),
        getInfo: vi.fn(() => ({})),
        close: vi.fn(),
        scan: vi.fn(),
        getData: vi.fn(() => [[0, 0]]),
        getFrequencies: vi.fn(() => [1e6, 2e6, 3e6]),
        refreshConfig: vi.fn(() => ({ start: 1e6, stop: 3e6, segments: 1 })),
        resume: vi.fn(),
        recall: vi.fn(),
        setSweep: vi.fn(),
    })),
    proxy: vi.fn(x => x),
    expose: vi.fn(),
}));

// Mock NanoVNA library
vi.mock('../lib/nanovna', () => ({
    NanoVNA_WebSerial: {
        getDevice: vi.fn(),
        requestDevice: vi.fn(),
        deviceInfo: vi.fn(() => 'Serial Device Info'),
    },
    NanoVNA_WebUSB: {
        getDevice: vi.fn(),
        requestDevice: vi.fn(),
        deviceInfo: vi.fn(() => 'USB Device Info'),
    }
}));

// Mock navigator.serial/usb
// ... existing navigator mocks ...
Object.defineProperty(global, 'navigator', {
    value: {
        serial: {
            getPorts: vi.fn(() => Promise.resolve([])),
            requestPort: vi.fn(() => Promise.resolve({
                open: vi.fn(() => Promise.resolve()),
                close: vi.fn(() => Promise.resolve()),
                readable: { getReader: vi.fn() },
                writable: { getWriter: vi.fn() }
            }))
        },
        usb: {
            getDevices: vi.fn(() => Promise.resolve([])),
            requestDevice: vi.fn(() => Promise.resolve({
                open: vi.fn(() => Promise.resolve()),
                close: vi.fn(() => Promise.resolve()),
                claimInterface: vi.fn(() => Promise.resolve()),
                transferIn: vi.fn(() => Promise.resolve({ data: new DataView(new ArrayBuffer(0)) })),
                transferOut: vi.fn(() => Promise.resolve())
            }))
        }
    },
    writable: true
});

describe('App Store', () => {
    let originalSetTimeout;
    let cleanup = [];

    beforeEach(async () => {
        vi.resetModules();
        const mod = await import('../store');
        store = mod.store;
        connect = mod.connect;
        disconnect = mod.disconnect;
        startUpdateLoop = mod.startUpdateLoop;
        getWorker = mod.getWorker;

        store.status = 'disconnected';
        store.autoUpdate = false;
        store.updating = false;
        store.requestStop = false;
        vi.clearAllMocks();
        originalSetTimeout = global.setTimeout;
        cleanup = [];
    });

    afterEach(() => {
        global.setTimeout = originalSetTimeout;
        cleanup.forEach(fn => fn());

        // Reset the singleton state in store.js if we can't avoid it
        // Actually, we can't easily reset a private variable like loopRunning 
        // unless we export it or use a trick. 
        // Since we are in the same environment, let's try to ensure 
        // the status is disconnected so the loop exits.
        store.status = 'disconnected';
        store.updating = false;
        store.autoUpdate = false;
    });

    it('should match Reference scan logic (Single: resume, Multi: scan loop)', async () => {
        store.status = 'connected';
        store.autoUpdate = true;

        // Default to Multi-Segment for start of test
        store.frequencies.start = 1000000;
        store.frequencies.stop = 2000000;
        store.frequencies.segments = 2;

        const worker = await getWorker();

        // --- Deterministic Control Mechanism ---
        const pendingCalls = [];
        let callNotify = null;

        class Deferred {
            constructor() {
                this.promise = new Promise((resolve) => { this.resolve = resolve; });
            }
        }

        const mockAsync = (name, returnValue) => {
            return vi.fn(async (...args) => {
                // console.log(`[TEST] Called mock: ${name}`);
                const deferred = new Deferred();
                pendingCalls.push({ name, args, deferred, returnValue });
                if (callNotify) { const notify = callNotify; callNotify = null; notify(); }
                return deferred.promise;
            });
        };

        const waitForCall = async () => {
            if (pendingCalls.length > 0) return pendingCalls.shift();
            // console.log(`[TEST] Waiting for call...`);
            await new Promise(r => { callNotify = r; });
            return pendingCalls.shift();
        };

        const overrideMethod = (obj, method, impl) => {
            const original = obj[method];
            obj[method] = impl;
            cleanup.push(() => { obj[method] = original; });
        };

        // Setup controlled mocks
        overrideMethod(worker, 'scan', mockAsync('scan'));
        overrideMethod(worker, 'getFrequencies', mockAsync('getFrequencies', [1e6]));
        overrideMethod(worker, 'resume', mockAsync('resume'));
        overrideMethod(worker, 'getData', mockAsync('getData', [[0, 0]]));

        // Control setTimeout
        vi.spyOn(global, 'setTimeout').mockImplementation((cb, ms) => {
            if (ms === 100) {
                // console.log(`[TEST] Called setTimeout(100)`);
                const deferred = new Deferred();
                pendingCalls.push({ name: 'setTimeout', args: [ms], deferred, cb });
                if (callNotify) { const notify = callNotify; callNotify = null; notify(); }
                deferred.promise.then(() => cb());
                return 12345;
            }
            return originalSetTimeout(cb, ms);
        });

        const tick = () => new Promise(r => setTimeout(r, 0));

        // Start Loop
        // console.log('[TEST] Starting update loop');
        const loopPromise = startUpdateLoop();

        // =========================================================
        // SCENARIO 1: Multi-Segment (segments=2)
        // Original logic: "updateMultiSegments"
        // Expected: scan -> getData -> scan -> getData -> wait
        // =========================================================

        // The loop calls `updateMultiSegments`. `updating` becomes true.
        // First segment scan.
        let call = await waitForCall();
        expect(call.name).toBe('scan');
        expect(store.updating).toBe(true); // Should be updating while scanning
        call.deferred.resolve();
        await tick();

        // getData 0
        call = await waitForCall();
        expect(call.name).toBe('getData');
        expect(store.updating).toBe(true);
        call.deferred.resolve([[0, 0]]);
        await tick();

        // getData 1
        call = await waitForCall();
        expect(call.name).toBe('getData');
        call.deferred.resolve([[0, 0]]);
        await tick();

        // Second segment scan
        call = await waitForCall();
        expect(call.name).toBe('scan');
        call.deferred.resolve();
        await tick();

        // getData 0
        call = await waitForCall();
        expect(call.name).toBe('getData');
        call.deferred.resolve([[0, 0]]);
        await tick();

        // getData 1
        call = await waitForCall();
        expect(call.name).toBe('getData');
        call.deferred.resolve([[0, 0]]);
        await tick();

        // Now `updateMultiSegments` should return.
        // `updating` becomes false in finally block.
        // Then `startUpdateLoop` hits `setTimeout`.
        call = await waitForCall();
        expect(call.name).toBe('setTimeout');
        expect(store.updating).toBe(false); // Should be NOT updating during wait

        // =========================================================
        // SCENARIO 2: Single-Segment (segments=1)
        // Original logic: "updateSingleSegment"
        // Expected: resume -> getFrequencies -> getData -> wait
        // =========================================================

        store.frequencies.segments = 1;
        call.deferred.resolve(); // Release timeout to start next iteration
        await tick();

        // Expect RESUME first
        call = await waitForCall();
        expect(call.name).toBe('resume');
        expect(store.updating).toBe(true);
        call.deferred.resolve();
        await tick();

        // Expect getFrequencies
        call = await waitForCall();
        expect(call.name).toBe('getFrequencies');
        call.deferred.resolve([1e6]);
        await tick();

        // Expect getData 0
        call = await waitForCall();
        expect(call.name).toBe('getData');
        call.deferred.resolve([[0, 0]]);
        await tick();

        // Expect getData 1
        call = await waitForCall();
        expect(call.name).toBe('getData');
        call.deferred.resolve([[0, 0]]);
        await tick();

        // Loop wait
        call = await waitForCall();
        expect(call.name).toBe('setTimeout');
        expect(store.updating).toBe(false);

        // Stop
        store.autoUpdate = false;
        store.status = 'disconnected';
        store.autoUpdate = false;
        call.deferred.resolve();
        await tick();

        await loopPromise;
        expect(store.updating).toBe(false);
    });

    it('should stop multi-segment scan when requestStop is set', async () => {
        store.status = 'connected';
        store.autoUpdate = true;

        // Multi-Segment settings
        store.frequencies.start = 1000000;
        store.frequencies.stop = 2000000;
        store.frequencies.segments = 4; // Use 4 segments

        const worker = await getWorker();

        const pendingCalls = [];
        let callNotify = null;
        class Deferred {
            constructor() { this.promise = new Promise(r => { this.resolve = r; }); }
        }
        const mockAsync = (name) => vi.fn(async (...args) => {
            const deferred = new Deferred();
            pendingCalls.push({ name, deferred });
            if (callNotify) { const n = callNotify; callNotify = null; n(); }
            return deferred.promise;
        });

        const waitForCall = async () => {
            if (pendingCalls.length > 0) return pendingCalls.shift();
            await new Promise(r => { callNotify = r; });
            return pendingCalls.shift();
        };

        const overrideMethod = (obj, method, impl) => {
            const original = obj[method];
            obj[method] = impl;
            cleanup.push(() => { obj[method] = original; });
        };

        overrideMethod(worker, 'scan', mockAsync('scan'));
        overrideMethod(worker, 'getData', mockAsync('getData'));

        // Control setTimeout to capture loop wait
        vi.spyOn(global, 'setTimeout').mockImplementation((cb, ms) => {
            if (ms === 100) {
                const deferred = new Deferred();
                pendingCalls.push({ name: 'setTimeout', args: [ms], deferred, cb });
                if (callNotify) { const n = callNotify; callNotify = null; n(); }
                deferred.promise.then(() => cb());
                return 12345;
            }
            return originalSetTimeout(cb, ms);
        });

        const loopPromise = startUpdateLoop();

        // 1st segment: scan -> getData 0 -> getData 1
        let call = await waitForCall();
        expect(call.name).toBe('scan');
        call.deferred.resolve();

        call = await waitForCall(); // getData 0
        call.deferred.resolve([[0, 0]]);

        call = await waitForCall(); // getData 1
        call.deferred.resolve([[0, 0]]);

        // Now the updateMultiSegments function should continue to Segment 1 or finish if requestStop is set.
        // But requestStop is checked at the START of the for loop.
        // To be safe, we set it now.
        store.requestStop = true;

        // The loop in store.js:
        // while (connected) {
        //   if (autoUpdate) await updateMultiSegments();
        //   if (requestStop) { autoUpdate = false; requestStop = false; }
        //   await setTimeout(100);
        // }

        // Actually, updateMultiSegments also checks requestStop INSIDE its loop:
        // for (...) { if (requestStop) break; ... }
        // So it should break immediately and return to the outer loop.

        call = await waitForCall();
        expect(call.name).toBe('setTimeout');

        expect(store.autoUpdate).toBe(false);
        expect(store.requestStop).toBe(false);

        // Terminate loop
        store.status = 'disconnected';
        call.deferred.resolve();
        await loopPromise;
    });

    it('should properly stop and resume multi-segment scan', async () => {
        store.status = 'connected';
        store.autoUpdate = true;
        store.frequencies.segments = 2;

        const worker = await getWorker();
        const pendingCalls = [];
        let callNotify = null;
        class Deferred { constructor() { this.promise = new Promise(r => { this.resolve = r; }); } }
        const mockAsync = (name) => vi.fn(async () => {
            const d = new Deferred();
            pendingCalls.push({ name, deferred: d });
            if (callNotify) { const n = callNotify; callNotify = null; n(); }
            return d.promise;
        });

        const waitForCall = async () => {
            if (pendingCalls.length > 0) return pendingCalls.shift();
            await new Promise(r => { callNotify = r; });
            return pendingCalls.shift();
        };

        const overrideMethod = (obj, method, impl) => {
            const original = obj[method];
            obj[method] = impl;
            cleanup.push(() => { obj[method] = original; });
        };

        overrideMethod(worker, 'scan', mockAsync('scan'));
        overrideMethod(worker, 'getData', mockAsync('getData'));

        vi.spyOn(global, 'setTimeout').mockImplementation((cb, ms) => {
            if (ms === 100) {
                const d = new Deferred();
                pendingCalls.push({ name: 'setTimeout', deferred: d, cb });
                if (callNotify) { const n = callNotify; callNotify = null; n(); }
                d.promise.then(() => cb());
                return 123;
            }
            return originalSetTimeout(cb, ms);
        });

        // Start loop
        const loopPromise = startUpdateLoop();

        // Wait for first scan
        let call = await waitForCall();
        expect(call.name).toBe('scan');
        call.deferred.resolve();

        // getData calls...
        call = await waitForCall(); call.deferred.resolve([[0, 0]]);
        call = await waitForCall(); call.deferred.resolve([[0, 0]]);

        // Now Request Stop
        store.requestStop = true;

        // Loop should hit setTimeout
        call = await waitForCall();
        expect(call.name).toBe('setTimeout');

        expect(store.autoUpdate).toBe(false);
        expect(store.updating).toBe(false);

        // Resume
        store.autoUpdate = true;
        call.deferred.resolve(); // Release last wait to start next iteration

        // Loop should pick it up and call scan again
        call = await waitForCall();
        expect(call.name).toBe('scan');
        call.deferred.resolve();

        store.status = 'disconnected';
        store.autoUpdate = false;

        // Final getData may happen or it may skip to setTimeout if we disconnect fast
        // Let's just resolve whatever comes next until loop finishes
        const drain = async () => {
            while (true) {
                try {
                    const c = await Promise.race([
                        waitForCall(),
                        new Promise((_, reject) => setTimeout(() => reject('timeout'), 500))
                    ]);
                    c.deferred.resolve([[0, 0]]);
                    if (c.name === 'setTimeout') break;
                } catch (e) { break; }
            }
        };
        drain();

        await loopPromise;
    });



    it('should update device frequency when store.frequencies changes (Single Segment)', async () => {
        store.status = 'connected';
        // store.autoUpdate = true; // Not strictly needed for this test, but consistent
        store.frequencies.segments = 1;

        const worker = await getWorker();

        // Spy on setSweep
        worker.setSweep = vi.fn(() => Promise.resolve());
        worker.scan = vi.fn(() => Promise.resolve());

        // Change start frequency
        store.frequencies.start = 123456;

        // Wait for watcher to trigger (async)
        await new Promise(r => setTimeout(r, 100));

        // Expect setSweep to be called
        expect(worker.setSweep).toHaveBeenCalledWith('start', 123456);

        // Change stop
        store.frequencies.stop = 654321;
        await new Promise(r => setTimeout(r, 100));
        expect(worker.setSweep).toHaveBeenCalledWith('stop', 654321);
    });

    it('should connect using WebUSB when type is usb', async () => {
        store.connectionType = 'usb';
        store.status = 'disconnected';

        // Mock NanoVNA_WebUSB response
        const { NanoVNA_WebUSB } = await import('../lib/nanovna');
        const mockDevice = { name: 'USB Device' };
        NanoVNA_WebUSB.getDevice.mockResolvedValue(mockDevice);

        await connect();

        expect(NanoVNA_WebUSB.getDevice).toHaveBeenCalled();
        expect(store.status).toBe('connected');

        const worker = await getWorker();
        expect(worker.open).toHaveBeenCalledWith({ type: 'usb' });
    });

    it('should throw error when connection fails', async () => {
        store.connectionType = 'serial';
        store.status = 'disconnected';

        const { NanoVNA_WebSerial } = await import('../lib/nanovna');
        const mockDevice = { name: 'Serial Device' };
        NanoVNA_WebSerial.getDevice.mockResolvedValue(mockDevice);

        // Make worker.open throw an error
        const worker = await getWorker();
        const originalOpen = worker.open;
        worker.open = vi.fn().mockRejectedValue(new Error('Connection failed'));

        // connect() should throw
        await expect(connect()).rejects.toThrow('Connection failed');

        // Verify cleanup happened
        expect(store.status).toBe('disconnected');

        // Restore
        worker.open = originalOpen;
    });
});

