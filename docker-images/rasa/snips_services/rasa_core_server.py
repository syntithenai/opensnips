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
import io
import os.path
import tempfile


from socket import error as socket_error

import paho.mqtt.client as mqtt
from SnipsMqttServer import SnipsMqttServer
from thread_handler import ThreadHandler

from rasa_nlu.config import RasaNLUConfig
from rasa_nlu.converters import load_data
from rasa_nlu.model import Metadata, Interpreter

import snips_factory

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
from rasa_core.domain import Domain
from rasa_core.domain import TemplateDomain

import uuid

from builtins import str
from typing import Text, List, Optional, Callable, Any, Dict, Union

from rasa_core.channels import UserMessage, InputChannel, OutputChannel
from rasa_core.domain import TemplateDomain, Domain
from rasa_core.events import Event
from rasa_core.featurizers import Featurizer, BinaryFeaturizer
from rasa_core.interpreter import NaturalLanguageInterpreter
from rasa_core.policies import PolicyTrainer, Policy
from rasa_core.policies.ensemble import SimplePolicyEnsemble, PolicyEnsemble
from rasa_core.policies.memoization import MemoizationPolicy
from rasa_core.policies.online_policy_trainer import (
    OnlinePolicyTrainer)
from rasa_core.processor import MessageProcessor
from rasa_core.tracker_store import InMemoryTrackerStore, TrackerStore

from rasa_core.utils import read_yaml_file


from rasa_snips_extensions import SnipsMqttAgent, SnipsDomain


logger = logging.getLogger(__name__)






