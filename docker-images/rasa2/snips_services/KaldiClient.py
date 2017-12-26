import argparse
from ws4py.client.threadedclient import WebSocketClient
import time
import threading
import sys
import urllib
import Queue
import json
import time
import os



class KaldiClient(WebSocketClient):

    def __init__(self, mqttClient, url,siteId, sessionId = None, protocols=None, extensions=None, heartbeat_freq=None, byterate=32000):
        WebSocketClient.__init__(self,url, protocols, extensions, heartbeat_freq)
        self.url = url
        self.siteId = siteId
        self.sessionId = sessionId
        self.client = mqttClient
        
    def send_data(self, data):
        print ('send data')
        #print(data)
        self.send(data, binary=True)

    def opened(self):
        print "Socket opened!"
        #def send_data_to_ws():
            #with self.audiofile as audiostream:
                #for block in iter(lambda: audiostream.read(self.byterate/4), ""):
                    #self.send_data(block)
            #print >> sys.stderr, "Audio sent, now sending EOS"
            #self.send("EOS")

        #t = threading.Thread(target=send_data_to_ws)
        #t.start()


    def received_message(self, m):
        response = json.loads(str(m))
        #print >> sys.stderr, "RESPONSE:", response
        #print >> sys.stderr, "JSON was:", m
        if response['status'] == 0:
            if 'result' in response:
                trans = response['result']['hypotheses'][0]['transcript']
                likelihood = response['result']['hypotheses'][0].get('likelihood',1)/300000
                if response['result']['final']:
                    print(response)
                    #print >> sys.stderr, trans,
                    #self.final_hyps.append(trans)
                    #print >> sys.stderr, '\r%s' % trans.replace("\n", "\\n")
                    self.client.publish('hermes/asr/textCaptured', payload=json.dumps({"text":trans.replace("\n", "\\n"),"siteId":self.siteId,"sessionId":self.sessionId,"seconds":response['segment-length'],"likelihood":likelihood}))
                    #self.client.publish('hermes/asr/stopListening', payload="{\"siteId\":\"default\",\"sessionId\":null}", qos=0)
        else:
            print >> sys.stderr, "Received error from server (status %d)" % response['status']
            if 'message' in response:
                print >> sys.stderr, "Error message:",  response['message']


    #def get_full_hyp(self, timeout=60):
        #return self.final_hyp_queue.get(timeout)

    def closed(self, code, reason=None):
        print "Websocket closed() called"
        #print >> sys.stderr
        #self.final_hyp_queue.put(" ".join(self.final_hyps))
