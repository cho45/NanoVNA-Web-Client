<script setup>
import { ref, watch, nextTick, computed } from 'vue';
import { store, getWorker } from '../store';

const props = defineProps({
  show: { type: Boolean, default: false }
});

const emit = defineEmits(['close']);

const canvasRef = ref(null);
const capturing = ref(false);
const captureDataUrl = ref('');

// Calculate display size based on devicePixelRatio
const displayScale = computed(() => window.devicePixelRatio || 1);
const displayWidth = computed(() => 320 * displayScale.value);
const displayHeight = computed(() => 240 * displayScale.value);

// Helper for date formatting
const strftime = (format) => {
  const now = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return format
    .replace('%Y', now.getFullYear())
    .replace('%m', pad(now.getMonth() + 1))
    .replace('%d', pad(now.getDate()))
    .replace('%H', pad(now.getHours()))
    .replace('%M', pad(now.getMinutes()))
    .replace('%S', pad(now.getSeconds()));
};

const doCapture = async () => {
  if (store.status !== 'connected') return;
  
  capturing.value = true;
  try {
    const worker = await getWorker();
    const data = await worker.getCapture();
    
    const canvas = canvasRef.value;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    const imd = ctx.createImageData(320, 240);
    const rgba = imd.data;
    
    // Convert RGB565 to RGBA
    for (let i = 0, len = data.length; i < len; i++) {
      const c565 = data[i];
      const r = ((c565 >> 11) & 0b011111) << 3;
      const g = ((c565 >>  5) & 0b111111) << 2;
      const b = ((c565 >>  0) & 0b011111) << 3;
      rgba[i * 4 + 0] = r;
      rgba[i * 4 + 1] = g;
      rgba[i * 4 + 2] = b;
      rgba[i * 4 + 3] = 0xff;
    }
    ctx.putImageData(imd, 0, 0);
    captureDataUrl.value = canvas.toDataURL();
  } catch (e) {
    console.error('Capture failed:', e);
  } finally {
    capturing.value = false;
  }
};

const downloadCapture = () => {
  if (!captureDataUrl.value) return;
  
  const name = `nanovna-capture-${strftime('%Y%m%d-%H%M%S')}.png`;
  const a = document.createElement('a');
  a.href = captureDataUrl.value;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
};

// Trigger capture when dialog opens (with nextTick to ensure DOM is mounted)
watch(() => props.show, async (newVal) => {
  if (newVal) {
    await nextTick();
    doCapture();
  }
}, { immediate: true });
</script>

<template>
  <div class="dialog-overlay" v-if="show" @click.self="$emit('close')">
    <div class="dialog capture-dialog">
      <div class="dialog-title">Device Screen Capture</div>
      <div class="dialog-content">
        <div class="capture-container">
          <canvas 
            ref="canvasRef" 
            width="320" 
            height="240"
            :style="{ width: `${displayWidth}px`, height: `${displayHeight}px` }"
          ></canvas>
          <div v-if="capturing" class="capture-loading">
            <span class="icon spinning">sync</span>
            Capturing...
          </div>
        </div>
      </div>
      <div class="dialog-actions">
        <button class="btn" @click="doCapture" :disabled="capturing">
          <span class="icon">refresh</span> Refresh
        </button>
        <button class="btn btn-primary" @click="downloadCapture" :disabled="!captureDataUrl">
          <span class="icon">save_alt</span> Download
        </button>
        <button class="btn" @click="$emit('close')">Close</button>
      </div>
    </div>
  </div>
</template>

<style scoped>
.capture-dialog {
  width: auto;
}

.capture-container {
  position: relative;
  display: inline-block;
}

.capture-container canvas {
  display: block;
  border: 1px solid var(--divider);
  border-radius: 4px;
  image-rendering: pixelated;
  image-rendering: -moz-crisp-edges;
  image-rendering: crisp-edges;
}

.capture-loading {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgba(255, 255, 255, 0.9);
  color: var(--text-dim);
}

.spinning {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}
</style>
