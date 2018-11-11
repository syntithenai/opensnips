#!/bin/sh
cp -r /opt/snowboy/* /opt/snips_services/
#  hacked snowboy file to remove audio hardware access
cp /opt/snips_services/snowboydecoder.noaudio.py /opt/snips_services/snowboydecoder.py
cd /opt/snips_services/
/opt/rasa/anaconda/bin/python /opt/snips_services/hotword_server.py 

