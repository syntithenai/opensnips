/* global Porcupine */
/* global PicovoiceAudioManager */

import Resources from './resources'
import SnipsMqttServer from './SnipsMqttServer'

export default class SnipsHotwordServer extends SnipsMqttServer {

    constructor(props) {
        super(props);
        this.sensitivities = new Float32Array([1]);
        this.hotwordManager =  null;
        if (!props.siteId || props.siteId.length === 0) {
            throw "Hotword Server must be configured with a siteId property";
        }
        this.hotwordId = this.props.hotwordId && this.props.hotwordId.length > 0 ? this.props.hotwordId : 'default';
        
        this.sendHotwordDetected = this.sendHotwordDetected.bind(this);
        this.sendHotwordToggleOn = this.sendHotwordToggleOn.bind(this);
        
        this.startHotword = this.startHotword.bind(this);
        this.stopHotword = this.stopHotword.bind(this);
        this.hotwordCallback = this.hotwordCallback.bind(this)
        
     }  
     
     afterConnect() {
        // console.log('HW server aftON CONNECT');
         if (this.props.toggleOn) {
                this.sendHotwordToggleOn(this.props.siteId) 
         }
         
     }; 
        
   
    
    // respond to hermes/hotword/toggleOn or toggleOff where the siteId matches props.siteId
    onMessageArrived(message) {
        let that = this;
        //console.log(['HW ONMESSAGE',this.props.siteId]);
        try {
            let parts = message.destinationName ? message.destinationName.split("/") : [];
            if (parts.length > 0 && parts[0] === "hermes") {
                if (parts.length > 1 && parts[1] === "hotword") {
                    if (parts.length > 2 && parts[2] === "toggleOn") {
                        let payload = JSON.parse(message.payloadString);
                        console.log([payload]);
                        if (payload.siteId && payload.siteId.length > 0 && payload.siteId === this.props.siteId) {
                                that.startHotword();
                        }
                    } else if (parts.length > 2 && parts[2] === "toggleOff") {
                        let payload = JSON.parse(message.payloadString);
                        console.log([payload]);
                        if (payload.siteId && payload.siteId.length > 0 && payload.siteId === this.props.siteId) {
                                that.stopHotword();
                        }
                    }
                }
            }
        } catch (e) {
            console.log(e);
        }
    }
    
    
    /**
     * Send Mqtt message to fake hotword detection
     */ 
    sendHotwordDetected() {
        let siteId = this.props.siteId;
       console.log(['HOTWORD DETECTED',siteId]);
        let that = this;
        if (this.state.connected && siteId && siteId.length > 0) {
            let message = new Paho.MQTT.Message(JSON.stringify({siteId:siteId,modelId:this.hotwordId,modelType:'universal'}));
            message.destinationName = "hermes/hotword/"+this.hotwordId+"/detected";
            this.mqttClient.send(message);
        }
    }
    
    /**
     * Send Mqtt message to toggle on hotword
     * Used to forcibly initialise the local hotword server.
     */ 
    sendHotwordToggleOn(siteId) {
       // console.log(['HW TOGGLE ON']);
        let that = this;
        if (this.state.connected) {
            let message = new Paho.MQTT.Message(JSON.stringify({siteId:siteId}));
            message.destinationName = "hermes/hotword/toggleOn";
            that.mqttClient.send(message);
            
        }
    };
    
    /**
     * Pause the hotword manager
     */ 
    stopHotword() {
       // console.log(['STOP HOTWORD']);
        if (this.hotwordManager) this.hotwordManager.pauseProcessing();
    };
    
    /**
     * Create or continue the hotword manager
     */ 
    startHotword(siteId) {
     //return 
     // console.log(['start hotword',siteId,this.siteId]);
      if (siteId === this.siteId ) {
          if (this.hotwordManager === null) {
              this.hotwordManager =  new PicovoiceAudioManager();
              let singleSensitivity = this.props.hotwordsensitivity ? this.props.hotwordsensitivity/100 : 0.9;
              let sensitivities=new Float32Array([singleSensitivity]);
            //  console.log(['START HOTWORD INIT',this.props.hotwordsensitivity,Resources.keywordIDs,sensitivities]);
              
              this.hotwordManager.start(Porcupine.create(Object.values(Resources.keywordIDs), sensitivities), this.hotwordCallback, function(e) {
                console.log(['hotword error',e]);
              });
          } else {
             // console.log(['START HOTWORD RESTART']);
              if(this.hotwordManager) this.hotwordManager.continueProcessing();
          }
      }
    };
    
    
    hotwordCallback(value) {
      //  console.log(['HOTWORD CALLBACK',value]);
        if (!isNaN(value) && parseInt(value,10)>=0) {
        //    console.log(['HOTWORD CALLBACK SEND',value]);
            this.sendHotwordDetected();
        }
        
    };

}
