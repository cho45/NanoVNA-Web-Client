<script setup>
import { ref, onMounted, watch } from 'vue';
import { store, connect, disconnect, getWorker, startUpdateLoop } from './store';
import Graph from './components/Graph.vue';
import Keypad from './components/Keypad.vue';
import TraceDialog from './components/TraceDialog.vue';
import ScaleDialog from './components/ScaleDialog.vue';
import CalibrationDialog from './components/CalibrationDialog.vue';
import AboutDialog from './components/AboutDialog.vue';
import MarkerDialog from './components/MarkerDialog.vue';
import CaptureDialog from './components/CaptureDialog.vue';

const menuVisible = ref(false);
const freqInputSelect = ref('start-stop');
const graphSelected = ref('frequency');

const showKeypad = ref(false);
const keypadTitle = ref('');
const keypadTarget = ref('');
const keypadValue = ref('');

const showTraceDialog = ref(false);
const currentTrace = ref(null);

const showScaleDialog = ref(false);
const showCalibrationDialog = ref(false);
const showAboutDialog = ref(false);
const showMarkerDialog = ref(false);
const showCaptureDialog = ref(false);

const handleConnect = async () => {
  try {
    await connect();
  } catch (e) {
    alert('Failed to connect: ' + e.message);
  }
};

const keypadUnit = ref('Hz');

const openKeypad = (title, target, value, unit = 'Hz') => {
  keypadTitle.value = title;
  keypadTarget.value = target;
  keypadValue.value = String(value);
  keypadUnit.value = unit;
  showKeypad.value = true;
};

const handleKeypadSubmit = (value) => {
  if (keypadTarget.value.startsWith('range.')) {
    const key = keypadTarget.value.split('.')[1];
    store.frequencies[key] = value;
    if (key === 'start' || key === 'stop') updateStartStop();
    if (key === 'center' || key === 'span') updateCenterSpan();
  } else if (keypadTarget.value === 'marker.add') {
    store.markers.push({ id: Date.now(), show: true, freq: value, data: [] });
    store.markers.sort((a, b) => a.freq - b.freq);
  } else if (keypadTarget.value.startsWith('frequencies.')) {
    const key = keypadTarget.value.split('.')[1];
    let val = value;
    if (key === 'segments' && val < 1) val = 1;
    store.frequencies[key] = val;
  }
  showKeypad.value = false;
};

const updateStartStop = () => {
  store.frequencies.center = (store.frequencies.start + store.frequencies.stop) / 2;
  store.frequencies.span = Math.abs(store.frequencies.stop - store.frequencies.start);
};

const updateCenterSpan = () => {
  store.frequencies.start = store.frequencies.center - store.frequencies.span / 2;
  store.frequencies.stop = store.frequencies.center + store.frequencies.span / 2;
};

const openTraceSettings = (trace) => {
  currentTrace.value = trace;
  showTraceDialog.value = true;
};

const formatFrequency = (freq) => {
  if (freq >= 1e9) return (freq / 1e9).toFixed(3) + 'G';
  if (freq >= 1e6) return (freq / 1e6).toFixed(3) + 'M';
  if (freq >= 1e3) return (freq / 1e3).toFixed(3) + 'k';
  return freq + 'Hz';
};

const nameOfFormat = (format) => {
  const formats = {
    smith: 'Smith',
    logmag: 'LogMag',
    phase: 'Phase',
    swr: 'SWR',
    linear: 'Linear',
    real: 'Real',
    imag: 'Imag',
    R: 'R',
    X: 'X',
    Z: '|Z|'
  };
  return formats[format] || format;
};

const recallSlot = async (n) => {
  if (store.status !== 'connected') return;
  const worker = await getWorker();

  // Stop update loop momentarily
  store.autoUpdate = false;
  
  await worker.recall(n);
  
  // Refresh configuration from device
  try {
    const config = await worker.refreshConfig();
    if (config) {
      store.frequencies.start = config.start;
      store.frequencies.stop = config.stop;
      // Recall resets to single segment (101 points)
      store.frequencies.segments = config.segments;
      
      const span = config.stop - config.start;
      store.frequencies.span = span;
      store.frequencies.center = config.start + span / 2;
    }
  } catch (e) {
    console.error('Failed to refresh config after recall', e);
  }
  
  store.autoUpdate = true;
  startUpdateLoop(); // Restart loop if it stopped
};


const addMarker = () => {
  openKeypad('Marker Frequency', 'marker.add', '');
};


const pause = () => { store.autoUpdate = false; };
const resume = () => {
   store.autoUpdate = true;
   store.data.ch0 = [];
   store.data.ch1 = [];
};
const stop = () => { store.requestStop = true; };
const refresh = () => {
   store.autoUpdate = true; 
   store.data.ch0 = [];
   store.data.ch1 = [];
};

