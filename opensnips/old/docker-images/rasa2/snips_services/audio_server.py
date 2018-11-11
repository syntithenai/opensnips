#!/usr/bin/python
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

class SnipsAudioServer(SnipsMqttServer):
    
    def __init__(self,
                 mqtt_hostname='mosquitto',
                 mqtt_port=1883,
                 site='default'
                 ):
        SnipsMqttServer.__init__(self,mqtt_hostname,mqtt_port)
        self.site = site
        self.thread_targets.append(self.sendAudioFrames)
        self.subscribe_to='hermes/audioServer/+/playBytes/+'

    def on_message(self, client, userdata, msg):
        parts = msg.topic.split('/')
        if msg.topic.startswith("hermes/audioServer/") and parts[3] == 'playBytes' :
            siteId = parts[2]
            wf = wave.open(io.BytesIO(bytes(msg.payload)), 'rb')
            p = pyaudio.PyAudio()
            CHUNK = 256
            stream = p.open(format=p.get_format_from_width(wf.getsampwidth()),
                            channels=wf.getnchannels(),
                            rate=wf.getframerate(),
                            output=True)

            data = wf.readframes(CHUNK)

            while data != None:
                stream.write(data)
                data = wf.readframes(CHUNK)

            stream.stop_stream()
            stream.close()

            p.terminate()
           
    def sendAudioFrames(self,run_event):
         
        audio = pyaudio.PyAudio()
        stream = audio.open(format=pyaudio.paInt16, channels=1,
                        rate=16000, input=True,
                        frames_per_buffer=256)
        while True  and run_event.is_set():
            frames = stream.read(256)
            # generate wav file in memory
            output = io.BytesIO()
            waveFile = wave.open(output, "wb")
            waveFile.setnchannels(1)
            waveFile.setsampwidth(2)
            waveFile.setframerate(16000)
            waveFile.writeframes(frames) 
            #waveFile.close()
            topic = 'hermes/audioServer/{}/audioFrame'.format(self.site)
            self.client.publish(topic, payload=output.getvalue(),qos=0)
            #output.close()  # discard buffer memory
                    
       
server = SnipsAudioServer()
server.start()







