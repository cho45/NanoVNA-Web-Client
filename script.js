/*
Copyright (c) 2019, cho45 <cho45@lowreal.net>
All rights reserved.
Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
    Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
    Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the 
    documentation and/or other materials provided with the distribution.
    Neither the name of Great Scott Gadgets nor the names of its contributors may be used to endorse or promote products derived from this software
    without specific prior written permission.
THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, 
THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED.
IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
(INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION)
HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE)
ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
*/

import * as Comlink from "./lib/comlink/esm/comlink.mjs";

Vue.use(VueMaterial.default);

Chart.pluginService.register({
	beforeRender: function (chart) {
		if (chart.config.options.pinnedTooltips) {
			// create an array of tooltips
			// we can't use the chart tooltip because there is only one tooltip per chart
			chart.pluginTooltips = [];

			const indexes = chart.config.options.pinnedTooltips.map( (freq) => {
				return chart.data.labels.findIndex( (f) => f >= freq );
			});

			const pointRadius = [], pointStyle = [];
			for (let target of indexes) {
				pointRadius[target] = 5;
				pointStyle[target] = 'rectRot';

				const active = chart.config.data.datasets.map( (_, i) => chart.getDatasetMeta(i).data[target] );

				if (active[0]) {
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
		if (chart.config.options.pinnedTooltips) {
			// we don't want the permanent tooltips to animate, so don't do anything till the animation runs atleast once
			if (!chart.allTooltipsOnce) {
				if (easing !== 1)
					return;
				chart.allTooltipsOnce = true;
			}

			Chart.helpers.each(chart.pluginTooltips, function (tooltip) {
				tooltip.initialize();
				tooltip.update();
				// we don't actually need this since we are not animating tooltips
				tooltip.pivot();
				tooltip.transition(easing).draw();
			});
		}
	}
});
Chart.Tooltip.positioners.custom = function (elements, eventPosition) {
	if (!elements.length) {
		return false;
	}

	var i, len;
	var x = 0;
	var y = 0;
	var count = 0;

	for (i = 0, len = elements.length; i < len; ++i) {
		var el = elements[i];
		if (el && el.hasValue()) {
			var pos = el.tooltipPosition();
			x += pos.x;
			y += pos.y;
			++count;
		}
	}

	x /= count;
	y /= count;

	if (y < 0) y = 0;

	return {
		x: x,
		y: y,
	};
};

function versionNumber(str) {
	const version = str.match(/(\d+)\.(\d+)\.(\d+)/);
	if (version) {
		return Array.from(version).slice(1).reduce( (r, i) => r * 10000 + Number(i), 0)
	} 
}

function colorGen(h, s, l, i) {
	if (!h) h = 0;
	if (!s) s = 60;
	if (!l) l = 55;
	if (!i) i = 53;
	return function () {
		const ret = `hsl(${h}, ${s}%, ${l}%)`;
		h = (h + i) % 360;
		return ret;
	};
}

function calcLogMag(i) {
	return Math.log10(Math.hypot(i.real, i.imag)) * 20
}

function calcSWR(i) {
	const x = Math.hypot(i.real, i.imag);
	if (x > 1) return 1/0;
	return (1 + x) / (1 - x);
}

function calcPhase(i) {
	return 2 * Math.atan2(i.real, i.imag) / Math.PI * 90;
}

function calcZ(i) {
	const z0 = 50;
	const d = z0 / ((1-i.real)*(1-i.real)+i.imag*i.imag); 
	const zr = ((1+i.real)*(1-i.real) - i.imag*i.imag) * d;  
	const zi = 2*i.imag * d;
	return [zr, zi];
}

function calcLinear(i) {
	return Math.hypot(i.real, i.imag);
}

function calcReal(i) {
	return i.real;
}

function calcImag(i) {
	return i.imag;
}

function calcZabs(i) {
	return Math.hypot(...calcZ(i));
}

function calcZR(i) {
	return calcZ(i)[0];
}

function calcZX(i) {
	return calcZ(i)[1];
}

function calcZr(i) {
	const d = ((1-i.real)*(1-i.real)+i.imag*i.imag);  
	const zr = ((1+i.real)*(1-i.real) - i.imag*i.imag) / d;
	const zi = 2*i.imag / d;
	return {
		freq: i.freq,
		real: zr,
		imag: zi
	};
}

function formatFrequency(freq, f) {
	if (typeof f === 'undefined') f = 6;
	if (freq < 1e3) {
		return (freq) + ' Hz';
	} else
	if (freq < 1e6) {
		return (freq / 1e3).toFixed(Math.min(3, f)) + ' kHz';
	} else {
		return (freq / 1e6).toFixed(Math.min(6, f)) + ' MHz';
	}
}

async function downloadFile(url, name) {
	if (typeof Capacitor === 'undefined') {
		const a = document.createElement('a');
		a.href = url;
		a.download = name;
		a.click();
	} else {
		const { Filesystem } = Capacitor.Plugins;
		try {
			const data = await (await fetch(url)).arrayBuffer();
			await Filesystem.writeFile({
				path: name,
				data: btoa(String.fromCharCode(...new Uint8Array(data))),
				directory: 'DOCUMENTS',
				encoding: undefined,
			});
		} catch(e) {
			console.error('Unable to write file', e);
		}
	}
}

new Vue({
	el: "#app",
	data: {
		status: 'disconnected',
		snackbar: {
			show: false,
			message: ""
		},
		alert: {
			show: false,
			title: "",
			content: ""
		},
		graph: "",
		menuVisible: false,

		traces: [
		],

		scaleTypes: [
			{
				key: 'dB',
				label: 'dB',
				suffix: 'dB',
				yAxisID: 'y-axis-dB',
			},
			{
				key: 'swr',
				label: 'SWR',
				suffix: '',
				yAxisID: 'y-axis-swr',
			},
			{
				key: 'phase',
				label: 'Phase',
				suffix: '\u00b0',
				yAxisID: 'y-axis-phase',
			},
			{
				key: 'z',
				label: '\u03a9 (R/X/Z)',
				suffix: '\u03a9',
				yAxisID: 'y-axis-z',
			},
		],
		scales: {
			dB: { min: -80, max: 0 },
			swr: { min: 1, max: 10 },
			phase: { min: -270, max: 270 },
			z: { min: -100, max: 100 },
		},

		showNumberInput: false,
		numberInput: {
			title: 'START',
			type: 'frequency',
			input: '1000',
			units: ['', '', '', 'x1'],
			unit: 'Hz',
			result: null,
		},

		showTraceDialog: false,
		currentTraceSetting: {
			show: true,
			channel: 0,
			format: 'smith',
			type: 'clear',
		},
		showScaleDialog: false,

		freqInputSelect: "start-stop",

		updating: false,
		progress: {
			total: 0,
			value: 0,
		},

		showCalibrationDialog: false,

		capturing: false,
		captureDownloadHref: "",
		showCaptureDialog: false,

		showAboutDialog: false,

		calibrationRunning: false,
		calibrationStep: "reset",

		graphSelected: 'freq',

		velocityOfSignalPropagation: 70,
		peakTDR: 0,

		showMarkerDialog: false,
		markers: [
		],
		newMarker: {
			freq: 0
		},

		freqs: [],
		data: {
			ch0: [],
			ch1: []
		},

		deviceInfo: {
			versionNumber: undefined,
			version: null,
			buildTimeStr: '',
			buildTime: null,
			info: '',
		},
		webVersion: "",
		serialMode: NanoVNA.name.replace(/^NanoVNA_/, ''),

		autoUpdate: 1000,
		requestStop: true,

		range: {
			start: 0.05e6,
			stop: 900e6,
			center: 450e6,
			span: 900e6,
			segments: 1,
		}
	},

	computed: {
		showSmithChart: function () {
			return this.graphSelected === 'smith';
		},

		showFreqChart: function () {
			return this.graphSelected === 'freq';
		},

		showTDRChart: function () {
			return this.graphSelected === 'tdr';
		},

		connected: function () {
			return this.status === 'connected';
		},

		disconnected: function () {
			return this.status === 'disconnected';
		}
	},

	methods: {
		test: function () {
		},

		tabChanged: function (e) {
			this.graphSelected = e;
		},

		connect: async function (device0) {
			try {
				this.showSnackbar('Connecting...');
				const device = device0 || await NanoVNA.requestDevice();
				if (device) {
					// for debug
					window.Backend = this.backend;

					this.status = 'connecting'
					let connected = false;
					try {
						if ('serial' in navigator || typeof Capacitor !== 'undefined') {
							const nanovna = new NanoVNA({
								onerror: (e) => {
									this.backend.opts.onerror(String(e));
								},
								ondisconnected: this.backend.opts.ondisconnected,
							});
							await nanovna.open(device);
							this.backend.nanovna = Comlink.proxy(nanovna);
							connected = true;
						} else {
							connected = await this.backend.open(NanoVNA.deviceInfo(device));
						}
					} catch (e) {
						this.showSnackbar('failed to open: ' + e);
					}
					if (!connected) {
						this.status = 'disconnected';
						return;
					}

					this.deviceInfo.version = await this.backend.getVersion();
					this.deviceInfo.info = await this.backend.getInfo();
					this.deviceInfo.buildTimeStr = this.deviceInfo.info.match(/Build time:\s*(([a-z]{3})\s*(\d?\d) (\d{4}) - (\d?\d):(\d?\d):(\d?\d))/i)[1] || '';
					this.deviceInfo.buildTimeStr = this.deviceInfo.buildTimeStr.replace(/\s+/g, ' ');
					this.deviceInfo.buildTime = strptime(this.deviceInfo.buildTimeStr, '%B %d %Y - %H:%M:%S');
					this.deviceInfo.versionNumber = versionNumber(this.deviceInfo.version);

					const v = this.deviceInfo.versionNumber || 0;
					if (v < versionNumber('0.2.0')) {
						alert(`Your NanoVNA firmware may be too old: ${this.deviceInfo.version}\nPlease upgrade firmware to 0.2.0 or above.`);
					}

					console.log(Object.assign({}, this.deviceInfo));

					this.status = 'connected';
					this.showSnackbar('Connected');


					/*
					const start = 50e3;
					const stop  = 900e6;
					const points = 101;
					const step = (stop - start) / (points - 1);
					const frequencies =  new Uint32Array(points).map( (_, i) => step*i+start);
					console.log(frequencies);
					this.backend.frequencies = frequencies;
					*/
					
					this.update();
				} else {
					if (!this.serialMode) {
						prompt("If you have problems with WebUSB, you can use Web Serial API with enabling flag enable-experimental-web-platform-features.", "chrome://flags/#enable-experimental-web-platform-features");
					}
				}
			} catch (e) {
				this.showSnackbar(e);
			}
		},

		disconnect: async function () {
			this.backend.close();
			this.requestStop = true;
			this.autoUpdate = 0;
			this.updating = false;
			this.status = 'disconnected';
		},

		update: async function () {
			if (this.updating) {
				console.log('already running');
				return;
			}

			if (+this.range.segments === 1) {
				this.updateSingleSegment();
			} else {
				this.updateMultiSegments();
			}
		},

		updateSingleSegment: async function () {
			this.updating = true;
			await this.backend.resume();
			const freqs = await this.backend.getFrequencies();
			if (this.freqs.some( (v, i) => freqs[i] !== v )) {
				this.showSnackbar('Frequency range is changed');
				// freq range is changed
				this.data.ch0.length = 0;
				this.data.ch1.length = 0;
				for (let dataset of this.freqChart.data.datasets) {
					dataset.data.length = 0;
				}
				for (let dataset of this.smithChart.data.datasets) {
					dataset.data.length = 0;
				}
			}
			this.freqs = freqs;

			const start = freqs[0], stop = freqs[freqs.length-1];
			const span   = stop - start;
			const center = span / 2 + start;
			this.range.start = start;
			this.range.stop = stop;
			this.range.span = span;
			this.range.center = center;

			const measured0 = await this.backend.getData(0);
			this.data.ch0.unshift(measured0.map( (complex, i) => ({
				freq: freqs[i],
				real: complex[0],
				imag: complex[1],
			})));

			const measured1 = await this.backend.getData(1);
			this.data.ch1.unshift(measured1.map( (complex, i) => ({
				freq: freqs[i],
				real: complex[0],
				imag: complex[1],
			})));
			this.updating = false;

			const maxAvgCount = Math.max(...this.traces.map( (i) => i.avgCount || 0 )) || 1;
			this.data.ch0 = this.data.ch0.slice(0, maxAvgCount);
			this.data.ch1 = this.data.ch1.slice(0, maxAvgCount);

			if (this.autoUpdate) {
				this.autoUpdateTimer = setTimeout(() => {
					this.update();
				}, this.autoUpdate);
			}
		},

		updateMultiSegments: async function () {
			this.updating = true;
			this.requestStop = false;

			// copy previous data
			const measured0 = Array.from(this.data.ch0[0] || []);
			const measured1 = Array.from(this.data.ch1[0] || []);

			this.data.ch0.unshift(measured0);
			this.data.ch1.unshift(measured1);

			const start = +this.range.start;
			const stop = +this.range.stop;
			const segments = +this.range.segments;
			const segmentSize = 101;
			const points = segmentSize * segments;
			const step = (stop - start) / (points-1);
			console.log({step});

			this.progress.total = segments;
			this.progress.value = 0;

			// this.freqs = Array.from(new Uint32Array(11).map( (_, n) => (stop - start) / (11 - 1) * n + start));

			for (let i = 0, n = 0; i < segments; i++) {
				this.progress.value = i;

				const segmentStart = start + step * n;
				const segmentStop = stop - (step * (segments - 1)) + step * n;
				const segmentStep = (segmentStop - segmentStart) / (segmentSize - 1);
				const freqs = new Uint32Array(segmentSize).map( (_, n) => segmentStep * n + segmentStart);
				console.log({segmentStart, segmentStop, n});

				await this.backend.scan(segmentStart, segmentStop, segmentSize);
				const data0 = await this.backend.getData(0);
				const data1 = await this.backend.getData(1);

				const m0 = measured0.
					// remove previous data
					filter( (i) => !freqs.includes(i.freq) ).
					// append new data
					concat(data0.map( (complex, i) => ({
						freq: freqs[i],
						real: complex[0],
						imag: complex[1],
					}))).
					sort( (a, b,) => a.freq - b.freq);
				// replace with new data
				measured0.splice(0, measured0.length, ...m0);

				const m1 = measured1.
					// remove previous data
					filter( (i) => !freqs.includes(i.freq) ).
					// append new data
					concat(data1.map( (complex, i) => ({
						freq: freqs[i],
						real: complex[0],
						imag: complex[1],
					}))).
					sort( (a, b,) => a.freq - b.freq);
				// replace with new data
				measured1.splice(0, measured1.length, ...m1);

				this.freqs = measured0.map( (i) => i.freq );
				n = i % 2 === 0 ? n + segments - i - 1 : n - (segments - i - 1);

				if (this.requestStop) {
					break;
				}
			}

			const maxAvgCount = Math.max(...this.traces.map( (i) => i.avgCount || 0 )) || 1;
			console.log(this.data);
			this.data.ch0 = this.data.ch0.slice(0, maxAvgCount);
			this.data.ch1 = this.data.ch1.slice(0, maxAvgCount);
			console.log(this.data);

			this.updating = false;

			if (this.autoUpdate) {
				this.autoUpdateTimer = setTimeout(() => {
					this.update();
				}, this.autoUpdate);
			}
		},

		pause: async function () {
			clearTimeout(this.autoUpdateTimer);
			this.autoUpdate = 0;
		},

		resume: function () {
			this.autoUpdate = 1000;
			this.update();
		},

		refresh: async function () {
			this.autoUpdate = 100;
			this.update();
		},

		stop: async function () {
			this.autoUpdate = 0;
			this.requestStop = true;
		},

		saveAs: async function (format) {
			if (format === 's1p') {
				const body = [];
				body.push('# Hz S RI R 50\n');
				this.data.ch0[0].forEach( (d) => {
					body.push(`${d.freq}\t${d.real}\t${d.imag}\n`);
				});
				const blob = new Blob(body, { type: 'application/octet-stream' });
				const url = URL.createObjectURL(blob);
				const name = `nanovna-${strftime('%Y%m%d-%H%M%S')}.s1p`;
				downloadFile(url, name);
				this.showSnackbar(`Saved as ${name}`);
			} else
			if (format === 's2p') {
				const body = [];
				body.push('# Hz S RI R 50\n');
				this.data.ch0[0].forEach( (ch0, i) => {
					const ch1 = this.data.ch1[0][i];
					// XXX treat S12 == S21, S22 = S11
					body.push(`${ch0.freq}\t${ch0.real}\t${ch0.imag}\t${ch1.real}\t${ch1.imag}\t${ch1.real}\t${ch1.imag}\t${ch0.real}\t${ch0.imag}\n`);
				});
				const blob = new Blob(body, { type: 'application/octet-stream' });
				const url = URL.createObjectURL(blob);
				const name = `nanovna-${strftime('%Y%m%d-%H%M%S')}.s2p`;
				downloadFile(url, name);
				this.showSnackbar(`Saved as ${name}`);
			} else {
				alert('not implemented');
			}
		},

		saveAsPng: function (graph) {
			const canvas = this.$refs[graph];
			canvas.toBlob((blob) => {
				const url = URL.createObjectURL(blob);
				const name = `graph-${strftime('%Y%m%d-%H%M%S')}.png`;
				downloadFile(url, name);
				this.showSnackbar(`Saved as ${name}`);
			});
		},

		recall: async function (n) {
			await this.backend.recall(n);
			this.showSnackbar(`Recalled ${n}`);
		},

		calibration: async function (step, argv) {
			this.calibrationRunning = true;
			if (step === 'reset') {
				await this.backend.doCal('reset');
				this.calibrationStep = 'open';
			} else
			if (step === 'open') {
				await this.backend.doCal('open');
				this.calibrationStep = 'short';
			} else
			if (step === 'short') {
				await this.backend.doCal('short');
				this.calibrationStep = 'load';
			} else 
			if (step === 'load') {
				await this.backend.doCal('load');
				await this.backend.doCal('isoln');
				this.calibrationStep = 'thru';
			} else
			if (step === 'thru') {
				await this.backend.doCal('thru');
				this.calibrationStep = 'done';
			} else
			if (step === 'done') {
				await this.backend.doCal('done');
				await this.backend.doSave('save', argv);
				this.showCalibrationDialog = false;
				this.calibrationStep = 'reset';
			}
			this.calibrationRunning = false;
		},

		capture: async function () {
			this.showCaptureDialog = true;
			this.capturing = true;
			const data = await this.backend.getCapture();

			const canvas = this.$refs.capture;
			const ctx = canvas.getContext('2d');
			const imd = ctx.createImageData(320, 240);
			const rgba = imd.data;
			for (var i = 0, len = data.length; i < len; i++) {
				const c565 = data[i];
				const r = (c565 >> 11 & 0b011111) << 3;
				const g = (c565 >>  5 & 0b111111) << 2;
				const b = (c565 >>  0 & 0b011111) << 3;
				rgba[i * 4 + 0] = r;
				rgba[i * 4 + 1] = g;
				rgba[i * 4 + 2] = b;
				rgba[i * 4 + 3] = 0xff;
			}
			ctx.putImageData(imd, 0, 0);
			this.captureDownloadHref = canvas.toDataURL();
			this.capturing = false;
		},

		downloadCapture: async function () {
			const name = `nanovna-capture-${strftime('%Y%m%d-%H%M%S')}.png`;
			downloadFile(this.captureDownloadHref, name);
			this.showSnackbar(`Saved as ${name}`);
		},

		calcTDR: async function () {
			if (!this.backend) return;
			if (!this.data.ch0.length) return;

			const SPEED_OF_LIGHT = 299792458;
			const velocityOfSignalPropagation = this.velocityOfSignalPropagation / 100;

			const tdr = await this.backend.calcTDR(this.data.ch0[0]);

			const distances = Array.from(tdr.time.map( (i) => i * SPEED_OF_LIGHT / 2));
			const real = tdr.complex.filter( (_, i) => (i % 2) === 0);
			const imag = tdr.complex.filter( (_, i) => (i % 2) === 1);
			const mag   = real.map( (r, i) => Math.hypot(r, imag[i]) );

			this.peakTDR = distances[mag.indexOf(Math.max(...mag))];

			this.TDRChart.data.labels = distances;
			this.TDRChart.data.datasets[0].data = real;
			this.TDRChart.data.datasets[1].data = real.reduce( (r, v, i) => {
				r.push(i === 0 ? v : r[i - 1] + v);
				return r;
			}, []);
			this.TDRChart.update();
		},

		editTrace: function (trace) {
			this.currentTraceSetting = Object.assign({ src: trace }, trace);
			if (!this.currentTraceSetting.type) {
				this.currentTraceSetting.type = 'clear';
			}
			if (!this.currentTraceSetting.avgCount) {
				this.currentTraceSetting.avgCount = 100;
			}
			this.showTraceDialog = true;
		},

		addTrace: function () {
			this.currentTraceSetting = {
				show: true,
				channel: 0,
				format: 'logmag',
				type: 'clear',
				avgCount: 100,
				color: this.colorGen()
			};
			this.showTraceDialog = true;
		},

		saveTrace: function () {
			const src = this.currentTraceSetting.src;
			const isNew = !src;
			if (isNew) {
				this.traces.push(this.currentTraceSetting);
			} else {
				const target = this.traces.findIndex((i) => i === src);
				delete this.currentTraceSetting.src;
				this.traces.splice(target, 1, this.currentTraceSetting);
			}
			this.showTraceDialog = false;
		},

		deleteTrace: function () {
			const src = this.currentTraceSetting.src;
			const target = this.traces.findIndex((i) => i === src);
			this.traces.splice(target, 1);
			this.showTraceDialog = false;
		},

		updateGraph: function () {
			if (this.data.ch0.length && this.data.ch1.length) {
				for (let update of this.updateFunctions) {
					update();
				}
			}

			if (this.graphSelected === 'freq') {
				if (!this.freqChart.data.datasets.length) return;
				this.freqChart.data.labels = this.freqs;
				this.freqChart.update();
			}
			if (this.graphSelected === 'smith') {
				if (!this.smithChart.data.datasets.length) return;
				this.smithChart.data.labels = this.freqs;
				this.smithChart.update();
			}
			if (this.graphSelected === 'tdr') {
				this.calcTDR();
			}
		},

		applyScaleSetting: function () {
			for (let {key, yAxisID} of this.scaleTypes) {
				const scale = this.scales[key];
				const axis = this.freqChart.options.scales.yAxes.find( (i) => i.id === yAxisID);
				axis.ticks.min = +scale.min;
				axis.ticks.max = +scale.max;
			}
			this.freqChart.update();
			this.saveLastStateToLocalStorage();
			this.showScaleDialog = false;
		},

		nameOfFormat: function (format) {
			// XXX
			return format.toUpperCase();
		},

		saveLastStateToLocalStorage: function () {
			const saving = {
				traces: this.traces,
				scales: this.scales,
				range: this.range,
				markers: this.markers,
			};
			console.log('save to localStorage', saving);
			localStorage.setItem('nanovna', JSON.stringify(saving));
		},

		loadLastStateFromLocalStorage: function () {
			let saved;
			try {
				saved = JSON.parse(localStorage.getItem('nanovna')) || {};
			} catch (e) {
				saved = {};
			}

			console.log('load from localStorage', saved);

			if (saved.traces) {
				this.traces = saved.traces;
			}
			if (saved.scales) {
				this.scales = saved.scales;
				this.applyScaleSetting();
			}
			if (saved.range) {
				this.range = saved.range;
			}
			if (saved.markers) {
				this.markers = saved.markers;
			}
		},

		showAbout: async function () {
			this.showAboutDialog = true;
			if (typeof Capacitor === 'undefined') {
				this.webVersion = (await (await fetch('.git/refs/heads/master')).text()).substring(0, 7);
			} else {
				const info = await Capacitor.Plugins.Device.getInfo();
				this.webVersion = `${info.appVersion} (${info.platform} ${info.osVersion} ${info.model})`;
			}
		},

		showSnackbar: function (message) {
			console.log('showSnackbar', message);
			this.snackbar.message = message;
			this.snackbar.show = true;
		},

		initSmithChart: function () {
			this.smithChart = new Chart(this.$refs.smith.getContext('2d'), {
				type: 'smith',
				options: {
					responsive: true,
					maintainAspectRatio: false,
					legend: {
						display: false
					},
					elements: {
						point: {
							pointStyle: 'cross',
							radius: 1,
							hitRadius: 20,
							hoverRadius: 20,
							borderColor: 'black',
							borderWidth: 0,
							hoverBorderWidth: 1,
						},
						line: {
							fill: false,
							tension: 0,
							borderWidth: 1,
							borderCapStyle: 'round',
							borderJoinStyle: 'round',
						}
					},
					tooltips: {
						enabled: true,
						mode: "nearest",
						callbacks: {
							label: (item, data) => {
								const {real, imag, freq} = data.datasets[item.datasetIndex].data[item.index];
								return `${formatFrequency(freq)} ${real.toFixed(3)} ${imag < 0 ? '-' : '+'} ${Math.abs(imag).toFixed(3)}j`;
							}
						}
					},
					animation: false,
					layout: {
						padding: {
							top: 0,
							left: 10,
							right: 10,
							bottom: 0,
						}
					},
				},
				data: {
					datasets: []
				}
			});

			this.$refs.smith.addEventListener("click", (e) => {
				const item = this.smithChart.getElementAtEvent(e)[0];
				if (!item) return;
				let data = item._chart.config.data.datasets[item._datasetIndex].data[item._index];
				console.log(data);
			});
		},

		initFreqChart: function () {
			this.freqChart = new Chart(this.$refs.freq.getContext('2d'), {
				type: 'line',
				options: {
					pinnedTooltips: [],

					responsive: true,
					maintainAspectRatio: false,
					legend: {
						display: false,
						position: 'top',
						padding: 0
					},
					layout: {
						padding: {
						}
					},
					elements: {
						point: {
							pointStyle: 'cross',
							radius: 1,
							hitRadius: 20,
							hoverRadius: 20,
							borderColor: 'black',
							borderWidth: 0,
							hoverBorderWidth: 1,
						},
						line: {
							borderWidth: 1,
							fill: false,
							tension: 0,
						}
					},
					tooltips: {
						enabled: true,
						position: "custom",
						mode: "index",
						intersect: false,
						callbacks: {
							title: (item, data) => {
								const freq = data.labels[item[0].index];
								return `${formatFrequency(freq)}`;
							},
							label: (item, data) => {
								const datasets = data.datasets[item.datasetIndex];
								const value = data.datasets[item.datasetIndex].data[item.index];
								return `${datasets.label}: ${value.toFixed(3)} ${datasets.suffix}`;
							},
						}
					},
					animation: false,
					scales: {
						xAxes: [
							{
								display: true,
								ticks: {
									autoSkip: false,
									stepSize: 100e6,
									maxTicksLimit: 11,
									callback: (value, index, values) => {
										const n = index % Math.floor(values.length / 11) === 0 && index < values.length / 11 * 10;
										if (n || index === values.length - 1) {
											return formatFrequency(value, 0);
										} else {
											return null;
										}
									}
								},
								scaleLabel: {
									display: false,
									labelString: "frequency"
								},
								afterFit: (scale) => scale.height = 70,
							}
						],
						yAxes: [
							{
								id: 'y-axis-dB',
								display: false,
								type: 'linear',
								ticks: {
									min: -80.0,
									max: 0.0,
									callback: (tick) => tick.toString() + 'dB'
								},
								scaleLabel: {
									display: false,
									labelString: "mag [dB]"
								},
								gridLines: {
									drawOnChartArea: false,
								}
							},
							{
								id: 'y-axis-swr',
								display: false,
								type: 'linear',
								ticks: {
									min: 1.0,
									max: 30.0,
									callback: (tick) => tick.toString() 
								},
								scaleLabel: {
									display: false,
									labelString: "SWR"
								},
								position: 'right',
								gridLines: {
									drawOnChartArea: false,
								}
							},
							{
								id: 'y-axis-phase',
								display: false,
								type: 'linear',
								ticks: {
									min: -90 * 3,
									max: +90 * 3,
									callback: (tick) => tick.toString() + '\u00b0'
								},
								scaleLabel: {
									display: false,
									labelString: "Phase"
								},
								position: 'right',
								gridLines: {
									drawOnChartArea: false,
								}
							},
							{
								id: 'y-axis-z',
								display: false,
								type: 'linear',
								ticks: {
									min: -100,
									max: +100,
									callback: (tick) => tick.toString() + '\u03a9'
								},
								scaleLabel: {
									display: false,
									labelString: "Z"
								},
								position: 'right',
								gridLines: {
									drawOnChartArea: false,
								}
							},
						]
					}
				},
				data: {
					labels: [],
					datasets: [
					]
				}
			});
		},

		initTDRChart: function () {
			this.TDRChart = new Chart(this.$refs.TDR.getContext('2d'), {
				type: 'line',
				options: {
					responsive: true,
					maintainAspectRatio: false,
					legend: {
						display: true,
						position: 'top',
						padding: 0
					},
					layout: {
						padding: {
						}
					},
					elements: {
						point: {
							pointStyle: 'cross',
							radius: 1,
							hitRadius: 20,
							hoverRadius: 20,
							borderColor: 'black',
							borderWidth: 0,
							hoverBorderWidth: 1,
						},
						line: {
							borderWidth: 1,
							fill: false,
							tension: 0,
						}
					},
					tooltips: {
						enabled: true,
						position: "nearest",
						mode: "index",
						intersect: false,
						/*
						callbacks: {
							label: (item, data) => {
								const {real, imag, freq} = data.datasets[item.datasetIndex].data[item.index];
								return `${(freq/1e6).toFixed(3)}MHz ${real.toFixed(3)} ${imag < 0 ? '-' : '+'} ${Math.abs(imag).toFixed(3)}j`;
							}
						}
						*/
					},
					animation: false,
					scales: {
						xAxes: [
							{
								display: true,
								ticks: {
									maxTicksLimit: 11,
									callback: (tick) => (tick * (this.velocityOfSignalPropagation / 100)).toFixed(3) + 'm'
								},
								scaleLabel: {
									display: false,
									labelString: "distance (one way)"
								},
							}
						],
						yAxes: [
							{
								id: 'impulse',
								display: true,
								type: 'linear',
								position: 'left',
								ticks: {
								},
								scaleLabel: {
									display: true,
									labelString: "impulse"
								}
							},
							{
								id: 'step',
								display: true,
								position: 'right',
								type: 'linear',
								ticks: {
									min: -1.5,
									max: +1.5
								},
								scaleLabel: {
									display: true,
									labelString: "step"
								}
							},
						]
					}
				},
				data: {
					labels: [],
					datasets: [
						{
							label: `CH0 TDR Impulse`,
							fill: false,
							yAxisID: 'impulse',
							borderColor: this.colorGen(),
							data: [],
						},
						{
							label: `CH0 TDR Step`,
							fill: false,
							yAxisID: 'step',
							borderColor: this.colorGen(),
							data: [],
						}
					]
				}
			});
		},

		openNumberInput: async function (opts) {
			this.numberInput.result = '';
			this.numberInput.title = opts.title || '';
			this.numberInput.description = opts.description || '';
			this.numberInput.descriptionHtml = opts.descriptionHtml || '';
			this.numberInput.prev  = opts.input || '';
			this.numberInput.unit = opts.unit || '';
			this.numberInput.units = opts.units || '';
			this.numberInput.input = '';
			this.showNumberInput = true;

			return await new Promise( (resolve, reject) => {
				const cancel = this.$watch('showNumberInput', () => {
					cancel();
					console.log('resolve', this.numberInput.result);
					resolve(this.numberInput.result);
				});
			});
		},

		formatNumber: function (number, sep) {
			if (!sep) sep = ',';
			return String(number).replace(/\B(?=(\d{3})+(?!\d))/g, sep);
		},

		formatFrequency: formatFrequency,

		numberInputButton: function (e) {
			const UNITS = {
				'G': 1e9,
				'M': 1e6,
				'k': 1e3,
				'x1' : 1,
				'm' : 1e-3,
				'\u00b5' : 1e-6,
				'n' : 1e-9,
				'p' : 1e-12,
			};

			const char = e.target.textContent.replace(/\s+/g, '');
			console.log(JSON.stringify(char));
			if (/^[0-9]$/.test(char)) {
				this.numberInput.input += char;
			} else
			if (char === '.') {
				if (!this.numberInput.input.includes('.')) {
					this.numberInput.input += char;
				}
			} else
			if (char === '\u232B') {
				if (this.numberInput.input.length) {
					this.numberInput.input = this.numberInput.input.slice(0, -1);
				} else {
					this.showNumberInput = false;
				}
			} else
			if (char === '-') {
				if (this.numberInput.input[0] === '-') {
					this.numberInput.input = this.numberInput.input.slice(1);
				} else {
					this.numberInput.input = '-' + this.numberInput.input;
				}
			} else
			if (UNITS[char]) {
				const base = parseFloat(this.numberInput.input);
				this.numberInput.result = base * UNITS[char];
				this.showNumberInput = false;
			}
			console.log(this.numberInput.input, parseFloat(this.numberInput.input));
		},

		updateStartStop: async function () {
			let [start, stop] = [ +this.range.start, +this.range.stop ];
			if (start < 0) start = 0;
			if (stop > 1500e6) stop = 1500e6;
			const span   = stop - start;
			const center = span / 2 + start;
			console.log('updateStartStop', this.range.center, this.range.span, {center, span});
			this.range.center = center;
			this.range.span = span;
			this.data.ch0.length = 0;
			this.data.ch1.length = 0;

			if (+this.range.segments === 1) {
				if (this.connected) {
					await this.backend.setSweep('start', this.range.start);
					await this.backend.setSweep('stop', this.range.stop);
				}
			}
			this.saveLastStateToLocalStorage();
		},

		updateCenterSpan: async function () {
			let [center, span] = [ +this.range.center, +this.range.span ];
			let start = center - (span / 2);
			let stop = center + (span / 2);
			if (start < 0) {
				this.showSnackbar('Invalid span for center. Reducing span.');
				console.log('start < 0', {center, span, start, stop});
				this.range.span = span + start * 2;
				stop += start;
				start -= start;
			}
			console.log('updateCenterSpan', { start, stop });
			this.range.start = start;
			this.range.stop = stop;
			this.data.ch0.length = 0;
			this.data.ch1.length = 0;

			if (+this.range.segments === 1) {
				if (this.connected) {
					await this.backend.setSweep('center', this.range.center);
					await this.backend.setSweep('span', this.range.span);
				}
			}
			this.saveLastStateToLocalStorage();
		},

		changeSegments: async function () {
			const num = await this.openNumberInput({
				title: 'Segments',
				descriptionHtml: `
					<p>By increasing the number of segments:</p>
					<ul>
						<li>Increases the number of measurement points and frequency resolution.</li>
						<li>Measurement time increases.</li>
					</ul>
				`,
				input: this.range.segments,
				unit: 'Segments',
				units: ['', '', '', 'x1'],
			});
			if (typeof num === 'number' && !isNaN(num)) {
				this.range.segments = ~~num;
			}
		},

		addMarker: async function () {
			const num = await this.openNumberInput({
				title: 'New marker frequency',
				input: '',
				unit: 'Hz',
				units: ['G', 'M', 'k', '1x'],
			});
			if (typeof num === 'number' && !isNaN(num)) {
				this.newMarker.freq = num;

				this.markers.push(Object.assign({}, this.newMarker));
				this.markers.sort( (a, b) => a.freq - b.freq);
				this.newMarker.freq = 0;
				this.saveLastStateToLocalStorage();
			}
		},

		removeMarker: function (marker) {
			for (var i = 0, len = this.markers.length; i < len; i++) {
				if (this.markers[i] === marker) {
					this.markers.splice(i, 1);
					break;
				}
			}
			this.saveLastStateToLocalStorage();
		},

		quit: function () {
			if (typeof Capacitor === 'undefined') {
				window.close();
			} else {
				Capacitor.Plugins.App.exitApp();
			}
		},
	},

	created: function () {
		window.app = this;
		this.updateFunctions = [];
	},

	mounted: async function () {
		//const Backend = Comlink.wrap(new Worker("./worker.js", { type: "module" }));
		const Backend = Comlink.wrap(new Worker("./worker.js"));

		this.colorGen = colorGen();

		this.backend = await new Backend();
		await this.backend.init(Comlink.proxy({
			onerror: (e) => {
				console.log('onerror', e);
			},
			ondisconnected:() => {
				this.status = 'disconnected';
				this.showSnackbar('Disconnected');
			},
		}));

		const device = await NanoVNA.getDevice();
		if (device) {
			this.connect(device);
		}

		this.$watch('range.segments', () => {
			this.stop();
			this.data.ch0.length = 0;
			this.data.ch1.length = 0;
			this.saveLastStateToLocalStorage();
		});

		document.body.addEventListener('focusin', async (e) => {
			if (e.target.nodeName !== 'INPUT') return;
			if (
				e.target.type !== 'number' &&
				!e.target.dataset.units
			) return;

			console.log('focusin', e.target, e.target.nodeName, e.target.type);
			const units = (e.target.dataset.units || '').split(/\s+/).filter( i => !!i );
			if (!units.length) units.push('x1');
			while (units.length < 4) units.unshift('');

			const num = await this.openNumberInput({
				title: e.target.name,
				input: e.target.dataset.rawValue || e.target.value,
				unit: e.target.dataset.unit,
				units: units
			});
			if (typeof num === 'number' && !isNaN(num)) {
				e.target.__vue__.$emit('input', num);
				e.target.__vue__.$emit('change', num);
			}
		});

		this.$watch('traces', () => {
			console.log('traces updated');
			this.updateFunctions.length = 0;
			this.smithChart.data.datasets.length = 0;
			this.freqChart.data.datasets.length = 0;

			const axisSet = new Set();
			for (let trace of this.traces) {
				if (!trace.show) continue;
				const [chart, func, yAxisID, suffix] = {
					'smith': [this.smithChart, calcZr, undefined, ''],
					'logmag': [this.freqChart, calcLogMag, 'y-axis-dB', 'dB'],
					'phase': [this.freqChart, calcPhase, 'y-axis-phase', '\u00b0'],
					'swr': [this.freqChart, calcSWR, 'y-axis-swr', ''],
					'linear': [this.freqChart, calcLinear, 'y-axis-z', ''],
					'real': [this.freqChart, calcReal, 'y-axis-z', ''],
					'imag': [this.freqChart, calcImag, 'y-axis-z', ''],
					'R': [this.freqChart, calcZR, 'y-axis-z', '\u03a9'],
					'X': [this.freqChart, calcZX, 'y-axis-z', '\u03a9'],
					'Z': [this.freqChart, calcZabs, 'y-axis-z', '\u03a9'],
				}[trace.format];

				if (yAxisID) axisSet.add(yAxisID);

				const n = chart.data.datasets.length;
				chart.data.datasets.push({
					label: `CH${trace.channel} ${trace.format}`,
					fill: false,
					borderColor: trace.color,
					backgroundColor: trace.color,
					data: [],
					suffix: suffix,
					yAxisID: yAxisID
				});
				chart.update();

				this.updateFunctions.push({
					clear: () => {
						chart.data.datasets[n].data = this.data[`ch${trace.channel}`][0].map(func);
					},
					freeze: () => {
						if (chart.data.datasets[n].data.length) {
							return;
						}
						chart.data.datasets[n].data = this.data[`ch${trace.channel}`][0].map(func);
					},
					maxhold: () => {
						const vals = this.data[`ch${trace.channel}`][0].map(func);
						const data = chart.data.datasets[n].data;
						chart.data.datasets[n].data = vals.map( (v, i) =>  Math.max(v, data[i] || Number.NEGATIVE_INFINITY) );
					},
					minhold: () => {
						const vals = this.data[`ch${trace.channel}`][0].map(func);
						const data = chart.data.datasets[n].data;
						chart.data.datasets[n].data = vals.map( (v, i) =>  Math.min(v, data[i] || Number.POSITIVE_INFINITY) );
					},
					videoavg: () => {
						const target = this.data[`ch${trace.channel}`].slice(0, trace.avgCount || 2);
						const vals = target.
							map( d => d.map(func) ).
							reduce( (r, o) => r.map( (v, i) => v + o[i]) ).
							map( v => v / target.length );
						chart.data.datasets[n].data = vals;
					},
					poweravg: () => {
						const target = this.data[`ch${trace.channel}`].slice(0, trace.avgCount || 2);
						if (trace.format === 'logmag') {
							const vals = target.
								map( d => d.map( (n) => Math.pow(10, func(n) / 10) ) ).
								reduce( (r, o) => r.map( (v, i) => v + o[i]) ).
								map( v => Math.log10(v / target.length) * 10 );
							chart.data.datasets[n].data = vals;
						} else {
							const vals = target.
								map( d => d.map(func) ).
								reduce( (r, o) => r.map( (v, i) => v + o[i]) ).
								map( v => v / target.length );
							chart.data.datasets[n].data = vals;
						}
					}
				}[trace.type || 'clear']);
			}

			for (let yAxis of this.freqChart.options.scales.yAxes) {
				yAxis.display = axisSet.has(yAxis.id);
			}

			this.updateGraph();
			this.saveLastStateToLocalStorage();
		});

		this.$watch('data.ch0', () => this.updateGraph());
		this.$watch('data.ch1', () => this.updateGraph());

		this.$watch('velocityOfSignalPropagation', () => {
			if (this.TDRChart) {
				this.TDRChart.update();
			}
		});

		this.$watch('markers', () => {
			this.freqChart.config.options.pinnedTooltips = this.markers.map( (m) => m.freq );
			this.freqChart.update();

			this.smithChart.config.options.pinnedTooltips = this.markers.map( (m) => m.freq );
			this.smithChart.update();
		});

		this.traces = [
			{
				show: true,
				channel: 0,
				format: 'smith',
				color: this.colorGen()
			},
			{
				show: true,
				channel: 0,
				format: 'logmag',
				color: this.colorGen()
			},
			{
				show: true,
				channel: 1,
				format: 'logmag',
				color: this.colorGen()
			},
		];

		this.initSmithChart();
		this.initFreqChart();
		this.initTDRChart();

		this.loadLastStateFromLocalStorage();

		console.log(this);
		this.$el.style.visibility = 'visible';
	}
});

