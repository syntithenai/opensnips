/* global window */
/* global Paho */
/* global Porcupine */
/* global PicovoiceAudioManager */

import React, { Component } from 'react'
import SnipsReactComponent from './SnipsReactComponent'
//import SnipsHotwordServer from './SnipsHotwordServer'
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
        //this.siteId = props.siteId;
        //console.log(['HOTWORD CONSTR',this.siteId,props,this]);
        this.hotwordId = this.props.hotwordId && this.props.hotwordId.length > 0 ? this.props.hotwordId : 'default';
        
        this.sendHotwordDetected = this.sendHotwordDetected.bind(this);
        this.sendHotwordToggleOn = this.sendHotwordToggleOn.bind(this);
        
        this.startHotword = this.startHotword.bind(this);
        this.stopHotword = this.stopHotword.bind(this);
        this.hotwordCallback = this.hotwordCallback.bind(this)
        let eventFunctions = {
        // SESSION
            'hermes/hotword/toggleOn' : function(payload) {
                console.log(['HOTWORD CALLBACK ON',payload,payload.siteId,that.props.siteId]);
                if (payload.siteId && payload.siteId.length > 0 && payload.siteId === that.props.siteId) {
                    that.startHotword(that.props.siteId);
                }
            },
            'hermes/hotword/toggleOff' : function(payload) {
                console.log(['HOTWORD CALLBACK OFF',payload]);
                if (payload.siteId && payload.siteId.length > 0 && payload.siteId === that.props.siteId) {
                    that.stopHotword();
                }
            }
        }
        this.logger = this.connectToLogger(props.logger,eventFunctions);
        console.log(['HOTWORD CONSTR',this.props.siteId,this.hotwordId]);
     }  
        
    componentDidMount() {
        let that = this;
         if (this.props.toggleOn) {
             console.log(['HOTWORD CONSTR TOGGLE ON',this.props.siteId,this.hotwordId]);
               setTimeout(function() {
                    that.sendHotwordToggleOn(that.props.siteId) ;
               },100)
         }
    };
    
    
    /**
     * Pause the hotword manager
     */ 
    stopHotword() {
        console.log(['STOP HOTWORD']);
        if (this.hotwordManager) this.hotwordManager.pauseProcessing();
    };
    
    /**
     * Create or continue the hotword manager
     */ 
    startHotword(siteId) {
     //return 
      console.log(['REALLY START HOTWORD',siteId,this.props.siteId]);
      if (siteId === this.props.siteId ) {
          if (this.hotwordManager === null) {
              this.hotwordManager =  new PicovoiceAudioManager();
              let singleSensitivity = this.props.hotwordsensitivity ? this.props.hotwordsensitivity/100 : 0.9;
              let sensitivities=new Float32Array([singleSensitivity]);
              console.log(['START HOTWORD INIT',this.props.hotwordsensitivity,Resources.keywordIDs,sensitivities]);
              
              this.hotwordManager.start(Porcupine.create(Object.values(Resources.keywordIDs), sensitivities), this.hotwordCallback, function(e) {
                console.log(['HOTWORD error',e]);
              });
          } else {
              console.log(['START HOTWORD RESTART']);
              if(this.hotwordManager) this.hotwordManager.continueProcessing();
          }
      }
    };
    
    
    hotwordCallback(value) {
       // console.log(['HOTWORD CALLBACK',value]);
        if (!isNaN(value) && parseInt(value,10)>=0) {
            console.log(['HOTWORD CALLBACK SEND',value]);
            this.sendHotwordDetected(this.props.siteId,this.hotwordId);
        }
        
    };
    
        
    render() {
        return <span id="snipshotwordserver" ></span>
    };
}