# Creates a blocking mqtt listener that can take one of two actions
# - respond to intents eg nlu/intent/User7_dostuff by calling code
# - respond to training requests eg hermes/training/start?id=XXX?type=rasa_core?domain=?stories=
class SnipsRasaCoreServer(SnipsMqttServer):
    
    def __init__(self,
                 mqtt_hostname=os.environ.get('rasa_core_mqtt_hostname','mosquitto'),
                 mqtt_port=os.environ.get('rasa_core_mqtt_port',1883),
                 training_mqtt_hostname=None,
                 training_mqtt_port=None,
                 core_model_path=os.environ.get('rasa_core_model_path','models/dialogue'),
                 domain_file=os.environ.get('rasa_core_domain_file',None),
                 core_training_file=os.environ.get('rasa_core_training_file',None),
                 lang=os.environ.get('rasa_core_lang','en-GB')
                 ):
        """ Initialisation.
        :param config: a YAML configuration.
        :param assistant: the client assistant class, holding the
                          intent handler and intents registry.
        """
        SnipsMqttServer.__init__(self,mqtt_hostname,mqtt_port,training_mqtt_hostname,training_mqtt_port)
        self.thread_handler = ThreadHandler()
        self.thread_targets.append(self.startTrainingMqtt)
        self.thread_targets.append(self.watchModels)
        
        #self.client = mqtt.Client()
        #self.client.on_connect = self.on_connect
        #self.client.on_disconnect = self.on_disconnect
        #self.client.on_message = self.on_message
        #self.mqtt_hostname = mqtt_hostname
        #self.mqtt_port = mqtt_port
        #self.training_client.on_message = self.on_message
        self.lang = lang
        self.subscribe_to='hermes/intent/+'
        # RASA config
        self.core_model_path = core_model_path
        # RASA training config
        self.domain_file = domain_file
        self.core_training_file = core_training_file
        self.core_model_path = core_model_path
        #self.agentLoaded = SnipsMqttAgent(self.domain_file,policies=[MemoizationPolicy(), KerasPolicy()],core_server = self)
        self.agentLoaded = None
        self.trainingId = None
        self.siteId = None
        self.sessionId = None
        self.core_modified=self.getCoreModified()
        self.core_domain_modified=self.getCoreDomainModified()
        self.core_model_modified=self.getCoreModelModified()
        self.loadModels()
        
    def getCoreModified(self):    
        if os.path.isfile(self.core_training_file):
            return os.path.getmtime(self.core_training_file) 
    def getCoreDomainModified(self):
        if os.path.isfile(self.domain_file):
            return os.path.getmtime(self.domain_file)
    def getCoreModelModified(self):
        if os.path.isfile("{}/domain.json".format(self.core_model_path)):
            return os.path.getmtime("{}/domain.json".format(self.core_model_path))
            
    def isCoreModified(self):    
        ret =   self.getCoreModified() != self.core_modified or self.getCoreDomainModified() != self.core_domain_modified or self.getCoreModified() > self.getCoreModelModified()  or self.getCoreDomainModified() > self.getCoreModelModified()
        #print("IS CORE MOD {} {} {} {} {} {}".format(ret,self.getCoreModified(),self.core_modified,self.getCoreDomainModified(),self.core_domain_modified,self.getCoreModelModified()))
        return ret
        
    def isCoreModelModified(self):
        return self.getCoreModelModified() != self.core_model_modified
        
    def hasTrainingMaterials(self):
        if self.domain_file is None or not os.path.isfile(self.domain_file):
            return False
        elif self.core_training_file is None or not os.path.isfile(self.core_training_file):
            return False
        else:
            return True
            
    
    #def on_connect(self, client, userdata, flags, result_code   ):
        ##self.loadModels()
        #pass
        
        

    def isCoreModelMissing(self):
        return not os.path.isfile("{}/domain.json".format(self.core_model_path))

    def watchModels(self,run_event):
        while True and run_event.is_set():
            time.sleep(5)
            #print("WATCH")
            if self.isCoreModified():
                print("WATCH AND MODIFIED")
                self.sendTrainingRequest()
            

    def sendTrainingRequest(self):
        if self.trainingId is None and self.hasTrainingMaterials():
            with io.open(self.domain_file) as domainFile:
                domain = domainFile.read()
            with io.open(self.core_training_file) as trainingFile:
                training = trainingFile.read()
            newId = str(uuid.uuid4())
            self.trainingId = newId
            self.training_client.subscribe("hermes/training/complete/{}".format(newId))
            self.training_client.publish('hermes/training/start', payload=json.dumps({"id":newId, "type": "rasacore","domain": domain,"stories":training}), qos=0)
            print('sent training request')
        else:
            print('training ongoing')
                

    def loadModels(self):
        #print("loading core model {}".format(self.core_model_path))
        if self.isCoreModelMissing():
            self.sendTrainingRequest()
        else:
            if self.trainingId is not None:
                self.training_client.unsubscribe("hermes/training/complete/{}".format(self.trainingId))
                self.trainingId = None
            
            #if (self.isCoreModelModified()):
            self.agentLoaded = SnipsMqttAgent.loadAgent(self.core_model_path,interpreter = RegexInterpreter(),action_factory = 'snips_factory.snips_action_factory',core_server = self)  # 
            print('loaded core model')
            self.core_model_modified=self.getCoreModelModified()
            self.core_modified=self.getCoreModified()
            self.core_domain_modified=self.getCoreDomainModified()
            
    def on_training_message(self,client,userdate,msg):
        return self.on_message(client,userdate,msg)

    def on_message(self, client, userdata, msg):
        if msg.topic is not None and msg.topic.startswith("hermes/audioServer"):
            pass
        else:
            print("MESSAGE: {}".format(msg.topic))
            # reload models after training has completed
            if self.trainingId is not None and msg.topic is not None and "{}".format(msg.topic).startswith("hermes/training/complete"):
                parts = msg.topic.split('/')
                if parts[-1] == self.trainingId:
                #payload = json.loads(msg.payload.decode('utf-8'))
                # TODO unzip payload into models folder
                    zipFile = tempfile.NamedTemporaryFile(delete = False,suffix='.zip')
                    zipFile.write(msg.payload)
                    zipFile.close()
                    import zipfile
                    zip_ref = zipfile.ZipFile(zipFile.name, 'r')
                    zip_ref.extractall(self.core_model_path)
                    zip_ref.close()
                    os.unlink(zipFile.name)

                    self.loadModels()
                else:
                    print('Training ID incorrect')
            # handle next action query
            elif msg.topic is not None and "{}".format(msg.topic).startswith("hermes/intent") and msg.payload :
                self.handleCoreQuery(msg)
           
    def handleCoreQuery(self,msg):
        if not self.isCoreModelMissing():
            self.log("Core query {}".format(msg.topic))
            payload = json.loads(msg.payload.decode('utf-8'))
            print(payload)
            print('#######################')
            #print(payload.get('slots','fail'))
            if 'input' in payload :        
                theId = payload.get('id')
                self.sessionId = sessionId = payload.get('sessionId')
                self.siteId = siteId = payload.get('siteId','default')
                # ditch the first token in the intentName split by __
                intentNameParts = payload['intent']['intentName'].split('__')
                print(intentNameParts)
                if len(intentNameParts) > 1:
                    intentName = intentNameParts[1]
                else:
                    intentName = intentNameParts[0]
                
                intentNameInnerParts = intentName.split("_")
                
                slots={}
                if 'slots' in payload and payload['slots'] is not None:
                    for entity in payload['slots']:
                        print("SLOT {} {}".format(entity['slotName'],entity['rawValue']))
                        slots[entity['slotName']] = entity['rawValue']

                query = "/{}{}]".format(intentName,json.dumps(slots))
                print('IN')
                print(query)
                response = self.agentLoaded.handle_message(query,output_channel = CollectingOutputChannel())
              
        else:
            print("core model missing")
    def log(self, message):
       print (message)
  

server = SnipsRasaCoreServer()
server.start()

