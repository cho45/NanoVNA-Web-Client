<script setup>
import { ref, computed } from 'vue';

const props = defineProps({
  trace: { type: Object, required: true },
  show: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'update', 'save', 'delete']);

const localTrace = ref({ ...props.trace });

const formats = [
  { value: 'smith', label: 'Smith Chart' },
  { value: 'logmag', label: 'LogMag' },
  { value: 'phase', label: 'Phase' },
  { value: 'swr', label: 'SWR' },
  { value: 'linear', label: 'Linear' },
  { value: 'real', label: 'Real' },
  { value: 'imag', label: 'Image' },
  { value: 'R', label: 'R (Resistance)' },
  { value: 'X', label: 'X (Reactance)' },
  { value: 'Z', label: '|Z| (Impedance)' }
];

const traceTypes = [
  { value: 'clear', label: 'Clear' },
  { value: 'freeze', label: 'Freeze' },
  { value: 'maxhold', label: 'Max Hold' },
  { value: 'minhold', label: 'Min Hold' },
  { value: 'videoavg', label: 'Video Average' },
  { value: 'poweravg', label: 'Power Average' }
];

const save = () => {
  Object.assign(props.trace, localTrace.value);
  emit('save', localTrace.value);
  emit('close');
};

const changeColor = () => {
  const colors = ['#448aff', '#ff5252', '#4caf50', '#ffeb3b', '#9c27b0', '#00bcd4'];
  const currentIndex = colors.indexOf(localTrace.value.color);
  localTrace.value.color = colors[(currentIndex + 1) % colors.length];
};
</script>

<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog trace-dialog">
      <div class="dialog-title" :style="{ backgroundColor: localTrace.color, color: '#fff' }">
        Trace
      </div>
      <div class="dialog-content">
        <div class="form-group flex-row">
          <label class="checkbox-label">
            <input type="checkbox" v-model="localTrace.show" class="checkbox-input">
            Show
          </label>
        </div>
        
        <div class="form-group">
          <label>Channel</label>
          <select v-model="localTrace.channel" class="input">
            <option :value="0">CH0 Reflect</option>
            <option :value="1">CH1 Through</option>
          </select>
        </div>

        <div class="form-group">
          <label>Trace Format</label>
          <select v-model="localTrace.format" class="input">
            <option v-for="f in formats" :key="f.value" :value="f.value">{{ f.label }}</option>
          </select>
        </div>

        <div class="form-group">
          <label>Trace Type</label>
          <select v-model="localTrace.type" class="input">
            <option v-for="t in traceTypes" :key="t.value" :value="t.value">{{ t.label }}</option>
          </select>
        </div>

        <div class="form-group" v-if="localTrace.type === 'videoavg' || localTrace.type === 'poweravg'">
          <label>Average Count</label>
          <input type="number" v-model.number="localTrace.avgCount" class="input" min="2" max="100">
        </div>

        <button class="btn btn-primary" @click="changeColor" style="margin-top: 16px;">Change Color</button>
      </div>
      <div class="dialog-actions">
        <button class="btn btn-icon" @click="$emit('delete', localTrace)" style="margin-right: auto; color: var(--warn, #f44336);" title="Delete Trace">
          <span class="icon">delete</span>
        </button>
        <button class="btn btn-primary" @click="$emit('close')">Cancel</button>
        <button class="btn btn-primary" @click="save">OK</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.trace-dialog {
  width: 300px;
}

.form-group {
  margin-top: 16px;
  display: flex;
  flex-direction: column;
}

.form-group.flex-row {
  flex-direction: row;
  align-items: center;
  gap: 16px;
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

.checkbox-label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
}

.form-group .checkbox-label {
  font-size: 14px;
  color: var(--text-primary);
}

.checkbox-input {
  cursor: pointer;
  width: 20px;
  height: 20px;
  margin: 0;
}
</style>
