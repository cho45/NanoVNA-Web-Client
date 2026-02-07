import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { detectBestConnectionType, store } from '../store';
import { NanoVNA_WebSerial, NanoVNA_WebUSB } from '../lib/nanovna';

// Mock navigator
const originalNavigator = global.navigator;

describe('Connection Switching Logic', () => {
    beforeEach(() => {
        // Reset store
        store.connectionType = 'auto';

        // Mock navigator properties
        global.navigator = {
            userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
            serial: {},
            usb: {}
        };
    });

    afterEach(() => {
        global.navigator = originalNavigator;
    });

    it('detectBestConnectionType returns specific type if configured', () => {
        store.connectionType = 'serial';
        expect(detectBestConnectionType()).toBe('serial');

        store.connectionType = 'usb';
        expect(detectBestConnectionType()).toBe('usb');
    });

    it('detectBestConnectionType defaults to serial on Desktop if available', () => {
        store.connectionType = 'auto';
        // Desktop UA
        global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
        global.navigator.serial = {};
        global.navigator.usb = {};

        expect(detectBestConnectionType()).toBe('serial');
    });

    it('detectBestConnectionType prefers USB on Android if available', () => {
        store.connectionType = 'auto';
        // Android UA
        global.navigator.userAgent = 'Mozilla/5.0 (Linux; Android 10; SM-G960F) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Mobile Safari/537.36';
        global.navigator.serial = {}; // Even if serial is present (though on Android it might technically be present but broken/flagged)
        global.navigator.usb = {};

        expect(detectBestConnectionType()).toBe('usb');
    });

    it('detectBestConnectionType falls back to available one if preferred is missing', () => {
        store.connectionType = 'auto';

        // Desktop, no serial, only USB
        global.navigator.userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)';
        global.navigator.serial = undefined;
        global.navigator.usb = {};
        expect(detectBestConnectionType()).toBe('usb');

        // Android, no USB, only Serial (unlikely but logic check)
        global.navigator.userAgent = 'Mozilla/5.0 (Linux; Android 10)';
        global.navigator.usb = undefined;
        global.navigator.serial = {};
        expect(detectBestConnectionType()).toBe('serial');
    });
});
