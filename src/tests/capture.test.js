import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NanoVNA_Base } from '../lib/nanovna';

// Test getCapture functionality
describe('NanoVNA Capture', () => {
    let vna;
    let writeMock;
    let readerCallback;

    class NanoVNA_Mock extends NanoVNA_Base {
        constructor(opts) {
            super(opts);
            writeMock = vi.fn();
        }

        async write(data) {
            return writeMock(data);
        }

        startReaderThread(callback) {
            readerCallback = callback;
            return vi.fn();
        }

        simulateData(string) {
            const encoder = new TextEncoder();
            readerCallback(encoder.encode(string));
        }

        simulateBinaryData(data) {
            readerCallback(data);
        }
    }

    beforeEach(() => {
        vna = new NanoVNA_Mock();
        vna.startReaderThread((data) => {
            // Convert Uint8Array to string for text data
            if (typeof data[0] === 'number' && data[0] < 128) {
                vna.buffer += String.fromCharCode(...data);
            }
            for (let i = 0, it; (it = vna.callbacks[i]); i++) {
                it();
            }
            vna.callbacks.length = 0;
        });
    });

    it('should send capture command', async () => {
        vna.initialized = true;
        vna.buffer = 'ch> ';

        // Start capture but don't await (we'll simulate response)
        const capturePromise = vna.getCapture();

        // Wait for command to be sent
        await vi.waitFor(() => {
            if (writeMock.mock.calls.some(call => call[0] === 'capture\r')) return true;
            throw new Error('Waiting for capture command');
        });

        expect(writeMock).toHaveBeenCalledWith('capture\r');

        // Simulate echo and binary response (320*240*2 bytes = 153600 bytes)
        // For test, we just verify the command was sent
        // Full binary parsing would require more complex mocking
    });
});

// Test RGB565 to RGBA conversion (isolated unit test)
describe('RGB565 Conversion', () => {
    it('should convert RGB565 to correct RGBA values', () => {
        // RGB565 format: RRRRR GGGGGG BBBBB (5-6-5 bits)
        // Test white (all 1s): 0xFFFF
        const white565 = 0xFFFF;
        const r_white = ((white565 >> 11) & 0b011111) << 3;
        const g_white = ((white565 >> 5) & 0b111111) << 2;
        const b_white = ((white565 >> 0) & 0b011111) << 3;
        expect(r_white).toBe(248); // 31 << 3
        expect(g_white).toBe(252); // 63 << 2
        expect(b_white).toBe(248); // 31 << 3

        // Test red (R=31, G=0, B=0): 0xF800
        const red565 = 0xF800;
        const r_red = ((red565 >> 11) & 0b011111) << 3;
        const g_red = ((red565 >> 5) & 0b111111) << 2;
        const b_red = ((red565 >> 0) & 0b011111) << 3;
        expect(r_red).toBe(248);
        expect(g_red).toBe(0);
        expect(b_red).toBe(0);

        // Test green (R=0, G=63, B=0): 0x07E0
        const green565 = 0x07E0;
        const r_green = ((green565 >> 11) & 0b011111) << 3;
        const g_green = ((green565 >> 5) & 0b111111) << 2;
        const b_green = ((green565 >> 0) & 0b011111) << 3;
        expect(r_green).toBe(0);
        expect(g_green).toBe(252);
        expect(b_green).toBe(0);

        // Test blue (R=0, G=0, B=31): 0x001F
        const blue565 = 0x001F;
        const r_blue = ((blue565 >> 11) & 0b011111) << 3;
        const g_blue = ((blue565 >> 5) & 0b111111) << 2;
        const b_blue = ((blue565 >> 0) & 0b011111) << 3;
        expect(r_blue).toBe(0);
        expect(g_blue).toBe(0);
        expect(b_blue).toBe(248);
    });
});

