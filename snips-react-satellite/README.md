# snips-react-satellite

React component providing a microphone that works with [Snips](http://snips.ai).
Implements audioserver,hotword,tts and skill-server elements of the Hermes protocol.


## About

This package provides a React component that shows a microphone and streams audio over mqtt in a dialog suitable for the [Snips Voice Platform](https://snips.ai) making it easy to develop web applications that behave as satellites in the Snips ecosystem.

The package only makes sense when used with a Snips voice server.

Features
- implements audioserver elements of the Snips hermes mqtt protocol supporting streaming audio to and from the device.
- optionally implements the hotword server elements of the Snips hermes mqtt protocol using Porcupine running with WebAssembly in the browser.
- implements the tts  server elements of the Snips hermes mqtt protocol  using native voices or falling back to speak.js javascript tts generation.
- long press or right click to show configuration page to select volume, tts voice, hotword, remote control and silence detection.
- logs showing asr transcripts, intent and tts plus audio recordings for each asr transcript.

## Screenshots

![microphone ](./snips-webbrowser-audioserver-microphone.png)

![microphone configuration](./snipsmicrophone_configuration.png)


## Quickstart

!! Ensure the snips voice services are running on localhost

Run the example

```
git clone https://github.com/syntithenai/opensnips.git
cd snips-react-satellite
npm install
npm start

```

## Install

```bash
npm install --save snips-react-satellite

!! ensure global script files are included as per example

```



## Usage

```jsx
import React, { Component } from 'react'

import SnipsReactSatellite from 'snips-react-satellite'

class Example extends Component {
  render () {
    return (
      <SnipsReactSatellite  />
    )
  }
}
```

## Props

- 


## License

MIT © [syntithenai](https://github.com/syntithenai)
