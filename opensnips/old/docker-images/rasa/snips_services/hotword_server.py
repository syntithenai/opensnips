#!/opt/rasa/anaconda/bin/python
# -*-: coding utf-8 -*-
""" Snips hotword server. """


#####################################################
# PIWHO INTEGRATION IS PENDING - SEE THE BOTTOM OF THE FILE

import json
import time
import os
import syslog
import sys
import wave
import struct
import StringIO
from piwho import recognition
import collections


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
                 sensitivity=os.environ.get('hotword_sensitivity','0.8'),
                 listen_to=os.environ.get('hotword_listen_to','default'),
                 ):
        SnipsMqttServer.__init__(self,mqtt_hostname,mqtt_port)

        self.hotword = hotword
        self.hotword_model = hotword_model
        self.listen_to = listen_to

        self.subscribe_to='hermes/hotword/+/toggleOff,hermes/hotword/+/toggleOn,hermes/audioServer/+/audioFrame'


        # PIWHO
        self.piwho_model = os.path.dirname(os.path.abspath(__file__)) + '/piwho/'
        self.piwho_speakers = self.piwho_model + '/speakers.txt'
        self.piwho_training_data = os.path.dirname(os.path.abspath(__file__)) + '/piwho/data'
        self.recog = None
        
        self.clientList = []
        self.allowedClientList = listen_to.split(',')

        self.client_buffer = {}
        self.client_recognition = {}
        self.client_talking = {}
        self.record = {}

        self.messageCount = 0;
        self.detection = snowboydecoder.HotwordDetector(hotword_model, sensitivity=sensitivity)
 
            
        for client in self.allowedClientList:
            self.client_buffer[client] = AudioBuffer(self.detection.detector.NumChannels() * self.detection.detector.SampleRate() * 20)
            self.client_recognition[client] =  AudioBuffer(self.detection.detector.NumChannels() * self.detection.detector.SampleRate() * 2)
            self.client_talking[client] = False
            self.record[client] = False

        
        self.trainPiWho()
        if (self.piwho_enabled()):
            self.recog = recognition.SpeakerRecognizer()
        
        
    def on_connect(self, client, userdata, flags, result_code):
        SnipsMqttServer.on_connect(self,client,userdata,flags,result_code)
        # enable to start
        for site in self.allowedClientList:
            self.client.publish('hermes/hotword/{}/toggleOn'.format(self.hotword), payload="{\"siteId\":\"" + site + "\",\"sessionId\":null}", qos=0)
            
   
    def on_message(self, client, userdata, msg):
        if msg.topic.endswith('toggleOff'):
            self.log('toggle off')
            try:
                msgJSON = json.loads(msg.payload)
            except:
                pass
            siteId = msgJSON.get('siteId','default')
            if siteId not in self.clientList:
                self.clientList.append(siteId)
        elif msg.topic.endswith('toggleOn'):
            self.log('toggle on')
            msgJSON = {}
            try:
                msgJSON = json.loads(msg.payload)
            except:
                pass
            siteId = msgJSON.get('siteId','default')
            if self.client_talking[siteId] == True:
                data = self.client_buffer[msgJSON['siteId']].get()
            if siteId in self.clientList:
                self.clientList.remove(siteId)
            self.messageCount = 0;
        else:
            self.messageCount = self.messageCount + 1;
            #self.log('hotword other message')
            siteId = msg.topic.split('/')[2]
            if False and self.messageCount % 20 == 0 :
                self.log('audiofrom {} {}'.format(siteId[2],len(msg.payload)))
                self.log('totals {} {} {} {}'.format(len(self.client_recognition),len(self.client_buffer),self.client_talking,self.record))
            if siteId not in self.clientList:
                if False and self.messageCount % 20 == 0 :
                    self.log('hotword no client')
                data = msg.payload[44:struct.unpack('<L', msg.payload[4:8])[0]]
                self.client_recognition[siteId].extend(data)

                ans = self.detection.detector.RunDetection(data)

                if ans == 1:
                    self.log('hotword detected')
                    self.record[siteId] = True
                    #inform that the hotword has been detected
                    client.publish('hermes/hotword/{}/detected'.format(self.hotword), payload="{\"siteId\":\"" + siteId + "\"}", qos=0)
                        
                    if self.piwho_enabled() :
                        os.chdir(self.piwho_model)
                        waveFile = wave.open( siteId + '_id.wav', 'wb')
                        waveFile.setnchannels(1)
                        waveFile.setsampwidth(2)
                        waveFile.setframerate(8000)
                        waveFile.writeframes(self.client_recognition[siteId].get()) 
                        waveFile.close()
                        speakers = self.recog.identify_speaker(siteId + '_id.wav')
                        print(speakers)
                        print(self.recog.get_speakers())
                        print(self.recog.get_speaker_scores())
                        if speakers is not None and len(speakers) > 0:
                            speaker = speakers[0]

                            action = "{\"type\":\"action\",\"text\":null,\"canBeEnqueued\":false,\"intentFilter\":null}"
                            jsonString = "{\"siteId\":\"" + siteId + "\",\"init\":" + action + ",\"customData\":\"" + speaker + "\"}"

                            client.publish('hermes/dialogueManager/startSession', payload=jsonString, qos=0)

                            self.client_buffer[siteId].extend(data)
                            self.clientList.append(siteId)
                    
            elif self.record[siteId] == True and self.piwho_enabled():
                #i want to capture what is said after the hotword as a wave
                data = msg.payload[44:struct.unpack('<L', msg.payload[4:8])[0]]
                self.client_buffer[siteId].extend(data)
                ans = self.detection.detector.RunDetection(data)
                if ans == 0:
                    #adding the data here misses the first 0.1 sec of the speaking audio and it sounds off
                    #saying "what is the...." the audio is "ot is the..".. the first word lacks the whole sound
                    #client_buffer[siteId].extend(data)
                    self.client_talking[siteId] = True
                elif ans == -2 and self.client_talking[siteId] == True:
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


    # get the modified data of the most recently modified file in the training data
    def getPiWhoTrainingDataLastModified(self):
        maximum = 0;
        for root, directories, files in os.walk(self.piwho_training_data):
            for listedFile in files:
                if os.path.getmtime(os.path.join(root,listedFile)) > maximum :
                    maximum = os.path.getmtime(os.path.join(root,listedFile))
        print("training last mod {}".format(maximum))
        return maximum
        
    # get the modified data of the most recently modified file in the marf model
    def getPiWhoModelLastModified(self):
        maximum = 0;
        for root, directories, files in os.walk(self.piwho_model):
            for listedFile in files:
                print("MLM check {} {}".format(listedFile,maximum))
                if "marf" in listedFile and "gzbin" in listedFile:
                    if os.path.getmtime(os.path.join(root,listedFile)) > maximum:
                        maximum = os.path.getmtime(os.path.join(root,listedFile))
        print("model last mod {}".format(maximum))
        return maximum

    # get the number of non empty line in speakers.txt
    def getPiWhoUserCount(self):
        line_count = char_count = 0
        if os.path.isfile(self.piwho_speakers):
            with open(self.piwho_speakers) as fin:
                stripped = (line.rstrip() for line in fin)
                for line_count, line in enumerate(filter(None, stripped), 1):
                    char_count += len(line)
        print("piwho user count {}".format(line_count))
        return line_count

    # check if piwho can be enabled
    # TODO fix piwho and remove this
    def piwho_enabled(self):
        return False
        #if self.getPiWhoModelLastModified() > 0 and self.getPiWhoUserCount() > 1:
            #print("PIWHO IS ENABLED")
            #return True
        #else:
            #print("PIWHO IS NOT ENABLED")
            #return False


    # are any of the wav files in the data directory newer than the MARF file?
    def isPiWhoTrainingDataModified(self):
        print("PIWHO TRAINING MODFIED DIFF {}".format(self.getPiWhoModelLastModified() - self.getPiWhoTrainingDataLastModified()))
        if self.getPiWhoModelLastModified() > self.getPiWhoTrainingDataLastModified():
            print("PIWHO TRAINING NOT MODIFIED")
            return False
        else:
            print("PIWHO TRAINING MODIFIED")
            return True
        
        
    def trainPiWho(self):
        # TODO fix piwho and remove this 
        if False and (self.getPiWhoTrainingDataLastModified() > 0 and self.isPiWhoTrainingDataModified()):
            print('start training')
            recog = recognition.SpeakerRecognizer()
            print('got recog')
            try:
                os.remove(self.piwho_speakers)
            except:
                pass

            print('rm speakers')

            for f in os.listdir(self.piwho_model):
                if os.path.isfile(f) and "marf" in f and ".gzbin" in f:
                    os.remove(os.path.join(self.piwho_model, f))
            print('rm marf')            

            print("training folder has {}".format(os.listdir(self.piwho_training_data)))
            for d in os.listdir(self.piwho_training_data):
                if os.path.isdir(os.path.join(self.piwho_training_data,d)):
                    print("train {}".format(d))
                    recog.speaker_name = d
                    os.chdir(self.piwho_model)
                    recog.train_new_data(os.path.join(self.piwho_training_data,d), d)
                    print('trained marf for {}'.format(d))            
            
            print('trained marf')            

        
    def log(self, message):
        print(message)

