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
        self.subscribe_to='hermes/hotword/+/detected,hermes/hotword/detected,hermes/asr/textCaptured,hermes/nlu/intentParsed,hermes/dialogueManager/startSession,hermes/dialogueManager/continueSession,hermes/dialogueManager/endSession'
        self.sessions={} # sessions keyed by siteId
        self.sessionIds={} # sites keyed by sessionId
        self.sessionData={} # extra data by sessionId
        self.sessionExpiry={} # session expiry time by sessionId
        self.thread_targets.append(self.monitorSessionTimeouts)
        self.expiryTimeout = 10
        
    def closeSession(self,sessionId,reason='nominal'):
        siteId = str(self.getSiteId(sessionId))
        sessionId = str(sessionId)
        data = self.getSessionData(sessionId)
        
        #print('clse session {} {}'.format(siteId,sessionId,data))
        #print(sessionId)
        #print(self.sessions)
        ##print(self.sessionIds)
        #print(self.sessionExpiry)
        #print('##########################')
        if sessionId is not None and sessionId in self.sessionIds:
            #print('really close session')
            self.sendMessage(siteId,sessionId,'hermes/dialogueManager/sessionEnded',{'sessionData':data,'termination':{'reason':reason,'error':''}})
            self.sendMessage(siteId,None,'hermes/asr/stopListening',{})
            self.sendMessage(siteId,None,'hermes/hotword/toggleOn',{})
            self.sessions.pop(siteId)
            self.sessionData.pop(sessionId)
            self.sessionExpiry.pop(sessionId)
            self.sessionIds.pop(sessionId)
                
                
    def monitorSessionTimeouts(self,run_event):
        while (run_event.is_set()):
            #print("check expiries ")
            #print(self.sessionExpiry)
            time.sleep(3)
            #print("NOW")
            try:
                now = time.time()
                #print("check time {}".format(now))
                if len(self.sessionExpiry) > 0:
                    for sessionId in self.sessionExpiry:
                        #print("check expiry {}".format(self.sessionExpiry[sessionId]))
                        
                        if (now > self.sessionExpiry[sessionId]):
                            #print("check EXPIRED")
                            self.closeSession(sessionId,'timeout')
                            
                     
            except (socket_error, Exception) as e:
                print("ERRR MONITor")
                print(e)
                
                
    def setSessionId(self,siteId,sessionId):
        self.sessions[siteId] = sessionId
        self.sessionIds[sessionId] = siteId
        
    def setSessionData(self,sessionId,data):
        self.sessionData[sessionId] = data

    def getSessionData(self,sessionId):
        if sessionId in self.sessionData:
            return self.sessionData[sessionId]
        else:
            return None
    
    def setSessionExpiry(self,sessionId,data):
        #print('set expiry {}'.format(data))
        self.sessionExpiry[sessionId] = data

    def getSessionExpiry(self,sessionId):
        if sessionId in self.sessionExpiry:
            return self.sessionExpiry[sessionId]
        else: 
            return None
    
    def getSiteId(self,sessionId):
        if sessionId in self.sessionIds:
            return self.sessionIds[sessionId]
        else:
            return None
        
    def getSessionId(self,siteId):
        if siteId in self.sessions:
            return self.sessions[siteId]
        else:
            sessionId = str(uuid.uuid4())
            siteId = str(siteId)
            #print('session id got')
            #print(sessionId)
            self.sessions[siteId] = sessionId
            self.sessionIds[sessionId] = siteId
            self.sessionData[sessionId]=''
            self.sessionExpiry[sessionId]=float(time.time()) + float(self.expiryTimeout)
            return sessionId
        
    def haveSession(self,sessionId):
        if (sessionId is not None and sessionId in self.sessionIds):
            return True
        else:
            return False
    
    def sendMessage(self,siteId,sessionId,topic,thePayload):
        thePayload['sessionId'] = sessionId
        thePayload['siteId'] = siteId
        self.client.publish(topic,payload = json.dumps(thePayload),qos=0,retain=False)

    def on_message(self, client, userdata, msg):
        msgJSON = json.loads(msg.payload)
        sessionId = msgJSON.get('sessionId')
        haveSession = self.haveSession(sessionId)
        if sessionId == None or len(sessionId) == 0 :
            sessionId = str(self.getSessionId(msgJSON.get('siteId')))
        sessionId = str(sessionId)
        siteId = msgJSON.get('siteId',self.getSiteId(sessionId))
        print("MESSAGE DIALOG {} {}".format(siteId,sessionId))
        if True or len(sessionId) > 0:
            #if msg.topic != "hermes/dialogueManager/sessionEnded":
            print("MESSAGE EXEC {} {} {}".format(msg.topic,siteId,sessionId))
            if msg.topic.startswith("hermes/hotword"):
                hotwordId = 'default'
                ok = False
                if len(msg.topic.split('/')) > 3 and msg.topic.split('/')[3] == 'detected':
                    hotwordId = msg.topic.split('/')[2]
                    ok = True
                elif len(msg.topic.split('/')) > 2 and msg.topic.split('/')[2] == 'detected':
                    ok = True
                print("HOTWORD DETECTED: {}".format(msg.topic))
                
                # SEND but silently drop if we already have an active session
                if not haveSession:
                    self.sendMessage(siteId,sessionId,'hermes/asr/stopListening',{})
                    self.sendMessage(siteId,sessionId,'hermes/hotword/{}/toggleOff'.format(hotwordId),{})
                    # start session by hotword
                    self.sendMessage(siteId,sessionId,'hermes/dialogueManager/sessionStarted',{"customData":None,"reactivatedFromSessionId": None})
                    self.sendMessage(siteId,sessionId,'hermes/asr/startListening',{})
                    self.setSessionExpiry(sessionId, float(time.time()) + float(self.expiryTimeout))
                    
            elif msg.topic.startswith("hermes/asr/textCaptured"):
                # SEND
                # hermes/nlu/query
                text = msgJSON.get('text','default')
                print("TEXT CAPTURED: {}".format(msg.topic))
                self.sendMessage(siteId,sessionId,'hermes/asr/stopListening',{})
                self.sendMessage(siteId,sessionId,'hermes/nlu/query',{'input':text,'intentFilter':None,'id':str(uuid.uuid4())})
            elif msg.topic.startswith("hermes/nlu/intentParsed"):
                # SEND
                # hermes/intent/XXX
                intent = msgJSON.get('intent')
                intentName = intent.get('intentName')
                text = msgJSON.get('input')
                theId = msgJSON.get('id','')
                print("INTENT PARSED: {}".format(msg.topic))
                self.sendMessage(siteId,sessionId,'hermes/intent/{}'.format(intentName),{'customData':self.getSessionData(sessionId),'input':text,'intent':intent,'slots':intent.get('slots')})
            elif msg.topic.startswith("hermes/dialogueManager/startSession"):
                if not haveSession:
                    print("START SESSION: {}".format(msg.topic))
                    # SEND
                    # hermes/dialogueManager/sessionStarted
                    self.setSessionData(sessionId,msgJSON.get('customData'))
                    self.sendMessage(siteId,sessionId,'hermes/dialogueManager/sessionStarted',{'sessionData':self.getSessionData(sessionId)})
                    self.setSessionExpiry(sessionId,float(time.time()) + float(self.expiryTimeout))
            #elif msg.topic.startswith("hermes/dialogueManager/continueSession"):
                #print("CONTINUE SESSION: {}".format(msg.topic))
                ## SEND
                ## hermes/asr/startListening
                #self.sendMessage(siteId,sessionId,'hermes/nlu/query',{'input':text,'intentFilter':[],'id':'')
            elif msg.topic.startswith("hermes/dialogueManager/endSession"):
                print("END SESSION: {}".format(msg.topic))
                # SEND
                # hermes/dialogueManager/sessionEnded
                self.closeSession(sessionId)
            else:
                print("UNKNOWN MESSAGE: {}".format(msg.topic))
        else:
            print('missing sessionId')
                
       
server = SnipsDialogServer()
server.start()







