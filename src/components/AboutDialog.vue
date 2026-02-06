<script setup>
import { store } from '../store';

defineProps({
  show: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

const version = __APP_VERSION__;

import { clearAppCache } from '../utils/cache';

const handleClearCache = async () => {
  if (confirm('This will clear the application cache and realod. Are you sure?')) {
    await clearAppCache();
  }
};
</script>

<template>
  <div class="dialog-overlay" @click.self="$emit('close')">
    <div class="dialog about-dialog" :class="{ 'has-info': !!store.info }">
      <div class="dialog-title">About</div>
      <div class="dialog-content about-content-wrapper">
        <div class="about-section app-info">
          <div class="about-hero">
            <img src="/favicon.svg" alt="NanoVNA Web Client" style="width: 64px; height: 64px;">
            <h3>NanoVNA Web Client</h3>
            <p>Version {{ version }}</p>
          </div>
          <div class="divider"></div>
          <p>A web-based interface for the NanoVNA<br>using WebUSB/WebSerial.</p>
          <p>License: BSD-3-Clause</p>
          <div class="divider"></div>
          <p style="font-size: 12px; color: var(--text-dim);">
            This application uses the Web Serial and Web USB APIs.
          </p>
        </div>

        <div v-if="store.info" class="about-section device-info-section">
          <h4>Connected Device Info</h4>
          <pre class="device-info">{{ store.info }}</pre>
          <p class="device-note">
            The copyright and license information above belongs to the firmware of the connected device.
          </p>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn btn-primary" @click="handleClearCache">Update App (Clear Cache)</button>
        <button class="btn btn-primary" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.about-dialog {
  width: 350px;
  text-align: center;
  transition: width 0.3s;
}

.about-dialog.has-info {
  width: 700px;
  max-width: 90vw;
}

.about-content-wrapper {
  display: flex;
  gap: 24px;
  text-align: left;
}

.about-section {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.about-section.app-info {
  text-align: center;
}

.about-hero {
  padding: 16px 0;
}

.about-hero h3 {
  margin: 16px 0 4px;
}

.device-info-section {
  border-left: 1px solid var(--divider);
  padding-left: 24px;
}

.device-info-section h4 {
  margin-top: 0;
  margin-bottom: 16px;
  font-size: 14px;
  color: var(--text-main);
  border-bottom: 2px solid var(--primary);
  display: inline-block;
  padding-bottom: 4px;
}

.divider {
  border: none;
  border-top: 1px solid var(--divider);
  margin: 16px 0;
}

.dialog-content p {
  font-size: 14px;
  line-height: 1.5;
  margin: 8px 0;
}

.device-info {
  margin: 0;
  padding: 12px;
  background: #f5f5f5;
  border-radius: 4px;
  font-size: 11px;
  white-space: pre-wrap;
  color: var(--text-main);
  border: 1px solid var(--divider);
  flex: 1;
  overflow: auto;
  max-height: 300px;
  font-family: monospace;
}

.device-note {
  font-size: 11px !important;
  color: var(--text-dim);
  margin-top: 8px !important;
}
</style>
