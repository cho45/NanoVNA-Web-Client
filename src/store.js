import { reactive, watch } from 'vue';
import * as Comlink from 'comlink';
import NanoVNA from './lib/nanovna';

const STORAGE_KEY = 'nanovna-web-client-state';

const defaultState = {
    status: 'disconnected',
    frequencies: {
        start: 1e6,
        stop: 900e6,
        center: 450.5e6,
        span: 899e6,
        length: 101, // points
        segments: 1,  // missing in previous
    },
    traces: [
        { id: 0, show: true, channel: 0, format: 'smith', scale: 1.0, offset: 0, color: '#f44336', type: 'clear', avgCount: 2 },
        { id: 1, show: true, channel: 0, format: 'logmag', scale: 10.0, offset: 0, color: '#4caf50', type: 'clear', avgCount: 2 },
        { id: 2, show: false, channel: 1, format: 'logmag', scale: 10.0, offset: 0, color: '#2196f3', type: 'clear', avgCount: 2 },
        { id: 3, show: false, channel: 1, format: 'phase', scale: 90.0, offset: 0, color: '#ffeb3b', type: 'clear', avgCount: 2 }
    ],
    data: {
        ch0: [],  // Array of {freq, real, imag}
        ch1: []   // Array of {freq, real, imag}
    },
    markers: [
        { id: 0, show: true, freq: 1e6, data: [] }
    ],
    activeMarker: 0,
    updating: false,
    requestStop: false, // Added for Stop button
    progress: { value: 0, total: 0 },
    scales: {
        logmag: { min: -80, max: 0 },
        swr: { min: 1, max: 10 },
        phase: { min: -180, max: 180 },
        linear: { min: 0, max: 1 },
        z: { min: -100, max: 100 }
    },
    autoUpdate: true,
    calibrationRunning: false,
    velocityFactor: 0.66, // Default for RG58 etc
    version: '',
    info: '',
    dataVersion: 0, // Increment to force reactive updates
};

function loadState() {
    const saved = localStorage.getItem(STORAGE_KEY);
    // Deep copy defaultState to avoid mutating it
    const state = JSON.parse(JSON.stringify(defaultState));

    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Merge primitives
            if (parsed.activeMarker !== undefined) state.activeMarker = parsed.activeMarker;
            if (parsed.autoUpdate !== undefined) state.autoUpdate = parsed.autoUpdate;
            if (parsed.velocityFactor !== undefined) state.velocityFactor = parsed.velocityFactor;

            // Deep merge nested
            if (parsed.frequencies) {
                state.frequencies = { ...state.frequencies, ...parsed.frequencies };
                if (!state.frequencies.segments || state.frequencies.segments < 1) {
                    state.frequencies.segments = 1;
                }
            }
            if (parsed.traces) state.traces = parsed.traces;
            if (parsed.markers) state.markers = parsed.markers;
            if (parsed.scales) state.scales = { ...state.scales, ...parsed.scales };
        } catch (e) {
            console.error('Failed to load state', e);
        }
    }
    return state;
}

export const store = reactive(loadState());

watch(store, (newState) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({
        frequencies: newState.frequencies,
        traces: newState.traces.map(t => ({ ...t, data: [] })),
        markers: newState.markers.map(m => ({ ...m, data: [] })),
        activeMarker: newState.activeMarker,
        scales: newState.scales,
        velocityFactor: newState.velocityFactor,
        autoUpdate: newState.autoUpdate
    }));
}, { deep: true });

let workerInstance = null;
let workerProxy = null;

export async function getWorker() {
    if (!workerProxy) {
        const WorkerConstructor = (await import('./worker?worker')).default;
        workerInstance = new WorkerConstructor();
        workerProxy = Comlink.wrap(workerInstance);
        await workerProxy.init(Comlink.proxy({
            onerror: (err) => {
                store.status = 'error';
                console.error('Worker error:', err);
            },
            ondisconnected: () => {
                store.status = 'disconnected';
            }
        }));
    }
    return workerProxy;
}

export async function connect() {
    try {
        store.status = 'connecting';

        // Try getting existing ports first (like Original mounted)
        let device = (await navigator.serial.getPorts())[0];

        if (!device) {
            device = await NanoVNA.requestDevice();
        }

        if (!device) {
            store.status = 'disconnected';
            return;
        }

        const worker = await getWorker();

        // Initialize worker with callbacks
        await worker.init(Comlink.proxy({
            onerror: (e) => {
                console.error('Worker error:', e);
                // store.status = 'disconnected'; // Maybe?
            },
            ondisconnected: () => {
                console.log('Worker disconnected');
                store.status = 'disconnected';
                store.autoUpdate = false;
            }
        }));

        const ok = await worker.open({ type: 'serial' });

        if (ok) {
            store.status = 'connected';
            store.autoUpdate = true; // Ensure data acquisition starts
            store.version = await worker.getVersion();
            store.info = await worker.getInfo();
            startUpdateLoop();
        }
    } catch (e) {
        store.status = 'disconnected';
        console.error('Connection failed', e);
        throw e;
    }
}

export async function disconnect() {
    if (workerProxy) {
        await workerProxy.close();
    }
    store.status = 'disconnected';
}

let loopRunning = false;

