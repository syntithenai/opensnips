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

sys.path.append('')

from socket import error as socket_error
from KaldiClient import KaldiClient
from SnipsMqttServer import SnipsMqttServer

import paho.mqtt.client as mqtt

import urllib


# TODO
# volume mute after hotword id.   -> amixer set 'Master' 10%
    
class SnipsKaldiServer(SnipsMqttServer):

    def __init__(self,
                 mqtt_hostname=os.environ.get('mqtt_hostname','mosquitto'),
                 mqtt_port=os.environ.get('mqtt_port',1883),
                 kaldi_url=os.environ.get('kaldi_url','ws://kaldi:80/client/ws/speech'),
                 ):
        SnipsMqttServer.__init__(self,mqtt_hostname,mqtt_port)
        self.subscribe_to='hermes/asr/startListening,hermes/asr/stopListening'
        #hermes/audioServer/{}/audioFrame
        content_type = "audio/x-raw, layout=(string)interleaved, rate=(int)16000, format=(string)S16LE, channels=(int)1"
        self.kaldi_url = kaldi_url + '?{}'.format(urllib.urlencode([("content-type", content_type)]))
        self.log("kaldi url - {}".format(self.kaldi_url))
        self.sockets = {}
        
    def on_connect(self, client, userdata, flags, result_code):
        SnipsMqttServer.on_connect(self,client,userdata,flags,result_code)
        #self.client.publish('hermes/asr/startListening', payload="{\"siteId\":\"default\",\"sessionId\":null}", qos=0)
            
   
    def on_message(self, client, userdata, msg):
        #print("MESSAGE {}".format(msg.topic))
        siteId = "default"
        sessionId = ""
        
        msgJSON = {}    
        if len(msg.payload) > 0:
            try:
                msgJSON = json.loads(msg.payload)
            except:
                pass
        siteId = msgJSON.get('siteId','default')
        sessionId = msgJSON.get('sessionId','default')
            

        if msg.topic.endswith('stopListening'):
            self.log('toggle off')
            if siteId in self.sockets:
                self.log('toggle off real')
                self.client.unsubscribe("hermes/audioServer/{}/audioFrame".format(siteId))
                self.sockets[siteId].send("EOS")
                #self.sockets[siteId].close()
                del self.sockets[siteId]
                
        elif msg.topic.endswith('startListening'):
            self.log('toggle on')
            if siteId not in self.sockets:
                self.log('toggle on real')
                self.sockets[siteId] = KaldiClient(self.client,self.kaldi_url,siteId,sessionId)
                self.sockets[siteId].connect()
                self.client.subscribe("hermes/audioServer/{}/audioFrame".format(siteId))
                self.log('started sockets now {}'.format(self.sockets))
        else:
            siteId = msg.topic.split('/')
            #self.log('audio msg {}'.format(siteId[2]))
            if siteId[2] in self.sockets:
                #self.log('audio msg active')# {}'.format(self.sockets[siteId]))
            
                #if self.messageCount % 20 == 0 :
                    #self.log('audiofrom {} {}'.format(siteId[2],len(msg.payload)))
                ##can test the speed
                #start = time.clock()

                #this works but is SLOWER than the below code
                #buffer = StringIO.StringIO(msg.payload)
                #wav = wave.open(buffer, 'r')
                #data = wav.readframes(wav.getnframes())
                
                #this is faster
                data = msg.payload[44:struct.unpack('<L', msg.payload[4:8])[0]]
                self.sockets[siteId[2]].send_data(data)
                #elapsed_time = time.clock()
                #print (elapsed_time - start)
                
                #ans = self.detection.detector.RunDetection(data)
                #if ans == 1:
                    #print('Hotword Detected!')
                    #self.client.publish('hermes/hotword/{}/detected'.format(self.hotword), payload="{\"siteId\":\"" + siteId[2] + "\",\"sessionId\":null}", qos=0)
        
        
        
    def log(self, message):
        print(message)

server = SnipsKaldiServer()
server.start()







