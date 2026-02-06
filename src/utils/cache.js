export const clearAppCache = async () => {
    if (navigator.serviceWorker) {
        const registrations = await navigator.serviceWorker.getRegistrations();
        for (const registration of registrations) {
            await registration.unregister();
        }
    }

    if (typeof caches !== 'undefined') {
        const keys = await caches.keys();
        await Promise.all(keys.map(key => caches.delete(key)));
    }

    window.location.reload(true);
};
