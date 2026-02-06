import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import App from '../App.vue';

// Mock store module to avoid side effects and allow controlled state
vi.mock('../store', async () => {
    return {
        store: {
            status: 'disconnected',
            frequencies: {
                start: 1e6,
                stop: 900e6,
                center: 450.5e6,
                span: 899e6,
                segments: 1
            },
            traces: [],
            markers: [],
            progress: { value: 0, total: 0 },
            scales: {
                logmag: { min: -80, max: 0 },
                swr: { min: 1, max: 10 },
                phase: { min: -180, max: 180 },
            }
        },
        connect: vi.fn(),
        disconnect: vi.fn(),
        getWorker: vi.fn(),
        startUpdateLoop: vi.fn()
    };
});

describe('App.vue', () => {
    it('should mount without errors', () => {
        const wrapper = mount(App, {
            global: {
                stubs: {
                    // Stub complex child components to focus on App.vue's integrity
                    Graph: true,
                    Keypad: true,
                    TraceDialog: true,
                    ScaleDialog: true,
                    CalibrationDialog: true,
                    AboutDialog: true,
                    MarkerDialog: true,
                    CaptureDialog: true
                }
            }
        });
        expect(wrapper.exists()).toBe(true);
        expect(wrapper.find('.app-container').exists()).toBe(true);
    });

    it('adds a trace when TraceDialog saves', async () => {
        // Import store to check it directly
        const { store } = await import('../store');

        const wrapper = mount(App, {
            global: {
                stubs: {
                    // Start with same stubs but we need to interact with TraceDialog
                    // If we don't include TraceDialog in stubs, it renders.
                    // If we included it in `stubs` above, we'd need to override it here if we want real interaction
                    // or just check if it was emitted.
                    // But in this file, we want to test the full flow.
                    Graph: true,
                    Keypad: true,
                    // TraceDialog: true, // Let it render
                    ScaleDialog: true,
                    CalibrationDialog: true,
                    AboutDialog: true,
                    MarkerDialog: true,
                    CaptureDialog: true
                }
            }
        });

        // 1. Open Add Trace dialog
        await wrapper.find('.btn-icon').trigger('click'); // Menu button

        const buttons = wrapper.findAll('.btn-nav');
        const addTraceBtn = buttons.find(b => b.text().includes('Add Trace'));
        expect(addTraceBtn.exists()).toBe(true);
        await addTraceBtn.trigger('click');

        // Check if `showTraceDialog` ref is true
        const traceDialog = wrapper.findComponent({ name: 'TraceDialog' });
        expect(traceDialog.exists()).toBe(true);
        expect(traceDialog.props('show')).toBe(true);

        // 2. Simulate "OK" (Save)
        // Find the "OK" button in the dialog and click it.
        const okButton = wrapper.findAll('button').find(b => b.text() === 'OK');
        expect(okButton.exists()).toBe(true);
        await okButton.trigger('click');

        // 3. Verify store update
        expect(store.traces.length).toBe(1);
        expect(store.traces[0].isNew).toBeUndefined(); // Should be cleaned up
    });

    it('deletes a trace when delete button is clicked and confirmed', async () => {
        const { store } = await import('../store');

        // Reset traces
        store.traces = [];

        // Mock confirm
        global.confirm = vi.fn(() => true);

        // Pre-populate store with a trace
        store.traces.push({ id: 999, show: true, channel: 0, format: 'logmag', color: '#000', type: 'clear' });
        expect(store.traces.length).toBeGreaterThan(0);

        const wrapper = mount(App, {
            global: {
                stubs: {
                    Graph: true,
                    Keypad: true,
                    // TraceDialog: true, // Let it render
                    ScaleDialog: true,
                    CalibrationDialog: true,
                    AboutDialog: true,
                    MarkerDialog: true,
                    CaptureDialog: true
                }
            }
        });

        // Open settings for the trace (find the chip)
        // Need to wait for render
        await wrapper.vm.$nextTick();

        const chips = wrapper.findAll('.chip');
        const targetChip = chips.find(c => c.text().includes('LogMag')); // Based on format we pushed
        expect(targetChip.exists()).toBe(true);
        await targetChip.trigger('click');

        // Dialog should be open
        const traceDialog = wrapper.findComponent({ name: 'TraceDialog' });
        expect(traceDialog.exists()).toBe(true);
        expect(traceDialog.props('show')).toBe(true);

        // Click delete button (btn-icon with delete icon)
        // We look for button with title "Delete Trace" or check icon inside
        const deleteBtn = traceDialog.findAll('button').find(b => b.attributes('title') === 'Delete Trace');
        expect(deleteBtn.exists()).toBe(true);

        await deleteBtn.trigger('click');

        // Check confirm called
        expect(global.confirm).toHaveBeenCalled();

        // Check store
        expect(store.traces.find(t => t.id === 999)).toBeUndefined();
    });
});
