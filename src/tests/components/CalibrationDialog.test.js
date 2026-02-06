import { mount } from '@vue/test-utils';
import { describe, it, expect, vi } from 'vitest';
import CalibrationDialog from '../../components/CalibrationDialog.vue';

// Mock store
vi.mock('../../store', async () => {
    return {
        store: {
            calibrationRunning: false,
            velocityFactor: 0.66
        },
        calibration: vi.fn(),
        getWorker: vi.fn().mockResolvedValue({ doCal: vi.fn() })
    };
});

describe('CalibrationDialog.vue', () => {
    it('should mount successfully', () => {
        const wrapper = mount(CalibrationDialog, { props: { show: true } });
        expect(wrapper.exists()).toBe(true);
    });

    it('should always initialize currentStep to reset', async () => {
        const wrapper = mount(CalibrationDialog, { props: { show: true } });
        const activeStep = wrapper.find('.step.active .step-label');
        expect(activeStep.text()).toBe('RESET');
    });
});
