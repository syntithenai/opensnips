#!/opt/rasa/anaconda/bin/python
# -*-: coding utf-8 -*-
""" Snips core and nlu server. """
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import json
import time
import os

from socket import error as socket_error

from SnipsMqttServer import SnipsMqttServer

import paho.mqtt.client as mqtt

from thread_handler import ThreadHandler
import sys,warnings
# apt-get install sox libsox-fmt-all
import sox

class SnipsTTSServer(SnipsMqttServer):
    
    def __init__(self,
                 mqtt_hostname='mosquitto',
                 mqtt_port=1883,
                 ):
        SnipsMqttServer.__init__(self,mqtt_hostname,mqtt_port)
        self.subscribe_to='hermes/tts/say'

    def on_message(self, client, userdata, msg):
        #print("MESSAGEtts: {}".format(msg.topic))
            
        if msg.topic is not None and msg.topic=="hermes/tts/say":
            print("MESSAGE OK: {}".format(msg.topic))
            payload = json.loads(msg.payload)
            # .decode('utf-8')
            sessionId = payload.get('sessionId')
            siteId = payload.get('siteId','default')
            lang = payload.get('lang','en-GB')
            theId = sessionId
            fileName = '/tmp/speaking.wav'
            
            os.system('/usr/bin/pico2wave -w=' + fileName + ' "{}" '.format(payload.get('text')))
            #pubCommand = "mosquitto_pub -h " +self.mqtt_hostname+" -t 'hermes/audioServer/default/playBytes/0049a91e-8449-4398-9752-07c858234' -f '" + fileName + "'"
            #print(pubCommand)
            #os.system(pubCommand)
            
            fp = open(fileName)
            f = fp.read()
            topic = 'hermes/audioServer/{}/playBytes'.format(siteId)
            if theId is not None:
                topic = topic + '/{}'.format(theId[::-1])
            self.client.publish(topic, payload=bytes(f),qos=0)
            #print("PUBLISHED on " + topic)
            os.remove(fileName)

       
server = SnipsTTSServer()
server.start()







