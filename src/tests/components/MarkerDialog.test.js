import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import MarkerDialog from '../../components/MarkerDialog.vue';

vi.mock('../../store', async () => {
    return {
        store: {
            markers: [
                { id: 1, show: true, freq: 1e6 }
            ],
            activeMarker: 1
        }
    };
});

describe('MarkerDialog.vue', () => {
    it('should mount successfully', () => {
        const wrapper = mount(MarkerDialog, { props: { show: true } });
        expect(wrapper.exists()).toBe(true);
    });

    it('should toggle marker visibility when checkbox is clicked', async () => {
        const wrapper = mount(MarkerDialog, { props: { show: true } });
        const checkbox = wrapper.find('input[type="checkbox"]');
        expect(checkbox.exists()).toBe(true);
        expect(checkbox.element.checked).toBe(true);

        await checkbox.setValue(false);
        // We mocked store.markers, but since we are modifying it directly via v-model, 
        // we can check if the mocked object was updated. 
        // However, imports are read-only bindings.
        // In this test setup, `import { store }` returns the mocked object.
        // Let's verify by checking the v-model binding or if we can access the mocked store.

        // Actually, since we mocked the module, we need to import it to check its state
        const { store } = await import('../../store');
        expect(store.markers[0].show).toBe(false);
    });
});
