# NanoVNA-WebUSB-Client

Very alpha version.

https://cho45.stfuawsc.com/NanoVNA/

<a href="https://github.com/ttrftech/NanoVNA">NanoVNA</a> interface implementation with WebUSB.


# Usage

# Requirements

## macOS

no requirements

## Android

Connect device via USB OTG connector. (Type-C to Type-C cable may not be usable. I recommend using USB-A OTG adapter.)

## Linux (Ubuntu)

Copy <a href="./etc/99-nanovna.rules">99-nanovna.rules</a> to your /etc/udev/rules.d.

BE CAREFUL: This rule disables `cdc_acm` driver for all STM32CDC devices (vid:0x0483, pid:0x5740). So, If you want to use device as usb cdc device, you must remove this file again.

## Windows

Replace driver with <a href="https://zadig.akeo.ie/">Zadig</a>.

# RUN with WebUSB
There are no requirements except a browser supporting WebUSB (available by default with Google Chrome currently)

1. Access to https://cho45.stfuawsc.com/NanoVNA/ .
2. Connect your NanoVNA to USB port.
3. Click [CONNECT] and select the device.

# RUN with WebSerial

WebSerial is more experimental feature on Google Chrome. But it may resolve driver issues around WebUSB.

1. Enable flag: chrome://flags/#enable-experimental-web-platform-features
2. Access to https://cho45.stfuawsc.com/NanoVNA/ .
3. Connect your NanoVNA to USB port.
4. Click [CONNECT] and select the device.

# Screenshots

<img src="images/DSC07514-900.jpg">

Connect via USB OTG connector.

<img src="images/Screenshot_20190827_231734_com.android.chrome.jpg" width=270 height=561> <img src="images/Screenshot_20190827_231803_com.android.chrome.jpg" width=270 height=561> <img src="images/Screenshot_20190827_231746_com.android.chrome.jpg" width=270 height=561> <img src="images/Screenshot_20190827_231756_com.android.chrome.jpg" width=270 height=561>


# Build

This project uses Rust partially for DSP. 

## Install some tools

- <a href="https://www.rust-lang.org/tools/install">Install Rust</a>

and install build tools as following:

```
$ cargo install wasm-pack
$ cargo install --force cargo-make

```

See also <a href="https://developer.mozilla.org/en-US/docs/WebAssembly/Rust_to_wasm">Compiling from Rust to WebAssembly</a>


