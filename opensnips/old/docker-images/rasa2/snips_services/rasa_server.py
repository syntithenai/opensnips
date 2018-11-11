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


class DefaultPolicy(KerasPolicy):
    def model_architecture(self, num_features, num_actions, max_history_len):
        """Build a Keras model and return a compiled model."""
        from keras.layers import LSTM, Activation, Masking, Dense
        from keras.models import Sequential

        n_hidden = 32  # size of hidden layer in LSTM
        # Build Model
        batch_shape = (None, max_history_len, num_features)

        model = Sequential()
        model.add(Masking(-1, batch_input_shape=batch_shape))
        model.add(LSTM(n_hidden, batch_input_shape=batch_shape))
        model.add(Dense(input_dim=n_hidden, output_dim=num_actions))
        model.add(Activation('softmax'))

        model.compile(loss='categorical_crossentropy',
                      optimizer='adam',
                      metrics=['accuracy'])

        logger.debug(model.summary())
        return model

# Thin interpreter to forward already processed NLU message to rasa_core
# TODO move json transcoding from dialog handling to here
class SnipsMqttInterpreter(Interpreter):
    def __init__(self):
        pass
    # skip loading
    def load(self):
        pass
    # passthrough parse from mqtt intent
    def parse(self, jsonData):
        #print('interpret snips')
        return json.loads(jsonData)



