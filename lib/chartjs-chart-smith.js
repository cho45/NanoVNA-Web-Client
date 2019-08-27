/*!
 * chartjs-chart-smith v0.2.0
 * https://github.com/chartjs/chartjs-chart-smith
 * (c) 2019 Chart.js Contributors
 * Released under the MIT license
 */
(function (global, factory) {
typeof exports === 'object' && typeof module !== 'undefined' ? factory(require('chart.js')) :
typeof define === 'function' && define.amd ? define(['chart.js'], factory) :
(global = global || self, factory(global.Chart));
}(this, function (Chart) { 'use strict';

Chart = Chart && Chart.hasOwnProperty('default') ? Chart['default'] : Chart;

var helpers = Chart.helpers;
var resolve = helpers.options.resolve;
var valueOrDefault = helpers.valueOrDefault;

var Controller = Chart.controllers.line.extend({
	// Not needed since there is only a single scale
	linkScales: helpers.noop,

	updateElement: function(point, index) {
		var me = this;
		var meta = me.getMeta();
		var custom = point.custom || {};
		var datasetIndex = me.index;
		var yScale = me.getScaleForId(meta.yAxisID);
		var xScale = me.getScaleForId(meta.xAxisID);
		var lineModel = meta.dataset._model;

		var options = me._resolvePointOptions(point, index);
		var {x, y} = me.calculatePointPosition(index);

		// Utility
		point._xScale = xScale;
		point._yScale = yScale;
		point._options = options;
		point._datasetIndex = datasetIndex;
		point._index = index;

		// Desired view properties
		point._model = {
			x: x,
			y: y,
			skip: custom.skip || isNaN(x) || isNaN(y),
			// Appearance
			radius: options.radius,
			pointStyle: options.pointStyle,
			rotation: options.rotation,
			backgroundColor: options.backgroundColor,
			borderColor: options.borderColor,
			borderWidth: options.borderWidth,
			tension: valueOrDefault(custom.tension, lineModel ? lineModel.tension : 0),
			steppedLine: lineModel ? lineModel.steppedLine : false,
			// Tooltip
			hitRadius: options.hitRadius
		};
	},

	/**
	 * @private
	 */
	_resolvePointOptions: function(element, index) {
		var me = this;
		var chart = me.chart;
		var dataset = chart.data.datasets[me.index];
		var custom = element.custom || {};
		var options = chart.options.elements.point;
		var values = {};
		var i, ilen, key;

		// Scriptable options
		var context = {
			chart: chart,
			dataIndex: index,
			dataset: dataset,
			datasetIndex: me.index
		};

		var ELEMENT_OPTIONS = {
			backgroundColor: 'pointBackgroundColor',
			borderColor: 'pointBorderColor',
			borderWidth: 'pointBorderWidth',
			hitRadius: 'pointHitRadius',
			hoverBackgroundColor: 'pointHoverBackgroundColor',
			hoverBorderColor: 'pointHoverBorderColor',
			hoverBorderWidth: 'pointHoverBorderWidth',
			hoverRadius: 'pointHoverRadius',
			pointStyle: 'pointStyle',
			radius: 'pointRadius',
			rotation: 'pointRotation'
		};
		var keys = Object.keys(ELEMENT_OPTIONS);

		for (i = 0, ilen = keys.length; i < ilen; ++i) {
			key = keys[i];
			values[key] = resolve([
				custom[key],
				dataset[ELEMENT_OPTIONS[key]],
				dataset[key],
				options[key]
			], context, index);
		}

		return values;
	},
	calculatePointPosition: function(dataIndex) {
		var scale = this.chart.scale;
		var data = this.getDataset().data[dataIndex];
		return scale.getPointPosition(data.real, data.imag);
	},
});

/*
 * Defines the scale for the smith chart.
 * When built, Chart will be passed via the UMD header
 */
var helpers$1 = Chart.helpers;

var defaults = {
	position: 'chartArea',
	display: true,
	ticks: {
		padding: 5,
		rCallback: function(tick) {
			return tick.toString();
		},
		xCallback: function(tick) {
			return tick.toString() + 'i';
		}
	}
};

var SmithScale = Chart.Scale.extend({
	setDimensions: function() {
		this.height = this.maxHeight;
		this.width = this.maxWidth;
		this.xCenter = this.left + Math.round(this.width / 2);
		this.yCenter = this.top + Math.round(this.height / 2);

		this.paddingLeft = 0;
		this.paddingTop = 0;
		this.paddingRight = 0;
		this.paddingBottom = 0;
	},

	buildTicks: function() {
		this.rTicks = [0, 0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1.0, 1.2, 1.4, 1.6, 1.8, 2.0, 3.0, 4.0, 5.0, 10.0, 20.0, 50.0];
		this.xTicks = [-50.0, -20.0, -10.0, -5.0, -4.0, -3.0, -2.0, -1.0, -0.8, -0.6, -0.4, -0.2, 0, 0.2, 0.4, 0.6, 0.8, 1.0, 2.0, 3.0, 4.0, 5.0, 10.0, 20.0, 50.0];

		// Need to do this to make the core scale work
		return [];
	},

	convertTicksToLabels: function() {
		this.rLabels = this.rTicks.map(function(tick, index, ticks) {
			return this.options.ticks.rCallback.apply(this, [tick, index, ticks]);
		}, this);

		this.xLabels = this.xTicks.map(function(tick, index, ticks) {
			return this.options.ticks.xCallback.apply(this, [tick, index, ticks]);
		}, this);

		// Need to do this to make the core scale work
		return [];
	},

	calculateTickRotation: helpers$1.noop,

	// fit function similar to the radial linear scale
	fit: function() {
		this.xCenter = (this.left + this.right) / 2;
		this.yCenter = (this.top + this.bottom) / 2;
		var fontSize = helpers$1.getValueOrDefault(this.options.ticks.fontSize, Chart.defaults.global.defaultFontSize);

		if (this.options.ticks.display) {
			var fontStyle = helpers$1.getValueOrDefault(this.options.ticks.fontStyle, Chart.defaults.global.defaultFontStyle);
			var fontFamily = helpers$1.getValueOrDefault(this.options.ticks.fontFamily, Chart.defaults.global.defaultFontFamily);
			var labelFont = helpers$1.fontString(fontSize, fontStyle, fontFamily);
			this.ctx.font = labelFont;

			var xLabelLengths = this.xLabels.map(function(tick) {
				return this.ctx.measureText(tick).width;
			}, this);

			// Figure out where these points will go, and assuming they are drawn there, how much will it go outside of the chart area.
			// We use that to determine how much padding we nede on each side
			this.minDimension = Math.min(this.right - this.left, this.bottom - this.top);

			helpers$1.each(this.xTicks, function(xTick, index) {
				if (xTick !== 0) {
					var halfDimension = this.minDimension / 2;
					var labelStart = this.getPointPosition(0, xTick);
					var cosPhi = (labelStart.x - this.xCenter) / halfDimension;
					var sinPhi = (labelStart.y - this.yCenter) / halfDimension;
					var labelWidth = xLabelLengths[index] + this.options.ticks.padding;
					var pts = [{
						x: labelStart.x + (cosPhi * labelWidth) + (sinPhi * fontSize),
						y: labelStart.y + (sinPhi * labelWidth) - (cosPhi * fontSize)
					}, {
						x: labelStart.x + (cosPhi * labelWidth) - (sinPhi * fontSize),
						y: labelStart.y + (sinPhi * labelWidth) + (cosPhi * fontSize)
					}];

					helpers$1.each(pts, function(pt) {
						this.paddingLeft = Math.max(this.paddingLeft, this.left - pt.x);
						this.paddingTop = Math.max(this.paddingTop, this.top - pt.y);
						this.paddingRight = Math.max(this.paddingRight, pt.x - this.right);
						this.paddingBottom = Math.max(this.paddingBottom, pt.y - this.bottom);
					}, this);
				}
			}, this);
		}

		this.minDimension = Math.min(this.right - this.left - this.paddingLeft - this.paddingRight, this.bottom - this.top - this.paddingBottom - this.paddingTop);

		// Store data about the arcs that we will draw
		this.arcs = [];
		this.rLabelPoints = [];
		this.xLabelPoints = [];

		// How do we draw the circles? From http://care.iitd.ac.in/People/Faculty/bspanwar/crl713/smith_chart_basics.pdf
		// we have that constant resistance circles obey the following
		// Center { r / (1 + r), 0}, Radius = 1 / (1 + r)
		//
		// The center point and radius will need to be scaled based on the size of the canvas
		// Draw each of the circles
		helpers$1.each(this.rTicks, function(r) {
			var radius = 1 / (1 + r) * (this.minDimension / 2); // scale for the min dimension
			var x = this.xCenter + ((r / (1 + r)) * (this.minDimension / 2));

			this.arcs.push({
				x: x,
				y: this.yCenter,
				r: radius,
				s: 0,
				e: 2 * Math.PI,
				cc: false
			});

			this.rLabelPoints.push({
				x: x - radius,
				y: this.yCenter
			});
		}, this);

		helpers$1.each(this.xTicks, function(x) {
			if (x !== 0) {
				var xRadius = (1 / Math.abs(x)) * (this.minDimension / 2);
				var xCoord = this.xCenter + (this.minDimension / 2); // far right side of the drawing area
				var yCoord = x > 0 ? this.yCenter - xRadius : this.yCenter + xRadius;

				// Ok, these circles are a pain. They need to only be drawn in the region that intersects the
				// resistance == 0 circle. This circle has a radius of 0.5 * this.minDimension and is centered
				// at (xCenter, yCenter). We will solve the intersection in polar coordinates and define the
				// center of our coordinate system as the center of the xCircle, ie (xCoord, yCoord)

				var r0 = Math.sqrt(Math.pow(xCoord - this.xCenter, 2) + Math.pow(yCoord - this.yCenter, 2));
				var phi0 = Math.atan2(this.yCenter - yCoord, this.xCenter - xCoord);

				// A circle with center location r0,phi0 with radius a is defined in polar coordinates by the equation
				// r = r0 * cos(phi - phi0) + sqrt(a^2 - ((r0^2) * sin^2(phi - phi0)))
				// Our xCircle is defined by r = xRadius because of where we defined the 0,0 point
				// Solving the intersection of these equations yields
				// phi = 0.5 * arccos((xRadius^2 - a^2) / (r0^2)) + phi0
				var arccos = Math.acos((Math.pow(xRadius, 2) - Math.pow(this.minDimension / 2, 2)) / Math.pow(r0, 2));
				var phi2 = ((x > 0 ? 0.5 : -0.5) * arccos) + phi0;
				var startAngle = x > 0 ? 0.5 * Math.PI : -0.5 * Math.PI;

				this.arcs.push({
					x: xCoord,
					y: yCoord,
					r: xRadius,
					s: startAngle,
					e: phi2,
					cc: x > 0 ? false : true
				});

				this.xLabelPoints.push({
					x: xCoord + (Math.cos(phi2) * xRadius),
					y: yCoord + (Math.sin(phi2) * xRadius),
				});
			} else {
				this.xLabelPoints.push(null);
			}
		}, this);
	},

	// Need a custom draw function here
	draw: function() {
		if (this.options.display) {
			if (this.options.gridLines.display) {
				this.ctx.strokeStyle = this.options.gridLines.color;
				this.ctx.lineWidth = this.options.gridLines.lineWidth;

				// Draw horizontal line for x === 0
				this.ctx.beginPath();
				this.ctx.moveTo(this.xCenter - (this.minDimension / 2), this.yCenter);
				this.ctx.lineTo(this.xCenter + (this.minDimension / 2), this.yCenter);
				this.ctx.stroke();

				// Draw each of the arcs
				helpers$1.each(this.arcs, function(arc) {
					this.ctx.beginPath();
					this.ctx.arc(arc.x, arc.y, arc.r, arc.s, arc.e, arc.cc);
					this.ctx.stroke();
				}, this);
			} else {
				// Simply draw a border line
				this.ctx.strokeStyle = this.options.gridLines.color;
				this.ctx.lineWidth = this.options.gridLines.lineWidth;
				this.ctx.beginPath();
				this.ctx.arc(this.xCenter, this.yCenter, this.minDimension / 2, 0, 2 * Math.PI, false);
				this.ctx.stroke();
			}

			if (this.options.ticks.display) {
				var fontSize = helpers$1.getValueOrDefault(this.options.ticks.fontSize, Chart.defaults.global.defaultFontSize);
				var fontStyle = helpers$1.getValueOrDefault(this.options.ticks.fontStyle, Chart.defaults.global.defaultFontStyle);
				var fontFamily = helpers$1.getValueOrDefault(this.options.ticks.fontFamily, Chart.defaults.global.defaultFontFamily);

				var labelFont = helpers$1.fontString(fontSize, fontStyle, fontFamily);
				this.ctx.font = labelFont;

				this.ctx.fillStyle = helpers$1.getValueOrDefault(this.options.ticks.fontColor, Chart.defaults.global.defaultFontColor);

				helpers$1.each(this.rLabels, function(rLabel, index) {
					var pt = this.rLabelPoints[index];

					this.ctx.save();
					this.ctx.translate(pt.x, pt.y);
					this.ctx.rotate(-0.5 * Math.PI);
					this.ctx.textBaseline = 'middle';
					this.ctx.textAlign = 'center';
					this.ctx.fillText(rLabel, 0, 0);
					this.ctx.restore();
				}, this);

				helpers$1.each(this.xLabels, function(xLabel, index) {
					var pt = this.xLabelPoints[index];

					if (pt) {
						var align = 'left';
						var ang = Math.atan2(pt.y - this.yCenter, pt.x - this.xCenter);
						var textPadding = this.options.ticks.padding;

						if (pt.x < this.xCenter) {
							ang += Math.PI;
							align = 'right';
							textPadding *= -1;
						}

						this.ctx.save();
						this.ctx.translate(pt.x, pt.y);
						this.ctx.rotate(ang);
						this.ctx.textBaseline = 'middle';
						this.ctx.textAlign = align;
						this.ctx.fillText(xLabel, textPadding, 0);
						this.ctx.restore();
					}
				}, this);
			}
		}
	},
	getPointPosition: function(real, imag) {
		// look for the intersection of the r circle and the x circle that is not the one along the right side of the canvas
		var realRadius = 1 / (1 + real) * (this.minDimension / 2); // scale for the minDimension size
		var realCenterX = this.xCenter + ((real / (1 + real)) * (this.minDimension / 2));
		var realCenterY = this.yCenter;

		var imagRadius = (1 / Math.abs(imag)) * (this.minDimension / 2);
		var imagCenterX = this.xCenter + (this.minDimension / 2); // far right side of the drawing area
		var imagCenterY = imag > 0 ? this.yCenter - imagRadius : this.yCenter + imagRadius;

		var r0 = Math.sqrt(Math.pow(imagCenterX - realCenterX, 2) + Math.pow(imagCenterY - realCenterY, 2));
		var angle = Math.atan2(realCenterY - imagCenterY, realCenterX - imagCenterX);
		var arccos = Math.acos((Math.pow(imagRadius, 2) - Math.pow(realRadius, 2)) / Math.pow(r0, 2));
		var phi = imag > 0 ? 0.5 * arccos + angle : -0.5 * arccos + angle;

		// We have an r and a phi from the point (imagCenterX, imagCenterY)
		// translate to an x and a undefined
		return {
			x: imag === 0 ? realCenterX - realRadius : (Math.cos(phi) * imagRadius) + imagCenterX,
			y: imag === 0 ? this.yCenter : (Math.sin(phi) * imagRadius) + imagCenterY
		};
	},
	getLabelForIndex: function(index, datasetIndex) {
		var d = this.chart.data.datasets[datasetIndex].data[index];
		return d.real + ' + ' + d.imag + 'i';
	}
});

// Register the Controller and Scale
Chart.controllers.smith = Controller;
Chart.defaults.smith = {
	scale: {
		type: 'smith',
	},
	tooltips: {
		callbacks: {
			title: function() {
				return null;
			},
			label: function(bodyItem, data) {
				var dataset = data.datasets[bodyItem.datasetIndex];
				var d = dataset.data[bodyItem.index];
				return dataset.label + ': ' + d.real + ' + ' + d.imag + 'i';
			}
		}
	}
};
Chart.scaleService.registerScaleType('smith', SmithScale, defaults);

}));
