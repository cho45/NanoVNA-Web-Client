/* tslint:disable */
/* eslint-disable */

export class DSP {
    free(): void;
    [Symbol.dispose](): void;
    calc_reflect_coeff_from_rawave(refr: Int16Array, samp: Int16Array): Float32Array;
    constructor(n: number);
}

export class FFT {
    free(): void;
    [Symbol.dispose](): void;
    analytic_signal(input_: Float32Array, output_: Float32Array): void;
    fft(input_: Float32Array, output_: Float32Array): void;
    ifft(input_: Float32Array, output_: Float32Array): void;
    ifft_abs(input_: Float32Array, output_: Float32Array): void;
    ifft_real(input_: Float32Array, output_: Float32Array): void;
    constructor(n: number, window_: Float32Array);
}

export function set_panic_hook(): void;

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
    readonly memory: WebAssembly.Memory;
    readonly __wbg_dsp_free: (a: number, b: number) => void;
    readonly __wbg_fft_free: (a: number, b: number) => void;
    readonly dsp_calc_reflect_coeff_from_rawave: (a: number, b: number, c: number, d: number, e: number) => [number, number];
    readonly dsp_new: (a: number) => number;
    readonly fft_analytic_signal: (a: number, b: number, c: number, d: any, e: number, f: number, g: any) => void;
    readonly fft_fft: (a: number, b: number, c: number, d: any, e: number, f: number, g: any) => void;
    readonly fft_ifft: (a: number, b: number, c: number, d: any, e: number, f: number, g: any) => void;
    readonly fft_ifft_abs: (a: number, b: number, c: number, d: any, e: number, f: number, g: any) => void;
    readonly fft_ifft_real: (a: number, b: number, c: number, d: any, e: number, f: number, g: any) => void;
    readonly fft_new: (a: number, b: number, c: number) => number;
    readonly set_panic_hook: () => void;
    readonly __wbindgen_free: (a: number, b: number, c: number) => void;
    readonly __wbindgen_malloc: (a: number, b: number) => number;
    readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
    readonly __wbindgen_externrefs: WebAssembly.Table;
    readonly __wbindgen_start: () => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;

/**
 * Instantiates the given `module`, which can either be bytes or
 * a precompiled `WebAssembly.Module`.
 *
 * @param {{ module: SyncInitInput }} module - Passing `SyncInitInput` directly is deprecated.
 *
 * @returns {InitOutput}
 */
export function initSync(module: { module: SyncInitInput } | SyncInitInput): InitOutput;

/**
 * If `module_or_path` is {RequestInfo} or {URL}, makes a request and
 * for everything else, calls `WebAssembly.instantiate` directly.
 *
 * @param {{ module_or_path: InitInput | Promise<InitInput> }} module_or_path - Passing `InitInput` directly is deprecated.
 *
 * @returns {Promise<InitOutput>}
 */
export default function __wbg_init (module_or_path?: { module_or_path: InitInput | Promise<InitInput> } | InitInput | Promise<InitInput>): Promise<InitOutput>;
