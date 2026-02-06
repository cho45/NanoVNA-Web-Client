import { mount } from '@vue/test-utils';
import { describe, it, expect } from 'vitest';
import TraceDialog from '../../components/TraceDialog.vue';

describe('TraceDialog.vue', () => {
    it('should mount successfully', () => {
        const wrapper = mount(TraceDialog, {
            props: {
                show: true,
                trace: { id: 0, channel: 0, format: 'logmag', color: '#000', type: 'clear', show: true }
            }
        });
        expect(wrapper.exists()).toBe(true);
    });

    it('should toggle show checkbox when clicking the label', async () => {
        const wrapper = mount(TraceDialog, {
            props: {
                show: true,
                trace: { id: 0, channel: 0, format: 'logmag', color: '#000', type: 'clear', show: false }
            }
        });

        const checkbox = wrapper.find('.checkbox-input');
        expect(checkbox.exists()).toBe(true);
        expect(checkbox.element.checked).toBe(false);

        // Click checkbox directly
        await checkbox.setValue(true);
        expect(checkbox.element.checked).toBe(true);

        // Verify label exists and is clickable
        const label = wrapper.find('.checkbox-label');
        expect(label.exists()).toBe(true);

        // Click label to toggle
        await label.trigger('click');
        expect(checkbox.element.checked).toBe(false);
    });

    it('should render checkbox with correct size styling', () => {
        const wrapper = mount(TraceDialog, {
            props: {
                show: true,
                trace: { id: 0, channel: 0, format: 'logmag', color: '#000', type: 'clear', show: true }
            }
        });

        const checkbox = wrapper.find('.checkbox-input');
        expect(checkbox.classes()).toContain('checkbox-input');

        const label = wrapper.find('.checkbox-label');
        expect(label.classes()).toContain('checkbox-label');
    });
});
