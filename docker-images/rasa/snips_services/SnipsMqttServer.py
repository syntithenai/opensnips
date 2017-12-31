#!/usr/bin/python
# -*-: coding utf-8 -*-
""" Snips core and nlu server. """
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import json
import time
import os
#import pyaudio
#import wave
#import io
from rasa_nlu.model import Metadata, Interpreter

from socket import error as socket_error

import paho.mqtt.client as mqtt

from thread_handler import ThreadHandler
import sys
import warnings

class SnipsMqttServer():
    
    def __init__(self,
                 mqtt_hostname='mosquitto',
                 mqtt_port=1883,
                 ):
        """ Initialisation.

        :param config: a YAML configuration.
        :param assistant: the client assistant class, holding the
                          intent handler and intents registry.
        """
        self.thread_handler = ThreadHandler()
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_message = self.on_message
        self.mqtt_hostname = mqtt_hostname
        self.mqtt_port = mqtt_port
        self.thread_targets=[self.startMqtt]
        self.subscribe_to = '#'
        
    # MQTT LISTENING SERVER
    def start(self):
        self.log("START")
        for threadTarget in self.thread_targets:
            print("RUN {}".format(threadTarget))
            self.thread_handler.run(target=threadTarget)
        self.thread_handler.start_run_loop()

    def startMqtt(self, run_event):
        self.log("Connecting to {} on port {}".format(self.mqtt_hostname, str(self.mqtt_port)))
        retry = 0
        while True and run_event.is_set():
            try:
                self.log("Trying to connect to {} {}".format(self.mqtt_hostname,self.mqtt_port))
                self.client.connect(self.mqtt_hostname, self.mqtt_port, 60)
                # SUBSCRIBE 
                print(self.subscribe_to)
                print(self.subscribe_to.split(","))
                for sub in self.subscribe_to.split(","):
                    if len(sub) > 0:
                        print('sub {}'.format(sub))
                        self.client.subscribe(sub)
                    else:
                        print('no subscriptions')
                
                break
            except (socket_error, Exception) as e:
                self.log("MQTT error {}".format(e))
                time.sleep(5 + int(retry / 5))
                retry = retry + 1
        while run_event.is_set():
            #try:
                self.client.loop()
            #except AttributeError as e:
            #    self.log("Error in mqtt run loop {}".format(e))
            #    time.sleep(1)

    def on_connect(self, client, userdata, flags, result_code):
        self.log("Connected with result code {}".format(result_code))

    def on_disconnect(self, client, userdata, result_code):
        self.log("Disconnected with result code " + str(result_code))
        time.sleep(5)
        for threadTarget in self.thread_targets:
            self.thread_handler.run(target=threadTarget)

    def on_message(self, client, userdata, msg):
        self.log("MESSAGE {}".format(msg.topic))
        
    def log(self, message):
        print (message)




# Thin interpreter to forward already processed NLU message to rasa_core
# USED BY RASA core and nlu
class SnipsMqttInterpreter(Interpreter):
    def __init__(self):
        pass
    # skip loading
    def load(self):
        pass
    # tojson parse from mqtt intent
    def parse(self, jsonData):
        print('interpret snips')
        print(jsonData)
        return json.loads(jsonData)


