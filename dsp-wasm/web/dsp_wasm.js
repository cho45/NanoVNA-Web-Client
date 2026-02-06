/* @ts-self-types="./dsp_wasm.d.ts" */

export class DSP {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        DSPFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_dsp_free(ptr, 0);
    }
    /**
     * @param {Int16Array} refr
     * @param {Int16Array} samp
     * @returns {Float32Array}
     */
    calc_reflect_coeff_from_rawave(refr, samp) {
        const ptr0 = passArray16ToWasm0(refr, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ptr1 = passArray16ToWasm0(samp, wasm.__wbindgen_malloc);
        const len1 = WASM_VECTOR_LEN;
        const ret = wasm.dsp_calc_reflect_coeff_from_rawave(this.__wbg_ptr, ptr0, len0, ptr1, len1);
        var v3 = getArrayF32FromWasm0(ret[0], ret[1]).slice();
        wasm.__wbindgen_free(ret[0], ret[1] * 4, 4);
        return v3;
    }
    /**
     * @param {number} n
     */
    constructor(n) {
        const ret = wasm.dsp_new(n);
        this.__wbg_ptr = ret >>> 0;
        DSPFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) DSP.prototype[Symbol.dispose] = DSP.prototype.free;

export class FFT {
    __destroy_into_raw() {
        const ptr = this.__wbg_ptr;
        this.__wbg_ptr = 0;
        FFTFinalization.unregister(this);
        return ptr;
    }
    free() {
        const ptr = this.__destroy_into_raw();
        wasm.__wbg_fft_free(ptr, 0);
    }
    /**
     * @param {Float32Array} input_
     * @param {Float32Array} output_
     */
    analytic_signal(input_, output_) {
        var ptr0 = passArrayF32ToWasm0(input_, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passArrayF32ToWasm0(output_, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.fft_analytic_signal(this.__wbg_ptr, ptr0, len0, input_, ptr1, len1, output_);
    }
    /**
     * @param {Float32Array} input_
     * @param {Float32Array} output_
     */
    fft(input_, output_) {
        var ptr0 = passArrayF32ToWasm0(input_, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passArrayF32ToWasm0(output_, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.fft_fft(this.__wbg_ptr, ptr0, len0, input_, ptr1, len1, output_);
    }
    /**
     * @param {Float32Array} input_
     * @param {Float32Array} output_
     */
    ifft(input_, output_) {
        var ptr0 = passArrayF32ToWasm0(input_, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passArrayF32ToWasm0(output_, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.fft_ifft(this.__wbg_ptr, ptr0, len0, input_, ptr1, len1, output_);
    }
    /**
     * @param {Float32Array} input_
     * @param {Float32Array} output_
     */
    ifft_abs(input_, output_) {
        var ptr0 = passArrayF32ToWasm0(input_, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passArrayF32ToWasm0(output_, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.fft_ifft_abs(this.__wbg_ptr, ptr0, len0, input_, ptr1, len1, output_);
    }
    /**
     * @param {Float32Array} input_
     * @param {Float32Array} output_
     */
    ifft_real(input_, output_) {
        var ptr0 = passArrayF32ToWasm0(input_, wasm.__wbindgen_malloc);
        var len0 = WASM_VECTOR_LEN;
        var ptr1 = passArrayF32ToWasm0(output_, wasm.__wbindgen_malloc);
        var len1 = WASM_VECTOR_LEN;
        wasm.fft_ifft_real(this.__wbg_ptr, ptr0, len0, input_, ptr1, len1, output_);
    }
    /**
     * @param {number} n
     * @param {Float32Array} window_
     */
    constructor(n, window_) {
        const ptr0 = passArrayF32ToWasm0(window_, wasm.__wbindgen_malloc);
        const len0 = WASM_VECTOR_LEN;
        const ret = wasm.fft_new(n, ptr0, len0);
        this.__wbg_ptr = ret >>> 0;
        FFTFinalization.register(this, this.__wbg_ptr, this);
        return this;
    }
}
if (Symbol.dispose) FFT.prototype[Symbol.dispose] = FFT.prototype.free;

export function set_panic_hook() {
    wasm.set_panic_hook();
}

function __wbg_get_imports() {
    const import0 = {
        __proto__: null,
        __wbg___wbindgen_copy_to_typed_array_fc0809a4dec43528: function(arg0, arg1, arg2) {
            new Uint8Array(arg2.buffer, arg2.byteOffset, arg2.byteLength).set(getArrayU8FromWasm0(arg0, arg1));
        },
        __wbg___wbindgen_throw_be289d5034ed271b: function(arg0, arg1) {
            throw new Error(getStringFromWasm0(arg0, arg1));
        },
        __wbg_error_7534b8e9a36f1ab4: function(arg0, arg1) {
            let deferred0_0;
            let deferred0_1;
            try {
                deferred0_0 = arg0;
                deferred0_1 = arg1;
                console.error(getStringFromWasm0(arg0, arg1));
            } finally {
                wasm.__wbindgen_free(deferred0_0, deferred0_1, 1);
            }
        },
        __wbg_new_8a6f238a6ece86ea: function() {
            const ret = new Error();
            return ret;
        },
        __wbg_stack_0ed75d68575b0f3c: function(arg0, arg1) {
            const ret = arg1.stack;
            const ptr1 = passStringToWasm0(ret, wasm.__wbindgen_malloc, wasm.__wbindgen_realloc);
            const len1 = WASM_VECTOR_LEN;
            getDataViewMemory0().setInt32(arg0 + 4 * 1, len1, true);
            getDataViewMemory0().setInt32(arg0 + 4 * 0, ptr1, true);
        },
        __wbindgen_init_externref_table: function() {
            const table = wasm.__wbindgen_externrefs;
            const offset = table.grow(4);
            table.set(0, undefined);
            table.set(offset + 0, undefined);
            table.set(offset + 1, null);
            table.set(offset + 2, true);
            table.set(offset + 3, false);
        },
    };
    return {
        __proto__: null,
        "./dsp_wasm_bg.js": import0,
    };
}

const DSPFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_dsp_free(ptr >>> 0, 1));
const FFTFinalization = (typeof FinalizationRegistry === 'undefined')
    ? { register: () => {}, unregister: () => {} }
    : new FinalizationRegistry(ptr => wasm.__wbg_fft_free(ptr >>> 0, 1));

function getArrayF32FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getFloat32ArrayMemory0().subarray(ptr / 4, ptr / 4 + len);
}

function getArrayU8FromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return getUint8ArrayMemory0().subarray(ptr / 1, ptr / 1 + len);
}

let cachedDataViewMemory0 = null;
function getDataViewMemory0() {
    if (cachedDataViewMemory0 === null || cachedDataViewMemory0.buffer.detached === true || (cachedDataViewMemory0.buffer.detached === undefined && cachedDataViewMemory0.buffer !== wasm.memory.buffer)) {
        cachedDataViewMemory0 = new DataView(wasm.memory.buffer);
    }
    return cachedDataViewMemory0;
}

let cachedFloat32ArrayMemory0 = null;
function getFloat32ArrayMemory0() {
    if (cachedFloat32ArrayMemory0 === null || cachedFloat32ArrayMemory0.byteLength === 0) {
        cachedFloat32ArrayMemory0 = new Float32Array(wasm.memory.buffer);
    }
    return cachedFloat32ArrayMemory0;
}

function getStringFromWasm0(ptr, len) {
    ptr = ptr >>> 0;
    return decodeText(ptr, len);
}

let cachedUint16ArrayMemory0 = null;
function getUint16ArrayMemory0() {
    if (cachedUint16ArrayMemory0 === null || cachedUint16ArrayMemory0.byteLength === 0) {
        cachedUint16ArrayMemory0 = new Uint16Array(wasm.memory.buffer);
    }
    return cachedUint16ArrayMemory0;
}

let cachedUint8ArrayMemory0 = null;
function getUint8ArrayMemory0() {
    if (cachedUint8ArrayMemory0 === null || cachedUint8ArrayMemory0.byteLength === 0) {
        cachedUint8ArrayMemory0 = new Uint8Array(wasm.memory.buffer);
    }
    return cachedUint8ArrayMemory0;
}

function passArray16ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 2, 2) >>> 0;
    getUint16ArrayMemory0().set(arg, ptr / 2);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passArrayF32ToWasm0(arg, malloc) {
    const ptr = malloc(arg.length * 4, 4) >>> 0;
    getFloat32ArrayMemory0().set(arg, ptr / 4);
    WASM_VECTOR_LEN = arg.length;
    return ptr;
}

function passStringToWasm0(arg, malloc, realloc) {
    if (realloc === undefined) {
        const buf = cachedTextEncoder.encode(arg);
        const ptr = malloc(buf.length, 1) >>> 0;
        getUint8ArrayMemory0().subarray(ptr, ptr + buf.length).set(buf);
        WASM_VECTOR_LEN = buf.length;
        return ptr;
    }

    let len = arg.length;
    let ptr = malloc(len, 1) >>> 0;

    const mem = getUint8ArrayMemory0();

    let offset = 0;

    for (; offset < len; offset++) {
        const code = arg.charCodeAt(offset);
        if (code > 0x7F) break;
        mem[ptr + offset] = code;
    }
    if (offset !== len) {
        if (offset !== 0) {
            arg = arg.slice(offset);
        }
        ptr = realloc(ptr, len, len = offset + arg.length * 3, 1) >>> 0;
        const view = getUint8ArrayMemory0().subarray(ptr + offset, ptr + len);
        const ret = cachedTextEncoder.encodeInto(arg, view);

        offset += ret.written;
        ptr = realloc(ptr, len, offset, 1) >>> 0;
    }

    WASM_VECTOR_LEN = offset;
    return ptr;
}

let cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
cachedTextDecoder.decode();
const MAX_SAFARI_DECODE_BYTES = 2146435072;
let numBytesDecoded = 0;
function decodeText(ptr, len) {
    numBytesDecoded += len;
    if (numBytesDecoded >= MAX_SAFARI_DECODE_BYTES) {
        cachedTextDecoder = new TextDecoder('utf-8', { ignoreBOM: true, fatal: true });
        cachedTextDecoder.decode();
        numBytesDecoded = len;
    }
    return cachedTextDecoder.decode(getUint8ArrayMemory0().subarray(ptr, ptr + len));
}

const cachedTextEncoder = new TextEncoder();

if (!('encodeInto' in cachedTextEncoder)) {
    cachedTextEncoder.encodeInto = function (arg, view) {
        const buf = cachedTextEncoder.encode(arg);
        view.set(buf);
        return {
            read: arg.length,
            written: buf.length
        };
    };
}

let WASM_VECTOR_LEN = 0;

let wasmModule, wasm;
function __wbg_finalize_init(instance, module) {
    wasm = instance.exports;
    wasmModule = module;
    cachedDataViewMemory0 = null;
    cachedFloat32ArrayMemory0 = null;
    cachedUint16ArrayMemory0 = null;
    cachedUint8ArrayMemory0 = null;
    wasm.__wbindgen_start();
    return wasm;
}

async function __wbg_load(module, imports) {
    if (typeof Response === 'function' && module instanceof Response) {
        if (typeof WebAssembly.instantiateStreaming === 'function') {
            try {
                return await WebAssembly.instantiateStreaming(module, imports);
            } catch (e) {
                const validResponse = module.ok && expectedResponseType(module.type);

                if (validResponse && module.headers.get('Content-Type') !== 'application/wasm') {
                    console.warn("`WebAssembly.instantiateStreaming` failed because your server does not serve Wasm with `application/wasm` MIME type. Falling back to `WebAssembly.instantiate` which is slower. Original error:\n", e);

                } else { throw e; }
            }
        }

        const bytes = await module.arrayBuffer();
        return await WebAssembly.instantiate(bytes, imports);
    } else {
        const instance = await WebAssembly.instantiate(module, imports);

        if (instance instanceof WebAssembly.Instance) {
            return { instance, module };
        } else {
            return instance;
        }
    }

    function expectedResponseType(type) {
        switch (type) {
            case 'basic': case 'cors': case 'default': return true;
        }
        return false;
    }
}

function initSync(module) {
    if (wasm !== undefined) return wasm;


    if (module !== undefined) {
        if (Object.getPrototypeOf(module) === Object.prototype) {
            ({module} = module)
        } else {
            console.warn('using deprecated parameters for `initSync()`; pass a single object instead')
        }
    }

    const imports = __wbg_get_imports();
    if (!(module instanceof WebAssembly.Module)) {
        module = new WebAssembly.Module(module);
    }
    const instance = new WebAssembly.Instance(module, imports);
    return __wbg_finalize_init(instance, module);
}

async function __wbg_init(module_or_path) {
    if (wasm !== undefined) return wasm;


    if (module_or_path !== undefined) {
        if (Object.getPrototypeOf(module_or_path) === Object.prototype) {
            ({module_or_path} = module_or_path)
        } else {
            console.warn('using deprecated parameters for the initialization function; pass a single object instead')
        }
    }

    if (module_or_path === undefined) {
        module_or_path = new URL('dsp_wasm_bg.wasm', import.meta.url);
    }
    const imports = __wbg_get_imports();

    if (typeof module_or_path === 'string' || (typeof Request === 'function' && module_or_path instanceof Request) || (typeof URL === 'function' && module_or_path instanceof URL)) {
        module_or_path = fetch(module_or_path);
    }

    const { instance, module } = await __wbg_load(await module_or_path, imports);

    return __wbg_finalize_init(instance, module);
}

export { initSync, __wbg_init as default };
