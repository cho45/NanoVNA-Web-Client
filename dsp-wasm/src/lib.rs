extern crate console_error_panic_hook;
extern crate wasm_bindgen;

//extern crate wee_alloc;
// Use `wee_alloc` as the global allocator.
//#[global_allocator]
//static ALLOC: wee_alloc::WeeAlloc = wee_alloc::WeeAlloc::INIT;

//use std::sync::Arc;
use rustfft::num_complex::Complex;
use rustfft::FFTplanner;
//use rustfft::num_traits::Zero;
//use std::mem;
use std::slice;

use wasm_bindgen::prelude::*;

#[wasm_bindgen]
extern "C" {
    #[wasm_bindgen(js_namespace = console)]
    fn log(s: &str);

    #[wasm_bindgen(js_namespace = Math)]
    fn log10(s: f32) -> f32;
}

#[allow(unused_macros)]
macro_rules! console_log {
    // Note that this is using the `log` function imported above during
    // `bare_bones`
    ($($t:tt)*) => (log(&format_args!($($t)*).to_string()))
}

#[wasm_bindgen]
pub fn set_panic_hook() {
    console_error_panic_hook::set_once();
}

#[wasm_bindgen]
pub struct FFT {
    n: usize,
    fft: std::sync::Arc<dyn rustfft::FFT<f32>>,
    ifft: std::sync::Arc<dyn rustfft::FFT<f32>>,
    window: Box<[f32]>,
}

#[wasm_bindgen]
impl FFT {
    #[allow(clippy::new_without_default)]
    #[wasm_bindgen(constructor)]
    pub fn new(n: usize, window_: &[f32]) -> Self {
        let fft = FFTplanner::new(false).plan_fft(n);
        let ifft = FFTplanner::new(true).plan_fft(n);
        let mut window = vec![0.0; n].into_boxed_slice();
        window.copy_from_slice(window_);
        FFT {
            n,
            fft,
            ifft,
            window,
        }
    }

    pub fn fft(&self, input_: &mut [f32], output_: &mut [f32]) {
        let input: &mut [Complex<f32>] =
            unsafe { slice::from_raw_parts_mut(input_ as *mut [f32] as *mut Complex<f32>, self.n) };
        let output: &mut [Complex<f32>] = unsafe {
            slice::from_raw_parts_mut(output_ as *mut [f32] as *mut Complex<f32>, self.n)
        };
        // console_log!("input: {}", input.len());
        self.fft.process(input, output);
    }

    pub fn ifft(&self, input_: &mut [f32], output_: &mut [f32]) {
        let input: &mut [Complex<f32>] =
            unsafe { slice::from_raw_parts_mut(input_ as *mut [f32] as *mut Complex<f32>, self.n) };
        let output: &mut [Complex<f32>] = unsafe {
            slice::from_raw_parts_mut(output_ as *mut [f32] as *mut Complex<f32>, self.n)
        };

        for i in 0..self.n {
            input[i] *= self.window[i];
        }

        self.ifft.process(input, output);
        let n = self.n as f32;
        for i in output.iter_mut() {
            *i /= n;
        }
    }

    pub fn ifft_abs(&self, input_: &mut [f32], output_: &mut [f32]) {
        let input: &mut [Complex<f32>] =
            unsafe { slice::from_raw_parts_mut(input_ as *mut [f32] as *mut Complex<f32>, self.n) };
        let mut output = Vec::<Complex<f32>>::with_capacity(self.n);
        unsafe {
            output.set_len(self.n);
        }

        for i in 0..self.n {
            input[i] *= self.window[i];
        }

        self.ifft.process(input, &mut output);

        let n = self.n as f32;

        for i in 0..self.n {
            output_[i] = (output[i] / n).norm();
        }
    }
}
