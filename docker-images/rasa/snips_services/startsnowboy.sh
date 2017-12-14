#!/bin/sh
cp -r /opt/snowboy/* /opt/snips_services/
cd /opt/snips_services/
python /opt/snips_services/hotword_server.py 

