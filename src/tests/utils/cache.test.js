import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { clearAppCache } from '../../utils/cache.js';

describe('clearAppCache', () => {
    let originalLocation;
    let reloadMock;
    let serviceWorkerMock;
    let cachesMock;

    beforeEach(() => {
        // Mock window.location.reload
        originalLocation = window.location;
        reloadMock = vi.fn();
        delete window.location;
        window.location = { ...originalLocation, reload: reloadMock };

        // Mock navigator.serviceWorker
        serviceWorkerMock = {
            getRegistrations: vi.fn().mockResolvedValue([]),
        };
        Object.defineProperty(navigator, 'serviceWorker', {
            value: serviceWorkerMock,
            configurable: true,
            writable: true,
        });

        // Mock caches
        cachesMock = {
            keys: vi.fn().mockResolvedValue([]),
            delete: vi.fn().mockResolvedValue(true),
        };
        Object.defineProperty(global, 'caches', {
            value: cachesMock,
            configurable: true,
            writable: true,
        });
    });

    afterEach(() => {
        window.location = originalLocation;
        vi.restoreAllMocks();
    });

    it('should unregister all service workers', async () => {
        const unregisterMock = vi.fn().mockResolvedValue(true);
        const registrations = [{ unregister: unregisterMock }, { unregister: unregisterMock }];
        serviceWorkerMock.getRegistrations.mockResolvedValue(registrations);

        await clearAppCache();

        expect(serviceWorkerMock.getRegistrations).toHaveBeenCalled();
        expect(unregisterMock).toHaveBeenCalledTimes(2);
    });

    it('should delete all caches', async () => {
        const cacheKeys = ['cache-v1', 'cache-v2'];
        cachesMock.keys.mockResolvedValue(cacheKeys);

        await clearAppCache();

        expect(cachesMock.keys).toHaveBeenCalled();
        expect(cachesMock.delete).toHaveBeenCalledWith('cache-v1');
        expect(cachesMock.delete).toHaveBeenCalledWith('cache-v2');
    });

    it('should reload the page with forceReload=true', async () => {
        await clearAppCache();
        expect(reloadMock).toHaveBeenCalledWith(true);
    });

    it('should handle cases where navigator.serviceWorker is undefined', async () => {
        Object.defineProperty(navigator, 'serviceWorker', { value: undefined });
        await clearAppCache();
        // Should not throw and proceed to clear caches and reload
        expect(cachesMock.keys).toHaveBeenCalled();
        expect(reloadMock).toHaveBeenCalledWith(true);
    });

    it('should handle cases where caches is undefined', async () => {
        Object.defineProperty(global, 'caches', { value: undefined });
        await clearAppCache();
        // Should not throw and proceed to reload
        expect(serviceWorkerMock.getRegistrations).toHaveBeenCalled();
        expect(reloadMock).toHaveBeenCalledWith(true);
    });
});
