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

class SnipsTrainingServer(SnipsMqttServer):
    
    def __init__(self,
                 mqtt_hostname='mosquitto',
                 mqtt_port=1883,
                 ):
        SnipsMqttServer.__init__(self,mqtt_hostname,mqtt_port)
        self.subscribe_to='hermes/train'

    def on_message(self, client, userdata, msg):
        print("MESSAGEtts: {}".format(msg.topic))
            
        if msg.topic is not None and msg.topic=="hermes/train":
            print("MESSAGE OK: {}".format(msg.topic))
            payload = json.loads(msg.payload)
            # .decode('utf-8')
            trainingType = payload.get('type')
            # DO THE TRAINING
            if trainingType == "rasanlu":
                # train both entity and slot only models for current project
                # train a single model from explicit config
                trainingConfig = payload.get('config','default content of config file for entitires')
                project=payload.get('project','default')
                model=payload.get('model','current')
                slotConfig = 'default for slots'
                trainingExamples = payload.get('examples','default')
                
                
                
                pass
            else if trainingType == "rasacore":
                pass
            else if trainingType == "kaldi":
                pass
            else if trainingType == "snips":
                pass
            
            
            topic = 'hermes/trainingComplete'
            #if theId is not None:
                #topic = topic + '/{}'.format(theId[::-1])
            f=None
            self.client.publish(topic, payload=bytes(f),qos=0)
            print("PUBLISHED on " + topic)
            
       
server = SnipsTrainingServer()
server.start()







