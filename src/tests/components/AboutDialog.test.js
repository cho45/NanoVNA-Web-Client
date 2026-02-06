import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import AboutDialog from '../../components/AboutDialog.vue';

vi.mock('../../store', async () => {
    return {
        store: {
            version: '0.1.0',
            info: 'Board: NanoVNA-H 4\nVersion: 1.2.3'
        }
    };
});

describe('AboutDialog.vue', () => {
    it('should mount successfully', () => {
        const wrapper = mount(AboutDialog, { props: { show: true } });
        expect(wrapper.exists()).toBe(true);
    });

    it('should display app icon', () => {
        const wrapper = mount(AboutDialog, { props: { show: true } });
        const img = wrapper.find('img[alt="NanoVNA Web Client"]');
        expect(img.exists()).toBe(true);
        expect(img.attributes('src')).toBe('/favicon.svg');
    });

    it('should display app title and version', () => {
        const wrapper = mount(AboutDialog, { props: { show: true } });
        expect(wrapper.text()).toContain('NanoVNA Web Client');
    });

    it('should display device info', () => {
        const wrapper = mount(AboutDialog, { props: { show: true } });
        expect(wrapper.find('.device-info').exists()).toBe(true);
        expect(wrapper.find('.device-info').text()).toContain('NanoVNA-H 4');
    });
});
