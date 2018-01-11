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
import io
import uuid
import tempfile
import shutil

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
                 training_mqtt_hostname=None,
                 training_mqtt_port=None,
                 nlu_model_path=os.environ.get('rasa_nlu_model_path','models/nlu'),
                 nlu_models=os.environ.get('rasa_nlu_models','default'),
                 nlu_training_path=os.environ.get('rasa_nlu_training_path','training_data/nlu/'),
                 config_file=os.environ.get('rasa_nlu_default_config_file','training_data/nlu/config.json'),
                 config_file_slots=os.environ.get('rasa_nlu_default_config_file_slots','training_data/nlu/config-slots.json'),
                 lang=os.environ.get('rasa_nlu_lang','en-GB'),
                 snips_user_id=os.environ.get('rasa_nlu_snips_user_id','user_Kr5A7b4OD'),
                 ):
                     
        """ Initialisation.
        :param config: a YAML configuration.
        :param assistant: the client assistant class, holding the
                          intent handler and intents registry.
        """
        SnipsMqttServer.__init__(self,mqtt_hostname,mqtt_port,training_mqtt_hostname,training_mqtt_port)
        # RASA config
        self.trainingIds = {}
        self.training_request_models={}
        self.interpreter = {}
        self.interpreter_slots = {}
        self.nlu_model_path = nlu_model_path
        self.nlu_training_path = nlu_training_path
        self.default_config_file = config_file
        self.default_config_file_slots = config_file_slots
        # for matching snips intents
        self.snips_user_id=snips_user_id
        
        self.models = nlu_models.split(",")
        
        self.thread_handler = ThreadHandler()
        self.thread_targets.append(self.startTrainingMqtt)
        self.training_client.on_message = self.on_training_message
        
        self.thread_targets.append(self.watchModels)
        
        self.lang = lang
        self.subscribe_to='hermes/nlu/query,hermes/nlu/partialQuery'
        self.nlu_modified={}
        self.nlu_model_modified={}
        
        self.loadModels(True)
        self.nlu_modified=self.getNluModifiedAll()
        self.nlu_model_modified=self.getNluModelModifiedAll()
        
    def getNluModified(self,model):
        if os.path.isfile("{}/{}/examples.md".format(self.nlu_training_path ,model)):
            return os.path.getmtime("{}/{}/examples.md".format(self.nlu_training_path ,model))
            
    def getNluModifiedAll(self):
        modelDates = {}
        for model in self.models:
            modelDates[model] = self.getNluModified(model)
        return modelDates    
            
    def getNluModelModified(self,model):
        if os.path.isfile("{}/{}/metadata.json".format(self.nlu_model_path ,model)):
            return os.path.getmtime("{}/{}/metadata.json".format(self.nlu_model_path ,model))
            
    def getNluModelModifiedAll(self):
        modelDates = {}
        for model in self.models:
            modelDates[model] = self.getNluModelModified(model)
        return modelDates    
    
    def isNluModified(self,model):
        if model in self.nlu_modified and (self.getNluModified(model) != self.nlu_modified[model]  or self.getNluModified(model) > self.getNluModelModified(model)):
            return True
        else:
            return False
            
    def isNluModelModified(self,model):
        if self.getNluModelModified(model) is None:
            return True
        elif model in self.nlu_model_modified and self.getNluModelModified(model) != self.nlu_model_modified[model]:
            return True
        elif self.getNluModified(model) > self.getNluModelModified(model):
            return True
        else:
            return False
            
    #def collectNluModified(self):
        #modified = []
        #for model in self.models:
            #if model in self.nlu_modified and (self.getNluModified(model) != self.nlu_modified[model]  or self.getNluModified(model) > self.getNluModelModified(model)):
                #modified.append(model)
        #return modified    
    
    #def collectNluModelModified(self):
        #modified = []
        #for model in self.models:
            #if model in self.nlu_model_modified and (self.getNluModelModified(model) != self.nlu_model_modified[model]  or self.getNluModelModified(model) > self.getNluModelModified(model)):
                #modified.append(model)
        #return modified    
    
    def isNluModelMissing(self,model):
        if self.getNluModelModified(model) is None:
            return True
        else:
            return False

    def hasTrainingMaterials(self,model):
        if self.getNluModified(model) is None:
            return False
        else:
            return True

    def watchModels(self,run_event):
        while True and run_event.is_set():
            for model in self.models:
                if self.isNluModelMissing(model) or self.isNluModified(model):
                    print("{} NLU training MODIFIED".format(model))
                    self.sendTrainingRequest(model)
            time.sleep(5)

    def sendTrainingRequest(self,model):
        if self.hasTrainingMaterials(model):
            #print('sent training request have materials for {}'.format(model))
            if (self.trainingIds.get(model) is None):
                with io.open(self.default_config_file) as theFile:
                    config = theFile.read()
                with io.open(self.default_config_file_slots) as theFile:
                    configSlots = theFile.read()
                with io.open("{}/{}/examples.md".format(self.nlu_training_path,model)) as theFile:
                    examples = theFile.read()
                newId = str(uuid.uuid4())
                print(newId)
                self.trainingIds[model] = newId
                self.training_request_models[newId]=model
                self.training_client.subscribe("hermes/training/complete/{}".format(newId))
                self.training_client.publish('hermes/training/start', payload=json.dumps({"id":newId, "type": "rasanlu","config": config,"config_slots":configSlots,"examples":examples,"model":model}), qos=0)
                print('sent training request')
            else:
                print('training ongoing')
        else:
            print('no training materials')
                

    def loadModels(self,force = False):
        config = RasaNLUConfig(self.default_config_file)
        slotConfig = RasaNLUConfig(self.default_config_file_slots)
        #print("start load modesls")
        # use the files as templates and override config on top for each model
        for model in self.models:
            
                        
            config.override({"project" : "nlu","fixed_model_name" : model})
            slotConfig.override({"project" : "nlu","fixed_model_name" : "{}_slots".format(model)})
                        
            if not self.isNluModelMissing(model):
                #print("model not missing")
                #if (self.hasTrainingMaterials(model)):
                    #self.sendTrainingRequest(model)
                #else:
                    #print('missing model and training data')
            #else:
                ## load trained model
                # allow that training id is None for load existing model
                if (self.isNluModelModified(model) or force):
                    print("loading nlu model {}".format(model))
                    self.nlu_model_modified[model]=self.getNluModelModified(model)
                    self.nlu_modified[model]=self.getNluModified(model)
                    self.interpreter[model] = Interpreter.load("{}/{}/".format(self.nlu_model_path,model), config)
                    self.interpreter_slots[model] = Interpreter.load("{}/{}_slots/".format(self.nlu_model_path,model), slotConfig)
                    
                    print('loaded nlu model {}'.format(model))
                if model in self.trainingIds and self.trainingIds[model] is not None:
                    self.training_client.unsubscribe("hermes/training/complete/{}".format(self.trainingIds[model]))
                    self.training_request_models[self.trainingIds[model]]=None
                    self.trainingIds[model] = None
                    
                
    def on_training_message(self,client,userdate,msg):
        return self.on_message(client,userdate,msg)


    def on_message(self, client, userdata, msg):
        if msg.topic is not None and msg.topic.startswith("hermes/audioServer"):
            pass
        else:
            print("MESSAGE: {}".format(msg.topic))
            if msg.topic is not None and "{}".format(msg.topic).startswith("hermes/nlu/query") and msg.payload :
                self.handleNluQuery(msg)
            elif msg.topic is not None and "{}".format(msg.topic).startswith("hermes/nlu/partialQuery")and msg.payload :
                self.handleNluSlotsQuery(msg)
            elif msg.topic is not None and "{}".format(msg.topic).startswith("hermes/training/complete")  and msg.payload:
                print ("DO TRAINING COMPLETE")
                ### TODO find model from cache
                parts = msg.topic.split('/')
                if len(parts) > 3 and parts[-1] in self.training_request_models:
                    # lookup model in cache from trainingId
                    model = self.training_request_models[parts[-1]]
                    if model in self.trainingIds and self.trainingIds[model] is not None and msg.topic is not None and "{}".format(msg.topic).startswith("hermes/training/complete"):
                        
                        if model in self.trainingIds and parts[-1] == self.trainingIds[model]:
                            #payload = json.loads(msg.payload.decode('utf-8'))
                            zipFile = tempfile.NamedTemporaryFile(delete = False,suffix='.zip')
                            zipFile.write(msg.payload)
                            zipFile.close()
                            import zipfile
                            zip_ref = zipfile.ZipFile(zipFile.name, 'r')
                            try:
                                #print('start unzip rm {}'.format(model))
                                shutil.rmtree("{}/{}".format(self.nlu_model_path,model))
                                #print('start unzip rm {}_slots'.format(model))
                                shutil.rmtree("{}/{}_slots".format(self.nlu_model_path,model))
                                #print('start unzip rm done')
                            except:
                                pass
                            try:
                                os.mkdir(model)
                            except:
                                pass
                            #self.training_request_model = None
                            zip_ref.extractall(self.nlu_model_path)
                            zip_ref.close()
                            os.unlink(zipFile.name)
                            print("UNZIPPED NOW LOAD")
                            self.loadModels()
                        else:
                            print('Training ID incorrect')
                            
                
    def checkConfidence(self,cutoff,confidence):
        if float(cutoff) > 0 and float(cutoff) > float(confidence):
            return False
        else:
            return True
    
    def intentName(self,intent):
        if len(self.snips_user_id) > 0:
            return "{}__{}".format(self.snips_user_id,intent)
        else:
            return intent
            
    def intentNotRecognized(self,id,text,sessionId):
        self.client.publish('hermes/nlu/intentNotRecognized',
            payload=json.dumps({"id": id,"sessionId": sessionId, "input": text}), 
            qos=0,
            retain=False)
        
            
    def handleNluQuery(self,msg):
            self.log("NLU query {}".format(msg.topic))
            payload = json.loads(msg.payload.decode('utf-8'))
            
            print(payload)
            if 'input' in payload :
                sessionId = payload.get('sessionId','')
                id = payload.get('id')
                text = payload.get('input')
                intentFilter=[]
                if 'intentFilter' in payload and payload['intentFilter'] is not None:
                 intentFilter = str(payload['intentFilter']).split(',')
                intentFilter = filter(None, intentFilter)
                print(text)
                print(intentFilter)
                model = payload.get('model','default')
                # require welcome intent
                sensitivity = payload.get('sensitivity','0.02')
                print("SENSITIVITY {}".format(sensitivity))
                print(self.interpreter)
                lookup = self.interpreter[model].parse(text)
                print(lookup)
                
                intentName = ""
                confidence = 0
                if len(intentFilter) > 0 :
                    print("###############")
                    print("intent filter {}".format(intentFilter))
                    # is preferred intent allowed ?
                    if lookup['intent']['name'] in intentFilter:
                        if self.checkConfidence(sensitivity,lookup['intent']['confidence']) :
                            intentName = self.intentName(lookup['intent']['name'])
                            confidence = lookup['intent']['confidence']
                            print("use preferred intent {} {}".format(intentName,confidence))
                        else:
                            return self.intentNotRecognized(id,text,sessionId)
                    # otherwise try the alternatives
                    else:
                        if 'intent_ranking' in lookup:
                            print("try alternatives")
                            for alternative in lookup['intent_ranking']:
                                print("alt {} {}".format(alternative['name'],alternative['confidence']))
                                if alternative['name'] in intentFilter:
                                    if self.checkConfidence(sensitivity,alternative['confidence']):
                                        print('USE THIS')
                                        intentName = self.intentName(alternative['name'])
                                        confidence = alternative['confidence']
                                        break
                                    else:
                                        return self.intentNotRecognized(id,text,sessionId)
                else:
                    print ('NO FILTER')
                    if self.checkConfidence(sensitivity,lookup['intent']['confidence']) :
                        intentName = self.intentName(lookup['intent']['name'])
                        confidence = lookup['intent']['confidence']
                    else:
                        return self.intentNotRecognized(id,text,sessionId)
                
                
                
                slots=[]
                
                for entity in lookup['entities']:
                    slot = {"entity": entity['value'],"range": {"end": entity['end'],"start": entity['start']},"rawValue": entity['value'],"slotName": "entity","value": {"kind": "Custom","value": entity['value']}} 
                    slots.append(slot)
                print('####################')
                print(intentName)
                print(slots)
                print('####################')
                self.client.publish('hermes/nlu/intentParsed',
                payload=json.dumps({"id": id,"sessionId": sessionId, "input": text,"intent": {"intentName": intentName,"probability": confidence},"slots": slots}), 
                qos=0,
                retain=False)

    def handleNluSlotsQuery(self,msg):
            self.log("NLU SLOTS query {}".format(msg.topic))
            payload = json.loads(msg.payload.decode('utf-8'))
            print(payload)
            model = payload.get('model','default')
            if 'input' in payload and not self.isNluModelMissing(model):
                sessionId = payload.get('sessionId','')
                id = payload.get('id','')
                text = payload.get('input','')
                intentName = payload.get('intentName','')
                intentName = payload.get('slot','')
                print(text)
                lookup = self.interpreter_slots[model].parse(text)
   
                slots=[]
                
                for entity in lookup['entities']:
                    slot = {"entity": entity['value'],"range": {"end": entity['end'],"start": entity['start']},"rawValue": entity['value'],"slotName": "entity","value": {"kind": "Custom","value": entity['value']}} 
                    slots.append(slot)
                print(slots)
                intentName = "{}__{}".format(self.snips_user_id,lookup['intent']['name'])
                self.client.publish('hermes/nlu/slotParsed',
                payload=json.dumps({"id": id,"sessionId": sessionId, "input": text,"slots": slots}), 
                qos=0,
                retain=False)
            else :
                print('Cannot handle message for missing model {}'.format(model))
                                    
    def log(self, message):
       print (message)
  

server = SnipsRasaNluServer()
server.start()


