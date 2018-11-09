/* global window */
/* global Paho */

import React, { Component } from 'react'
import eventFunctions from './eventFunctions'
import Crunker from 'crunker'
import SnipsMqttServer from './SnipsMqttServer'
//const UNKNOWNSITE = 'Unknown Site';
//const UNKNOWNSESSION = 'Unknown Session';

export default class SnipsLogger  extends SnipsMqttServer {

    constructor(props) {
        super(props);
        this.eventFunctions = eventFunctions;
        this.eventCallbackFunctions = this.addCallbacks(this.props.eventCallbackFunctions);
        //this.clientId = props.clientId ? props.clientId :  'client'+parseInt(Math.random()*100000000,10);
        this.siteId = props.siteId ? props.siteId :  'site'+parseInt(Math.random()*100000000,10);
        this.state={sites:{},messages:[],session:{},audioListening:{},hotwordListening:{},showLogMessages:{},sessionStatus:{},sessionStatusText:{}};
        //messages:[],sessions:{},intents:[],asr:[],tts:{'unknownSession':[]}};
        this.audioBuffers={};
        // state
        this.lastSessionId={};
        // console.log('LOGGER CONSTRUCT');
        
        this.getSession = this.getSession.bind(this);
        this.saveSession = this.saveSession.bind(this);
        this.updateSession = this.updateSession.bind(this);
        this.logAudioBuffer = this.logAudioBuffer.bind(this);
        this.updateSessionStatus = this.updateSessionStatus.bind(this);
        this.addCallbacks = this.addCallbacks.bind(this);
        this.findEventCallbackFunctions = this.findEventCallbackFunctions.bind(this);
        this.onMessageArrived = this.onMessageArrived.bind(this);
        //this.setSites = this.setSites.bind(this);
        //  this.setState = this.props.setState;
        this.mqttConnect.bind(this)() ;
    }   
     
    
    addCallbacks(eventCallbackFunctions) {
        //console.log(['ADD CALLBACKS',eventCallbackFunctions,this.eventCallbackFunctions]);
        let that = this;
        this.eventCallbackFunctions = Array.isArray(this.eventCallbackFunctions) ? this.eventCallbackFunctions : [];
        if (eventCallbackFunctions) {
            //console.log(['HAVE CALLBACKS',eventCallbackFunctions]);
            Object.keys(eventCallbackFunctions).map(function(key,loopKey) {
                let value = eventCallbackFunctions[key];
                //console.log(['TRY CALLBACKS',value,key]);
                if (typeof value === "function") {
                    //console.log(['USE CALLBACKS',{subcription:key,callBack:value}]);
                    that.eventCallbackFunctions.push({subscription:key,callBack:value});
                }
                
            });
        }
        //console.log(['ADDED CALLBACKS',this.eventCallbackFunctions]);
        return this.eventCallbackFunctions;
    };
    
