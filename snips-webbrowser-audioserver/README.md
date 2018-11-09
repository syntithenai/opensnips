# snips-webbrowser-audioserver

> snips audioserver implementation in a browser with micropohone component for react

[![NPM](https://img.shields.io/npm/v/snips-webbrowser-audioserver.svg)](https://www.npmjs.com/package/snips-webbrowser-audioserver) [![JavaScript Style Guide](https://img.shields.io/badge/code_style-standard-brightgreen.svg)](https://standardjs.com)

## questions
- is it a design goal that the dialogueManager be stateless/functional (excepting timeouts) 

## OpenSnips aims to be an implementation of the Snips Hermes MQTT protocol in javascript
- run Snips Services in a web browser or in nodejs on a server and orchestrate a mixture of them.
- using PocketSphinx.js for ASR and a custom NLU module, with a local only MQTT proxy, the whole stack can be run in a Web Browser.
- switch between a number of providers of ASR (Snips/Kaldi/Google/Amazon Polly/OpenSphinx/DeepSpeech/???) and NLU (Snips/RASA/Custom/DialogFlow/??) services 

- implement audio on the server using mpg123 and sox as base layers for cross platform support to Windows as well as Linux/Mac/Android.
- support simultaneous input from multiple sources (audioserver -> intent) debounced to trigger a single intent.

- support distributed training via the mqtt protocol.

Because OpenSnips relies on a number of services, we suggest using Docker to orchestrate the suite of microservices as per the included example.


## TODO

### Microphone
- extract hotword server
- extract audio server
- mqtt payloads crashing connection ??
- sessionId endSession
- limit notifications to event from on this site
- recording duration timeout + other timeout
- server hotword
    - intent -> endSession
    - stopListening -> textCaptured
    - textCaptured -> eventParsed
    - 
- ? bubble style
- user support (key localStorage) DONE
- docs



### Log
- reverse sort log DONE
- logs in session blocks DONE
- filter by siteId DONE
- intent handlers DONE
- audio logging DONE
 ? site connect to audio - listen, send
-
- 

### AppServer
- say method (and other helpers -> end, continue) export available in app server intent functions
- debounce

### Opensnips
- extend logger to replace opensnips with nodejs replacements for snips-scripts (plus gstreamer-kaldi and rasa server)
* props.disableDefaultListeners 
* kaldi retraining based on user recordings

* methods suitable for nodejs and browser 
  - SnipsAudioServer
  - SnipsTtsServer
  - SnipsHotwordServer
  - SnipsDialogueServer
  - SnipsAsrServer (with kaldi)
  - SnipsNluServer (with rasa)
  - SnipsAppServer
  - SnipsRasaCoreAppServer
  - SnipsTrainingServer (with kaldi/rasa)
        - start with slot values
        - rasa intents
        - rasa core
  - ?? SnipsAirTokensWorker - arbitrary work (training) distributed to clients ??
  - SnipsVoiceIdServer
        - piwho mqtt listener -> userId events
        - ??? pi voiceId/login hooks
  - SnipsDiscoveryServer - mqtt based site discovery

- local messaging wrappers around mqtt send to pass local messages locally to browser
- ? 100% browser ASR - pocketSphinx, NLU - see speechify.js
https://github.com/syl22-00/pocketsphinx.js

- model building UI
    - intents and slots and actions (nodejs/browser)
    - training server

### Snips Image
- sam
- sam login entrypoint in docker image + update docs
- skills server
- toggle services




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
