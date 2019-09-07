(function() {
    const __exports = {};
    let wasm;

    /**
    */
    __exports.set_panic_hook = function() {
        wasm.set_panic_hook();
    };

    let cachegetFloat32Memory = null;
    function getFloat32Memory() {
        if (cachegetFloat32Memory === null || cachegetFloat32Memory.buffer !== wasm.memory.buffer) {
            cachegetFloat32Memory = new Float32Array(wasm.memory.buffer);
        }
        return cachegetFloat32Memory;
    }

    let WASM_VECTOR_LEN = 0;

    function passArrayF32ToWasm(arg) {
        const ptr = wasm.__wbindgen_malloc(arg.length * 4);
        getFloat32Memory().set(arg, ptr / 4);
        WASM_VECTOR_LEN = arg.length;
        return ptr;
    }

    let cachegetUint16Memory = null;
    function getUint16Memory() {
        if (cachegetUint16Memory === null || cachegetUint16Memory.buffer !== wasm.memory.buffer) {
            cachegetUint16Memory = new Uint16Array(wasm.memory.buffer);
        }
        return cachegetUint16Memory;
    }

    function passArray16ToWasm(arg) {
        const ptr = wasm.__wbindgen_malloc(arg.length * 2);
        getUint16Memory().set(arg, ptr / 2);
        WASM_VECTOR_LEN = arg.length;
        return ptr;
    }

    let cachegetInt32Memory = null;
    function getInt32Memory() {
        if (cachegetInt32Memory === null || cachegetInt32Memory.buffer !== wasm.memory.buffer) {
            cachegetInt32Memory = new Int32Array(wasm.memory.buffer);
        }
        return cachegetInt32Memory;
    }

    function getArrayF32FromWasm(ptr, len) {
        return getFloat32Memory().subarray(ptr / 4, ptr / 4 + len);
    }

    const heap = new Array(32);

    heap.fill(undefined);

    heap.push(undefined, null, true, false);

    let heap_next = heap.length;

    function addHeapObject(obj) {
        if (heap_next === heap.length) heap.push(heap.length + 1);
        const idx = heap_next;
        heap_next = heap[idx];

        heap[idx] = obj;
        return idx;
    }

function getObject(idx) { return heap[idx]; }

let cachedTextEncoder = new TextEncoder('utf-8');

let cachegetUint8Memory = null;
function getUint8Memory() {
    if (cachegetUint8Memory === null || cachegetUint8Memory.buffer !== wasm.memory.buffer) {
        cachegetUint8Memory = new Uint8Array(wasm.memory.buffer);
    }
    return cachegetUint8Memory;
}

let passStringToWasm;
if (typeof cachedTextEncoder.encodeInto === 'function') {
    passStringToWasm = function(arg) {


        let size = arg.length;
        let ptr = wasm.__wbindgen_malloc(size);
        let offset = 0;
        {
            const mem = getUint8Memory();
            for (; offset < arg.length; offset++) {
                const code = arg.charCodeAt(offset);
                if (code > 0x7F) break;
                mem[ptr + offset] = code;
            }
        }

        if (offset !== arg.length) {
            arg = arg.slice(offset);
            ptr = wasm.__wbindgen_realloc(ptr, size, size = offset + arg.length * 3);
            const view = getUint8Memory().subarray(ptr + offset, ptr + size);
            const ret = cachedTextEncoder.encodeInto(arg, view);

            offset += ret.written;
        }
        WASM_VECTOR_LEN = offset;
        return ptr;
    };
} else {
    passStringToWasm = function(arg) {


        let size = arg.length;
        let ptr = wasm.__wbindgen_malloc(size);
        let offset = 0;
        {
            const mem = getUint8Memory();
            for (; offset < arg.length; offset++) {
                const code = arg.charCodeAt(offset);
                if (code > 0x7F) break;
                mem[ptr + offset] = code;
            }
        }

        if (offset !== arg.length) {
            const buf = cachedTextEncoder.encode(arg.slice(offset));
            ptr = wasm.__wbindgen_realloc(ptr, size, size = offset + buf.length);
            getUint8Memory().set(buf, ptr + offset);
            offset += buf.length;
        }
        WASM_VECTOR_LEN = offset;
        return ptr;
    };
}

let cachedTextDecoder = new TextDecoder('utf-8');

function getStringFromWasm(ptr, len) {
    return cachedTextDecoder.decode(getUint8Memory().subarray(ptr, ptr + len));
}

function dropObject(idx) {
    if (idx < 36) return;
    heap[idx] = heap_next;
    heap_next = idx;
}

function takeObject(idx) {
    const ret = getObject(idx);
    dropObject(idx);
    return ret;
}
/**
*/
class DSP {

    static __wrap(ptr) {
        const obj = Object.create(DSP.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_dsp_free(ptr);
    }
    /**
    * @param {number} n
    * @returns {DSP}
    */
    constructor(n) {
        const ret = wasm.dsp_new(n);
        return DSP.__wrap(ret);
    }
    /**
    * @param {Int16Array} refr
    * @param {Int16Array} samp
    * @returns {Float32Array}
    */
    calc_reflect_coeff_from_rawave(refr, samp) {
        const retptr = 8;
        const ret = wasm.dsp_calc_reflect_coeff_from_rawave(retptr, this.ptr, passArray16ToWasm(refr), WASM_VECTOR_LEN, passArray16ToWasm(samp), WASM_VECTOR_LEN);
        const memi32 = getInt32Memory();
        const v0 = getArrayF32FromWasm(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1]).slice();
        wasm.__wbindgen_free(memi32[retptr / 4 + 0], memi32[retptr / 4 + 1] * 4);
        return v0;
    }
}
__exports.DSP = DSP;
/**
*/
class FFT {

    static __wrap(ptr) {
        const obj = Object.create(FFT.prototype);
        obj.ptr = ptr;

        return obj;
    }

    free() {
        const ptr = this.ptr;
        this.ptr = 0;

        wasm.__wbg_fft_free(ptr);
    }
    /**
    * @param {number} n
    * @param {Float32Array} window_
    * @returns {FFT}
    */
    constructor(n, window_) {
        const ret = wasm.fft_new(n, passArrayF32ToWasm(window_), WASM_VECTOR_LEN);
        return FFT.__wrap(ret);
    }
    /**
    * @param {Float32Array} input_
    * @param {Float32Array} output_
    */
    fft(input_, output_) {
        const ptr0 = passArrayF32ToWasm(input_);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF32ToWasm(output_);
        const len1 = WASM_VECTOR_LEN;
        try {
            wasm.fft_fft(this.ptr, ptr0, len0, ptr1, len1);
        } finally {
            input_.set(getFloat32Memory().subarray(ptr0 / 4, ptr0 / 4 + len0));
            wasm.__wbindgen_free(ptr0, len0 * 4);
            output_.set(getFloat32Memory().subarray(ptr1 / 4, ptr1 / 4 + len1));
            wasm.__wbindgen_free(ptr1, len1 * 4);
        }
    }
    /**
    * @param {Float32Array} input_
    * @param {Float32Array} output_
    */
    ifft(input_, output_) {
        const ptr0 = passArrayF32ToWasm(input_);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF32ToWasm(output_);
        const len1 = WASM_VECTOR_LEN;
        try {
            wasm.fft_ifft(this.ptr, ptr0, len0, ptr1, len1);
        } finally {
            input_.set(getFloat32Memory().subarray(ptr0 / 4, ptr0 / 4 + len0));
            wasm.__wbindgen_free(ptr0, len0 * 4);
            output_.set(getFloat32Memory().subarray(ptr1 / 4, ptr1 / 4 + len1));
            wasm.__wbindgen_free(ptr1, len1 * 4);
        }
    }
    /**
    * @param {Float32Array} input_
    * @param {Float32Array} output_
    */
    ifft_abs(input_, output_) {
        const ptr0 = passArrayF32ToWasm(input_);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF32ToWasm(output_);
        const len1 = WASM_VECTOR_LEN;
        try {
            wasm.fft_ifft_abs(this.ptr, ptr0, len0, ptr1, len1);
        } finally {
            input_.set(getFloat32Memory().subarray(ptr0 / 4, ptr0 / 4 + len0));
            wasm.__wbindgen_free(ptr0, len0 * 4);
            output_.set(getFloat32Memory().subarray(ptr1 / 4, ptr1 / 4 + len1));
            wasm.__wbindgen_free(ptr1, len1 * 4);
        }
    }
    /**
    * @param {Float32Array} input_
    * @param {Float32Array} output_
    */
    ifft_real(input_, output_) {
        const ptr0 = passArrayF32ToWasm(input_);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF32ToWasm(output_);
        const len1 = WASM_VECTOR_LEN;
        try {
            wasm.fft_ifft_real(this.ptr, ptr0, len0, ptr1, len1);
        } finally {
            input_.set(getFloat32Memory().subarray(ptr0 / 4, ptr0 / 4 + len0));
            wasm.__wbindgen_free(ptr0, len0 * 4);
            output_.set(getFloat32Memory().subarray(ptr1 / 4, ptr1 / 4 + len1));
            wasm.__wbindgen_free(ptr1, len1 * 4);
        }
    }
    /**
    * @param {Float32Array} input_
    * @param {Float32Array} output_
    */
    analytic_signal(input_, output_) {
        const ptr0 = passArrayF32ToWasm(input_);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArrayF32ToWasm(output_);
        const len1 = WASM_VECTOR_LEN;
        try {
            wasm.fft_analytic_signal(this.ptr, ptr0, len0, ptr1, len1);
        } finally {
            input_.set(getFloat32Memory().subarray(ptr0 / 4, ptr0 / 4 + len0));
            wasm.__wbindgen_free(ptr0, len0 * 4);
            output_.set(getFloat32Memory().subarray(ptr1 / 4, ptr1 / 4 + len1));
            wasm.__wbindgen_free(ptr1, len1 * 4);
        }
    }
}
__exports.FFT = FFT;

function init(module) {

    let result;
    const imports = {};
    imports.wbg = {};
    imports.wbg.__wbg_new_59cb74e423758ede = function() {
        const ret = new Error();
        return addHeapObject(ret);
    };
    imports.wbg.__wbg_stack_558ba5917b466edd = function(arg0, arg1) {
        const ret = getObject(arg1).stack;
        const ret0 = passStringToWasm(ret);
        const ret1 = WASM_VECTOR_LEN;
        getInt32Memory()[arg0 / 4 + 0] = ret0;
        getInt32Memory()[arg0 / 4 + 1] = ret1;
    };
    imports.wbg.__wbg_error_4bb6c2a97407129a = function(arg0, arg1) {
        const v0 = getStringFromWasm(arg0, arg1).slice();
        wasm.__wbindgen_free(arg0, arg1 * 1);
        console.error(v0);
    };
    imports.wbg.__wbindgen_object_drop_ref = function(arg0) {
        takeObject(arg0);
    };
    imports.wbg.__wbindgen_throw = function(arg0, arg1) {
        throw new Error(getStringFromWasm(arg0, arg1));
    };

    if ((typeof URL === 'function' && module instanceof URL) || typeof module === 'string' || (typeof Request === 'function' && module instanceof Request)) {

        const response = fetch(module);
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            result = WebAssembly.instantiateStreaming(response, imports)
            .catch(e => {
                return response
                .then(r => {
                    if (r.headers.get('Content-Type') != 'application/wasm') {
                        console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);
                        return r.arrayBuffer();
                    } else {
                        throw e;
                    }
                })
                .then(bytes => WebAssembly.instantiate(bytes, imports));
            });
        } else {
            result = response
            .then(r => r.arrayBuffer())
            .then(bytes => WebAssembly.instantiate(bytes, imports));
        }
    } else {

        result = WebAssembly.instantiate(module, imports)
        .then(result => {
            if (result instanceof WebAssembly.Instance) {
                return { instance: result, module };
            } else {
                return result;
            }
        });
    }
    return result.then(({instance, module}) => {
        wasm = instance.exports;
        init.__wbindgen_wasm_module = module;

        return wasm;
    });
}

self.wasm_bindgen = Object.assign(init, __exports);

})();