# Creates a blocking mqtt listener that can take one of three actions
# - train the nlu and the dialog manager and reload them
# - respond to nlu query on mqtt hermes/nlu/query with a message to hermes/nlu/intentParsed
# - respond to intents eg nlu/intent/User7_dostuff by calling code
class SnipsRasaServer():
    
    def __init__(self,
                 disable_nlu=os.environ.get('rasa_disable_nlu','no'),
                 disable_core=os.environ.get('rasa_disable_core','no'),
                 mqtt_hostname=os.environ.get('mqtt_hostname','mosquitto'),
                 mqtt_port=os.environ.get('mqtt_port',1883),
                 nlu_model_path=os.environ.get('rasa_nlu_model_path','models/nlu'),
                 snips_assistant_path=os.environ.get('rasa_snips_assistant_path','models/snips'),
                 snips_user_id=os.environ.get('rasa_snips_user_id','user_Kr5A7b4OD'),
                 core_model_path=os.environ.get('rasa_core_model_path','models/core'),
                 config_file=os.environ.get('rasa_config_file','rasa_config/config.json'),
                 domain_file=os.environ.get('rasa_domain_file','rasa_config/domain.yml'),
                 nlu_training_file=os.environ.get('rasa_nlu_training_file','rasa_config/nlu.md'),
                 core_training_file=os.environ.get('rasa_core_training_file','rasa_config/stories.md'),
                 lang=os.environ.get('rasa_lang','en-GB')
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
        self.lang = lang
        # RASA config
        self.disable_nlu = disable_nlu
        self.disable_core = disable_core
        self.interpreter = None
        self.nlu_model_path = nlu_model_path
        self.core_model_path = core_model_path
        # to generate stub assistant
        self.snips_assistant_path = snips_assistant_path
        self.snips_user_id = snips_user_id
        self.config_file = config_file
        # RASA training config
        self.domain_file = domain_file
        self.nlu_training_file = nlu_training_file
        self.core_training_file = core_training_file
        
        self.isNluTraining = False
        self.isCoreTraining = False
        
        # save modified times on source files
        self.nlu_modified=self.getNluModified()
        self.core_modified=self.getCoreModified()
        self.core_domain_modified=self.getCoreDomainModified()
        self.nlu_model_modified=self.getNluModelModified()
        self.core_model_modified=self.getCoreModelModified()
        
        self.loadModels(True)
        
    def getNluModified(self):
        if os.path.isfile(self.nlu_training_file):
            return os.path.getmtime(self.nlu_training_file)
    def getCoreModified(self):    
        if os.path.isfile(self.core_training_file):
            return os.path.getmtime(self.core_training_file) 
    def getNluModelModified(self):
        if os.path.isfile("{}/default/current/metadata.json".format(self.nlu_model_path)):
            return os.path.getmtime("{}/default/current/metadata.json".format(self.nlu_model_path))
    def getCoreModelModified(self):
        if os.path.isfile("{}/domain.json".format(self.core_model_path)):
            return os.path.getmtime("{}/domain.json".format(self.core_model_path))
    def getCoreDomainModified(self):
        if os.path.isfile(self.domain_file):
            return os.path.getmtime(self.domain_file)
        
    def isNluModified(self):
        return self.getNluModified() != self.nlu_modified  or self.getNluModified() > self.getNluModelModified()
    def isCoreModified(self):    
        return self.getCoreModified() != self.core_modified or self.getCoreModified() > self.getCoreModelModified()  or self.getCoreDomainModified() != self.core_domain_modified or self.getCoreDomainModified() > self.getCoreModelModified()
    def isNluModelModified(self):
        return self.getNluModelModified() != self.nlu_model_modified
    def isCoreModelModified(self):
        return self.getCoreModelModified() != self.core_model_modified
    
    def isNluModelMissing(self):
        return not os.path.isfile("{}/default/current/metadata.json".format(self.nlu_model_path))
    def isCoreModelMissing(self):
        return not os.path.isfile("{}/domain.json".format(self.core_model_path))

    # these function read extended rasa stories format and output something suitable for training
    def generateNLU(self):
        if os.path.getmtime(self.nlu_training_file) != self.nlu_modified:
            # do generation
            pass
        
    def generateCore(self):
        pass
    def generateDomain(self):
        pass

    
    def watchModels(self,run_event):
        while True and run_event.is_set():
            self.loadModels()
            time.sleep(10)
            
    def trainModels(self,force=False):
        self.train_nlu(force)
        self.train_core(force)
        
    # RASA model generation
    def loadModels(self,force=False):
        self.trainModels()
        
        # if file exists import os.path os.path.exists(file_path)
        # create an NLU interpreter and dialog agent based on trained models
        if self.disable_nlu != "yes":
            if force or self.isNluModelModified():
                self.interpreter = Interpreter.load("{}/default/current".format(self.nlu_model_path), RasaNLUConfig(self.config_file))
                self.nlu_model_modified=self.getNluModelModified()
                self.nlu_modified=self.getNluModified()
        
                print('loaded nlu model')
            
        
        #self.interpreter = RasaNLUInterpreter("models/nlu/default/current")
        if self.disable_core != "yes":
            if force or self.isCoreModelModified():
                self.agent = Agent.load(self.core_model_path, interpreter=SnipsMqttInterpreter())
                self.core_model_modified=self.getCoreModelModified()
                self.core_modified=self.getCoreModified()
                self.core_domain_modified=self.getCoreDomainModified()
                print('loaded core model')
        
        

    # RASA training
    def train_nlu(self,force=False):
        if self.disable_nlu  != "yes" and not   self.isNluTraining :
            #print("TRY NLU TRAIN {} {} {}".format(force,self.isNluModified() , self.isNluModelMissing()))
            if (force or self.isNluModified() or self.isNluModelMissing()):
                self.isNluTraining = True
                print("NLU TRAIN {} {} {}".format(force,self.isNluModified() , self.isNluModelMissing()))
            
                from rasa_nlu.converters import load_data
                from rasa_nlu.config import RasaNLUConfig
                from rasa_nlu.model import Trainer

                training_data = load_data(self.nlu_training_file)
                trainer = Trainer(RasaNLUConfig(self.config_file))
                trainer.train(training_data)
                #model_directory = trainer.persist('models/nlu/', fixed_model_name="current")
                model_directory = trainer.persist(self.nlu_model_path, fixed_model_name="current")
                #self.core_model_modified=self.getCoreModelModified()
                self.isNluTraining = False
                self.nlu_modified=self.getNluModified()
                return model_directory

    def train_core(self,force=False):
        if self.disable_core != "yes" and not self.isCoreTraining :
            #print("TRY CORE TRAIN {} {} {} ".format(force,self.isCoreModified()   , self.isCoreModelMissing()))
            if force or self.isCoreModified()  or self.isCoreModelMissing():
                self.isCoreTraining = True
                print("CORE TRAIN {} {} {} ".format(force,self.isCoreModified()   , self.isCoreModelMissing()))
            
                agent = Agent(self.domain_file,
                              policies=[MemoizationPolicy(), DefaultPolicy()])
                agent.train(
                        self.core_training_file,
                        max_history=3,
                        epochs=100,
                        batch_size=50,
                        augmentation_factor=50,
                        validation_split=0.2
                )
                agent.persist(self.core_model_path)
                self.isCoreTraining = False
                self.core_modified=self.getCoreModified()
                self.core_domain_modified=self.getCoreDomainModified()
                return agent



    # MQTT LISTENING SERVER
    def start(self):
        self.thread_handler.run(target=self.start_blocking)
        self.thread_handler.run(target=self.watchModels)
        self.thread_handler.start_run_loop()

    def start_blocking(self, run_event):
        self.log("Connecting to {} on port {}".format(self.mqtt_hostname, str(self.mqtt_port)))
        retry = 0
        while True and run_event.is_set():
            try:
                self.log("Trying to connect to {} {}".format(self.mqtt_hostname,self.mqtt_port))
                self.client.connect(self.mqtt_hostname, self.mqtt_port, 60)
                break
            except (socket_error, Exception) as e:
                self.log("MQTT error {}".format(e))
                time.sleep(5 + int(retry / 5))
                retry = retry + 1
        # SUBSCRIBE 
        self.client.subscribe('#', 0)
        while run_event.is_set():
            try:
                self.client.loop()
            except AttributeError as e:
                self.log("Error in mqtt run loop {}".format(e))
                time.sleep(1)

    def on_connect(self, client, userdata, flags, result_code):
        self.log("Connected with result code {}".format(result_code))

    def on_disconnect(self, client, userdata, result_code):
        self.log("Disconnected with result code " + str(result_code))
        time.sleep(5)
        self.thread_handler.run(target=self.start_blocking)

    def on_message(self, client, userdata, msg):
        if msg.topic is not None and msg.topic.startswith("hermes/audioServer"):
            pass
        else:
            print("MESSAGE: {}".format(msg.topic))
            if msg.topic is not None and "{}".format(msg.topic).startswith("hermes/nlu") and "{}".format(msg.topic).endswith('/query') and msg.payload and self.disable_nlu != "yes":
                self.handleNluQuery(msg)
            elif msg.topic is not None and "{}".format(msg.topic).startswith("hermes/intent") and msg.payload and  self.disable_core != "yes":
                self.handleCoreQuery(msg)
           
    def handleCoreQuery(self,msg):
            self.log("Core query {}".format(msg.topic))
            payload = json.loads(msg.payload.decode('utf-8'))
            print(payload)
            print('#######################')
            print(payload.get('slots','fail'))
            if 'input' in payload :        
                theId = payload.get('id')
                sessionId = payload.get('sessionId')
                siteId = payload.get('siteId','default')
                entities=[]
                # strip snips user id from entity name
                intentNameParts = payload['intent']['intentName'].split('__')
                intentNameParts = intentNameParts[1:]
                intentName = '__'.join(intentNameParts)
                if 'slots' in payload and payload['slots'] is not None:
                    for entity in payload['slots']:
                        entities.append({ "start": entity['range']['start'],"end": entity['range']['end'],"value": entity['rawValue'],"entity": entity['slotName']})
                output = {
                  "text": payload['input'],
                  "intent": {
                    "name": intentName,
                    "confidence": 1.0
                  },
                  "entities": entities
                }  
                self.log("CORE HANDLER {}".format(json.dumps(output)))
                message = json.dumps(output)
                response = self.agent.handle_message(message,output_channel = CollectingOutputChannel())
                print ("OUT")
                print(response)
                if response is not None and len(response) > 0:
                    self.client.publish('hermes/tts/say',
                    payload = json.dumps({"lang":self.lang,"sessionId": sessionId, "text": response[0], "siteId": siteId,"id":theId}), 
                    qos=0,
                    retain=False)

            
    def handleNluQuery(self,msg):
            self.log("NLU query {}".format(msg.topic))
            payload = json.loads(msg.payload.decode('utf-8'))
            print(payload)
            if 'input' in payload :
                sessionId = payload['sessionId']
                id = payload['id']
                text = payload['input']
                print(text)
                lookup = self.interpreter.parse(text)
   
                slots=[]
                
                for entity in lookup['entities']:
                    slot = {"entity": entity['value'],"range": {"end": entity['end'],"start": entity['start']},"rawValue": entity['value'],"slotName": "entity","value": {"kind": "Custom","value": entity['value']}} 
                    slots.append(slot)
                print(slots)
                intentName = "user_Kr5A7b4OD__{}".format(lookup['intent']['name'])
                self.client.publish('hermes/nlu/intentParsed',
                payload=json.dumps({"id": id,"sessionId": sessionId, "input": text,"intent": {"intentName": intentName,"probability": 1.0},"slots": slots}), 
                qos=0,
                retain=False)
                    
    def log(self, message):
       print (message)
  

server = SnipsRasaServer()
server.start()



#class ActionSearchRestaurants(Action):
    #def name(self):
        #return 'action_search_restaurants'

    #def run(self, dispatcher, tracker, domain):
        #dispatcher.utter_message("here's what I found")
        #return []


#class ActionSuggest(Action):
    #def name(self):
        #return 'action_suggest'

    #def run(self, dispatcher, tracker, domain):
        #dispatcher.utter_message("papi's pizza place")
        #return []







