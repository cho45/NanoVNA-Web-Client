<script setup>
import { ref } from 'vue';
import { store, calibration } from '../store';

const props = defineProps({
  show: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

const currentStep = ref('reset');

const runCalibration = async (step, slot = 0) => {
    try {
        await calibration(step, slot);
        // Move to next step automatically if it's a standard step
        const steps = ['reset', 'open', 'short', 'load', 'thru', 'done'];
        const nextIdx = steps.indexOf(step) + 1;
        if (nextIdx < steps.length) {
            currentStep.value = steps[nextIdx];
        }
    } catch (e) {
        alert('Calibration error: ' + e.message);
    }
};
</script>

<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog cal-dialog">
      <div class="dialog-title">Calibration</div>
      <div class="dialog-content">
        <div class="stepper">
          <div v-for="s in ['reset', 'open', 'short', 'load', 'thru', 'done']" :key="s" 
               class="step" :class="{ active: currentStep === s }">
            <div class="step-header" @click="currentStep = s">
              <div class="step-circle">{{ s === 'done' ? '✓' : '' }}</div>
              <div class="step-label">{{ s.toUpperCase() }}</div>
            </div>
            <div class="step-content" v-if="currentStep === s">
              <p v-if="s === 'reset'">Reset current calibration status</p>
              <p v-if="s === 'open'">Connect OPEN to CH0</p>
              <p v-if="s === 'short'">Connect SHORT to CH0</p>
              <p v-if="s === 'load'">Connect LOAD to CH0</p>
              <p v-if="s === 'thru'">Connect CH0 and CH1 with cable</p>
              <p v-if="s === 'done'">Save calibration data</p>
              
              <div class="step-actions">
                <button v-if="s !== 'done'" class="btn btn-raised btn-accent" 
                        @click="runCalibration(s)" :disabled="store.calibrationRunning">
                  {{ s === 'reset' ? 'Reset' : 'CAL ' + s.toUpperCase() }}
                </button>
                <template v-else>
                  <button v-for="n in [0, 1, 2, 3, 4]" :key="n" class="btn btn-raised btn-accent" 
                          @click="runCalibration('done', n)">Save {{ n }}</button>
                </template>
              </div>
            </div>
          </div>
        </div>

        <div class="divider" style="margin: 24px 0; border-top: 1px solid var(--divider);"></div>
        
        <div class="form-group">
          <label>Velocity Factor (TDR)</label>
          <input type="number" v-model.number="store.velocityFactor" class="input" step="0.01" min="0.01" max="1.0">
          <p class="help-text">Relative to speed of light (0.66 for PE, 0.70 for PTFE)</p>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn btn-primary" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.cal-dialog {
  width: 400px;
}

.stepper {
  display: flex;
  flex-direction: column;
}

.step {
  border-left: 1px solid var(--divider);
  margin-left: 12px;
  padding-left: 24px;
  padding-bottom: 24px;
  position: relative;
}

.step:last-child {
  border-left: none;
}

.step-header {
  display: flex;
  align-items: center;
  gap: 12px;
  cursor: pointer;
  margin-left: -37px;
  background: var(--surface-color);
  padding: 4px 0;
}

.step-circle {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: var(--text-dim);
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 12px;
}

.step.active .step-circle {
  background: var(--primary);
}

.step-label {
  font-weight: 500;
  color: var(--text-dim);
}

.step.active .step-label {
  color: var(--text-main);
}

.step-content {
  padding-top: 8px;
}

.step-content p {
  margin: 0 0 16px 0;
  font-size: 14px;
  color: var(--text-dim);
}

.step-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.divider {
  border: none;
  border-top: 1px solid var(--divider);
}

.form-group {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
}

.form-group label {
  font-size: 12px;
  color: var(--text-dim);
}

.input {
  border: none;
  border-bottom: 1px solid var(--divider);
  padding: 4px 0;
  font-size: 16px;
  background: transparent;
  width: 100%;
}

.help-text {
  font-size: 11px;
  color: var(--text-dim);
  margin-top: 4px;
}
</style>
