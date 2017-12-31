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

logger = logging.getLogger(__name__)


# Creates a blocking mqtt listener that can take one of three actions
# - train the nlu and the dialog manager and reload them
# - respond to nlu query on mqtt hermes/nlu/query with a message to hermes/nlu/intentParsed
# - respond to intents eg nlu/intent/User7_dostuff by calling code
class SnipsRasaNluServer(SnipsMqttServer):
    
    def __init__(self,
                 mqtt_hostname=os.environ.get('rasa_nlu_mqtt_hostname','mosquitto'),
                 mqtt_port=os.environ.get('rasa_nlu_mqtt_port',1883),
                 nlu_model_path=os.environ.get('rasa_nlu_model_path','rasa_config/models/nlu'),
                 nlu_models=os.environ.get('rasa_nlu_models','default'),
                 config_file=os.environ.get('rasa_nlu_config_file','rasa_config/config.json'),
                 config_file_slots=os.environ.get('rasa_nlu_config_file','rasa_config/config-slots.json'),
                 lang=os.environ.get('rasa_nlu_lang','en-GB'),
                 snips_user_id=os.environ.get('rasa_nlu_snips_user_id','user_Kr5A7b4OD'),
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
        self.subscribe_to='#'
        
        # RASA config
        self.interpreter = {}
        self.interpreter_slots = {}
        self.nlu_model_path = nlu_model_path
        self.nlu_models = nlu_models.split(",")
        self.config_file = config_file
        self.config_file_slots = config_file_slots
        # for matching snips intents
        self.snips_user_id=snips_user_id
        self.loadModels(True)
        
    def isNluModelMissing(self):
        return False
        #not os.path.isfile("{}/metadata.json".format(self.nlu_model_path)) or not os.path.isfile("{}/metadata.json".format(self.nlu_model_path_slots))

    def loadModels(self,payload = None):
        # use the files as templates and override config on top for each model
        config = RasaNLUConfig(self.config_file)
        slotConfig = RasaNLUConfig(self.config_file_slots)
        for model in self.nlu_models:
            config.override({"project" : "nlu","fixed_model_name" : model})
            slotConfig.override({"project" : "nlu","fixed_model_name" : "{}_slots".format(model)})
        
            # if file exists import os.path os.path.exists(file_path)
            # create an NLU interpreter and dialog agent based on trained models
            self.interpreter[model] = Interpreter.load("{}/{}/".format(self.nlu_model_path,model), config)
            self.interpreter_slots[model] = Interpreter.load("{}/{}_slots/".format(self.nlu_model_path,model), slotConfig)
        print('loaded nlu model')


    def on_message(self, client, userdata, msg):
        if msg.topic is not None and msg.topic.startswith("hermes/audioServer"):
            pass
        else:
            print("MESSAGE: {}".format(msg.topic))
            if msg.topic is not None and "{}".format(msg.topic).startswith("hermes/nlu") and "{}".format(msg.topic).endswith('/query') and msg.payload :
                self.handleNluQuery(msg)
            elif msg.topic is not None and "{}".format(msg.topic).startswith("hermes/nlu") and "{}".format(msg.topic).endswith('/partialQuery') and msg.payload :
                self.handleNluSlotsQuery(msg)
            elif msg.topic is not None and "{}".format(msg.topic).startswith("hermes/training/complete")  and msg.payload:
                self.loadModels(msg.payload)
            
    def handleNluQuery(self,msg):
            self.log("NLU query {}".format(msg.topic))
            payload = json.loads(msg.payload.decode('utf-8'))
            print(payload)
            if 'input' in payload :
                sessionId = payload['sessionId']
                id = payload['id']
                text = payload['input']
                print(text)
                model = payload.get('model','default')
                lookup = self.interpreter[model].parse(text)
                
                slots=[]
                
                for entity in lookup['entities']:
                    slot = {"entity": entity['value'],"range": {"end": entity['end'],"start": entity['start']},"rawValue": entity['value'],"slotName": "entity","value": {"kind": "Custom","value": entity['value']}} 
                    slots.append(slot)
                print(slots)
                intentName = "{}__{}".format(self.snips_user_id,lookup['intent']['name'])
                self.client.publish('hermes/nlu/intentParsed',
                payload=json.dumps({"id": id,"sessionId": sessionId, "input": text,"intent": {"intentName": intentName,"probability": 1.0},"slots": slots}), 
                qos=0,
                retain=False)

    def handleNluSlotsQuery(self,msg):
            self.log("NLU SLOTS query {}".format(msg.topic))
            payload = json.loads(msg.payload.decode('utf-8'))
            print(payload)
            if 'input' in payload :
                sessionId = payload['sessionId']
                id = payload['id']
                text = payload['input']
                print(text)
                model = payload.get('model','default')
                lookup = self.interpreter_slots[model].parse(text)
   
                slots=[]
                
                for entity in lookup['entities']:
                    slot = {"entity": entity['value'],"range": {"end": entity['end'],"start": entity['start']},"rawValue": entity['value'],"slotName": "entity","value": {"kind": "Custom","value": entity['value']}} 
                    slots.append(slot)
                print(slots)
                intentName = "{}__{}".format(self.snips_user_id,lookup['intent']['name'])
                self.client.publish('hermes/nlu/slotParsed',
                payload=json.dumps({"id": id,"sessionId": sessionId, "input": text,"intent": {"intentName": intentName,"probability": 1.0},"slots": slots}), 
                qos=0,
                retain=False)
                                    
    def log(self, message):
       print (message)
  

server = SnipsRasaNluServer()
server.start()


