# OpenSnips



## Overview

This project is home to a number of open source projects related to the Snips voice platform.

- <b>[snips-react-satellite](./snips-react-satellite/README.md) </b> - React component to add a microphone button to a web page that streams mqtt audio to Snips. Implements hotword,audioserver,tts and skill-server components of the Snips mqtt hermes protocol.

- collection of assistants including meekahome music player

- TODO. opensnips 100% open source implementation in nodejs of the snips hermes protocol using kaldi asr and rasa nlu.
Previous sample implementation developed in python has been archived.

- docker images for snips, nodejs, mosquitto

- docker-compose suite to run example


## Quickstart

Install docker
```
curl -fsSL https://get.docker.com -o get-docker.sh
$ sudo sh get-docker.sh
apt-get install docker-compose
```

Run the example
```
git clone https://github.com/syntithenai/opensnips.git
docker-compose up &

```
Open http://localhost:3000/ in your browser to see the microphone demo.

The opensnips repository includes a snips assistant for meekahome that supports the example AppServer intents.
"what is the time"
"what is the date"
"search for <search_topic>"


## Web Browser Audioserver

[More info](./snips-react-satellite/README.md)

![microphone ](snips-react-satellite/snips-webbrowser-audioserver-microphone.png  "microphone ")

![microphone configuration](./snips-react-satellite/snipsmicrophone_configuration.png  "microphone configuration")

