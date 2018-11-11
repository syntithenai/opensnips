
import SnipsMqttServer from './SnipsMqttServer'

export default class SnipsDialogueServer extends SnipsMqttServer  {

    constructor(props) {
        super(props);
        this.state={}
        
        that.sendMqtt = that.sendMqtt.bind(this);
        
        let eventFunctions = {
        // SESSION
            'hermes/hotword/#/detected' : function(payload,session) {
                if (payload.siteId) {
                    this.sendMqtt('hermes/hotword/toggleOff',{siteId:payload.siteId});    
                    let message = new Paho.MQTT.Message(JSON.stringify({siteId:siteId,init:{type:'action',canBeEnqueued:true,sendIntentNotRecognized:true}}));
            
                    this.sendMqtt('hermes/asr/startSession',{siteId:payload.siteId,init:{type:'action',canBeEnqueued:true,sendIntentNotRecognized:true},customData:payload:customData});    

                }
            },
            'hermes/dialogueManager/startSession' : function(payload,session) {
                //stopListening,hotwordToggleOff,sessionStarted/sessionQueued
                // do we have an existing session on this site ?
                
                // else generate new session
                let sessionId = this.generateSessionId();
                if (payload && payload.init && payload.init.text && payload.init.text.length > 0) {
                    this.sendMqtt('hermes/tts/say',{text:payload.init.text,siteId:payload.siteId,sessionId:sessionId,customData:payload.customData});    
                }
                this.sendMqtt('hermes/dialogueManager/sessionStarted',{siteId:payload.siteId,sessionId:sessionId,customData:payload.customData});    
                this.sendMqtt('hermes/asr/startListening',{siteId:payload.siteId,sessionId:sessionId});    
            }, 
            'hermes/dialogueManager/continueSession' : function(payload,session) {
                //stopListening,hotwordToggleOff,sessionStarted/sessionQueued
                this.sendMqtt('hermes/asr/startListening',{siteId:payload.siteId,sessionId:payload.sessionId});    
            },
            'hermes/dialogueManager/endSession' : function(payload,session) {
                this.sendMqtt('hermes/dialogueManager/sessionEnded',{siteId:payload.siteId,sessionId:payload.sessionId});    
            },
            
            // MANAGEMENT
            'hermes/asr/textCaptured' : function(payload,session) {
                this.sendMqtt('hermes/asr/stopListening',{siteId:payload.siteId,sessionId:payload.sessionId});    
                this.sendMqtt('hermes/nlu/query',{input:payload.text,siteId:payload.siteId,sessionId:payload.sessionId});    
                // hermes/asr/stopListening, hermes/nlu/query
            },
            'hermes/nlu/intentNotRecognized' : function(payload,session) {
                // sessionEnded
                // ?? play sound grunt
                this.sendMqtt('hermes/dialogueManager/sessionEnded',{siteId:payload.siteId,sessionId:payload.sessionId});    
            },
            'hermes/nlu/slotParsed' : function(payload,session) {
                //this.sendMqtt('hermes/dialogueManager/sessionEnded',{siteId:payload.siteId,sessionId:payload.sessionId});    
            },
            'hermes/nlu/intentParsed' : function(payload,session) {
                // hermes/intent
                this.sendMqtt('hermes/intent',{siteId:payload.siteId,sessionId:payload.sessionId});    
            }
        }
        
        this.logger = new SnipsLogger({logAudio:false,setLogData:this.setLogData , eventCallbackFunctions :eventFunctions});
        
    }  
    
    generateSessionId() {
        //// return uuid of form xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx
        var uuid = '', ii;
        for (ii = 0; ii < 32; ii += 1) {
          switch (ii) {
          case 8:
          case 20:
            uuid += '-';
            uuid += (Math.random() * 16 | 0).toString(16);
            break;
          case 12:
            uuid += '-';
            uuid += '4';
            break;
          case 16:
            uuid += '-';
            uuid += (Math.random() * 4 | 8).toString(16);
            break;
          default:
            uuid += (Math.random() * 16 | 0).toString(16);
          }
        }
        return uuid;
    };
    
    sendMqtt(destination,payload) {
        if (this.state.connected) {
            let message = new Paho.MQTT.Message(JSON.stringify(payload));
            message.destinationName = destination;
            this.mqttClient.send(message);
            
        }
    }; 
    
   setLogData(sites,messages,sessionStatus,sessionStatusText,hotwordListening,audioListening) {
        //console.log(['SET setLogData',sites]);
       this.setState({sites:sites,messages:messages,sessionStatus:sessionStatus,sessionStatusText:sessionStatusText,hotwordListening:hotwordListening,audioListening:audioListening});
   };
    
