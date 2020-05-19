# OpenSnips

This repository is DEPRECATED.

For a working full featured voice dialog manager suite see https://github.com/syntithenai/hermod   

## Overview

This project is home to a number of open source projects related to the Snips voice platform.

- [Hermod](https://github.com/syntithenai/hermod), a BSD-2 licenced full voice stack with a dialog manager optimised for a multi user (web hosted) environment.

- <b>[snips-react-satellite](./snips-react-satellite/README.md) </b> - React component to add a microphone button to a web page that streams mqtt audio to Snips. Implements hotword,audioserver,tts and skill-server components of the Snips mqtt hermes protocol.

- collection of assistants including meekahome music player

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
```
"what is the time"
"what is the date"
"search for <search_topic>"
```

## Web Browser Audioserver

[More info](./snips-react-satellite/README.md)


## PulseAudio

If you are developing on Linux it is useful to have multiple access to the sound card by using pulse audio.

The docker compose file shows a container can use  pulseaudio on the Linux host.

To enable
- Run paprefs and enable network server. 
- Possibly also update volume mount in docker-compose.yml to point at cookie file (if not anon access) and PULSE_HOST to 
Linux IP address.

The snips image is built with alsa and pulse config compatible with the environment variables from the docker-compose file.
    - a custom alsa config file sets sink and source as pulseaudio
    - a custom pulse client config file uses settings to disable auto start of the pulse server on the client (because this setup talks directly to the host pulse server)

!! If you have a (playstation eye) microphone plugged into a always on usb power port, it may not reset on reboot and end up jammed. Switch usb ports (and reboot) to fix.


### Pulseaudio Links

- [https://wiki.archlinux.org/index.php/PulseAudio/Examples#Allowing_multiple_users_to_use_PulseAudio_at_the_same_time](https://wiki.archlinux.org/index.php/PulseAudio/Examples#Allowing_multiple_users_to_use_PulseAudio_at_the_same_time)
- [https://github.com/mviereck/x11docker/wiki/Container-sound:-ALSA-or-Pulseaudio](https://github.com/mviereck/x11docker/wiki/Container-sound:-ALSA-or-Pulseaudio)
- [https://github.com/MichaelHills/snips-pulse-docker/blob/master/run-snips.sh](https://github.com/MichaelHills/snips-pulse-docker/blob/master/run-snips.sh)

