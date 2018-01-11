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
import shutil

from socket import error as socket_error

from SnipsMqttServer import SnipsMqttServer

import paho.mqtt.client as mqtt

from thread_handler import ThreadHandler
import sys,warnings

from rasa_nlu.training_data import TrainingData

from rasa_nlu.converters import validate_rasa_nlu_data,get_entity_synonyms_dict
from rasa_nlu.converters import load_data
from rasa_nlu.config import RasaNLUConfig
from rasa_nlu.model import Trainer
import tempfile

##

import argparse
import logging
import os
import re

import typing
from typing import Text
from typing import Tuple
from typing import Optional

from rasa_nlu.components import ComponentBuilder
from rasa_nlu.converters import load_data
from rasa_nlu.model import Interpreter
from rasa_nlu.model import Trainer

from rasa_nlu.config import RasaNLUConfig
from rasa_nlu.utils.md_to_json import MarkdownToJson
from rasa_nlu.utils.md_to_json import comment_regex,synonym_regex,intent_regex,INTENT_PARSING_STATE,SYNONYM_PARSING_STATE

from rasa_core import utils
from rasa_core.actions import Action
from rasa_core.agent import Agent
from rasa_core.channels.console import ConsoleInputChannel
from rasa_core.interpreter import RasaNLUInterpreter
from rasa_core.policies.keras_policy import KerasPolicy
from rasa_core.policies.memoization import MemoizationPolicy
from rasa_core.channels.direct import CollectingOutputChannel

logger = logging.getLogger(__name__)
##



SAMPLE_NLU = """
## intent:play_next
- play next track
- play next
- play the next track
- skip this track
- play the next one
- play on
- play the next song
- play the next one
## intent:agree
- yes
- i agree
- for sure
- make it happen
- absolutely
- sure
- ok
- you bet


## intent:disagree
- no
- never
- no way
- nope
- eek
- i disagree
- not what I want
- that is not what i want
- please don't
"""



SAMPLE_STORIES = """
## clear_the_playlist
* clear_the_playlist
    - ask_confirm_clear_playlist
* agree
    - say_clearing_the_playlist

## create_a_playlist
* create_a_playlist
- utter_add_to_playlist_ask_name
* create_a_playlist[playlist=juggling]
- utter_ok_creating_a_playlist

## create_a_playlist_directly
* create_a_playlist[playlist=juggling]
- utter_ok_creating_a_playlist

"""




class SnipsMarkdownToJson(MarkdownToJson):

    def __init__(self, markdown):
        self.markdown = markdown
        # set when parsing examples from a given intent
        self.current_intent = None
        self.common_examples = []
        self.entity_synonyms = []
        self.interpret(markdown)

    def interpret(self,markdown):
        """Parse the content of the actual .md file."""
        from rasa_nlu.utils.md_to_json import strip_comments

        f_com_rmved = strip_comments(comment_regex,self.markdown)# Strip comments
        for row in f_com_rmved:
            # Remove white-space which may have crept in due to comments
            row = row.strip() 
            intent_match = re.search(intent_regex, row)
            if intent_match is not None:
                self._set_current_state(
                        INTENT_PARSING_STATE, intent_match.group(1))
                continue

            synonym_match = re.search(synonym_regex, row)
            if synonym_match is not None:
                self._set_current_state(
                        SYNONYM_PARSING_STATE, synonym_match.group(1))
                continue
            print("PARSE NLU ROW {}".format(row))
            self._parse_intent_or_synonym_example(row)
        return {
            "rasa_nlu_data": {
                "common_examples": self.common_examples,
                "entity_synonyms": self.entity_synonyms
            }
        }


