#!/usr/local/bin/python
# -*-: coding utf-8 -*-
""" Snips core and nlu server. """
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals

import json
import time
import os
import os.path

from socket import error as socket_error

import paho.mqtt.client as mqtt
from SnipsMqttServer import SnipsMqttServer
from thread_handler import ThreadHandler

from rasa_nlu.config import RasaNLUConfig
from rasa_nlu.converters import load_data
from rasa_nlu.model import Metadata, Interpreter


import argparse
import logging

import sys
import warnings

from rasa_core import utils
from rasa_core.actions import Action
from rasa_core.agent import Agent
from rasa_core.channels.console import ConsoleInputChannel
from rasa_core.interpreter import RasaNLUInterpreter
from rasa_core.policies.keras_policy import KerasPolicy
from rasa_core.policies.memoization import MemoizationPolicy
from rasa_core.channels.direct import CollectingOutputChannel
from rasa_core.interpreter import RegexInterpreter

logger = logging.getLogger(__name__)


# Creates a blocking mqtt listener that can take one of two actions
# - respond to intents eg nlu/intent/User7_dostuff by calling code
# - respond to training requests eg herme/train?type=rasa_core?domain=?stories=
class SnipsRasaCoreServer(SnipsMqttServer):
    
    def __init__(self,
                 mqtt_hostname=os.environ.get('rasa_core_mqtt_hostname','mosquitto'),
                 mqtt_port=os.environ.get('rasa_core_mqtt_port',1883),
                 core_model_path=os.environ.get('rasa_core_model_path','rasa_config/models/dialogue'),
                 domain_file=os.environ.get('rasa_core_domain_file','rasa_config/domain.yml'),
                 core_training_file=os.environ.get('rasa_core_training_file','rasa_config/stories.md'),
                 lang=os.environ.get('rasa_core_lang','en-GB')
                 ):
                     
        """ Initialisation.
        :param config: a YAML configuration.
        :param assistant: the client assistant class, holding the
                          intent handler and intents registry.
        """
        SnipsMqttServer.__init__(self,mqtt_hostname,mqtt_port)
        self.thread_handler = ThreadHandler()
        self.client = mqtt.Client()
        self.client.on_connect = self.on_connect
        self.client.on_disconnect = self.on_disconnect
        self.client.on_message = self.on_message
        self.mqtt_hostname = mqtt_hostname
        self.mqtt_port = mqtt_port
        self.lang = lang
        self.subscribe_to='hermes/training/complete,hermes/intent/+'
        
        # RASA config
        self.core_model_path = core_model_path
        # to generate stub assistant
        # RASA training config
        self.domain_file = domain_file
        self.core_training_file = core_training_file
        
        self.agent = agent = Agent(self.domain_file,policies=[MemoizationPolicy(), KerasPolicy()])
        self.agentLoaded = None
        self.loadModels()
        

    def isCoreModelMissing(self):
        return not os.path.isfile("{}/domain.json".format(self.core_model_path))

    def loadModels(self,payload=None):
        self.agentLoaded = self.agent.load(self.core_model_path,interpreter = RegexInterpreter()) 
        print('loaded core model')

    def on_message(self, client, userdata, msg):
        if msg.topic is not None and msg.topic.startswith("hermes/audioServer"):
            pass
        else:
            print("MESSAGE: {}".format(msg.topic))
            # reload models after training has completed
            if msg.topic is not None and "{}".format(msg.topic).startswith("hermes/training/complete"):
                #payload = json.loads(msg.payload.decode('utf-8'))
                # TODO unzip payload into models folder
                self.loadModels(msg.payload)
            # handle next action query
            elif msg.topic is not None and "{}".format(msg.topic).startswith("hermes/intent") and msg.payload :
                self.handleCoreQuery(msg)
           
    def handleCoreQuery(self,msg):
            self.log("Core query {}".format(msg.topic))
            payload = json.loads(msg.payload.decode('utf-8'))
            print(payload)
            print('#######################')
            #print(payload.get('slots','fail'))
            if 'input' in payload :        
                theId = payload.get('id')
                sessionId = payload.get('sessionId')
                siteId = payload.get('siteId','default')
                intentNameParts = payload['intent']['intentName'].split('__')
                print(intentNameParts)
                if len(intentNameParts) > 1:
                    intentName = intentNameParts[1]
                else:
                    intentName = '__'.join(intentNameParts)
                
                slots={}
                if 'slots' in payload and payload['slots'] is not None:
                    for entity in payload['slots']:
                        print("SLOT {} {}".format(entity['slotName'],entity['rawValue']))
                        slots[entity['slotName']] = entity['rawValue']

                query = "/{}{}]".format(intentName,json.dumps(slots))
                print('IN')
                print(query)
                response = self.agentLoaded.handle_message(query,output_channel = CollectingOutputChannel())
                print ("OUT")
                print(response)
                if response is not None and len(response) > 0:
                    self.client.publish('hermes/tts/say',
                    payload = json.dumps({"lang":self.lang,"sessionId": sessionId, "text": response[0], "siteId": siteId,"id":theId}), 
                    qos=0,
                    retain=False)
                    self.client.publish('hermes/dialogue/endSession',json.dumps({"sessionId": sessionId,  "siteId": siteId}))

            
  
    def log(self, message):
       print (message)
  

server = SnipsRasaCoreServer()
server.start()

