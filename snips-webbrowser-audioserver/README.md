# snips-webbrowser-audioserver

> snips audioserver implementation in a browser with micropohone component for react

[![NPM](https://img.shields.io/npm/v/snips-webbrowser-audioserver.svg)](https://www.npmjs.com/package/snips-webbrowser-audioserver) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## About

This package provides a React component that shows a microphone and streams audio over mqtt in a dialog suitable for the [Snips Voice Platform](https://snips.ai)

The package only makes sense when used with a Snips voice server.

Features
- implements audioserver elements of the Snips hermes mqtt protocol supporting streaming audio to and from the device.
- implements the hotword server elements of the Snips hermes mqtt protocol using Porcupine running with WebAssembly in the browser.
- implements the tts  server elements of the Snips hermes mqtt protocol  using native voices or falling back to speak.js javascript tts generation.
- silence detection by hark so you only transmit while you talk
- configuration page to select voice, hotword, volume etc.

## Screenshots


![microphone ](snips-webbrowser-audioserver/snips-webbrowser-audioserver-microphone.png  "microphone ")

![microphone configuration](./snips-webbrowser-audioserver/snipsmicrophone_configuration.png  "microphone configuration")



## Install

```bash
npm install --save snips-webbrowser-audioserver

!! ensure global script files are included as per example

```



## Usage

```jsx
import React, { Component } from 'react'

import SnipsMicrophone from 'snips-webbrowser-audioserver'

class Example extends Component {
  render () {
    return (
      <SnipsMicrophone  />
    )
  }
}
```


## Props


- mqttServer
- mqttPort
- hotwordId
- siteId
- clientId
- buttonStyle
- speechBubbleStyle
- configStyle




### Config

- inputvolume
- outputvolume
- voicevolume
- ttsvoice
- voicerate
- voicepitch
- remotecontrol
- hotword
- hotwordsensitivity
- silencedetection
- silencesensitivity
- enabletts
- enableaudio
- enablenotifications


## License

MIT © [syntithenai](https://github.com/syntithenai)
