## VITAL FOR PULSE AUDIO
https://wiki.archlinux.org/index.php/PulseAudio/Examples#Allowing_multiple_users_to_use_PulseAudio_at_the_same_time
~/.config/pulse/default.pa
load-module module-native-protocol-unix auth-anonymous=1 socket=/tmp/pulse-socket


IMPORTANT !!!!
Afterwards, set PulseAudio as a client to the UNIX socket just created in the secondary user:
/home/secondaryuser/.config/pulse/client.conf
default-server = unix:/tmp/pulse-socket


# pulse audio and docker explanation
https://github.com/mviereck/x11docker/wiki/Container-sound:-ALSA-or-Pulseaudio

#pulse docker on raspbian
https://github.com/MichaelHills/snips-pulse-docker/blob/master/run-snips.sh


# android x server
https://play.google.com/store/apps/details?id=x.org.server&hl=en&showAllReviews=true

# create a react module
https://github.com/transitive-bullshit/create-react-library

# browser hotword
https://github.com/alanjames1987/Cross-Browser-Voice-Recognition-with-PocketSphinx.js/blob/master/js/main.js


# silence recogniser
https://github.com/otalk/hark

# hotword detector
https://github.com/Picovoice/Porcupine/tree/master/demo/js

# play audio data from mqtt
https://stackoverflow.com/questions/44073159/play-wav-file-as-bytes-received-from-server

# submitted request for hotwords via chat
https://github.com/Picovoice/Porcupine/issues/95

# vumeter
https://codepen.io/travisholliday/pen/gyaJk


# stop hexagon generator
https://codepen.io/wvr/pen/WrNgJp

# media demo - using native tts voices
https://codepen.io/matt-west/pen/wGzuJ

https://snips.ai/

# crunker join wav files
https://github.com/jackedgson/crunker

# mosquitto authentication
https://github.com/jpmens/mosquitto-auth-plug

# javascript copy paste
https://www.lucidchart.com/techblog/2014/12/02/definitive-guide-copying-pasting-javascript/

# RASA nodejs wrapper
https://github.com/beevelop/rasa-client

# JS NLU
https://github.com/Botfuel/botfuel-nlp-sdk
https://github.com/spencermountain/compromise
https://github.com/superscriptjs/superscript/wiki/Triggers
https://github.com/NaturalNode/natural


# SNIPS RASA - example training data for music player phrases
https://github.com/aaldaber/snips_training_data_to_rasa

#  FREE MUSIC  (FMA NEW HOME)
https://archive.org/details/audio_music
