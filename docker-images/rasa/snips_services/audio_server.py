#!/usr/bin/python
# -*-: coding utf-8 -*-
""" Snips core and nlu server. """
from __future__ import absolute_import
from __future__ import division
from __future__ import print_function
from __future__ import unicode_literals
import hashlib
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

class SnipsAudioServer(SnipsMqttServer):
    
    def __init__(self,
                 mqtt_hostname=os.environ.get('audioserver_mqtt_hostname','mosquitto'),
                 mqtt_port=os.environ.get('audioserver_mqtt_port',1883),
                 site=os.environ.get('audioserver_site','default'),
                 ):
        SnipsMqttServer.__init__(self,mqtt_hostname,mqtt_port)
        self.site = site
        self.thread_targets.append(self.sendAudioFrames)
        self.subscribe_to='hermes/audioServer/+/playBytes/+'
        self.pyaudio = pyaudio.PyAudio()
        self.sampleWidth = 2
        self.formatFromWidth = pyaudio.paInt16
        self.nchannels = 1
        self.framerate=16000
        self.chunkSize = 256
        self.streamOut = self.pyaudio.open(format=self.formatFromWidth,
                            channels=self.nchannels,
                            rate=self.framerate,
                            output=True)
        self.streamIn = self.pyaudio.open(format=self.formatFromWidth, channels=self.nchannels,
                        rate=self.framerate, input=True,
                        frames_per_buffer=self.chunkSize)
        


    def on_message(self, client, userdata, msg):
        #print("AS msg")                
        parts = msg.topic.split('/')
        if msg.topic.startswith("hermes/audioServer/") and parts[3] == 'playBytes' :
            siteId = parts[2]
            wf2 = wave.open(io.BytesIO(bytes(msg.payload)), 'rb')
            data2 = wf2.readframes(wf2.getnframes())
            self.streamOut.write(data2)
            
           
    def sendAudioFrames(self,run_event):
        #print("SOF start")
        c=0
        while True  and run_event.is_set():
            c=c+1
            #if c % 20 == 1:
                #print("SOF DATA 1")
            self.streamIn.start_stream()
            frames = self.streamIn.read(self.chunkSize)
            self.streamIn.stop_stream()
            #if c % 20 == 1:
                #print("FRAMES {}".format(len(frames)))
            
            # generate wav file in memory
            output = io.BytesIO()
            waveFile = wave.open(output, "wb")
            waveFile.setnchannels(1)
            waveFile.setsampwidth(2)
            waveFile.setframerate(16000)
            waveFile.writeframes(frames) 
            waveFile.close()
            topic = 'hermes/audioServer/{}/audioFrame'.format(self.site)
            #if c % 20 == 1:
                #print("publish {} {}".format(topic,hashlib.md5(output.getvalue()).hexdigest()))
            self.client.publish(topic, payload=output.getvalue(),qos=0)
            output.close()  # discard buffer memory
        
        self.streamIn.close()            
        #print('exited audios server send frames')
       
server = SnipsAudioServer()
server.start()