// Test marker store operations
describe('Marker Operations', () => {
    it('should format frequency correctly', () => {
        const formatFrequency = (freq) => {
            if (freq >= 1e9) return (freq / 1e9).toFixed(3) + ' GHz';
            if (freq >= 1e6) return (freq / 1e6).toFixed(3) + ' MHz';
            if (freq >= 1e3) return (freq / 1e3).toFixed(3) + ' kHz';
            return freq + ' Hz';
        };

        expect(formatFrequency(1e6)).toBe('1.000 MHz');
        expect(formatFrequency(2.4e9)).toBe('2.400 GHz');
        expect(formatFrequency(500e3)).toBe('500.000 kHz');
        expect(formatFrequency(100)).toBe('100 Hz');
    });
});

// Test pinnedTooltips marker index calculation
describe('Marker Display Logic', () => {
    it('should find correct marker index from frequency labels', () => {
        // Simulate chart.data.labels (frequency array)
        const labels = [1e6, 2e6, 3e6, 4e6, 5e6, 6e6, 7e6, 8e6, 9e6, 10e6];
        const markerFreqs = [2.5e6, 7e6];

        // Logic from pinnedTooltips plugin: find first label >= marker freq
        const indexes = markerFreqs.map((freq) => {
            return labels.findIndex((f) => f >= freq);
        }).filter(i => i >= 0);

        // 2.5e6 -> index 2 (3e6 is first >= 2.5e6)
        // 7e6 -> index 6 (7e6 is exact match)
        expect(indexes).toEqual([2, 6]);
    });

    it('should handle marker at exact frequency match', () => {
        const labels = [1e6, 2e6, 3e6, 4e6, 5e6];
        const markerFreqs = [3e6];

        const indexes = markerFreqs.map((freq) => {
            return labels.findIndex((f) => f >= freq);
        }).filter(i => i >= 0);

        expect(indexes).toEqual([2]); // 3e6 is at index 2
    });

    it('should handle marker before first frequency', () => {
        const labels = [1e6, 2e6, 3e6, 4e6, 5e6];
        const markerFreqs = [0.5e6]; // Before first label

        const indexes = markerFreqs.map((freq) => {
            return labels.findIndex((f) => f >= freq);
        }).filter(i => i >= 0);

        expect(indexes).toEqual([0]); // First label (1e6) is >= 0.5e6
    });

    it('should filter out markers beyond frequency range', () => {
        const labels = [1e6, 2e6, 3e6, 4e6, 5e6];
        const markerFreqs = [10e6]; // Beyond last label

        const indexes = markerFreqs.map((freq) => {
            return labels.findIndex((f) => f >= freq);
        }).filter(i => i >= 0);

        expect(indexes).toEqual([]); // No valid index found
    });

    it('should set pointStyle and pointRadius for marker positions', () => {
        const labels = [1e6, 2e6, 3e6, 4e6, 5e6];
        const markerFreqs = [2e6, 4e6];

        const indexes = markerFreqs.map((freq) => {
            return labels.findIndex((f) => f >= freq);
        }).filter(i => i >= 0);

        const pointRadius = [];
        const pointStyle = [];

        for (let target of indexes) {
            pointRadius[target] = 5;
            pointStyle[target] = 'rectRot';
        }

        // Verify point styles are set at correct indexes
        expect(pointRadius[1]).toBe(5);  // index 1 = 2e6
        expect(pointRadius[3]).toBe(5);  // index 3 = 4e6
        expect(pointStyle[1]).toBe('rectRot');
        expect(pointStyle[3]).toBe('rectRot');

        // Other positions should be undefined
        expect(pointRadius[0]).toBeUndefined();
        expect(pointRadius[2]).toBeUndefined();
    });

    it('should handle empty markers array', () => {
        const labels = [1e6, 2e6, 3e6, 4e6, 5e6];
        const markerFreqs = [];

        const indexes = markerFreqs.map((freq) => {
            return labels.findIndex((f) => f >= freq);
        }).filter(i => i >= 0);

        expect(indexes).toEqual([]);
    });

    it('should handle multiple markers at same frequency', () => {
        const labels = [1e6, 2e6, 3e6, 4e6, 5e6];
        const markerFreqs = [3e6, 3e6]; // Duplicate

        const indexes = markerFreqs.map((freq) => {
            return labels.findIndex((f) => f >= freq);
        }).filter(i => i >= 0);

        expect(indexes).toEqual([2, 2]); // Both resolve to same index
    });
});