    findEventCallbackFunctions(subscriptionKey) {
        let that = this;
        //console.log(['AAA::FIND  EVENT CALLBACK',subscriptionKey,this.eventCallbackFunctions]);
        let ret=[];
        this.eventCallbackFunctions.map(function(value,vkey) {
            //console.log(['AAA::TRY FIND  EVENT CALLBACK',value,vkey]);
            if (value.subscription === subscriptionKey) {
                //console.log(['AAA::FOUND  EVENT CALLBACK',subscriptionKey,value]);
                ret.push(value);
                return;
            }
        });
        return ret;
    };
    
      
    generateUuid() {
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
    
    onMessageArrived(message) {
        let that = this;
        let parts = message.destinationName ? message.destinationName.split("/") : [];
        if (parts.length > 0 && parts[0] === "hermes") {
            if (parts.length > 1 &&  parts[1] === "audioServer") {
                var audio = message.payloadBytes;
                if (parts.length > 3) {
                    let siteId = parts[2];
                    let action = parts[3];
                    let id = parts.length > 4 ? parts[4] : ''; //this.generateUuid() ;
                    if (action === "playBytes") {
                    } else if (action === "playFinished") {
                    } else if (action === "audioFrame") {
                        this.appendAudioBuffer(siteId,audio);
                    }   
                    let functionKey ='hermes/audioServer/#/'+action;
                    // hooks and callbacks
                    if (action !== "audioFrame") console.log(['LOGGER AUDIO CALLBACK',functionKey,that.eventFunctions[functionKey]]);
                        
                    if (this.eventFunctions.hasOwnProperty(functionKey)) {
                        let p = that.eventFunctions[functionKey].bind(that)(audio);
                        p.then(function(session) {
                            if (action !== "audioFrame")  console.log(['LOGGER AUDIO CALLBACK COMPLETE',functionKey,session]);
                            let callbacks = that.findEventCallbackFunctions(functionKey);
                            if (action !== "audioFrame")  console.log(['LOGGER AUDIO CALLBACKS',callbacks]);
                            if (callbacks) {
                                callbacks.map(function(value,ckey) {
                                    if (action !== "audioFrame")  console.log(['LOGGER AUDIO CALLBACK ONE',value,ckey]);
                                    let session = that.getSession(siteId,null);
                                    value.callBack.bind(that)(message.destinationName,siteId,id,session,audio);
                                });
                            }
                        }).catch(function(e) {
                            console.log(e);
                        });
                    }
                    let sessionId = this.lastSessionId[siteId];
                     
                    let messages = this.state.messages;
                    // console.log(['CAPTURE LOGS',this.props.siteId,payload.siteId]);
                    if (action !== "audioFrame" && (!this.props.siteId || (this.props.siteId && this.props.siteId === siteId ))) {
                        console.log(['LOGGER AUDIO MESSAGE',message.destinationName]);
                        messages.push({sessionId:sessionId,payload: <div style={{backgroundColor:'lightgrey'}}><hr/></div>  ,text:message.destinationName});
                        this.setState({messages:messages});                        
                    }
                } 
            } else {
                let payload = {};
                try {
                  payload = JSON.parse(message.payloadString);  
                } catch (e) {
                }
                console.log(['LOGGER PRE MESSAGE',message.destinationName,message,JSON.stringify(this.state.sites)]);
                
               // limit by siteId prop ??
              // if (!this.props.siteId || (this.props.siteId && payload.siteId == this.props.siteId)) {
                    // special case for hotword parameter in url
                    let functionKey = message.destinationName;
                    if (parts.length > 3 && parts[0] === "hermes" && parts[1] === "hotword" && parts[3] === "detected") {
                        functionKey = 'hermes/hotword/#/detected'
                    // special case for intent parameter in hermes/intent
                    } else if (parts.length > 1 && parts[0] === "hermes" && parts[1] === "intent") {
                        functionKey = 'hermes/intent/#';
                        
                    }
                    
                    if (this.eventFunctions.hasOwnProperty(functionKey)) {
                        console.log(['AAA:: EVENT FN DETECT ',functionKey,this.eventFunctions[functionKey]]);
                        let p = that.eventFunctions[functionKey].bind(that)(payload);
                        //console.log(['AAA::EVENT FN callback ',functionKey,p]);
                        //if (p && typeof p.then === "function") 
                        p.then(function(session) {
                          //  console.log(['AAA::RESOLVED INTERNAL PROMISE',functionKey,session,that.props.eventCallbackFunctions]);
                            
                            let callbacks = that.findEventCallbackFunctions(functionKey);
                            //console.log(['AAA::GOT  EVENT CALLBACK',functionKey,callbacks]);
                            if (callbacks) {
                                callbacks.map(function(value,ckey) {
                                    //console.log(['AAA::DO  EVENT CALLBACK',functionKey,ckey,value]);
                                    value.callBack.bind(that)(payload,session);
                                });
                            }
                            
                        }).catch(function(e) {
                            console.log(e);
                        });
                    } else {
                       // console.log(['AAA:: NO FUNCTION',functionKey]);
                    }
                        
                    let messages = this.state.messages;
                   // console.log(['CAPTURE LOGS',this.props.siteId,payload.siteId]);
                   // TODO losing logs with sessionId only
                   let thisState = {}
                        if (payload.siteId) {
                        if (payload.sessionId) {
                            thisState = this.getSession(payload.siteId,payload.sessionId);
                        }
                    }
                    
                    //console.log(['THISSTaTE',thisState]);
                    
                    if (!this.props.siteId || (this.props.siteId && this.props.siteId === thisState.siteId)) {
                        messages.push({sessionId:thisState.sessionId,payload: <div style={{backgroundColor:'lightgrey'}}><hr/><div style={{backgroundColor:'lightblue'}}><pre>{JSON.stringify(payload,undefined,4)}</pre></div><hr/><div style={{backgroundColor:'lightgreen'}}><pre>{JSON.stringify(thisState,undefined,4)}</pre></div><hr/></div>  ,text:message.destinationName});
                        // + ' ' + JSON.stringify(payload)
                        this.setState({messages:messages});                        
                    }
                    
                    console.log(['LOGGER MESSAGE',message.destinationName,message,JSON.parse(JSON.stringify(this.state.sites))]);
                            //,this.sessionId,mainTopic,audio.length,payload,message                   
               //}
            } 
        }
    };
 
    
    cleanSlots(slots) { 
        let final={};
        if (slots) {
            slots.map(function(slot) {
                final[slot.slotName] = {type:slot.value.kind,value:slot.value.value}
                return;
            });
        }
        return final;
    };
  
    /** 
     * Get a session for a given siteId and sessionId
     * If siteId is absent, lookup by session id Index
     * If session does not already exist, create it.
     */
   //  that.lastSessionId[payload.siteId]
    getSession(siteIdIn,sessionId) {
        //console.log(['LOGGER START GET SESSION',siteIdIn,sessionId,JSON.stringify(this.state.sites)]);
        // ensure sessionId
        //let sessionId =  sessionIdIn && sessionIdIn.length > 0 ? sessionIdIn : 'unknownSession';
        // force sessionId to last session for messages where it is missing
        if (!sessionId || sessionId.length === 0){ 
            sessionId = this.lastSessionId[siteIdIn]
        }
        if (sessionId && sessionId.length > 0){
            // ensure siteId
            let siteId=siteIdIn;
            if (!siteIdIn ||siteIdIn.length === 0) {
                siteId = this.state.sessions[sessionId];
            }        
          // console.log(['LOGGER START GET forced params',siteId,sessionId,JSON.stringify(this.state.sites)]);
            if (siteId && siteId.length>0) {
                // lookup session by siteId and sessionId
                if (this.state.sites && this.state.sites.hasOwnProperty(siteId) && this.state.sites[siteId].hasOwnProperty(sessionId) && this.state.sites[siteId][sessionId]) {
                  // console.log('GOT EXISTING SESSION',this.state.sites[siteId][sessionId]);
                    return this.state.sites[siteId][sessionId];
                } else {
                    //console.log('CREATE NEW SESSION');
                    // fallback, create a new session
                    let sites = this.state.sites ? this.state.sites : {};
                    let sessions = this.state.sessions ? this.state.sessions : {};
                    if (!sites.hasOwnProperty(siteId)) sites[siteId] = {};
                    let newSession={createtimestamp: new Date().getTime(),siteId:siteId,sessionId:sessionId};
                    if (!sites[siteId].hasOwnProperty(sessionId)) sites[siteId][sessionId]=newSession;
                    sessions[sessionId] = siteId;
                    this.setState({sites:sites,sessions:sessions});
                    return sites[siteId][sessionId];
                }
            }             
        }
    }; 

    
    /**
     *  Lookup session, use callback to make changes and restore session to state
     */
    updateSession(payload,callback) {
        let siteId = payload && payload.siteId && payload.siteId.length > 0 ? payload.siteId : null;
        
        let sessionId = payload && payload.sessionId && payload.sessionId.length > 0 ? payload.sessionId : null;
        let session = this.getSession(siteId,sessionId);
        if (session) {
            let result = callback(session)
            this.saveSession(session.siteId,session.sessionId,result);                    
        }          
    };
   
    
    saveSession(siteIdIn,sessionIdIn,session) {
        //console.log(['SAVE SESSION']);
         let sessionId =  sessionIdIn && sessionIdIn.length > 0 ? sessionIdIn : 'unknownSession';
        // ensure siteId
        let siteId=siteIdIn;
        if (!siteIdIn ||siteIdIn.length === 0) {
            siteId = this.state.sessions[sessionId];
        }        
        if (siteId && siteId.length>0) {
            let sites = this.state.sites;
            sites[siteId][sessionId] = session;
            this.setState({sites:sites});
            this.setLogData();
        }
        
    };

    setLogData() {
        //console.log('LOG SET SITES');
        if (this.props.setLogData)  this.props.setLogData(this.state.sites,this.state.messages,this.state.sessionStatus,this.state.sessionStatusText,this.state.hotwordListening,this.state.audioListening);
    };   

   
    
    updateSessionStatus(siteKey,session) {
        let that = this;
         let sessionStatus=0;
        let sessionKey = session.sessionId;
        if (that.state.hotwordListening[siteKey]) sessionStatus=1;
        if (that.state.audioListening[siteKey]) sessionStatus=2;
        if (session.queued) sessionStatus=3;
        if (session.started) sessionStatus=4;
        if (session.intents && session.asr && session.intents.length < session.asr.length) sessionStatus=5;
        if (session.intents && session.asr && session.intents.length === session.asr.length) sessionStatus=6;
        if (session.ended) sessionStatus=7;
        if (session.success) sessionStatus=8;
        let statusTexts=['starting','hotword','listening','queued','started','transcribed','interpreted','ended','success'];
        let statusText= statusTexts[sessionStatus];
        let allSessionsStatus = that.state.sessionStatus;
        let allSessionsStatusText = that.state.sessionStatusText;
        allSessionsStatus[sessionKey] = sessionStatus;
        allSessionsStatusText[sessionKey] = statusText;
      //  console.log(['UPDATE SESSION STATUS',{sessionStatus:allSessionsStatus,sessionStatusText:allSessionsStatusText}]);
        that.setState({sessionStatus:allSessionsStatus,sessionStatusText:allSessionsStatusText});
    }; 
 





  
    /**
     * Get or create an audio buffer for the siteId
     */
    getAudioBuffer(siteId) {
        if (siteId) {
            if (this.audioBuffers.hasOwnProperty(siteId)) {
                return this.audioBuffers[siteId];
            } else {
                this.audioBuffers[siteId] = [];
                return this.audioBuffers[siteId];
            }
        }
    };
    
    /**
     * Get or create an audio buffer for the siteId
     */
    appendAudioBuffer(siteId,buffer) {
        
        if (this.props.logAudio === true && siteId) {
            if (this.state.audioListening[siteId]) {
                let currentBuffer = this.getAudioBuffer(siteId);
                currentBuffer.push(buffer);
            }
        }
        // merge current and buffer
        
        //this.audioBuffers[siteId] = [];
    };


    /**
     * Get or create an audio buffer for the siteId
     */
    resetAudioBuffer(siteId) {
        //console.log(['RESET AUDIO']);
        this.audioBuffers[siteId] = [];
    };
    
    logAudioBuffer(payload) {
        //return;
        if (this.props.logAudio === true) {
            let that = this;
            let siteId = payload.siteId;
            // save to sites/sessions
           // console.log(['EXPORT AUDIO',this.getAudioBuffer(siteId)]);
            let audioContext = window.AudioContext || window.webkitAudioContext;
            let context = new audioContext();
            //let audioBuffers=[];    
            let promises = [];
            let audioBuffer = this.getAudioBuffer(siteId);
            if (audioBuffer.length> 10) return;
            audioBuffer.map(function(bytes,key) {
                let p = new Promise(function(resolve,reject) {
                    //console.log(['HANDLE BUFFER',bytes]);
                    var buffer = new Uint8Array( bytes.length );
                    if (bytes.length > 0) {
                        buffer.set( new Uint8Array(bytes), 0 );
                        try {
                            context.decodeAudioData(buffer.buffer, function(audioBuffer) {
                                console.log(['PUSH BUFFER',audioBuffer]);
                                //audioBuffers.push(audioBuffer);
                                resolve(audioBuffer);
                            });
                            
                        } catch (e) {
                            // trash buffer
                            reject();
                        }   
                    }
                });
        
            
                promises.push(p);
                return;
            })
            
            Promise.all(promises).then(function(allBuffers) {
                console.log(['MERGED allBuffers',allBuffers]);
                let merger =  new Crunker();
                try {
                    let output = merger.export(merger.concatAudio(allBuffers), "audio/wav");
                    console.log(['MERGED AUDIO',output]);
                    that.updateSession(payload,function(session) {
                             if (!session.audio) session.audio=[];
                             that.blobToDataUrl(output.blob).then(function(dataUrl) {
                                console.log(['BLOG TO DATA URL',dataUrl,output.blob]);
                                session.audio.push(dataUrl);               
                                // start again
                                that.resetAudioBuffer(siteId); 
                             });                         
                             return session;
                    });                
                } catch (e) {
                    console.log(e.message);
                }
            });            
        }
    };
    
    blobToDataUrl(blob) {
        return new Promise((fulfill, reject) => {
            let reader = new FileReader();
            reader.onerror = reject;
            reader.onload = (e) => fulfill(reader.result);
            reader.readAsDataURL(blob);
        })
    }
    
    sendMqtt(destination,payload) {
        
       if (!destination.startsWith('hermes/audioServer')) console.log(['SESSION SEND MQTT LOGGER',destination,payload])
        if (this.state.connected) {
            if (!destination.startsWith('hermes/audioServer')) console.log(['SESSION SEND MQTT LOGGER CNNECTED',destination,payload])
            let message = new Paho.MQTT.Message(JSON.stringify(payload));
            message.destinationName = destination;
            this.mqttClient.send(message);
            
        }
    };
    sendAudioMqtt(destination,payload) {
        if (this.state.connected) {
            let message = new Paho.MQTT.Message(payload);
            message.destinationName = destination;
            this.mqttClient.send(message);
            
        }
    };


}

   //<h4>Sessions</h4>
         //{JSON.stringify(this.state.sessions)}
        //<hr/>
        //<h4>Audio On</h4>
         //{JSON.stringify(this.state.audioListening)}
        //<hr/>
        //<h4>Hotword On</h4>
         //{JSON.stringify(this.state.hotwordListening)}
        //<br/><hr/>
         //<hr/>
     