export async function startUpdateLoop() {
    if (store.status !== 'connected' || loopRunning) return;
    loopRunning = true;

    try {
        const worker = await getWorker();

        const updateSingleSegment = async () => {
            store.updating = true;
            try {
                await worker.resume();
                const freqs = await worker.getFrequencies();

                // Check if frequency range changed (Original logic)
                const currentFreqs = store.frequencies.data || [];
                const changed = freqs.length !== currentFreqs.length || freqs.some((v, i) => v !== currentFreqs[i]);

                if (changed) {
                    store.data.ch0 = [];
                    store.data.ch1 = [];
                    store.frequencies.data = freqs;
                    store.frequencies.length = freqs.length; // Ensure length is updated for UI

                    // Update range from device (Original behavior)
                    if (freqs.length > 0) {
                        const start = freqs[0];
                        const stop = freqs[freqs.length - 1];
                        const span = stop - start;
                        const center = start + span / 2;

                        store.frequencies.start = start;
                        store.frequencies.stop = stop;
                        store.frequencies.span = span;
                        store.frequencies.center = center;
                    }
                }

                const data0 = await worker.getData(0);
                const data1 = await worker.getData(1);
                const needsCh1 = store.traces.some(t => t.channel === 1 && t.show);

                store.data.ch0 = data0.map((d, i) => ({
                    freq: freqs[i],
                    real: d[0],
                    imag: d[1]
                }));

                if (needsCh1) {
                    store.data.ch1 = data1.map((d, i) => ({
                        freq: freqs[i],
                        real: d[0],
                        imag: d[1]
                    }));
                }

                store.dataVersion++;
            } finally {
                store.updating = false;
            }
        };

        const updateMultiSegments = async () => {
            store.updating = true;
            store.requestStop = false;
            try {
                const start = +store.frequencies.start;
                const stop = +store.frequencies.stop;
                const segments = +store.frequencies.segments;
                const segmentSize = 101;
                const totalPoints = segmentSize * segments;
                const step = (stop - start) / (totalPoints - 1);

                // Update length so UI knows we are in multi-segment mode
                store.frequencies.length = totalPoints;

                store.progress.total = segments;
                store.progress.value = 0;

                let currentCh0 = store.data.ch0.length ? [...store.data.ch0] : [];
                let currentCh1 = store.data.ch1.length ? [...store.data.ch1] : [];

                for (let i = 0, n = 0; i < segments; i++) {
                    // Check stop request (Fix for Stop button)
                    if (store.requestStop || store.status !== 'connected') break;
                    // Note: original code checks segments again, but simplified here as segments is unlikely to change mid-loop without reset
                    if (+store.frequencies.segments === 1) break;

                    store.progress.value = i + 1;

                    const segmentStart = start + step * n;
                    const segmentStop = stop - (step * (segments - 1)) + step * n;

                    await worker.scan(segmentStart, segmentStop, segmentSize);

                    const data0 = await worker.getData(0);
                    const data1 = await worker.getData(1);

                    const segmentStep = (segmentStop - segmentStart) / (segmentSize - 1);

                    const segmentFreqs = new Uint32Array(segmentSize);
                    for (let k = 0; k < segmentSize; k++) {
                        segmentFreqs[k] = segmentStep * k + segmentStart;
                    }

                    const segFreqsSet = new Set(segmentFreqs);

                    const merge = (current, incoming) => {
                        const filtered = current.filter(p => !segFreqsSet.has(p.freq));
                        const newPoints = incoming.map((d, k) => ({
                            freq: segmentFreqs[k],
                            real: d[0],
                            imag: d[1]
                        }));
                        return filtered.concat(newPoints).sort((a, b) => a.freq - b.freq);
                    };

                    currentCh0 = merge(currentCh0, data0);
                    currentCh1 = merge(currentCh1, data1);

                    store.data.ch0 = currentCh0;
                    store.data.ch1 = currentCh1;

                    store.frequencies.data = currentCh0.map(p => p.freq);

                    store.dataVersion++;

                    n = i % 2 === 0 ? n + segments - i - 1 : n - (segments - i - 1);
                }
            } finally {
                store.updating = false;
            }
        };

        while (store.status === 'connected') {
            if (store.autoUpdate && !store.updating) {
                const segments = +store.frequencies.segments;
                if (segments === 1) {
                    await updateSingleSegment();
                } else {
                    await updateMultiSegments();
                }
            }
            if (store.requestStop) {
                store.autoUpdate = false;
                store.requestStop = false;
            }
            await new Promise(r => setTimeout(r, 100));
        }
    } finally {
        loopRunning = false;
        store.updating = false;
    }
}

// Watch frequency changes
watch(() => [store.frequencies.start, store.frequencies.stop, store.frequencies.segments], async ([start, stop, segments]) => {
    if (store.status === 'connected' && workerProxy) {
        if (+segments === 1) {
            try {
                // In single segment mode, we must update device registers immediately
                // so that the next resume() call uses the new range.
                await workerProxy.setSweep('start', +start);
                await workerProxy.setSweep('stop', +stop);
            } catch (e) {
                console.error('Failed to update frequency range', e);
            }
        }
    }
});

export async function calibration(step, slot = 0) {
    if (!workerProxy) return;
    store.calibrationRunning = true;
    try {
        await workerProxy.doCal(step, slot);
    } finally {
        store.calibrationRunning = false;
    }
}
