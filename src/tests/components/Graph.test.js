import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import Graph from '../../components/Graph.vue';
import { store } from '../../store'; // This will be the mocked store

// Detailed Mock for Chart.js
const mockChartInstance = {
    destroy: vi.fn(),
    update: vi.fn(),
    config: {
        options: {
            pinnedTooltips: []
        },
        data: {
            datasets: []
        }
    },
    data: {
        labels: [],
        datasets: []
    }
};

vi.mock('chart.js', () => {
    class MockChart {
        constructor() {
            return mockChartInstance;
        }
    }
    MockChart.pluginService = { register: vi.fn() };
    MockChart.Tooltip = class { };
    MockChart.helpers = { each: vi.fn() };

    return {
        default: MockChart,
        pluginService: MockChart.pluginService,
        Tooltip: MockChart.Tooltip,
        helpers: MockChart.helpers
    };
});

// Mock Store
vi.mock('../../store', async () => {
    const { reactive } = await import('vue');
    return {
        store: reactive({
            status: 'connected', // Needs to be connected to update chart
            frequencies: { start: 1e6, stop: 900e6, segments: 1, data: [1e6, 2e6] },
            traces: [{ id: 0, show: true, channel: 0, format: 'logmag', color: '#f44336' }],
            markers: [
                { id: 1, show: true, freq: 1e6 },
                { id: 2, show: false, freq: 2e6 }
            ],
            scales: {
                logmag: { min: -80, max: 0 },
                swr: { min: 1, max: 10 },
                phase: { min: -180, max: 180 },
                linear: { min: 0, max: 1 },
                z: { min: -100, max: 100 }
            },
            data: {
                ch0: [{ freq: 1e6, real: 0, imag: 0 }, { freq: 2e6, real: 0, imag: 0 }],
                ch1: []
            },
            dataVersion: 0
        }),
        getWorker: vi.fn(),
    };
});

// Mock dsp
vi.mock('../../lib/dsp', () => ({
    formatFrequency: (val) => val + ' Hz',
    calcLogMag: () => -20,
    calcSWR: () => 1.5,
    calcPhase: () => 0,
    calcLinear: () => 0.5,
    calcReal: () => 0.5,
    calcImag: () => 0.5,
    calcZr: () => ({ real: 0.5, imag: 0.5 })
}));

describe('Graph.vue', () => {
    it('should only show visible markers', async () => {
        const wrapper = mount(Graph, { props: { type: 'frequency' } });

        // Wait for watchers to fire
        await wrapper.vm.$nextTick();

        // Trigger updateChart by changing dataVersion
        store.dataVersion++;
        await wrapper.vm.$nextTick();

        // Check if pinnedTooltips contains only the visible marker
        expect(mockChartInstance.config.options.pinnedTooltips).toHaveLength(1);
        expect(mockChartInstance.config.options.pinnedTooltips[0]).toBe(1e6);
        expect(mockChartInstance.config.options.pinnedTooltips).not.toContain(2e6);
    });

    it('should update pinned markers when visibility changes', async () => {
        const wrapper = mount(Graph, { props: { type: 'frequency' } });

        // Initial state
        store.dataVersion++;
        await wrapper.vm.$nextTick();
        expect(mockChartInstance.config.options.pinnedTooltips).toHaveLength(1);

        // Make second marker visible
        store.markers[1].show = true;
        store.dataVersion++;
        await wrapper.vm.$nextTick();

        expect(mockChartInstance.config.options.pinnedTooltips).toHaveLength(2);
        expect(mockChartInstance.config.options.pinnedTooltips).toContain(1e6);
        expect(mockChartInstance.config.options.pinnedTooltips).toContain(2e6);
    });
});
