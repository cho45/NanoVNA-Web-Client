
Vue.use(VueMaterial.default);
new Vue({
	el: "#app",
	data: {
		statusText: "init",
		connected: false,
		firmwareFile: null,
		dfuDesc: null,
		device: null,
		log : [],
		builds: [],
		firmwareFileArrayBuffer: null,
		progress: {
			total: 0,
			done: 0
		},
	},

	methods: {
		loadLatestBuilds: async function () {
			const res = await fetch('https://circleci.com/api/v1.1/project/github/ttrftech/NanoVNA/tree/master?shallow=true&offset=0&limit=5&mine=false');
			if (!res.ok) {
				alert('failed to fetchlatest build information');
			}

			this.builds = await res.json();
		},

		downloadFirmware: async function (buildNum) {
			const res = await fetch(`https://circleci.com/api/v1.1/project/github/ttrftech/NanoVNA/${buildNum}/artifacts`);
			if (!res.ok) {
				alert('failed to fetchlatest build information');
			}
			const artifacts = await res.json();
			const binInfo = artifacts.find( i => /ch\.bin/.test(i.path) );
			console.log({binInfo});
			const a = document.createElement('a');
			a.download = `ch-${buildNum}.bin`;
			a.href = binInfo.url;
			a.click();
		},

		select: async function () {
			this.log.length = 0;
			this.log.push("requestDevice...");

			const filters = [
				{ vendorId: 0x0483, productId: 0xdf11 }
			];
			const device = await navigator.usb.requestDevice({ filters });
			if (!device) {
				this.statusText = "no device selected";
				return;
			}
			this.log.push("findDeviceDfuInterfaces");

			const interfaces = await dfu.findDeviceDfuInterfaces(device);
			if (interfaces.length === 0) {
				this.statusText = "selected device does not have any dfu interface";
				return;
			}

			try {
				const d = new dfu.Device(device, interfaces[0]);
				await device.open();
				const mapping = await d.readInterfaceNames();
				for (let intf of interfaces) {
					if (intf.name === null) {
						let configIndex = intf.configuration.configurationValue;
						let intfNumber = intf["interface"].interfaceNumber;
						let alt = intf.alternate.alternateSetting;
						intf.name = mapping[configIndex][intfNumber][alt];
					}
				}
			}  finally {
				await device.close();
			}

			this.log.push("connecting...");
			await this.connect(new dfu.Device(device, interfaces.find( i => /Internal Flash/.test(i.name) )));
		},

		fileChange: function (e) {
			e.preventDefault();
			const file = e.target.files[0];
			if (/\.bin$/.test(file.name)) {
				this.firmwareFile = file;
				const reader = new FileReader();
				reader.onload = () => {
					this.firmwareFileArrayBuffer = reader.result;
				};
				reader.readAsArrayBuffer(file);
			} else {
				alert('require .bin file');
			}
		},

		connect: async function (device) {

			this.log.push("device.open");
			try {
				await device.open();
			} catch (e) {
				this.statusText = e;
				return;
			}

			this.log.push("readConfigurationDescriptor");
			const configDesc = dfu.parseConfigurationDescriptor(await device.readConfigurationDescriptor(0));
			let funcDesc = null;
			if (configDesc.bConfigurationValue === device.settings.configuration.configurationValue) {
				for (let desc of configDesc.descriptors) {
					if (desc.bDescriptorType == 0x21 && desc.hasOwnProperty("bcdDFUVersion")) {
						funcDesc = desc;
						break;
					}
				}
			}
			if (!funcDesc) {
				this.statusText = "funcDesc is not found";
				return;
			}

			const dfuDesc = {
				WillDetach:            ((funcDesc.bmAttributes & 0x08) != 0),
				ManifestationTolerant: ((funcDesc.bmAttributes & 0x04) != 0),
				CanUpload:             ((funcDesc.bmAttributes & 0x02) != 0),
				CanDnload:             ((funcDesc.bmAttributes & 0x01) != 0),
				TransferSize:          funcDesc.wTransferSize,
				DetachTimeOut:         funcDesc.wDetachTimeOut,
				DFUVersion:            funcDesc.bcdDFUVersion
			};
			this.log.push(`dfuDesc: ${JSON.stringify(dfuDesc, null, 2)}`);

			if (!dfuDesc.CanDnload) {
				this.statusText = "download is disabled... give up";
				return;
			}

			this.dfuDesc = dfuDesc;

			if (dfuDesc.DFUVersion === 0x011a && device.settings.alternate.interfaceProtocol == 0x02) {
				this.log.push("this is dfuse device");
				device = new dfuse.Device(device.device_, device.settings);
				console.log(device);
				this.log.push(`memoryInfo: ${JSON.stringify(device.memoryInfo, null, 2)}`);
			} else {
				this.statusText = "unsupported device";
				return;
			}

			device.logDebug = (m) => { this.log.push(`[DEBUG] ${m}`) };
			device.logInfo =  (m) => { this.log.push(`[INFO] ${m}`); this.statusText = m };
			device.logWarning = (m) => { this.log.push(`[WARNING] ${m}`); this.statusText = m };
			device.logError = (m) => { this.log.push(`[ERROR] ${m}`); this.statusText = m };
			device.logProgress = (done, total) => {
				this.progress.done = done;
				this.progress.total = total;
			};

			this.connected = true;
			this.device = device;
		},

		write: async function () {
			const { device, firmwareFileArrayBuffer } = this;
			try {
				let status = await device.getStatus();
				if (status.state == dfu.dfuERROR) {
					await device.clearStatus();
				}
			} catch (error) {
				this.statusText = "Failed to clear status";
			}

			device.startAddress = 0x8000000;

			await device.do_download(this.dfuDesc.TransferSize, firmwareFileArrayBuffer, this.dfuDesc.ManifestationTolerant);
			await device.waitDisconnected(5000);
			this.connected = false;
			this.device = null;
		},

		disconnect: async function () {
			this.connected = false;
			this.device.close();
			this.device = null;
		}
	},

	mounted: async function () {
		console.log('mounted');
		this.loadLatestBuilds();

		this.$watch("log", () => {
			const log = this.$refs.log;
			log.scrollTop = log.scrollHeight;
		});
	}
});
