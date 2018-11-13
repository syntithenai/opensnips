import React, { Component } from 'react'
import SnipsMqttServer from './SnipsMqttServer';
import SnipsLogger from './SnipsLogger'


export default class SnipsReactComponent extends Component {
    
    constructor(props) {
        super(props);
        this.props = props;
        this.state={};
        this.logger = null;
        this.queueOneOffCallbacks = this.queueOneOffCallbacks.bind(this);
        this.connectToLogger = this.connectToLogger.bind(this);
    };
    
    componentDidMount() {
        this.connectToLogger(this.props.logger,{});
    };
    
    
    connectToLogger(logger,eventFunctions) {
        if (logger) {
            logger.addCallbacks(eventFunctions);
            this.logger = logger;
            return this.logger;
        } else {
            this.logger =  new SnipsLogger(Object.assign({logAudio:false,setLogData:this.setLogData , eventCallbackFunctions :eventFunctions},this.props));
            return this.logger;
        }
    };
    
    queueOneOffCallbacks(eventFunctions) {
        if (this.logger) {
            this.logger.addCallbacks(eventFunctions,true);
        }
    };
   
    sendMqtt(destination,payload) {
        if (this.logger) {
            this.logger.sendMqtt(destination,payload);
        }
    }; 
    // force update
    setLogData(sites,messages,sessionStatus,sessionStatusText,hotwordListening,audioListening) {
       this.setState(this.state);
   };
   
   /**
    *  MQTT SEND 
    */
     
     
    /**
     * Send Mqtt message to toggle on hotword
     * Used to forcibly initialise the local hotword server.
     */ 
    sendHotwordToggleOn(siteId) {
        this.sendMqtt("hermes/hotword/toggleOn",{siteId:siteId});
    };
    /**
     * Send Mqtt message to fake hotword detection
     */ 
    sendHotwordDetected(siteId,hotwordId) {
        this.sendMqtt("hermes/hotword/"+hotwordId+"/detected",{siteId:siteId,modelId:hotwordId,modelType:'universal'});
    }
    
    /**
     * Send Mqtt message to start a voice session
     */     
    sendStartSession(siteId,customData,text) {
        let payload = {siteId:siteId,init:{type:'action',canBeEnqueued:false,sendIntentNotRecognized:true}}
        if (customData) payload.customData = JSON.stringify(customData);
        if (text && text.length > 0) payload.init.text = text;
        this.sendMqtt("hermes/dialogueManager/startSession",payload);
    };
    
    /**
     * Send Mqtt message to indicate that tts has finished
     */     
    sendSayFinished(id,sessionId) {
        this.sendMqtt("hermes/tts/sayFinished",{id:id,sessionId:sessionId});
    };
    
    /**
     * Send Mqtt message to indicate audioserver playback has finished
     */ 
    sendPlayFinished(siteId,sessionId) {
        this.sendMqtt("hermes/audioServer/"+this.siteId+"/playFinished",{siteId:siteId,id:sessionId});
    };

    /**
     * Send Mqtt message to end the session immediately
     */ 
    sendEndSession(sessionId,text) {
        let payload = {sessionId:sessionId}
        if (text && text.length > 0) {
            payload.text = text;
        }
        this.sendMqtt("hermes/dialogueManager/endSession",payload);
    };
   
   
   /**
     * Send Mqtt message to toggle on asr
     * Used to forcibly initialise the local asr server.
     */ 
    sendAsrToggleOn(siteId) {
        this.sendMqtt("hermes/asr/toggleOn",{});
    };
    
    /**
     * Send Mqtt message to toggle on asr
     * Used to forcibly initialise the local asr server.
     */ 
    sendAsrStopListening(siteId) {
        this.sendMqtt("hermes/asr/stopListening",{siteId:siteId});
    };
   
    /**
     * Send Mqtt message to toggle on asr
     * Used to forcibly initialise the local asr server.
     */ 
    sendAsrStartListening(siteId) {
        this.sendMqtt("hermes/asr/startListening",{siteId:siteId});
    };
   

     /**
     * Send Mqtt message to toggle on asr
     * Used to forcibly initialise the local asr server.
     */ 
    sendAsrToggleOff(siteId) {
        this.sendMqtt("hermes/asr/toggleOff",{});
    };
    
     /**
     * Send Mqtt message to toggle on feedback
     */ 
    sendFeedbackToggleOn(siteId) {
        this.sendMqtt("hermes/feedback/sound/toggleOn",{siteId:siteId});
    };
    
     /**
     * Send Mqtt message to toggle off feedback
     */ 
    sendFeedbackToggleOff(siteId) {
        this.sendMqtt("hermes/feedback/sound/toggleOff",{siteId:siteId});
    };
    
    
    
    
    
    render() {
        return <b id="snipsreactcomponent" ></b>
    }
}

