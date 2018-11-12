/* global window */
/* global Paho */
/* global Porcupine */
/* global PicovoiceAudioManager */

import React, { Component } from 'react'
import SnipsReactComponent from './SnipsReactComponent'
import Resources from './resources'

export default class SnipsReactHotwordServer extends SnipsReactComponent {

   constructor(props) {
        super(props);
        this.sensitivities = new Float32Array([1]);
        this.hotwordManager =  null;
        if (!props.siteId || props.siteId.length === 0) {
            throw "HOTWORD Server must be configured with a siteId property";
        }
        let that = this;
        this.hotwordId = this.props.hotwordId && this.props.hotwordId.length > 0 ? this.props.hotwordId : 'default';
        
        this.sendHotwordDetected = this.sendHotwordDetected.bind(this);
        this.sendHotwordToggleOn = this.sendHotwordToggleOn.bind(this);
        
        this.startHotword = this.startHotword.bind(this);
        this.stopHotword = this.stopHotword.bind(this);
        this.hotwordCallback = this.hotwordCallback.bind(this)
        let eventFunctions = {
        // SESSION
            'hermes/hotword/toggleOn' : function(payload) {
                if (payload.siteId && payload.siteId.length > 0 && payload.siteId === that.props.siteId) {
                    that.startHotword(that.props.siteId);
                }
            },
            'hermes/hotword/toggleOff' : function(payload) {
                if (payload.siteId && payload.siteId.length > 0 && payload.siteId === that.props.siteId) {
                    that.stopHotword();
                }
            }
        }
        this.logger = this.connectToLogger(props.logger,eventFunctions);
     }  
        
    componentDidMount() {
        let that = this;
         if (this.props.toggleOn) {
               setTimeout(function() {
                    that.startHotword(that.props.siteId);
               },1000)
         }
    };
    
    
    /**
     * Pause the hotword manager
     */ 
    stopHotword() {
        if (this.hotwordManager) this.hotwordManager.pauseProcessing();
    };
    
    /**
     * Create or continue the hotword manager
     */ 
    startHotword(siteId) {
      if (siteId === this.props.siteId ) {
          if (this.hotwordManager === null) {
              this.hotwordManager =  new PicovoiceAudioManager();
              let singleSensitivity = this.props.hotwordsensitivity ? this.props.hotwordsensitivity/100 : 0.9;
              let sensitivities=new Float32Array([singleSensitivity]);
              this.hotwordManager.start(Porcupine.create(Object.values(Resources.keywordIDs), sensitivities), this.hotwordCallback, function(e) {
                console.log(['HOTWORD error',e]);
              });
          } else {
              if(this.hotwordManager) this.hotwordManager.continueProcessing();
          }
      }
    };
    
    
    hotwordCallback(value) {
        if (!isNaN(value) && parseInt(value,10)>=0) {
            this.sendStartSession(this.props.siteId,{startedBy:'snipsreacthotword',user:this.props.user ? this.props.user._id : ''});
        }
        
    };
    
        
    render() {
        return <span id="snipsreacthotwordserver" ></span>
    };
}
