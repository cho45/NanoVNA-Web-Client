<script setup>
import { store } from '../store';

const props = defineProps({
  show: { type: Boolean, default: false }
});

const emit = defineEmits(['close', 'add-marker']);

const formatFrequency = (freq) => {
  if (freq >= 1e9) return (freq / 1e9).toFixed(3) + ' GHz';
  if (freq >= 1e6) return (freq / 1e6).toFixed(3) + ' MHz';
  if (freq >= 1e3) return (freq / 1e3).toFixed(3) + ' kHz';
  return freq + ' Hz';
};

const removeMarker = (index) => {
  store.markers.splice(index, 1);
};

const addMarker = () => {
  emit('add-marker');
};
</script>

<template>
  <div class="dialog-overlay" v-if="show" @click.self="$emit('close')">
    <div class="dialog marker-dialog">
      <div class="dialog-title">Marker Settings</div>
      <div class="dialog-content">
        <div class="marker-list" v-if="store.markers.length">
          <div v-for="(marker, index) in store.markers" :key="marker.id" class="marker-item">
            <input type="checkbox" v-model="marker.show" />
            <span class="icon" style="color: var(--primary);">label</span>
            <span class="marker-freq">{{ formatFrequency(marker.freq) }}</span>
            <button class="btn-icon" @click="removeMarker(index)">
              <span class="icon">delete</span>
            </button>
          </div>
        </div>
        <div v-else class="no-markers">
          No markers defined
        </div>
        <button class="btn btn-primary" @click="addMarker" style="margin-top: 16px;">
          <span class="icon">add</span> Add Marker
        </button>
      </div>
      <div class="dialog-actions">
        <button class="btn" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.marker-dialog {
  width: 350px;
}

.marker-list {
  max-height: 300px;
  overflow-y: auto;
}

.marker-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 0;
  border-bottom: 1px solid var(--divider);
}

.marker-item:last-child {
  border-bottom: none;
}

.marker-freq {
  flex: 1;
  font-family: monospace;
}

.no-markers {
  color: var(--text-dim);
  text-align: center;
  padding: 24px;
}
</style>
