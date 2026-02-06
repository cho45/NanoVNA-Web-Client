<script setup>
import { onMounted, onUnmounted, ref, watch, watchEffect } from 'vue';
import Chart from 'chart.js';
import 'chartjs-chart-smith';
import { store, getWorker } from '../store';
import * as dsp from '../lib/dsp';

// Register Chart.js plugin for pinned tooltips (markers)
Chart.pluginService.register({
  beforeRender: function (chart) {
    if (chart.config.options.pinnedTooltips && chart.config.options.pinnedTooltips.length > 0) {
      // Create array of tooltips for markers
      chart.pluginTooltips = [];

      const indexes = chart.config.options.pinnedTooltips.map((freq) => {
        return chart.data.labels.findIndex((f) => f >= freq);
      }).filter(i => i >= 0);

      const pointRadius = [];
      const pointStyle = [];
      
      for (let target of indexes) {
        pointRadius[target] = 5;
        pointStyle[target] = 'rectRot';

        const active = chart.config.data.datasets.map((_, i) => {
          const meta = chart.getDatasetMeta(i);
          return meta && meta.data && meta.data[target];
        }).filter(Boolean);

        if (active.length > 0 && active[0]) {
          chart.pluginTooltips.push(new Chart.Tooltip({
            _chart: chart.chart,
            _chartInstance: chart,
            _data: chart.data,
            _options: chart.options.tooltips,
            _active: active,
          }, chart));
        }
      }

      for (let dataset of chart.data.datasets) {
        dataset.pointRadius = pointRadius;
        dataset.pointStyle = pointStyle;
      }
    }
  },
  afterDraw: function (chart, easing) {
    if (chart.config.options.pinnedTooltips && chart.config.options.pinnedTooltips.length > 0) {
      if (!chart.allTooltipsOnce) {
        if (easing !== 1) return;
        chart.allTooltipsOnce = true;
      }

      Chart.helpers.each(chart.pluginTooltips, function (tooltip) {
        tooltip.initialize();
        tooltip.update();
        tooltip.pivot();
        tooltip.transition(easing).draw();
      });
    }
  }
});


const props = defineProps({
  type: { type: String, default: 'frequency' } // 'frequency' or 'smith'
});

const canvasRef = ref(null);
let chart = null;

const initChart = () => {
  if (!canvasRef.value) return;

  const ctx = canvasRef.value.getContext('2d');
  let config;
  if (props.type === 'smith') config = getSmithConfig();
  else if (props.type === 'tdr') config = getTdrConfig();
  else config = getFreqConfig();
  
  chart = new Chart(ctx, config);
};

const getFreqConfig = () => ({
  type: 'line',
  data: { labels: [], datasets: [] },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    scales: {
      xAxes: [{
        ticks: { callback: (value) => dsp.formatFrequency(value, 3), fontColor: 'rgba(0,0,0,0.54)' },
        gridLines: { color: 'rgba(0,0,0,0.08)' }
      }],
      yAxes: [
        { id: 'y-axis-dB', position: 'left', ticks: { fontColor: 'rgba(0,0,0,0.54)', min: store.scales.logmag.min, max: store.scales.logmag.max }, gridLines: { color: 'rgba(0,0,0,0.08)' }, scaleLabel: { display: true, labelString: 'dB' } },
        { id: 'y-axis-swr', position: 'right', display: false, ticks: { fontColor: 'rgba(0,0,0,0.54)', min: store.scales.swr.min, max: store.scales.swr.max }, gridLines: { color: 'rgba(0,0,0,0.08)' }, scaleLabel: { display: true, labelString: 'SWR' } },
        { id: 'y-axis-phase', position: 'right', display: false, ticks: { fontColor: 'rgba(0,0,0,0.54)', min: store.scales.phase.min, max: store.scales.phase.max }, gridLines: { color: 'rgba(0,0,0,0.08)' }, scaleLabel: { display: true, labelString: 'Phase' } }
      ]
    },
    legend: { labels: { fontColor: 'rgba(0,0,0,0.87)' } },
    tooltips: {
      callbacks: {
        title: (tooltipItems) => {
          if (tooltipItems.length > 0) {
            return dsp.formatFrequency(tooltipItems[0].xLabel);
          }
          return '';
        },
        label: (tooltipItem, data) => {
          const datasetLabel = data.datasets[tooltipItem.datasetIndex].label || '';
          const value = tooltipItem.yLabel;
          let formattedValue = value;
          
          // Determine format from dataset label
          if (datasetLabel.includes('logmag')) {
            formattedValue = dsp.formatLogMag(value);
          } else if (datasetLabel.includes('phase')) {
            formattedValue = dsp.formatPhase(value);
          } else if (datasetLabel.includes('swr')) {
            formattedValue = dsp.formatSWR(value);
          } else if (datasetLabel.includes('linear')) {
            formattedValue = dsp.formatLinear(value);
          } else if (datasetLabel.includes('real')) {
            formattedValue = dsp.formatReal(value);
          } else if (datasetLabel.includes('imag')) {
            formattedValue = dsp.formatImag(value);
          }
          
          return datasetLabel + ': ' + formattedValue;
        }
      }
    }
  }
});

