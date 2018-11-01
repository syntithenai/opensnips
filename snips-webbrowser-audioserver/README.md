# snips-webbrowser-audioserver

> snips audioserver implementation in a browser with micropohone component for react

[![NPM](https://img.shields.io/npm/v/snips-webbrowser-audioserver.svg)](https://www.npmjs.com/package/snips-webbrowser-audioserver) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)



## TODO

### Microphone

- server hotword
- recording duration timeout
- bubble style
- user support (key localStorage)
- docs
- ??? voiceId

### Log
- reverse sort log
- logs in session blocks
- intent handlers
- filter by siteId
- site connect to audio - listen, send
- audio logging

- 

- extend logger to replace opensnips with nodejs
* props.disableDefaultListeners 
* methods suitable for nodejs and browser 
  - SnipsAudioServer
  - SnipsTtsServer
  - SnipsHotwordServer
  - SnipsDialogueServer
  - SnipsAsrServer (with kaldi)
  - SnipsNluServer (with rasa)
  - SnipsAppServer
  - SnipsRasaCoreAppServere
  - SnipsTrainingServer (with kaldi/rasa)
        - start with slot values
        - rasa intents
        - rasa core
  




## About

This package provides a React component that shows a microphone and streams audio over mqtt in a dialog suitable for the [Snips Voice Platform](https://snips.ai) making it easy to develop web applications that behave as satellites in the Snips ecosystem.

The package only makes sense when used with a Snips voice server.

Features
- implements audioserver elements of the Snips hermes mqtt protocol supporting streaming audio to and from the device.
- optionally implements the hotword server elements of the Snips hermes mqtt protocol using Porcupine running with WebAssembly in the browser.
- implements the tts  server elements of the Snips hermes mqtt protocol  using native voices or falling back to speak.js javascript tts generation.
- silence detection by hark so you only transmit while you talk
- long press or right click to show configuration page to select volume, tts voice, hotword, remote control and silence detection.
- logs showing asr transcripts, intent and tts plus audio recordings for each asr transcript.

## Screenshots


![microphone ](./snips-webbrowser-audioserver-microphone.png  "microphone ")

![microphone configuration](./snipsmicrophone_configuration.png  "microphone configuration")


## Quickstart

!! Ensure the snips voice services are running on localhost

Run the example
git clone https://github.com/syntithenai/opensnips.git
cd snips-webbrowser-audioserver
npm install
npm start


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
