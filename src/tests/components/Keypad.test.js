import { describe, it, expect, vi } from 'vitest';
import { mount } from '@vue/test-utils';
import Keypad from '../../components/Keypad.vue';

describe('Keypad.vue', () => {
    it('renders correctly with default props', () => {
        const wrapper = mount(Keypad, {
            props: {
                title: 'Test Input',
                unit: 'Hz'
            }
        });
        expect(wrapper.text()).toContain('Input Test Input');
        expect(wrapper.find('.unit').text()).toBe('Hz');
        expect(wrapper.find('.val').text()).toBe('0');
    });

    it('updates input when keys are clicked', async () => {
        const wrapper = mount(Keypad);

        // Click '1', '2', '.' , '5'
        const buttons = wrapper.findAll('.key-btn');
        const findBtn = (text) => buttons.find(b => b.text() === text);

        await findBtn('1').trigger('click');
        await findBtn('2').trigger('click');
        await findBtn('.').trigger('click');
        await findBtn('5').trigger('click');

        expect(wrapper.find('.val').text()).toBe('12.5');
    });

    it('handles backspace', async () => {
        const wrapper = mount(Keypad);
        const buttons = wrapper.findAll('.key-btn');
        const findBtn = (text) => buttons.find(b => b.text() === text);
        const backspace = wrapper.find('.key-btn:has(svg), .key-btn:not(.unit-btn):not(:has(svg))');
        // Wait, the backspace button has text ⌫ (\u232B)
        const backspaceBtn = buttons.find(b => b.text() === '\u232B');

        await findBtn('1').trigger('click');
        await findBtn('2').trigger('click');
        expect(wrapper.find('.val').text()).toBe('12');

        await backspaceBtn.trigger('click');
        expect(wrapper.find('.val').text()).toBe('1');

        await backspaceBtn.trigger('click');
        expect(wrapper.find('.val').text()).toBe('0');
    });

    it('submits correct value with x1 unit', async () => {
        const wrapper = mount(Keypad);
        const buttons = wrapper.findAll('.key-btn');
        const findBtn = (text) => buttons.find(b => b.text() === text);

        await findBtn('1').trigger('click');
        await findBtn('2').trigger('click');
        await findBtn('3').trigger('click'); // 123

        await findBtn('x1').trigger('click');

        expect(wrapper.emitted()).toHaveProperty('submit');
        expect(wrapper.emitted('submit')[0]).toEqual([123]);
    });

    it('submits correct value with k unit', async () => {
        const wrapper = mount(Keypad);
        const buttons = wrapper.findAll('.key-btn');
        const findBtn = (text) => buttons.find(b => b.text() === text);

        await findBtn('1').trigger('click');
        await findBtn('.').trigger('click');
        await findBtn('5').trigger('click'); // 1.5

        await findBtn('k').trigger('click');

        expect(wrapper.emitted()).toHaveProperty('submit');
        expect(wrapper.emitted('submit')[0]).toEqual([1500]); // 1.5 * 1000
    });

    it('submits correct value with M unit', async () => {
        const wrapper = mount(Keypad);
        const buttons = wrapper.findAll('.key-btn');
        const findBtn = (text) => buttons.find(b => b.text() === text);

        await findBtn('1').trigger('click');
        await findBtn('M').trigger('click');

        expect(wrapper.emitted('submit')[0]).toEqual([1000000]);
    });

    it('submits correct value with G unit', async () => {
        const wrapper = mount(Keypad);
        const buttons = wrapper.findAll('.key-btn');
        const findBtn = (text) => buttons.find(b => b.text() === text);

        await findBtn('1').trigger('click');
        await findBtn('G').trigger('click');

        expect(wrapper.emitted('submit')[0]).toEqual([1000000000]);
    });

    it('emits close event on cancel', async () => {
        const wrapper = mount(Keypad);
        await wrapper.find('.btn-primary').trigger('click'); // Cancel button
        expect(wrapper.emitted()).toHaveProperty('close');
    });

    it('emits close event on overlay click', async () => {
        const wrapper = mount(Keypad);
        await wrapper.find('.dialog-overlay').trigger('click');
        expect(wrapper.emitted()).toHaveProperty('close');
    });

    it('does not emit close event on dialog click (propagation check)', async () => {
        const wrapper = mount(Keypad);
        await wrapper.find('.dialog').trigger('click');
        expect(wrapper.emitted('close')).toBeFalsy();
    });
});
