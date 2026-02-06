<script setup>
import { store } from '../store';

const props = defineProps({
  show: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

const scaleTypes = [
  { key: 'logmag', label: 'LogMag', suffix: 'dB' },
  { key: 'swr', label: 'SWR', suffix: '' },
  { key: 'phase', label: 'Phase', suffix: '°' },
  { key: 'linear', label: 'Linear', suffix: '' }
];
</script>

<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog scale-dialog">
      <div class="dialog-title">Scale Settings</div>
      <div class="dialog-content">
        <div v-for="type in scaleTypes" :key="type.key" class="scale-group">
          <div class="scale-label">{{ type.label }} {{ type.suffix }}</div>
          <div class="scale-inputs">
            <div class="form-group flex-1">
              <label>Min</label>
              <input type="number" v-model="store.scales[type.key].min" class="input">
            </div>
            <div class="form-group flex-1">
              <label>Max</label>
              <input type="number" v-model="store.scales[type.key].max" class="input">
            </div>
          </div>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn btn-primary" @click="$emit('close')">OK</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.scale-dialog {
  max-width: 400px;
  width: 90%;
}

.scale-group {
  margin-top: 16px;
  border: 1px solid var(--divider);
  padding: 12px;
  border-radius: 4px;
}

.scale-label {
  font-weight: 500;
  margin-bottom: 8px;
}

.scale-inputs {
  display: flex;
  gap: 16px;
}

.form-group {
  display: flex;
  flex-direction: column;
}

.flex-1 {
  flex: 1;
}

.form-group label {
  font-size: 11px;
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
</style>