    /*
     * 
     * if msg.topic.startswith("hermes/hotword"):
                hotwordId = 'default'
                ok = False
                if len(msg.topic.split('/')) > 3 and msg.topic.split('/')[3] == 'detected':
                    hotwordId = msg.topic.split('/')[2]
                    ok = True
                elif len(msg.topic.split('/')) > 2 and msg.topic.split('/')[2] == 'detected':
                    ok = True
                print("HOTWORD DETECTED: {}".format(msg.topic))
                self.hotwords[sessionId] = hotwordId
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
            elif msg.topic.startswith("hermes/nlu/intentNotRecognized"):
                # check if there is a default action for this session and forward as intent if exists otherwise do nothing
                pass
            elif msg.topic.startswith("hermes/nlu/slotParsed"):
                pass
                # fake an intent using the last intent before slot parsing was called or intent as passed through parameters
                #intent = msgJSON.get('intent')
                #intentName = intent.get('intentName')
                #intentName = msgJSON.get('intentName')
                #text = msgJSON.get('input')
                #theId = msgJSON.get('id','')
                #print("INTENT PARSED: {}".format(msg.topic))
                #self.sendMessage(siteId,sessionId,'hermes/intent/{}'.format(intentName),{'customData':self.getSessionData(sessionId),'input':text,'intent':intent,'slots':intent.get('slots')})
            elif msg.topic.startswith("hermes/nlu/intentParsed"):
                intent = msgJSON.get('intent')
                intentName = intent.get('intentName')
                text = msgJSON.get('input')
                theId = msgJSON.get('id','')
                print("INTENT PARSED: {}".format(msg.topic))
                self.sendMessage(siteId,sessionId,'hermes/intent/{}'.format(intentName),{'customData':self.getSessionData(sessionId),'input':text,'intent':intent,'slots':intent.get('slots')})
            # ALTERNATIVE ENTRY POINT TO NORMAL FLOW INSTEAD OF HOTWORD DETECTED BUT ACCEPTS customData and intentFilter
            elif msg.topic.startswith("hermes/dialogueManager/startSession"):
                if not haveSession:
                    print("START SESSION: {}".format(msg.topic))
                    # SEND
                    # hermes/dialogueManager/sessionStarted
                    self.sendMessage(siteId,sessionId,'hermes/asr/stopListening',{})
                    self.setSessionData(sessionId,msgJSON.get('customData'))
                    self.sendMessage(siteId,sessionId,'hermes/dialogueManager/sessionStarted',{'customData':self.getSessionData(sessionId)})
                    self.sendMessage(siteId,sessionId,'hermes/asr/startListening',{})
                    self.setSessionExpiry(sessionId,float(time.time()) + float(self.expiryTimeout))
            # ENTRY POINT FOR COMPLEX FLOW DIALOGUES        
            elif msg.topic.startswith("hermes/dialogueManager/continueSession"):
                print("CONTINUE SESSION: {}".format(msg.topic))
                # save these against the session key to be used when interpreting other messages
                fallback_intent = msgJSON.get('fallback_intent','')
                intentFilter = msgJSON.get('intentFilter','')
                slotFilter = msgJSON.get('slot','')
                nlu_model = msgJSON.get('nlu_model','default')
                handler_model = msgJSON.get('handler_model','default')
                asr_model = msgJSON.get('core_model','default')
                self.sessionConfig[sessionId] = {"fallback_intent":fallback_intent,"intentFilter":intentFilter,"slotFilter":slotFilter,"nlu_model":nlu_model,"handler_model":handler_model,"asr_model":asr_model}
                
                
                text = msgJSON.get('text','')
                if len(text) > 0:
                    self.client.publish('hermes/tts/say',
                    payload = json.dumps({"lang":self.lang,"sessionId": sessionId, "text": text, "siteId": siteId,"id":theId}), 
                    qos=0,
                    retain=False)
                    
                self.sendMessage(siteId,sessionId,'hermes/asr/stopListening',{})
                self.setSessionData(sessionId,msgJSON.get('customData'))
                #self.sendMessage(siteId,sessionId,'hermes/dialogueManager/sessionStarted',{'customData':self.getSessionData(sessionId)})
                self.sendMessage(siteId,sessionId,'hermes/asr/startListening',{})
                self.setSessionExpiry(sessionId,float(time.time()) + float(self.expiryTimeout))
                ## SEND
                ## hermes/asr/startListening
                #self.sendMessage(siteId,sessionId,'hermes/nlu/query',{'input':text,'intentFilter':[],'id':'')
            elif msg.topic.startswith("hermes/dialogueManager/endSession"):
                print("END SESSION: {}".format(msg.topic))
                # SEND
                # hermes/dialogueManager/sessionEnded
                self.closeSession(sessionId)
     * 
     * */
  

}