class SnipsTrainingServer(SnipsMqttServer):
    
    def __init__(self,
                 mqtt_hostname='mosquitto',
                 mqtt_port=1883,
                 ):
        SnipsMqttServer.__init__(self,mqtt_hostname,mqtt_port)
        self.subscribe_to='hermes/training/start'
        self.thread_targets.append(self.do_training)
        self.queue=[]
        

    def on_connect(self, client, userdata, flags, result_code):
        SnipsMqttServer.on_connect(self,client,userdata,flags,result_code)
        # test to start
        #self.client.publish('hermes/training/start', payload="{\"id\":\"someid\",\"type\":\"rasacore\",\"sessionId\":null}", qos=0)
            
    def send_training_complete(self,theId,modelPath):
        import shutil
        tmpdir = tempfile.mkdtemp()
        try:
            tmparchive = os.path.join(tmpdir, 'archive')
            zipContent = open(shutil.make_archive(tmparchive, 'zip', modelPath), 'rb').read()
        finally:
            shutil.rmtree(tmpdir)
       
        topic = 'hermes/training/complete/{}'.format(theId)
        self.client.publish(topic, payload=zipContent,qos=0)
        #shutil.rmtree(modelPath)
        

    def on_message(self, client, userdata, msg):
        print("MESSAGEtts: {}".format(msg.topic))
            
        if msg.topic is not None and msg.topic=="hermes/training/start":
            self.queue.append(msg)
            print("MESSAGE queued: {} of {} messages".format(msg.topic,len(self.queue)))
            
    def do_training(self,run_event):
        while True and run_event.is_set():
            #print('do training')
            if len(self.queue) > 0:
                msg = self.queue.pop(0)
                payload = json.loads(msg.payload)
                theId  = payload.get('id')
                print('HANDLE TRAINING REQUEST {}'.format(theId))
                if theId is not None:
                    # .decode('utf-8')
                    trainingType = payload.get('type')
                    # DO THE TRAINING
                    if trainingType == "rasanlu":
                        # set variables from msg payload or defaults
                        trainingConfig = payload.get('config')
                        #if trainingConfig is None:
                            #with open('rasa_config/config.json', 'r') as content_file:
                                #trainingConfig = content_file.read()
                        trainingConfig = json.loads(trainingConfig)
                        
                        slotConfig = payload.get('config_slots')
                        #if slotConfig is None:
                            #with open('rasa_config/config-slots.json', 'r') as content_file:
                                #slotConfig = content_file.read()
                        slotConfig = json.loads(slotConfig)
                        project=payload.get('project','nlu')
                        model=payload.get('model','default')
                        training_data = payload.get('examples','')
                        
                        tmpdir = tempfile.mkdtemp()
            
                        # train intents and slots
                        rasaConfig = RasaNLUConfig()
                        rasaConfig.override(trainingConfig)
                        trainer = Trainer(rasaConfig)
                        data = SnipsMarkdownToJson(training_data)
                        trainer.train(TrainingData(data.common_examples,get_entity_synonyms_dict(data.entity_synonyms)))
                        model_directory = trainer.persist(tmpdir, project_name=project, fixed_model_name=model)
                         
                        # train slots only for partial query
                        rasaConfig.override(slotConfig)
                        trainer = Trainer(rasaConfig)
                        data = SnipsMarkdownToJson(training_data)
                        trainer.train(TrainingData(data.common_examples,get_entity_synonyms_dict(data.entity_synonyms)))
                        model_directory = trainer.persist(tmpdir, project_name=project, fixed_model_name="{}_slots".format(model))
                        # send mqtt training/complete
                        self.send_training_complete(theId,"{}/{}".format(tmpdir,project))
                        #shutil.rmtree(tmpdir)
                        
                    elif trainingType == "rasacore":
                        print("training rasa core")
                        training_data = payload.get('stories') #,SAMPLE_STORIES)
                        trainingFile = tempfile.NamedTemporaryFile(delete = False,suffix='.md')
                        trainingFile.write(training_data)
                        trainingFile.close()
                        #print((training_data))
                        domain_data = payload.get('domain')
                        #if domain_data is None:
                            #with open('rasa_config/domain.yml', 'r') as content_file:
                                #domain_data = content_file.read()
                        
                        #print(domain_data)
                        
                        domainFile = tempfile.NamedTemporaryFile(delete = False,suffix='.yml')
                        domainFile.write(domain_data)
                        domainFile.close()

                        agent = Agent(domainFile.name,policies=[MemoizationPolicy(), KerasPolicy()])
                        agent.train(
                                trainingFile.name,
                                max_history=3,
                                epochs=30, #was 100
                                batch_size=50,
                                augmentation_factor=50,
                                validation_split=0.2
                        )
                        print("traing rasa core done train")
                        # cleanup
                        domainFile.close()
                        os.unlink(domainFile.name)
                        os.unlink(trainingFile.name)
                        # persist
                        modelPath = tempfile.mkdtemp()
                        agent.persist(modelPath)
                        self.send_training_complete(theId,modelPath)
                        print("traing rasa core sent")
                        
                    elif trainingType == "kaldi":
                        pass
                    elif trainingType == "piwho":
                        pass
                    elif trainingType == "snowboy":
                        pass
                    # I WISH
                    #elif trainingType == "snips":
                        #pass
                else:
                    print("Required ID missing in training request")
            time.sleep(5)
        
        
server = SnipsTrainingServer()
server.start()







