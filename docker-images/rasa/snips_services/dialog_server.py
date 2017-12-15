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
import pyaudio
import wave
import io

from SnipsMqttServer import SnipsMqttServer
from socket import error as socket_error

import paho.mqtt.client as mqtt

from thread_handler import ThreadHandler
import sys
import warnings
import uuid

class SnipsDialogServer(SnipsMqttServer):
    
    def __init__(self,
                 mqtt_hostname='mosquitto',
                 mqtt_port=1883,
                 ):
        SnipsMqttServer.__init__(self,mqtt_hostname,mqtt_port)
        self.subscribe_to='hermes/hotword/+/detected,hermes/hotword/detected,hermes/asr/textCaptured,hermes/intentParsed/+,hermes/dialogueManager/startSession,hermes/dialogueManager/continueSession,hermes/dialogueManager/endSession'
    
        self.sessions={}
        self.sessionData={}

    def getSessionId(self,siteId):
        if siteId is not None:
            if siteId in self.sessions:
                return self.sessions.get(siteId)
            else:
                sessionId = str(uuid.uuid4())
                print('session id got')
                print(sessionId)
                self.sessions[siteId] = sessionId
                self.sessionData[siteId]=''
                return sessionId
    
    def sendMessage(self,siteId,topic,thePayload):
        thePayload['sessionId'] = self.getSessionId(siteId)
        thePayload['siteId'] = siteId
        self.client.publish(topic,payload = json.dumps(thePayload),qos=0,retain=False)


    def on_message(self, client, userdata, msg):
        msgJSON = json.loads(msg.payload)
        siteId = msgJSON.get('siteId','default')
        if msg.topic.startswith("hermes/hotword"):
            hotwordId = 'default'
            ok = False
            if len(msg.topic.split('/')) > 3 and msg.topic.split('/')[3] == 'detected':
                hotwordId = msg.topic.split('/')[2]
                ok = True
            elif len(msg.topic.split('/')) > 2 and msg.topic.split('/')[2] == 'detected':
                ok = True
            print("HOTWORD DETECTED: {}".format(msg.topic))
            # SEND
            # hermes/hotword/toggleOff
            self.sendMessage(siteId,'hermes/hotword/{}/toggleOff'.format(hotwordId),{})
            # hermes/asr/startListening
            self.sendMessage(siteId,'hermes/asr/startListening',{})
        elif msg.topic.startswith("hermes/asr/textCaptured"):
            # SEND
            # hermes/nlu/query
            text = msgJSON.get('text','default')
            print("TEXT CAPTURED: {}".format(msg.topic))
            self.sendMessage(siteId,'hermes/nlu/query',{'input':text,'intentFilter':[],'id':''})
        elif msg.topic.startswith("hermes/nlu/intentParsed"):
            # SEND
            # hermes/intent/XXX
            intent = msgJSON.get('intent')
            intentName = intent.get('intentName')
            theId = msgJSON.get('id','')
            print("INTENT PARSED: {}".format(msg.topic))
            self.sendMessage(siteId,'hermes/intent/{}'.format(intentName),{'customData':text,'input':text,'intent':intent,'slots':intent.get('slots')})
        elif msg.topic.startswith("hermes/dialogueManager/startSession"):
            print("START SESSION: {}".format(msg.topic))
            # SEND
            # hermes/dialogueManager/sessionStarted
            self.sendMessage(siteId,'hermes/dialogueManager/sessionStarted',{'sessionData':self.sessionData[siteId]})
        #elif msg.topic.startswith("hermes/dialogueManager/continueSession"):
            #print("CONTINUE SESSION: {}".format(msg.topic))
            ## SEND
            ## hermes/asr/startListening
            #self.sendMessage(siteId,'hermes/nlu/query',{'input':text,'intentFilter':[],'id':'')
        elif msg.topic.startswith("hermes/dialogueManager/endSession"):
            print("END SESSION: {}".format(msg.topic))
            # SEND
            # hermes/dialogueManager/sessionEnded
            self.sendMessage(siteId,'hermes/dialogueManager/sessionEnded',{'sessionData':self.sessionData[siteId]})
        else:
            print("UNKNOWN MESSAGE: {}".format(msg.topic))
            
       
server = SnipsDialogServer()
server.start()







