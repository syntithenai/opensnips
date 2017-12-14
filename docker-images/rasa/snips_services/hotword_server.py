#!/opt/rasa/anaconda/bin/python
# -*-: coding utf-8 -*-
""" Snips hotword server. """

import json
import time
import os
import syslog
import sys
import wave
import struct
import StringIO

from socket import error as socket_error

import paho.mqtt.client as mqtt

from SnipsMqttServer import SnipsMqttServer
sys.path.append('')

import snowboydecoder

# TODO
# volume mute after hotword id.   -> amixer set 'Master' 10%
    
#class to store audio after the hotword is spoken
class AudioBuffer(object):
    def __init__(self, size = 4096):
        self._buf = collections.deque(maxlen=size)

    def extend(self, data):
        self._buf.extend(data)

    def get(self):
        tmp = bytes(bytearray(self._buf))
        self._buf.clear()
        return tmp

class SnipsHotwordServer(SnipsMqttServer):

    def __init__(self,
                 mqtt_hostname=os.environ.get('mqtt_hostname','mosquitto'),
                 mqtt_port=os.environ.get('mqtt_port',1883),
                 hotword_model=os.environ.get('hotword_model','resources/snowboy.umdl'),
                 hotword=os.environ.get('hotword','snowboy'),
                 site=os.environ.get('site','default'),
                 listen_to=os.environ.get('listen_to','default')
                 ):
        SnipsMqttServer.__init__(self,mqtt_hostname,mqtt_port)
        self.subscribe_to='hermes/audioServer/+/audioFrame,hermes/hotword/+/toggleOff,hermes/hotword/+/toggleOn'
                        
        self.activeClientList = []
        self.allowedClientList = listen_to.split(',')
        self.messageCount = 0;
        self.detection = snowboydecoder.HotwordDetector(hotword_model, sensitivity=0.5)

        self.hotword = hotword
        self.hotword_model = hotword_model
        self.site = site
        self.listen_to = listen_to

        self.client_buffer = {}
        self.client_recognition = {}
        self.client_talking = {}
        self.record = {}
        for client in self.allowedClientList:
            self.client_buffer[client] = AudioBuffer(self.detection.detector.NumChannels() * self.detection.detector.SampleRate() * 20)
            self.client_recognition[client] =  AudioBuffer(self.detection.detector.NumChannels() * self.detection.detector.SampleRate() * 2)
            self.client_talking[client] = False
            self.record[client] = False


        
    def on_connect(self, client, userdata, flags, result_code):
        SnipsMqttServer.on_connect(self,client,userdata,flags,result_code)
        # enable to start
        self.client.publish('hermes/hotword/{}/toggleOn'.format(self.hotword), payload="{\"siteId\":\"" + self.site + "\",\"sessionId\":null}", qos=0)
            
   
    def on_message(self, client, userdata, msg):
        if msg.topic.endswith('toggleOff'):
            self.log('toggle off')
            msgJSON = json.loads(msg.payload)
            siteId = msgJSON.get('siteId','default')
            if siteId in self.activeClientList:
                self.activeClientList.remove(siteId)
        elif msg.topic.endswith('toggleOn'):
            self.log('toggle on')
            msgJSON = json.loads(msg.payload)
            siteId = msgJSON.get('siteId','default')
            if siteId not in self.activeClientList:
                self.activeClientList.append(siteId)
            self.messageCount = 0;
        else:
            self.messageCount = self.messageCount + 1;
            
            siteId = msg.topic.split('/')[2]
            if siteId in self.activeClientList:
                #if self.messageCount % 20 == 0 :
                    #self.log('audiofrom {} {}'.format(siteId[2],len(msg.payload)))
                data = msg.payload[44:struct.unpack('<L', msg.payload[4:8])[0]]
                self.client_recognition[siteId].extend(data)
                ans = self.detection.detector.RunDetection(data)
                if ans == 1:
                    print('Hotword Detected!')
                    self.record[siteId] = True
                    #inform that the hotword has been detected
                    self.client.publish('hermes/hotword/{}/detected'.format(self.hotword), payload="{\"siteId\":\"" + siteId + "\",\"sessionId\":null}", qos=0)

                    waveFile = wave.open( siteId + '_id.wav', 'wb')
                    waveFile.setnchannels(1)
                    waveFile.setsampwidth(2)
                    waveFile.setframerate(16000)
                    waveFile.writeframes(self.client_recognition[siteId].get()) 
                    waveFile.close()
                    speaker = self.recog.identify_speaker(siteId + '_id.wav')[0]

                    action = "{\"type\":\"action\",\"text\":null,\"canBeEnqueued\":false,\"intentFilter\":null}"
                    jsonString = "{\"siteId\":\"" + siteId + "\",\"init\":" + action + ",\"customData\":\"" + speaker + "\"}"

                    self.client.publish('hermes/dialogueManager/startSession', payload=jsonString, qos=0)

                    self.client_buffer[siteId].extend(data)
                    self.clientList.append(siteId)
                    
            elif self.record[siteId] == True:
                #i want to capture what is said after the hotword as a wave
                data = msg.payload[44:struct.unpack('<L', msg.payload[4:8])[0]]
                self.client_buffer[siteId].extend(data)
                ans = self.detection.detector.RunDetection(data)
                if ans == 0:
                    #adding the data here misses the first 0.1 sec of the speaking audio and it sounds off
                    #saying "what is the...." the audio is "ot is the..".. the first word lacks the whole sound
                    #client_buffer[siteId].extend(data)
                    self.client_talking[siteId] = True
                elif ans == -2 and client_talking[siteId] == True:
                    self.client_talking[siteId] = False
                    self.record[siteId] = False
                    data = self.client_buffer[siteId].get()
                    #save wave file
                    waveFile = wave.open( siteId + '.wav', 'wb')
                    waveFile.setnchannels(1)
                    waveFile.setsampwidth(2)
                    waveFile.setframerate(16000)
                    waveFile.writeframes(data) 
                    waveFile.close()





        
    def log(self, message):
        print(message)

server = SnipsHotwordServer()
server.start()
