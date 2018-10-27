#!/bin/sh
python ./audio_server.py &
export audioserver_mode=stream; python ./audio_server.py