const getTdrConfig = () => ({
  type: 'line',
  data: { labels: [], datasets: [] },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    scales: {
      xAxes: [{
        ticks: { callback: (value) => (value * 1e9).toFixed(1) + ' ns', fontColor: 'rgba(0,0,0,0.54)' },
        gridLines: { color: 'rgba(0,0,0,0.08)' }
      }],
      yAxes: [{
        ticks: { fontColor: 'rgba(0,0,0,0.54)' },
        gridLines: { color: 'rgba(0,0,0,0.08)' },
        scaleLabel: { display: true, labelString: 'Magnitude' }
      }]
    },
    legend: { labels: { fontColor: 'rgba(0,0,0,0.87)' } },
    tooltips: {
      callbacks: {
        title: (tooltipItems) => {
          if (tooltipItems.length > 0) {
            return (tooltipItems[0].xLabel * 1e9).toFixed(1) + ' ns';
          }
          return '';
        },
        label: (tooltipItem, data) => {
          const datasetLabel = data.datasets[tooltipItem.datasetIndex].label || '';
          const value = tooltipItem.yLabel;
          return datasetLabel + ': ' + value.toFixed(4);
        }
      }
    }
  }
});

const getSmithConfig = () => ({
  type: 'smith',
  data: { datasets: [] },
  options: {
    responsive: true,
    maintainAspectRatio: false,
    animation: { duration: 0 },
    scale: { gridLines: { color: 'rgba(0,0,0,0.08)' }, ticks: { fontColor: 'rgba(0,0,0,0.54)' } },
    legend: { labels: { fontColor: 'rgba(0,0,0,0.87)' } },
    tooltips: {
      callbacks: {
        label: (tooltipItem, data) => {
          const datasetLabel = data.datasets[tooltipItem.datasetIndex].label || '';
          const point = data.datasets[tooltipItem.datasetIndex].data[tooltipItem.index];
          if (point && typeof point === 'object') {
            return [
              datasetLabel,
              'Freq: ' + dsp.formatFrequency(point.freq || 0),
              'Real: ' + (point.real || 0).toFixed(3),
              'Imag: ' + (point.imag || 0).toFixed(3)
            ];
          }
          return datasetLabel;
        }
      }
    }
  }
});

