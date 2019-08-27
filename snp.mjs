
export class SNP {
	static parse(data, numberOfPort) {
		const snp = new SNP(data, numberOfPort);
		snp.parse();
		return snp;
	}

	get unitFactor() {
		return {
			'HZ': 1,
			'KHZ': 1e3,
			'MHZ': 1e6,
			'GHZ': 1e9
		}[this.unit] || NaN;
	}

	constructor(data, numberOfPort) {
		if (typeof numberOfPort === 'string') {
			if (numberOfPort.match(/s(\d)p/)) {
				numberOfPort = +RegExp.$1;
			} else {
				throw "invalid value for numberOfPort";
			}
		}
		if (this.numberOfPort > 2) {
			throw "numberOfPort > 2 is not supported";
		}
		this.numberOfPort = numberOfPort;
		this.data = data;
		this.unit = 'GHZ';
		this.parameter = 'S';
		this.format = 'MA';
		this.reference = 50;
		this.values = [];
	}

	parse() {
		const lines = this.data.split(/\r?\n/);
		while (lines.length) {
			const line = lines.shift().replace(/^\s*|\s*!.*$/g, '');
			if (/^\[([^]+)\]\s*(.+)/.test(line)) {
				const name = RegExp.$1;
				const val = RegExp.$2;
				// console.log({name, val});
				continue;
			} else
			if (/^#/i.test(line)) {
				const options = line.split(/\s+/);
				options.shift();
				while (options.length) {
					const option = options.shift();
					if (/^(Hz|kHz|MHz|GHz)$/i.test(option)) {
						this.unit = option.toUpperCase();
					} else
					if (/^[SYZGH]$/i.test(option)) {
						this.parameter = option.toUpperCase();
					} else
					if (/^(DB|MA|RI)$/i.test(option)) {
						this.format = option.toUpperCase();
					} else
					if (/^R$/.test(option)) {
						this.reference = +options.shift();
					}
				}
			} else
			if (/^\d/.test(line)) {
				const values = line.replace(/^\s+|\s+$/g, '').split(/\s+/);
				const freq = +values.shift();
				if (values.length % 2 !== 0) {
					throw "odd number of values";
				}
				// All angles are measured in degrees
				// MA = magnitude/angle DB = dB/angle, RI = real/imag
				const func = this['convert' + this.format];
				const ret = [];
				for (let i = 0; i < values.length; i += 2) {
					ret.push(func.call(this, +values[i+0], +values[i+1]));
				}
				// N11, N21, N12, N22 
				// console.log(ret);
				this.values.push({
					freq: freq * this.unitFactor,
					params: ret,
				});
			}
		}
	}

	convertMA(mag, angle) {
		const rad = (angle* Math.PI) / 180;
		return [mag * Math.cos(rad), mag * Math.sin(rad)];
	}

	convertDB(dB, angle) {
		const mag = Math.pow(10, dB / 20);
		return this.convertMA(mag, angle);
	}

	convertRI(real, imag) {
		return [real, imag];
	}
};


