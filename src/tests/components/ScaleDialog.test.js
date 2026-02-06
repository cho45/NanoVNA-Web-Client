import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import ScaleDialog from '../../components/ScaleDialog.vue';

// Mock store for scales
vi.mock('../../store', async () => {
    return {
        store: {
            scales: {
                logmag: { min: -80, max: 0 },
                swr: { min: 1, max: 10 },
                phase: { min: -180, max: 180 },
                linear: { min: 0, max: 1 },
                z: { min: -100, max: 100 }
            }
        }
    };
});

describe('ScaleDialog.vue', () => {
    it('should mount successfully', () => {
        const wrapper = mount(ScaleDialog, { props: { show: true } });
        expect(wrapper.exists()).toBe(true);
    });
});
