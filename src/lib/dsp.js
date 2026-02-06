/*
Math functions for NanoVNA data processing.
*/

export function calcLogMag(i) {
    return Math.log10(Math.hypot(i.real, i.imag)) * 20;
}

export function calcSWR(i) {
    const x = Math.hypot(i.real, i.imag);
    if (x >= 1) return Infinity;
    return (1 + x) / (1 - x);
}

export function calcPhase(i) {
    return Math.atan2(i.imag, i.real) / Math.PI * 180;
}

export function calcZ(i) {
    const z0 = 50;
    const d = z0 / ((1 - i.real) * (1 - i.real) + i.imag * i.imag);
    const zr = ((1 + i.real) * (1 - i.real) - i.imag * i.imag) * d;
    const zi = 2 * i.imag * d;
    return [zr, zi];
}

export function calcLinear(i) {
    return Math.hypot(i.real, i.imag);
}

export function calcReal(i) {
    return i.real;
}

export function calcImag(i) {
    return i.imag;
}

export function calcZabs(i) {
    return Math.hypot(...calcZ(i));
}

export function calcZR(i) {
    return calcZ(i)[0];
}

export function calcZX(i) {
    return calcZ(i)[1];
}

export function calcZr(i) {
    const d = ((1 - i.real) * (1 - i.real) + i.imag * i.imag);
    const zr = ((1 + i.real) * (1 - i.real) - i.imag * i.imag) / d;
    const zi = 2 * i.imag / d;
    return {
        freq: i.freq,
        real: zr,
        imag: zi
    };
}

export function formatFrequency(freq, f = 6) {
    if (freq < 1e3) {
        return freq + ' Hz';
    } else if (freq < 1e6) {
        return (freq / 1e3).toFixed(Math.min(3, f)) + ' kHz';
    } else {
        return (freq / 1e6).toFixed(Math.min(6, f)) + ' MHz';
    }
}

export function formatLogMag(value) {
    return value.toFixed(2) + ' dB';
}

export function formatPhase(value) {
    return value.toFixed(1) + '°';
}

export function formatSWR(value) {
    if (!isFinite(value)) return '∞';
    return value.toFixed(2);
}

export function formatLinear(value) {
    return value.toFixed(4);
}

export function formatReal(value) {
    return value.toFixed(4);
}

export function formatImag(value) {
    return value.toFixed(4);
}