server = SnipsHotwordServer()
server.start()

# same result
# using generated MARF and speakers based on piwho/data/*
# AND
# using MARF and speakers from Gregs AI repository 


#No arguments have been specified.
#0
#java.lang.ArrayIndexOutOfBoundsException: 0
	#at marf.Storage.ResultSet.getMininumID(ResultSet.java:115)
	#at marf.Storage.ResultSet.getMinimumResult(ResultSet.java:283)
	#at marf.Classification.Distance.Distance.getResult(Distance.java:169)
	#at marf.MARF.queryResultID(MARF.java:1381)
	#at SpeakerIdentApp.ident(SpeakerIdentApp.java:647)
	#at SpeakerIdentApp.main(SpeakerIdentApp.java:410)


#java -Xmx100m -jar /opt/snips_services/piwho/marf/./Speaker.jar --ident default_id.wav -endp -lpc -cheb -debug 


#Option set: Valid options: {-mah=-mah (506), --reset=--reset (3), -cepstral=-cepstral (304), -eucl=-eucl (503), -fft=-fft (301), --stats=--stats (2), -diff=-diff (508), --single-train=--single-train (12), -h=-h (6), -text=-text (710), -mink=-mink (505), -minmax=-minmax (306), -cheb=-cheb (504), -boost=-boost (101), -raw=-raw (107), -lpc=-lpc (300), -segm=-segm (303), --help=--help (5), -low=-low (104), -high=-high (105), -lowcfe=-lowcfe (109), -spectrogram=-spectrogram (9), -randcl=-randcl (507), -cos=-cos (512), --version=--version (4), -endp=-endp (103), -hamming=-hamming (511), -randfe=-randfe (305), -norm=-norm (100), -highcfe=-highcfe (110), default_id.wav=default_id.wav (13), -debug=-debug (7), -nn=-nn (500), --train=--train (0), -band=-band (102), -aggr=-aggr (308), -markov=-markov (502), -silence=-silence (17), -wav=-wav (700), --best-score=--best-score (14), -bandstopcfe=-bandstopcfe (112), --ident=--ident (1), -bandstop=-bandstop (113), --batch-ident=--batch-ident (11), -noise=-noise (16), -graph=-graph (8), --gui=--gui (15), -bandcfe=-bandcfe (111), -highpassboost=-highpassboost (106), -zipf=-zipf (510), -f0=-f0 (302)}
#Active options: {-debug=-debug (7), -cheb=-cheb (504), --ident=--ident (1), default_id.wav=default_id.wav (13), -lpc=-lpc (300), -endp=-endp (103)}
#Invalid options: []

