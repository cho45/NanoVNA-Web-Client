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

//use std::sync::Arc;
use rustfft::num_complex::Complex;
use rustfft::num_traits::Zero;
use rustfft::FFTplanner;
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

    pub fn ifft_real(&self, input_: &mut [f32], output_: &mut [f32]) {
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
            let g = output[i] / n;
            output_[i] = g.re;
        }
    }

    pub fn analytic_signal(&self, input_: &mut [f32], output_: &mut [f32]) {
        let input: &mut [Complex<f32>] =
            unsafe { slice::from_raw_parts_mut(input_ as *mut [f32] as *mut Complex<f32>, self.n) };
        let output: &mut [Complex<f32>] = unsafe {
            slice::from_raw_parts_mut(output_ as *mut [f32] as *mut Complex<f32>, self.n)
        };
        self.fft.process(input, output);

        let half_n = self.n / 2;
        for i in 0..self.n {
            input[i] = if i == 0 || i == half_n {
                output[i]
            } else if 1 < i && i < half_n {
                output[i] * 2.0
            } else {
                Complex::zero()
            }
        }

        self.ifft.process(input, output);

        let n = self.n as f32;
        for i in output.iter_mut() {
            *i /= n;
        }
    }
}

#[wasm_bindgen]
pub struct DSP {
    n: usize,
    fft: std::sync::Arc<dyn rustfft::FFT<f32>>,
    ifft: std::sync::Arc<dyn rustfft::FFT<f32>>,
}

#[wasm_bindgen]
impl DSP {
    #[allow(clippy::new_without_default)]
    #[wasm_bindgen(constructor)]
    pub fn new(n: usize) -> Self {
        let fft = FFTplanner::new(false).plan_fft(n);
        let ifft = FFTplanner::new(true).plan_fft(n);
        DSP { n, fft, ifft }
    }

    pub fn calc_reflect_coeff_from_rawave(&self, refr: &[i16], samp: &[i16]) -> Box<[f32]> {
        //        log(&format!("DSP: {:?}", self.n));
        //        log(&format!("refr: {:?}", refr));
        //        log(&format!("samp: {:?}", samp));

        let mut input: Vec<Complex<f32>> = vec![Complex::zero(); self.n];
        let mut output: Vec<Complex<f32>> = vec![Complex::zero(); self.n];
        input.resize(self.n, Complex::zero());
        output.resize(self.n, Complex::zero());

        // compute analytic signal

        for i in 0..self.n {
            input[i].re = refr[i] as f32;
        }

        //        log(&format!("input: {:?} {:?}", input.len(), input));

        self.fft.process(&mut input, &mut output);
        let half_n = self.n / 2;
        for i in 0..self.n {
            input[i] = if i == 0 || i == half_n {
                output[i]
            } else if 1 < i && i < half_n {
                output[i] * 2.0
            } else {
                Complex::zero()
            }
        }

        self.ifft.process(&mut input, &mut output);

        let n = self.n as f32;
        for i in output.iter_mut() {
            *i /= n;
        }
        //        log(&format!("output: {:?}", output));

        const REF_LEVEL: f32 = (1 << 9) as f32;

        let ret: Complex<f32> = output
            .into_iter()
            .enumerate()
            .map(|(index, refh)| (refh * (samp[index] as f32)) / refh.norm() / REF_LEVEL)
            .fold(Complex::zero(), |r, i| r + i)
            / (self.n as f32);

        //        log(&format!("re: {:?}", ret));

        return vec![ret.re, ret.im].into_boxed_slice();
    }
}