// Helper function for date formatting (original strftime)
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

// Download file helper
const downloadFile = (url, filename) => {
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

// Save As Touchstone format
const saveAs = (format) => {
  if (store.status !== 'connected' || !store.data.ch0.length) return;
  
  if (format === 's1p') {
    const body = ['# Hz S RI R 50\n'];
    store.data.ch0.forEach((d) => {
      body.push(`${d.freq}\t${d.real}\t${d.imag}\n`);
    });
    const blob = new Blob(body, { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const name = `nanovna-${strftime('%Y%m%d-%H%M%S')}.s1p`;
    downloadFile(url, name);
  } else if (format === 's2p') {
    const body = ['# Hz S RI R 50\n'];
    store.data.ch0.forEach((ch0, i) => {
      const ch1 = store.data.ch1[i] || { real: 0, imag: 0 };
      body.push(`${ch0.freq}\t${ch0.real}\t${ch0.imag}\t${ch1.real}\t${ch1.imag}\t${ch1.real}\t${ch1.imag}\t${ch0.real}\t${ch0.imag}\n`);
    });
    const blob = new Blob(body, { type: 'application/octet-stream' });
    const url = URL.createObjectURL(blob);
    const name = `nanovna-${strftime('%Y%m%d-%H%M%S')}.s2p`;
    downloadFile(url, name);
  }
};

// Save chart as PNG
const graphRefs = ref({});
const saveAsPng = (graphType) => {
  const canvas = document.querySelector(`canvas[data-graph-type="${graphType}"]`);
  if (!canvas) return;
  canvas.toBlob((blob) => {
    const url = URL.createObjectURL(blob);
    const name = `graph-${strftime('%Y%m%d-%H%M%S')}.png`;
    downloadFile(url, name);
  });
};

// Add new trace
const addTrace = () => {
  const colors = ['#f44336', '#e91e63', '#9c27b0', '#673ab7', '#3f51b5', '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50', '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800', '#ff5722'];
  const usedColors = store.traces.map(t => t.color);
  const availableColor = colors.find(c => !usedColors.includes(c)) || colors[Math.floor(Math.random() * colors.length)];
  
  const newId = Math.max(...store.traces.map(t => t.id), -1) + 1;
  currentTrace.value = {
    id: newId,
    show: true,
    channel: 0,
    format: 'logmag',
    scale: 10.0,
    offset: 0,
    color: availableColor,
    type: 'clear',
    avgCount: 2,
    isNew: true
  };
  showTraceDialog.value = true;
};

const handleTraceSave = (trace) => {
  if (trace.isNew) {
    delete trace.isNew;
    store.traces.push(trace);
  }
  showTraceDialog.value = false;
};

const handleTraceDelete = (trace) => {
  if (confirm('Delete this trace?')) {
    const idx = store.traces.findIndex(t => t.id === trace.id);
    if (idx !== -1) {
      store.traces.splice(idx, 1);
    }
    showTraceDialog.value = false;
  }
};


// Quit (close window)
const quit = () => {
  if (confirm('Close this window?')) {
    window.close();
  }
};
</script>

<template>
  <div class="app-container">
    <!-- Toolbar -->
    <header class="header">
      <button class="btn btn-icon" @click="menuVisible = !menuVisible">
        <span class="icon">menu</span>
      </button>
      <h3 class="md-title" style="flex: 1; margin-left: 16px;">
        NanoVNA
        <span v-if="store.version" style="font-size: 0.8em; opacity: 0.7; margin-left: 8px;">
          ({{ store.version.trim() }})
        </span>
      </h3>
      
      <button class="btn btn-primary" v-if="store.status === 'disconnected'" @click="handleConnect">
        <span class="icon">usb</span>&nbsp;connect
      </button>
      <button class="btn btn-primary" v-else-if="store.status === 'connecting'" disabled>
        <span class="icon">usb</span>&nbsp;connecting...
      </button>
      
      <template v-else-if="store.status === 'connected'">
        <template v-if="store.frequencies.length <= 101">
          <button class="btn btn-primary" v-if="store.autoUpdate" @click="pause">
            <span class="icon">pause</span>&nbsp;Pause
          </button>
          <button class="btn btn-primary" v-else @click="resume">
            <span class="icon">refresh</span>&nbsp;Resume
          </button>
        </template>
        <template v-else>
          <button class="btn btn-primary" v-if="store.updating" @click="stop" :disabled="store.requestStop">
            <span class="icon">pause</span>&nbsp;Stop [{{store.progress.value}}/{{store.progress.total}}]
          </button>
          <button class="btn btn-primary" v-else @click="refresh">
            <span class="icon">refresh</span>&nbsp;Update
          </button>
        </template>
      </template>
    </header>

    <!-- Drawer Overlay -->
    <div class="drawer-overlay" v-if="menuVisible" @click="menuVisible = false"></div>

    <!-- Sidebar Drawer -->
    <aside class="drawer" :class="{ open: menuVisible }">
      <div style="padding: 16px; font-size: 14px; color: var(--text-dim); font-weight: 500;">Actions</div>
      <div class="divider"></div>
      
      <div class="nav-section">
        <div class="nav-subheader">Graph</div>
        <button class="btn-nav" @click="showMarkerDialog = true; menuVisible = false">
          <span class="icon">label</span> Setup Markers
        </button>
        <button class="btn-nav" @click="showScaleDialog = true; menuVisible = false">
          <span class="icon">height</span> Setup Scales
        </button>
        <button class="btn-nav" @click="addTrace">
          <span class="icon">add</span> Add Trace
        </button>
        <button class="btn-nav" @click="openKeypad('Segments', 'frequencies.segments', store.frequencies.segments, '')">
          <span class="icon">gradient</span> Resolution...
        </button>

        <div class="nav-subheader">Device</div>
        <button class="btn-nav" @click="handleConnect" v-if="store.status === 'disconnected'">
          <span class="icon">usb</span> Connect
        </button>
        <button class="btn-nav" disabled v-else-if="store.status === 'connecting'">
          <span class="icon">usb</span> Connect
        </button>
        <button class="btn-nav" @click="disconnect" v-else>
          <span class="icon">cancel</span> Disconnect
        </button>
        
        <div class="nav-subheader">Save</div>
        <button class="btn-nav" @click="saveAs('s1p')" :disabled="store.status !== 'connected'">
          <span class="icon">save_alt</span> Save As .s1p
        </button>
        <button class="btn-nav" @click="saveAs('s2p')" :disabled="store.status !== 'connected'">
          <span class="icon">save_alt</span> Save As .s2p
        </button>
        <button class="btn-nav" @click="saveAsPng('smith')" :disabled="store.status !== 'connected'" v-show="graphSelected === 'smith'">
          <span class="icon">image</span> Save Smith Chart As .png
        </button>
        <button class="btn-nav" @click="saveAsPng('frequency')" :disabled="store.status !== 'connected'" v-show="graphSelected === 'frequency'">
          <span class="icon">image</span> Save Freq Chart As .png
        </button>
        <button class="btn-nav" @click="showCaptureDialog = true; menuVisible = false" :disabled="store.status !== 'connected'">
          <span class="icon">video_label</span> Capture Device
        </button>

        <div class="divider"></div>

        <div class="nav-subheader">State</div>
        <button class="btn-nav" @click="showCalibrationDialog = true; menuVisible = false" :disabled="store.status !== 'connected'">
          <span class="icon">settings_input_antenna</span> Calibrate...
        </button>
        <button class="btn-nav" v-for="n in [0, 1, 2, 3, 4]" :key="n" @click="recallSlot(n)" :disabled="store.status !== 'connected'">
          <span class="icon">arrow_left</span> Recall {{n}}
        </button>

        <div class="divider"></div>
        
        <div class="nav-subheader">About</div>
        <button class="btn-nav" @click="showAboutDialog = true; menuVisible = false">
          <span class="icon">info</span> Version
        </button>
        <button class="btn-nav" @click="quit">
          <span class="icon">exit_to_app</span> Quit
        </button>
      </div>
    </aside>

    <!-- Main Content -->
    <main class="main-content">
      <div class="input-panel">
        <div class="tabs-navigation">
          <button class="tab-btn" :class="{ active: freqInputSelect === 'start-stop' }" @click="freqInputSelect = 'start-stop'">Start/Stop</button>
          <button class="tab-btn" :class="{ active: freqInputSelect === 'center-span' }" @click="freqInputSelect = 'center-span'">Center/Span</button>
        </div>
        
        <div class="freq-inputs" v-if="freqInputSelect === 'start-stop'">
          <div class="input-group">
            <label>Start</label>
            <div class="field" @click="openKeypad('Start Frequency', 'range.start', store.frequencies.start)">
              {{ formatFrequency(store.frequencies.start) }}
            </div>
          </div>
          <div class="input-group">
            <label>Stop</label>
            <div class="field" @click="openKeypad('Stop Frequency', 'range.stop', store.frequencies.stop)">
              {{ formatFrequency(store.frequencies.stop) }}
            </div>
          </div>
        </div>

        <div class="freq-inputs" v-if="freqInputSelect === 'center-span'">
          <div class="input-group">
            <label>Center</label>
            <div class="field" @click="openKeypad('Center Frequency', 'range.center', store.frequencies.center)">
              {{ formatFrequency(store.frequencies.center) }}
            </div>
          </div>
          <div class="input-group">
            <label>Span</label>
            <div class="field" @click="openKeypad('Frequency Span', 'range.span', store.frequencies.span)">
              {{ formatFrequency(store.frequencies.span) }}
            </div>
          </div>
        </div>

        <div class="traces-chips">
          <button v-for="trace in store.traces" :key="trace.id" 
                  class="chip" 
                  :style="{ backgroundColor: trace.show ? trace.color : '#e0e0e0', color: trace.show ? '#fff' : 'rgba(0,0,0,0.87)' }"
                  @click="openTraceSettings(trace)">
            CH{{ trace.channel }} {{ nameOfFormat(trace.format) }}
          </button>
        </div>
      </div>

      <div class="graph-area">
        <div class="tabs-navigation">
          <button class="tab-btn" :class="{ active: graphSelected === 'smith' }" @click="graphSelected = 'smith'">Smith</button>
          <button class="tab-btn" :class="{ active: graphSelected === 'frequency' }" @click="graphSelected = 'frequency'">Freq</button>
          <button class="tab-btn" :class="{ active: graphSelected === 'tdr' }" @click="graphSelected = 'tdr'">TDR</button>
        </div>
        <div class="graph-wrapper">
          <Graph :type="graphSelected" />
        </div>
      </div>
    </main>

    <!-- Dialogs -->
    <Keypad v-if="showKeypad" 
            :title="keypadTitle" 
            :modelValue="keypadValue" 
            :unit="keypadUnit"
            @submit="handleKeypadSubmit" 
            @close="showKeypad = false" />
    
    <TraceDialog v-if="showTraceDialog" 
                 :show="showTraceDialog"
                 :trace="currentTrace" 
                 @save="handleTraceSave"
                 @delete="handleTraceDelete"
                 @close="showTraceDialog = false" />
    
    <ScaleDialog v-if="showScaleDialog" 
                 :show="showScaleDialog"
                 @close="showScaleDialog = false" />
    
    <AboutDialog :show="showAboutDialog" @close="showAboutDialog = false" v-if="showAboutDialog" />
                 
    <CalibrationDialog v-if="showCalibrationDialog" 
                       :show="showCalibrationDialog"
                       @close="showCalibrationDialog = false" />
    
    <MarkerDialog v-if="showMarkerDialog"
                  :show="showMarkerDialog"
                  @close="showMarkerDialog = false"
                  @add-marker="showMarkerDialog = false; addMarker()" />
    
    <CaptureDialog v-if="showCaptureDialog"
                   :show="showCaptureDialog"
                   @close="showCaptureDialog = false" />
  </div>
</template>

<style scoped>
/* .btn-inverse removed */

.nav-section {
  display: flex;
  flex-direction: column;
}

.nav-subheader {
  padding: 16px;
  font-size: 12px;
  color: var(--text-dim);
  text-transform: uppercase;
}

.btn-nav {
  display: flex;
  align-items: center;
  gap: 32px;
  padding: 0 16px;
  height: 48px;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
  font-size: 14px;
  font-weight: 500;
  cursor: pointer;
}

.btn-nav:hover {
  background: rgba(0,0,0,0.08);
}

.btn-nav .icon {
  color: var(--text-dim);
}

.input-panel {
  margin-bottom: 24px;
}

.freq-inputs {
  display: flex;
  gap: 16px;
  margin-top: 16px;
}

.input-group {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.input-group label {
  font-size: 12px;
  color: var(--text-dim);
  margin-bottom: 4px;
}

.field {
  height: 32px;
  border-bottom: 1px solid var(--divider);
  display: flex;
  align-items: center;
  font-size: 16px;
  cursor: pointer;
}

.traces-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  margin-top: 16px;
}

.graph-area {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 400px;
}

.graph-wrapper {
  flex: 1;
  position: relative;
  background: #fff;
}

.slot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 16px;
  font-size: 13px;
}

.marker-list {
  padding: 0 8px;
}

.marker-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 4px 8px;
  background: rgba(0,0,0,0.05);
  border-radius: 4px;
  margin-bottom: 4px;
}

.marker-info {
  display: flex;
  flex-direction: column;
}

.marker-id {
  font-size: 10px;
  font-weight: bold;
  color: var(--primary);
}

.marker-freq {
  font-size: 12px;
}

.btn-icon {
  background: none;
  border: none;
  cursor: pointer;
  padding: 4px;
  display: flex;
  align-items: center;
}

.btn-icon .icon {
  font-size: 18px;
  color: var(--text-dim);
}

.slot-actions {
  display: flex;
  gap: 8px;
}
</style>