#Active Option requested: --ident opts: {-debug=-debug (7), -cheb=-cheb (504), --ident=--ident (1), default_id.wav=default_id.wav (13), -lpc=-lpc (300), -endp=-endp (103)}
#Active Option requested: 13 opts: {-debug=-debug (7), -cheb=-cheb (504), --ident=--ident (1), default_id.wav=default_id.wav (13), -lpc=-lpc (300), -endp=-endp (103)}
#File: default_id.wav, id = 1
#File: default_id.wav, id = 0
#MARF: Loading sample "default_id.wav"
#Requested loader: 700
#MARF: Preprocessing...
#MARF: Invoking preprocess() of marf.Preprocessing.Endpoint.Endpoint
#Preprocessing.normalize(0,15999) has begun...
#Preprocessing.normalize(0,15999) has normally finished...
#MARF: Done preprocess() of marf.Preprocessing.Endpoint.Endpoint
#MARF: Feature extraction...
#LPC.extractFeatures() has begun...
#sample length: 4693
#poles: 20
#window length: 128
#LPC.extractFeatures() - number of windows = 73
#LPC.extractFeatures() has finished.
#MARF: Classification...
#MARF: Classifying...
#StorageManager.restore() --- file not found: "marf.Storage.TrainingSet.7008000.0.0.0.103.300.2.20.gzbin", marf.Storage.TrainingSet.7008000.0.0.0.103.300.2.20.gzbin (No such file or directory)
#Creating one now...
#TrainingSet.restore() -- Training set loaded successfully. Size: 0 vector(s).
#No arguments have been specified.
#0
#java.lang.ArrayIndexOutOfBoundsException: 0
	#at marf.Storage.ResultSet.getMininumID(ResultSet.java:115)
	#at marf.Storage.ResultSet.getMinimumResult(ResultSet.java:283)
	#at marf.Classification.Distance.Distance.getResult(Distance.java:169)
	#at marf.MARF.queryResultID(MARF.java:1381)
	#at SpeakerIdentApp.ident(SpeakerIdentApp.java:647)
	#at SpeakerIdentApp.main(SpeakerIdentApp.java:410)
#Usage:
  #java SpeakerIdentApp --train <samples-dir> [options]        -- train mode
                       #--single-train <sample> [options]      -- add a single sample to the training set
                       #--ident <sample> [options]             -- identification mode
                       #--batch-ident <samples-dir> [options]  -- batch identification mode
                       #--gui                                  -- use GUI as a user interface
                       #--stats=[per-config|per-speaker|both]  -- display stats (default is per-config)
                       #--best-score                           -- display best classification result
                       #--reset                                -- reset stats
                       #--version                              -- display version info
                       #--help | -h                            -- display this help and exit

#Options (one or more of the following):

#Loaders:

  #-wav          - assume WAVE files loading (default)
  #-text         - assume loading of text samples

