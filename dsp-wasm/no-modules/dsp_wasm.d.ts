/* tslint:disable */
/**
*/
export function set_panic_hook(): void;
/**
*/
export class DSP {
  free(): void;
/**
* @param {number} n 
* @returns {DSP} 
*/
  constructor(n: number);
/**
* @param {Int16Array} refr 
* @param {Int16Array} samp 
* @returns {Float32Array} 
*/
  calc_reflect_coeff_from_rawave(refr: Int16Array, samp: Int16Array): Float32Array;
}
/**
*/
export class FFT {
  free(): void;
/**
* @param {number} n 
* @param {Float32Array} window_ 
* @returns {FFT} 
*/
  constructor(n: number, window_: Float32Array);
/**
* @param {Float32Array} input_ 
* @param {Float32Array} output_ 
*/
  fft(input_: Float32Array, output_: Float32Array): void;
/**
* @param {Float32Array} input_ 
* @param {Float32Array} output_ 
*/
  ifft(input_: Float32Array, output_: Float32Array): void;
/**
* @param {Float32Array} input_ 
* @param {Float32Array} output_ 
*/
  ifft_abs(input_: Float32Array, output_: Float32Array): void;
/**
* @param {Float32Array} input_ 
* @param {Float32Array} output_ 
*/
  ifft_real(input_: Float32Array, output_: Float32Array): void;
/**
* @param {Float32Array} input_ 
* @param {Float32Array} output_ 
*/
  analytic_signal(input_: Float32Array, output_: Float32Array): void;
}

/**
* If `module_or_path` is {RequestInfo}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {RequestInfo | BufferSource | WebAssembly.Module} module_or_path
*
* @returns {Promise<any>}
*/
export default function init (module_or_path: RequestInfo | BufferSource | WebAssembly.Module): Promise<any>;
        