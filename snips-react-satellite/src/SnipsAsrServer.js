
import SnipsLogger from './SnipsLogger'

export default class SnipsAsrServer   {

    constructor(props) {
        super(props);
        this.state={}
        
        that.sendMqtt = that.sendMqtt.bind(this);
        
        let eventFunctions = {
        // SESSION
            'hermes/asr/startListening' : function(payload,session) {
                if (payload.siteId) {
                    this.sendMqtt('hermes/hotword/toggleOff',{siteId:payload.siteId});    
                    let message = new Paho.MQTT.Message(JSON.stringify({siteId:siteId,init:{type:'action',canBeEnqueued:true,sendIntentNotRecognized:true}}));
            
                    this.sendMqtt('hermes/asr/startSession',{siteId:payload.siteId,init:{type:'action',canBeEnqueued:true,sendIntentNotRecognized:true},customData:payload:customData});    

                }
            },
            'hermes/asr/stopListening' : function(payload,session) {
                //stopListening,hotwordToggleOff,sessionStarted/sessionQueued
                // do we have an existing session on this site ?
                
                // else generate new session
                let sessionId = this.generateSessionId();
                if (payload && payload.init && payload.init.text && payload.init.text.length > 0) {
                    this.sendMqtt('hermes/tts/say',{text:payload.init.text,siteId:payload.siteId,sessionId:sessionId,customData:payload.customData});    
                }
                this.sendMqtt('hermes/dialogueManager/sessionStarted',{siteId:payload.siteId,sessionId:sessionId,customData:payload.customData});    
                this.sendMqtt('hermes/asr/startListening',{siteId:payload.siteId,sessionId:sessionId});    
            }
        }
        
        this.logger = new SnipsLogger({logAudio:false,setLogData:this.setLogData , eventCallbackFunctions :eventFunctions});
        
    }  
    
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
    
   
}
