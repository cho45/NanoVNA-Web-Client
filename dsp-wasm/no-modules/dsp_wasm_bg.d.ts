/* tslint:disable */
export const memory: WebAssembly.Memory;
export function set_panic_hook(): void;
export function __wbg_fft_free(a: number): void;
export function fft_new(a: number, b: number, c: number): number;
export function fft_fft(a: number, b: number, c: number, d: number, e: number): void;
export function fft_ifft(a: number, b: number, c: number, d: number, e: number): void;
export function fft_ifft_abs(a: number, b: number, c: number, d: number, e: number): void;
export function fft_ifft_real(a: number, b: number, c: number, d: number, e: number): void;
export function fft_analytic_signal(a: number, b: number, c: number, d: number, e: number): void;
export function __wbg_dsp_free(a: number): void;
export function dsp_new(a: number): number;
export function dsp_calc_reflect_coeff_from_rawave(a: number, b: number, c: number, d: number, e: number, f: number): void;
export function __wbindgen_malloc(a: number): number;
export function __wbindgen_realloc(a: number, b: number, c: number): number;
export function __wbindgen_free(a: number, b: number): void;