const updateChart = async () => {
  if (!chart) return;

  if (props.type === 'tdr') {
    const s11 = store.traces.find(t => t.channel === 0 && t.show);
    const chData = store.data.ch0;
    if (!s11 || !chData || chData.length === 0) return;

    try {
        const worker = await getWorker();
        // Convert to plain array for Worker postMessage (Vue Proxy cannot be cloned)
        const plainData = chData.map(d => ({ freq: d.freq, real: d.real, imag: d.imag }));
        const tdrResult = await worker.calcTDR(plainData);
        
        chart.data.labels = Array.from(tdrResult.time);
        chart.data.datasets = [{
            label: 'TDR Impulse',
            data: Array.from(tdrResult.complex.filter((_, i) => i % 2 === 0)),
            borderColor: s11.color,
            borderWidth: 2,
            pointRadius: 2,
            fill: false
        }];
        chart.update();
    } catch (e) {
        console.error('TDR calc failed', e);
    }
    return;
  }

  const traces = store.traces.filter(t => t.show && (props.type === 'smith' ? t.format === 'smith' : t.format !== 'smith'));
  
  if (props.type === 'frequency') {
    chart.data.labels = store.frequencies.data || [];
    chart.data.datasets = traces.map(t => {
      const chData = t.channel === 0 ? store.data.ch0 : store.data.ch1;
      return {
        label: `CH${t.channel} ${t.format}`,
        data: chData.map(d => {
          const complex = { real: d.real, imag: d.imag };
          if (t.format === 'logmag') return dsp.calcLogMag(complex);
          if (t.format === 'swr') return dsp.calcSWR(complex);
          if (t.format === 'phase') return dsp.calcPhase(complex);
          if (t.format === 'linear') return dsp.calcLinear(complex);
          if (t.format === 'real') return dsp.calcReal(complex);
          if (t.format === 'imag') return dsp.calcImag(complex);
          return 0;
        }),
        borderColor: t.color,
        backgroundColor: 'transparent',
        borderWidth: 2,
        pointRadius: 2,
        yAxisID: t.format === 'swr' ? 'y-axis-swr' : (t.format === 'phase' ? 'y-axis-phase' : 'y-axis-dB')
      };
    });
  } else {
    // Smith chart - use calcZr to transform to normalized impedance
    chart.data.datasets = traces.map(t => {
      const chData = t.channel === 0 ? store.data.ch0 : store.data.ch1;
      return {
        label: `CH${t.channel} Smith`,
        data: chData.map(d => dsp.calcZr(d)),  // Returns {freq, real, imag}
        borderColor: t.color,
        borderWidth: 2,
        pointRadius: 2,
        fill: false
      };
    });
  }

  // Set marker positions for pinnedTooltips plugin
  chart.config.options.pinnedTooltips = store.markers.filter(m => m.show).map(m => m.freq);
  
  chart.update();
};

// Use watchEffect to automatically track all reactive dependencies
watchEffect(() => {
    // Access dataVersion to establish dependency tracking
    const version = store.dataVersion;
    updateChart();
});
watch(() => props.type, () => {
    if (chart) chart.destroy();
    initChart();
    updateChart();
});
watch(() => store.scales, () => {
  if (!chart || props.type === 'smith') return;
  const axes = chart.options.scales.yAxes;
  axes.find(a => a.id === 'y-axis-dB').ticks.min = store.scales.logmag.min;
  axes.find(a => a.id === 'y-axis-dB').ticks.max = store.scales.logmag.max;
  axes.find(a => a.id === 'y-axis-swr').ticks.min = store.scales.swr.min;
  axes.find(a => a.id === 'y-axis-swr').ticks.max = store.scales.swr.max;
  axes.find(a => a.id === 'y-axis-phase').ticks.min = store.scales.phase.min;
  axes.find(a => a.id === 'y-axis-phase').ticks.max = store.scales.phase.max;
  chart.update();
}, { deep: true });
watch(() => store.status, (status) => {
    if (status === 'connected') updateChart();
});

onMounted(initChart);
onUnmounted(() => {
  if (chart) chart.destroy();
});
</script>

<template>
  <div class="graph-container">
    <canvas ref="canvasRef" :data-graph-type="props.type"></canvas>
  </div>
</template>

<style scoped>
.graph-container {
  width: 100%;
  height: 100%;
  position: relative;
}
</style>
